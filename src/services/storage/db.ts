import Dexie, { Table } from 'dexie';
import { Contraction } from '../../types/contraction';
import { SyncOperation } from '../../types/sync';

export class ContractionDatabase extends Dexie {
  contractions!: Table<Contraction, string>;
  syncQueue!: Table<SyncOperation, string>;

  constructor() {
    super('ContractionTrackerDB');

    this.version(1).stores({
      contractions: 'id, startTime, endTime, syncStatus, createdAt, updatedAt',
      syncQueue: 'id, contractionId, timestamp, status'
    });
  }
}

export const db = new ContractionDatabase();

// Helper functions for database operations
export const dbOperations = {
  // Contraction operations
  async addContraction(contraction: Contraction): Promise<void> {
    await db.contractions.add(contraction);
  },

  async updateContraction(id: string, updates: Partial<Contraction>): Promise<void> {
    await db.contractions.update(id, {
      ...updates,
      updatedAt: Date.now()
    });
  },

  async deleteContraction(id: string): Promise<void> {
    await db.contractions.delete(id);
  },

  async getContraction(id: string): Promise<Contraction | undefined> {
    return await db.contractions.get(id);
  },

  async getAllContractions(): Promise<Contraction[]> {
    return await db.contractions.orderBy('startTime').reverse().toArray();
  },

  async getRecentContractions(limit: number = 10): Promise<Contraction[]> {
    return await db.contractions
      .orderBy('startTime')
      .reverse()
      .limit(limit)
      .toArray();
  },

  async getContractionsInRange(startTime: number, endTime: number): Promise<Contraction[]> {
    return await db.contractions
      .where('startTime')
      .between(startTime, endTime)
      .toArray();
  },

  async getPendingContractions(): Promise<Contraction[]> {
    return await db.contractions
      .where('syncStatus')
      .equals('pending')
      .toArray();
  },

  // Sync queue operations
  async addSyncOperation(operation: SyncOperation): Promise<void> {
    await db.syncQueue.add(operation);
  },

  async updateSyncOperation(id: string, updates: Partial<SyncOperation>): Promise<void> {
    await db.syncQueue.update(id, updates);
  },

  async deleteSyncOperation(id: string): Promise<void> {
    await db.syncQueue.delete(id);
  },

  async getPendingSyncOperations(): Promise<SyncOperation[]> {
    return await db.syncQueue
      .where('status')
      .equals('pending')
      .toArray();
  },

  async clearCompletedSyncOperations(): Promise<void> {
    await db.syncQueue
      .where('status')
      .equals('completed')
      .delete();
  },

  // Clear all data (for testing/reset)
  async clearAllData(): Promise<void> {
    await db.contractions.clear();
    await db.syncQueue.clear();
  }
};
