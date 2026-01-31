import { GoogleSheetsClient } from '../googleSheets/sheetsClient';
import * as firestoreClient from '../firebase/firestoreClient';
import { dbOperations } from '../storage/db';
import { Contraction } from '../../types/contraction';
import { getGoogleSheetsConfig } from '../storage/localStorage';

export interface MigrationProgress {
  step: string;
  current?: number;
  total?: number;
}

export interface MigrationResult {
  success: boolean;
  migrated: number;
  verified: number;
  errors?: string[];
}

/**
 * Merge local and remote contractions using last-write-wins strategy
 */
const mergeContractions = (local: Contraction[], remote: Contraction[]): Contraction[] => {
  const merged = new Map<string, Contraction>();

  // Add all local contractions
  local.forEach(c => merged.set(c.id, c));

  // Override with remote if newer
  remote.forEach(c => {
    const existing = merged.get(c.id);
    if (!existing || c.updatedAt > existing.updatedAt) {
      merged.set(c.id, c);
    }
  });

  // Return sorted by startTime descending
  return Array.from(merged.values()).sort((a, b) => b.startTime - a.startTime);
};

/**
 * Migrate data from Google Sheets to Firebase
 * @param onProgress Optional callback to report migration progress
 * @returns Migration result with success status and counts
 */
export const migrateFromSheetsToFirebase = async (
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationResult> => {
  const errors: string[] = [];

  try {
    // Step 1: Fetch data from Google Sheets
    onProgress?.({ step: 'Fetching data from Google Sheets...' });
    let sheetsData: Contraction[] = [];
    try {
      const config = getGoogleSheetsConfig();
      if (!config) {
        throw new Error('Google Sheets configuration not found');
      }
      const sheetsClient = new GoogleSheetsClient(config);
      sheetsData = await sheetsClient.getAllContractions();
      onProgress?.({
        step: `Fetched ${sheetsData.length} contractions from Google Sheets`,
      });
    } catch (error) {
      const errorMsg = `Failed to fetch from Google Sheets: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.warn(errorMsg);
      // Continue with empty sheets data
    }

    // Step 2: Fetch local data from IndexedDB
    onProgress?.({ step: 'Fetching local data from IndexedDB...' });
    const localData = await dbOperations.getAllContractions();
    onProgress?.({
      step: `Fetched ${localData.length} contractions from local storage`,
    });

    // Step 3: Merge data
    onProgress?.({ step: 'Merging data sources...' });
    const merged = mergeContractions(localData, sheetsData);
    onProgress?.({
      step: `Merged ${merged.length} unique contractions`,
    });

    // Step 4: Upload to Firebase
    onProgress?.({ step: 'Uploading to Firebase...', current: 0, total: merged.length });

    let uploadedCount = 0;
    const batchSize = 10; // Upload in batches to avoid overwhelming Firebase

    for (let i = 0; i < merged.length; i += batchSize) {
      const batch = merged.slice(i, i + batchSize);

      // Upload batch in parallel
      await Promise.all(
        batch.map(async (contraction) => {
          try {
            await firestoreClient.addContraction(contraction);
            uploadedCount++;
          } catch (error) {
            const errorMsg = `Failed to upload contraction ${contraction.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(errorMsg);
          }
        })
      );

      onProgress?.({
        step: 'Uploading to Firebase...',
        current: uploadedCount,
        total: merged.length,
      });
    }

    // Step 5: Verify uploaded data
    onProgress?.({ step: 'Verifying uploaded data...' });
    let firestoreData: Contraction[] = [];
    try {
      firestoreData = await firestoreClient.getAllContractions(true);
      onProgress?.({
        step: `Verified ${firestoreData.length} contractions in Firebase`,
      });
    } catch (error) {
      const errorMsg = `Failed to verify Firebase data: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(errorMsg);
    }

    // Step 6: Update local IndexedDB cache with Firebase data
    onProgress?.({ step: 'Updating local cache...' });
    for (const contraction of firestoreData) {
      try {
        const existing = await dbOperations.getContraction(contraction.id);
        if (!existing) {
          await dbOperations.addContraction(contraction);
        } else {
          await dbOperations.updateContraction(contraction.id, contraction);
        }
      } catch (error) {
        console.warn(`Failed to update local cache for ${contraction.id}:`, error);
      }
    }

    // Final result
    const success = uploadedCount === merged.length && errors.length === 0;
    const result: MigrationResult = {
      success,
      migrated: uploadedCount,
      verified: firestoreData.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    if (success) {
      onProgress?.({ step: 'Migration completed successfully!' });
    } else {
      onProgress?.({
        step: `Migration completed with ${errors.length} error(s)`,
      });
    }

    return result;
  } catch (error) {
    console.error('Migration failed:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Migration failed: ${errorMsg}`);

    return {
      success: false,
      migrated: 0,
      verified: 0,
      errors,
    };
  }
};

/**
 * Check if Google Sheets has data that can be migrated
 */
export const hasGoogleSheetsData = async (): Promise<boolean> => {
  try {
    const config = getGoogleSheetsConfig();
    if (!config) {
      return false;
    }
    const sheetsClient = new GoogleSheetsClient(config);
    const data = await sheetsClient.getAllContractions();
    return data.length > 0;
  } catch (error) {
    console.warn('Failed to check Google Sheets data:', error);
    return false;
  }
};
