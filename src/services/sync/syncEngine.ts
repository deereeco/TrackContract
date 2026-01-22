import { GoogleSheetsClient } from '../googleSheets/sheetsClient';
import { GoogleSheetsConfig, SyncOperation } from '../../types/sync';
import { dbOperations } from '../storage/db';
import { SyncQueue } from './syncQueue';
import { mergeContractions } from './conflictResolver';
import { getGoogleSheetsConfig, hasGoogleSheetsConfig } from '../storage/localStorage';

export class SyncEngine {
  private client: GoogleSheetsClient | null = null;
  private queue: SyncQueue;
  private syncing = false;

  constructor() {
    this.queue = new SyncQueue();
    this.initializeClient();
  }

  private initializeClient() {
    const config = getGoogleSheetsConfig();
    if (config) {
      this.client = new GoogleSheetsClient(config);
    }
  }

  /**
   * Update the Google Sheets configuration
   */
  updateConfig(config: GoogleSheetsConfig) {
    this.client = new GoogleSheetsClient(config);
  }

  /**
   * Check if sync is configured
   */
  isConfigured(): boolean {
    return this.client !== null && hasGoogleSheetsConfig();
  }

  /**
   * Full sync: pull from remote, merge with local, push changes
   */
  async fullSync(): Promise<void> {
    if (!this.client || this.syncing) return;

    this.syncing = true;

    try {
      // 1. Get remote contractions
      const remoteContractions = await this.client.getAllContractions();

      // 2. Get local contractions
      const localContractions = await dbOperations.getAllContractions();

      // 3. Merge with conflict resolution
      const mergedContractions = mergeContractions(localContractions, remoteContractions);

      // 4. Update local database with merged data
      await dbOperations.clearAllData();
      for (const contraction of mergedContractions) {
        await dbOperations.addContraction(contraction);
      }

      // 5. Process pending sync queue
      await this.queue.processQueue(async (operation) => {
        await this.processOperation(operation);
      });
    } catch (error) {
      console.error('Full sync failed:', error);
      throw error;
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Incremental sync: only push local changes
   */
  async incrementalSync(): Promise<void> {
    if (!this.client || this.syncing) return;

    this.syncing = true;

    try {
      // Process pending operations
      await this.queue.processQueue(async (operation) => {
        await this.processOperation(operation);
      });
    } catch (error) {
      console.error('Incremental sync failed:', error);
      throw error;
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Process a single sync operation
   */
  private async processOperation(operation: SyncOperation): Promise<void> {
    if (!this.client) throw new Error('Sync client not initialized');

    const contraction = await dbOperations.getContraction(operation.contractionId);
    if (!contraction) {
      console.warn('Contraction not found for sync operation:', operation);
      return;
    }

    switch (operation.type) {
      case 'create':
        await this.client.appendContractions([contraction]);
        // Update local with sheet row ID (would need to fetch to get row number)
        await dbOperations.updateContraction(contraction.id, {
          syncStatus: 'synced',
          syncedAt: Date.now(),
        });
        break;

      case 'update':
        if (contraction.sheetRowId) {
          await this.client.updateContraction(contraction);
          await dbOperations.updateContraction(contraction.id, {
            syncStatus: 'synced',
            syncedAt: Date.now(),
          });
        } else {
          // If no row ID, treat as create
          await this.client.appendContractions([contraction]);
          await dbOperations.updateContraction(contraction.id, {
            syncStatus: 'synced',
            syncedAt: Date.now(),
          });
        }
        break;

      case 'delete':
        if (contraction.sheetRowId) {
          await this.client.deleteContraction(contraction.id, contraction.sheetRowId);
        }
        break;

      case 'archive':
        // Archive by ID - the Apps Script will find it in the sheet
        await this.client.archiveContraction(contraction.id);
        await dbOperations.updateContraction(contraction.id, {
          archived: true,
          syncStatus: 'synced',
        });
        break;

      case 'restore':
        // Restore means un-archive and re-append to main sheet
        await this.client.appendContractions([contraction]);
        await dbOperations.updateContraction(contraction.id, {
          archived: false,
          syncStatus: 'synced',
          syncedAt: Date.now(),
        });
        break;
    }
  }

  /**
   * Queue a contraction for sync
   */
  async queueContraction(
    type: 'create' | 'update' | 'delete' | 'archive' | 'restore',
    contractionId: string,
    data: any
  ): Promise<void> {
    await this.queue.enqueue(type, contractionId, data);
  }

  /**
   * Queue multiple contractions for archiving
   */
  async queueArchiveAll(contractionIds: string[]): Promise<void> {
    if (!this.client) throw new Error('Sync client not initialized');

    try {
      // Archive all in one request
      await this.client.archiveAllContractions(contractionIds);

      // Update all contractions in local DB
      for (const id of contractionIds) {
        await dbOperations.updateContraction(id, {
          archived: true,
          syncStatus: 'synced',
        });
      }
    } catch (error) {
      console.error('Failed to queue archive all:', error);
      throw error;
    }
  }

  /**
   * Get pending sync count
   */
  async getPendingCount(): Promise<number> {
    return await this.queue.getPendingCount();
  }

  /**
   * Test connection to Google Sheets
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) return false;
    return await this.client.testConnection();
  }

  /**
   * Initialize the Google Sheet with headers
   */
  async initializeSheet(): Promise<void> {
    if (!this.client) throw new Error('Sync client not initialized');
    await this.client.initializeSheet();
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();
