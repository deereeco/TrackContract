import { v4 as uuidv4 } from 'uuid';
import { HistoryEntry, HistoryState, HistoryActionType } from '../../types/history';
import { Contraction } from '../../types/contraction';
import { dbOperations } from '../storage/db';

const HISTORY_STORAGE_KEY = 'contraction-tracker-history';
const MAX_HISTORY_SIZE = 50;

export class HistoryManager {
  private state: HistoryState;

  constructor() {
    this.state = {
      entries: [],
      currentIndex: -1,
      maxSize: MAX_HISTORY_SIZE,
    };
    this.loadFromLocalStorage();
  }

  /**
   * Load history from localStorage and IndexedDB
   */
  private async loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state.currentIndex = parsed.currentIndex || -1;
      }

      // Load entries from IndexedDB
      const entries = await dbOperations.getAllHistory();
      this.state.entries = entries;
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }

  /**
   * Save history state to localStorage
   */
  private async saveToLocalStorage() {
    try {
      // Save pointer to localStorage
      localStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify({ currentIndex: this.state.currentIndex })
      );

      // Save entries to IndexedDB
      await dbOperations.clearHistory();
      for (const entry of this.state.entries) {
        await dbOperations.addHistoryEntry(entry);
      }
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }

  /**
   * Add a new history entry
   */
  async addEntry(
    actionType: HistoryActionType,
    description: string,
    contractionId?: string,
    contractionIds?: string[],
    previousState?: Contraction,
    previousStates?: Contraction[]
  ): Promise<void> {
    // Remove any entries after current index (redo stack)
    if (this.state.currentIndex < this.state.entries.length - 1) {
      this.state.entries = this.state.entries.slice(0, this.state.currentIndex + 1);
    }

    // Create new entry
    const entry: HistoryEntry = {
      id: uuidv4(),
      actionType,
      timestamp: Date.now(),
      description,
      contractionId,
      contractionIds,
      previousState,
      previousStates,
    };

    // Add to entries
    this.state.entries.push(entry);
    this.state.currentIndex++;

    // Maintain max size (FIFO)
    if (this.state.entries.length > this.state.maxSize) {
      this.state.entries.shift();
      this.state.currentIndex--;
    }

    await this.saveToLocalStorage();
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.state.currentIndex >= 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.state.currentIndex < this.state.entries.length - 1;
  }

  /**
   * Get the entry at current undo position
   */
  getUndoEntry(): HistoryEntry | null {
    if (!this.canUndo()) return null;
    return this.state.entries[this.state.currentIndex];
  }

  /**
   * Get the entry at current redo position
   */
  getRedoEntry(): HistoryEntry | null {
    if (!this.canRedo()) return null;
    return this.state.entries[this.state.currentIndex + 1];
  }

  /**
   * Move undo pointer back (after undo executed)
   */
  async moveUndoPointer(): Promise<void> {
    if (this.canUndo()) {
      this.state.currentIndex--;
      await this.saveToLocalStorage();
    }
  }

  /**
   * Move redo pointer forward (after redo executed)
   */
  async moveRedoPointer(): Promise<void> {
    if (this.canRedo()) {
      this.state.currentIndex++;
      await this.saveToLocalStorage();
    }
  }

  /**
   * Get description for undo action
   */
  getUndoDescription(): string | null {
    const entry = this.getUndoEntry();
    return entry ? `Undo: ${entry.description}` : null;
  }

  /**
   * Get description for redo action
   */
  getRedoDescription(): string | null {
    const entry = this.getRedoEntry();
    return entry ? `Redo: ${entry.description}` : null;
  }

  /**
   * Clear all history
   */
  async clear(): Promise<void> {
    this.state.entries = [];
    this.state.currentIndex = -1;
    await this.saveToLocalStorage();
  }

  /**
   * Get current state (for debugging)
   */
  getState(): HistoryState {
    return { ...this.state };
  }
}

// Singleton instance
export const historyManager = new HistoryManager();
