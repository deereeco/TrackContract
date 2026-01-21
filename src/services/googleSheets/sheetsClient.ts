import { GoogleSheetsConfig } from '../../types/sync';
import { Contraction } from '../../types/contraction';
import { contractionToSheetRow, sheetRowToContraction } from './sheetsMapper';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export class GoogleSheetsClient {
  private config: GoogleSheetsConfig;

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
  }

  private getUrl(path: string): string {
    return `${SHEETS_API_BASE}/${this.config.spreadsheetId}${path}`;
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}key=${this.config.apiKey}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`Google Sheets API Error: ${error.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  /**
   * Initialize the sheet with headers if empty
   */
  async initializeSheet(): Promise<void> {
    try {
      const url = this.getUrl(`/values/${encodeURIComponent(this.config.sheetName)}!A1:I1`);
      const response = await this.request<{ values?: string[][] }>(url);

      // If no headers, add them
      if (!response.values || response.values.length === 0) {
        const headers = ['id', 'startTime', 'endTime', 'duration', 'intensity', 'notes', 'createdAt', 'updatedAt', 'deleted'];
        await this.appendRows([headers]);
      }
    } catch (error) {
      console.error('Failed to initialize sheet:', error);
      throw error;
    }
  }

  /**
   * Get all contractions from the sheet
   */
  async getAllContractions(): Promise<Contraction[]> {
    try {
      const url = this.getUrl(`/values/${encodeURIComponent(this.config.sheetName)}!A2:I`);
      const response = await this.request<{ values?: string[][] }>(url);

      if (!response.values || response.values.length === 0) {
        return [];
      }

      return response.values
        .map((row, index) => sheetRowToContraction(row, index + 2))
        .filter((c): c is Contraction => c !== null)
        .filter(c => !c.notes?.includes('DELETED')); // Filter out deleted entries
    } catch (error) {
      console.error('Failed to get contractions from sheet:', error);
      throw error;
    }
  }

  /**
   * Append new contractions to the sheet
   */
  async appendContractions(contractions: Contraction[]): Promise<void> {
    try {
      const rows = contractions.map(contractionToSheetRow);
      await this.appendRows(rows);
    } catch (error) {
      console.error('Failed to append contractions:', error);
      throw error;
    }
  }

  /**
   * Update a specific contraction in the sheet
   */
  async updateContraction(contraction: Contraction): Promise<void> {
    if (!contraction.sheetRowId) {
      throw new Error('Cannot update contraction without sheetRowId');
    }

    try {
      const row = contractionToSheetRow(contraction);
      const range = `${this.config.sheetName}!A${contraction.sheetRowId}:I${contraction.sheetRowId}`;
      const url = this.getUrl(`/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`);

      await this.request(url, {
        method: 'PUT',
        body: JSON.stringify({
          range,
          values: [row],
        }),
      });
    } catch (error) {
      console.error('Failed to update contraction:', error);
      throw error;
    }
  }

  /**
   * Mark a contraction as deleted in the sheet
   */
  async deleteContraction(_contractionId: string, sheetRowId: number): Promise<void> {
    try {
      const range = `${this.config.sheetName}!I${sheetRowId}`;
      const url = this.getUrl(`/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`);

      await this.request(url, {
        method: 'PUT',
        body: JSON.stringify({
          range,
          values: [['DELETED']],
        }),
      });
    } catch (error) {
      console.error('Failed to delete contraction:', error);
      throw error;
    }
  }

  /**
   * Batch update multiple contractions
   */
  async batchUpdate(contractions: Contraction[]): Promise<void> {
    try {
      const data = contractions
        .filter(c => c.sheetRowId)
        .map(c => ({
          range: `${this.config.sheetName}!A${c.sheetRowId}:I${c.sheetRowId}`,
          values: [contractionToSheetRow(c)],
        }));

      if (data.length === 0) return;

      const url = this.getUrl('/values:batchUpdate');
      await this.request(url, {
        method: 'POST',
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data,
        }),
      });
    } catch (error) {
      console.error('Failed to batch update:', error);
      throw error;
    }
  }

  /**
   * Helper method to append rows
   */
  private async appendRows(rows: any[][]): Promise<void> {
    const range = `${this.config.sheetName}!A:I`;
    const url = this.getUrl(`/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`);

    await this.request(url, {
      method: 'POST',
      body: JSON.stringify({
        range,
        values: rows,
      }),
    });
  }

  /**
   * Test connection to the sheet
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = this.getUrl('');
      await this.request(url);
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}
