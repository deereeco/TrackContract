import { Contraction } from '../../types/contraction';

/**
 * Convert a Contraction object to a sheet row (array of values)
 */
export const contractionToSheetRow = (contraction: Contraction): any[] => {
  return [
    contraction.id,
    contraction.startTime.toString(),
    contraction.endTime?.toString() || '',
    contraction.duration?.toString() || '',
    contraction.intensity?.toString() || '',
    contraction.notes || '',
    contraction.createdAt.toString(),
    contraction.updatedAt.toString(),
    '', // deleted flag
  ];
};

/**
 * Convert a sheet row to a Contraction object
 */
export const sheetRowToContraction = (row: any[], rowIndex: number): Contraction | null => {
  try {
    // Validate required fields
    if (!row[0] || !row[1]) {
      return null;
    }

    const contraction: Contraction = {
      id: row[0],
      startTime: parseInt(row[1], 10),
      endTime: row[2] ? parseInt(row[2], 10) : null,
      duration: row[3] ? parseInt(row[3], 10) : null,
      intensity: row[4] ? parseInt(row[4], 10) : undefined,
      notes: row[5] || undefined,
      createdAt: row[6] ? parseInt(row[6], 10) : parseInt(row[1], 10),
      updatedAt: row[7] ? parseInt(row[7], 10) : parseInt(row[1], 10),
      syncStatus: 'synced',
      syncedAt: Date.now(),
      sheetRowId: rowIndex,
    };

    return contraction;
  } catch (error) {
    console.error('Failed to parse sheet row:', error, row);
    return null;
  }
};

/**
 * Find the row index of a contraction by ID
 */
export const findContractionRowIndex = (contractions: Contraction[], id: string): number | null => {
  const contraction = contractions.find(c => c.id === id);
  return contraction?.sheetRowId || null;
};
