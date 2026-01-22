import Dexie, { Table } from 'dexie';
import { Contraction } from '../../types/contraction';
import { SyncOperation } from '../../types/sync';
import { HistoryEntry } from '../../types/history';

export class ContractionDatabase extends Dexie {
  contractions!: Table<Contraction, string>;
  syncQueue!: Table<SyncOperation, string>;
  history!: Table<HistoryEntry, string>;

  constructor() {
    super('ContractionTrackerDB');

    // Version 1: Initial schema
    this.version(1).stores({
      contractions: 'id, startTime, endTime, syncStatus, createdAt, updatedAt',
      syncQueue: 'id, contractionId, timestamp, status'
    });

    // Version 2: Add history table and archived index
    this.version(2).stores({
      contractions: 'id, startTime, endTime, syncStatus, createdAt, updatedAt, archived',
      syncQueue: 'id, contractionId, timestamp, status',
      history: 'id, timestamp, actionType'
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
    const all = await db.contractions.orderBy('startTime').reverse().toArray();
    return all.filter(c => !c.archived);
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

  // History operations
  async addHistoryEntry(entry: HistoryEntry): Promise<void> {
    await db.history.add(entry);
  },

  async getAllHistory(): Promise<HistoryEntry[]> {
    return await db.history.orderBy('timestamp').toArray();
  },

  async deleteHistoryEntry(id: string): Promise<void> {
    await db.history.delete(id);
  },

  async clearHistory(): Promise<void> {
    await db.history.clear();
  },

  // Clear all data (for testing/reset)
  async clearAllData(): Promise<void> {
    await db.contractions.clear();
    await db.syncQueue.clear();
    await db.history.clear();
  }
};
