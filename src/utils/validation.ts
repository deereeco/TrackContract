import { Contraction } from '../types/contraction';

/**
 * Validate a contraction object
 */
export const validateContraction = (contraction: Partial<Contraction>): string[] => {
  const errors: string[] = [];

  if (!contraction.id) {
    errors.push('Contraction must have an ID');
  }

  if (!contraction.startTime) {
    errors.push('Contraction must have a start time');
  }

  if (contraction.startTime && contraction.startTime > Date.now()) {
    errors.push('Start time cannot be in the future');
  }

  if (contraction.endTime) {
    if (contraction.endTime < (contraction.startTime || 0)) {
      errors.push('End time must be after start time');
    }

    if (contraction.endTime > Date.now()) {
      errors.push('End time cannot be in the future');
    }
  }

  if (contraction.duration !== undefined && contraction.duration !== null) {
    if (contraction.duration < 0) {
      errors.push('Duration must be positive');
    }

    if (contraction.duration > 600) {
      errors.push('Duration seems unusually long (>10 minutes)');
    }
  }

  if (contraction.intensity !== undefined) {
    if (contraction.intensity < 1 || contraction.intensity > 10) {
      errors.push('Intensity must be between 1 and 10');
    }
  }

  return errors;
};

/**
 * Validate Google Sheets configuration
 */
export const validateGoogleSheetsConfig = (config: any): string[] => {
  const errors: string[] = [];

  if (!config.apiKey || typeof config.apiKey !== 'string' || config.apiKey.trim() === '') {
    errors.push('API key is required');
  }

  if (!config.spreadsheetId || typeof config.spreadsheetId !== 'string' || config.spreadsheetId.trim() === '') {
    errors.push('Spreadsheet ID is required');
  }

  if (!config.sheetName || typeof config.sheetName !== 'string' || config.sheetName.trim() === '') {
    errors.push('Sheet name is required');
  }

  return errors;
};

/**
 * Extract spreadsheet ID from a Google Sheets URL
 */
export const extractSpreadsheetId = (url: string): string | null => {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
};

/**
 * Validate if a string is a valid UUID
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};
