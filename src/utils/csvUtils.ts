import { v4 as uuidv4 } from 'uuid';
import type { Contraction } from '../types/contraction';

export const CSV_TEMPLATE = `id,startTime,endTime,duration,intensity,notes
,2024-01-15 10:30:00,2024-01-15 10:31:15,75,7,strong contraction
,2024-01-15 10:45:00,2024-01-15 10:46:30,90,8,
,2024-01-15 11:00:00,,,5,mild pressure
`;

// Auto-detect CSV vs TSV delimiter
function detectDelimiter(firstLine: string): string {
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return tabs > commas ? '\t' : ',';
}

// Parse a single CSV/TSV line respecting quoted fields
function parseLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

interface ParsedCSV {
  headers: string[];
  rows: string[][];
}

export function parseCSV(text: string): ParsedCSV {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseLine(lines[0], delimiter).map(h => h.trim());
  const rows = lines.slice(1).map(line => parseLine(line, delimiter).map(f => f.trim()));

  return { headers, rows };
}

// Normalize header names to field keys
function resolveHeader(header: string): keyof Contraction | null {
  const h = header.toLowerCase().replace(/[_\s-]/g, '');
  if (['starttime', 'start'].includes(h)) return 'startTime';
  if (['endtime', 'end'].includes(h)) return 'endTime';
  if (h === 'duration') return 'duration';
  if (h === 'intensity') return 'intensity';
  if (['notes', 'note', 'comments', 'comment'].includes(h)) return 'notes';
  if (h === 'id') return 'id';
  if (['createdat', 'created'].includes(h)) return 'createdAt';
  return null;
}

function parseTimestamp(value: string): number | null {
  if (!value) return null;
  // Try as numeric timestamp first
  const num = Number(value);
  if (!isNaN(num) && num > 1_000_000_000) return num > 1e12 ? num : num * 1000;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.getTime();
}

export function csvToContractions(
  parsed: ParsedCSV,
  now: number
): { valid: Contraction[]; invalid: number } {
  const colMap: Partial<Record<keyof Contraction, number>> = {};
  parsed.headers.forEach((h, i) => {
    const field = resolveHeader(h);
    if (field) colMap[field] = i;
  });

  let invalid = 0;
  const valid: Contraction[] = [];

  for (const row of parsed.rows) {
    const get = (field: keyof Contraction): string => {
      const idx = colMap[field];
      return idx !== undefined ? (row[idx] ?? '') : '';
    };

    const startTimeRaw = get('startTime');
    const startTime = parseTimestamp(startTimeRaw);
    if (!startTime) { invalid++; continue; }

    const endTimeRaw = get('endTime');
    const endTime = parseTimestamp(endTimeRaw);

    const durationRaw = get('duration');
    let duration: number | null = durationRaw ? Number(durationRaw) : null;
    if (duration !== null && isNaN(duration)) duration = null;
    // Auto-calculate duration if not provided
    if (duration === null && endTime !== null) {
      duration = Math.round((endTime - startTime) / 1000);
    }

    const intensityRaw = get('intensity');
    const intensity = intensityRaw ? Number(intensityRaw) : undefined;

    const notes = get('notes') || undefined;

    const idRaw = get('id');
    const id = idRaw || uuidv4();

    const createdAtRaw = get('createdAt');
    const createdAt = parseTimestamp(createdAtRaw) ?? now;

    valid.push({
      id,
      startTime,
      endTime: endTime ?? null,
      duration: duration ?? null,
      intensity: intensity && !isNaN(intensity) ? intensity : undefined,
      notes,
      createdAt,
      updatedAt: now,
      archived: false,
      syncStatus: 'synced',
    });
  }

  return { valid, invalid };
}

function escapeField(value: string, delimiter: string): string {
  if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function contractionsToDelimited(contractions: Contraction[], delimiter: string): string {
  const headers = ['id', 'startTime', 'endTime', 'duration', 'intensity', 'notes', 'createdAt'];
  const escape = (v: string) => escapeField(v, delimiter);

  const rows = contractions.map(c => [
    escape(c.id),
    escape(new Date(c.startTime).toISOString()),
    escape(c.endTime ? new Date(c.endTime).toISOString() : ''),
    escape(c.duration != null ? String(c.duration) : ''),
    escape(c.intensity != null ? String(c.intensity) : ''),
    escape(c.notes ?? ''),
    escape(new Date(c.createdAt).toISOString()),
  ].join(delimiter));

  return [headers.join(delimiter), ...rows].join('\n');
}

export function contractionsToCSV(contractions: Contraction[]): string {
  return contractionsToDelimited(contractions, ',');
}

export function contractionsToTSV(contractions: Contraction[]): string {
  return contractionsToDelimited(contractions, '\t');
}
