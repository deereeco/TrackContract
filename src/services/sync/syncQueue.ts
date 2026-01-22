import { v4 as uuidv4 } from 'uuid';
import { SyncOperation } from '../../types/sync';
import { dbOperations } from '../storage/db';

const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff

export class SyncQueue {
  private processing = false;

  /**
   * Add an operation to the sync queue
   */
  async enqueue(
    type: 'create' | 'update' | 'delete' | 'archive' | 'restore',
    contractionId: string,
    data: any
  ): Promise<void> {
    const operation: SyncOperation = {
      id: uuidv4(),
      type,
      contractionId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    await dbOperations.addSyncOperation(operation);
  }

  /**
   * Process all pending operations
   */
  async processQueue(processor: (operation: SyncOperation) => Promise<void>): Promise<void> {
    if (this.processing) return;

    this.processing = true;

    try {
      const operations = await dbOperations.getPendingSyncOperations();

      for (const operation of operations) {
        try {
          await dbOperations.updateSyncOperation(operation.id, { status: 'processing' });
          await processor(operation);
          await dbOperations.updateSyncOperation(operation.id, { status: 'completed' });
        } catch (error) {
          console.error('Failed to process sync operation:', error, operation);

          const newRetryCount = operation.retryCount + 1;

          if (newRetryCount >= MAX_RETRIES) {
            await dbOperations.updateSyncOperation(operation.id, {
              status: 'failed',
              retryCount: newRetryCount,
            });
          } else {
            // Schedule retry with exponential backoff
            await dbOperations.updateSyncOperation(operation.id, {
              status: 'pending',
              retryCount: newRetryCount,
            });

            // Wait before retrying
            const delay = RETRY_DELAYS[newRetryCount - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // Clean up completed operations
      await dbOperations.clearCompletedSyncOperations();
    } finally {
      this.processing = false;
    }
  }

  /**
   * Get the number of pending operations
   */
  async getPendingCount(): Promise<number> {
    const operations = await dbOperations.getPendingSyncOperations();
    return operations.length;
  }

  /**
   * Clear all operations (for testing/reset)
   */
  async clear(): Promise<void> {
    await dbOperations.clearCompletedSyncOperations();
  }
}
