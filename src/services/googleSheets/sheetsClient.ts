import { GoogleSheetsConfig } from '../../types/sync';
import { Contraction } from '../../types/contraction';
import { contractionToSheetRow } from './sheetsMapper';

export class GoogleSheetsClient {
  private config: GoogleSheetsConfig;

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
  }

  private async request(action: string, params: any = {}, body: any = null): Promise<any> {
    const url = new URL(this.config.scriptUrl);
    url.searchParams.append('action', action);
    url.searchParams.append('sheetName', this.config.sheetName);

    // Add any additional query parameters
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key]);
    });

    const options: RequestInit = {
      method: body ? 'POST' : 'GET',
      redirect: 'follow',
    };

    if (body) {
      // Use FormData with JSON to avoid CORS preflight
      const formData = new FormData();
      formData.append('data', JSON.stringify(body));
      options.body = formData;
    }

    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      throw new Error(`Google Apps Script Error: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Unknown error from Apps Script');
    }

    return result;
  }

  /**
   * Initialize the sheet with headers if empty
   */
  async initializeSheet(): Promise<void> {
    try {
      await this.request('initialize');
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
      const response = await this.request('getAll');

      if (!response.data || response.data.length === 0) {
        return [];
      }

      return response.data.map((item: any) => ({
        id: item.id,
        startTime: new Date(item.startTime).getTime(),
        endTime: item.endTime ? new Date(item.endTime).getTime() : null,
        duration: item.duration ? parseFloat(item.duration) : null,
        intensity: item.intensity ? parseInt(item.intensity) : undefined,
        notes: item.notes || undefined,
        createdAt: new Date(item.createdAt).getTime(),
        updatedAt: new Date(item.updatedAt).getTime(),
        sheetRowId: item.sheetRowId,
      }));
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
      await this.request('append', {}, { rows });
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
      await this.request('update', {}, {
        rowIndex: contraction.sheetRowId,
        row,
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
      await this.request('delete', { rowIndex: sheetRowId });
    } catch (error) {
      console.error('Failed to delete contraction:', error);
      throw error;
    }
  }

  /**
   * Archive a contraction (move to Archived Contractions sheet)
   */
  async archiveContraction(_contractionId: string, sheetRowId: number): Promise<void> {
    try {
      await this.request('archive', { rowIndex: sheetRowId });
    } catch (error) {
      console.error('Failed to archive contraction:', error);
      throw error;
    }
  }

  /**
   * Archive all contractions (move to Archived Contractions sheet)
   */
  async archiveAllContractions(contractionIds: string[]): Promise<void> {
    try {
      await this.request('archiveAll', {}, { contractionIds });
    } catch (error) {
      console.error('Failed to archive all contractions:', error);
      throw error;
    }
  }

  /**
   * Batch update multiple contractions
   */
  async batchUpdate(contractions: Contraction[]): Promise<void> {
    try {
      const updates = contractions
        .filter(c => c.sheetRowId)
        .map(c => ({
          rowIndex: c.sheetRowId,
          row: contractionToSheetRow(c),
        }));

      if (updates.length === 0) return;

      await this.request('batchUpdate', {}, { updates });
    } catch (error) {
      console.error('Failed to batch update:', error);
      throw error;
    }
  }

  /**
   * Test connection to the sheet
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('test');
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}
