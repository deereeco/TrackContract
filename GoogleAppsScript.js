/**
 * Google Apps Script for Contraction Tracker
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste this entire file
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type: "Web app"
 * 6. Set "Execute as": Me
 * 7. Set "Who has access": Anyone
 * 8. Click "Deploy"
 * 9. Copy the deployment URL and paste it in the app settings
 *
 * This script acts as a proxy, allowing your app to write to the sheet
 * without exposing API keys or requiring OAuth in the client.
 */

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const params = e.parameter;
    const action = params.action;
    const sheetName = params.sheetName || 'Contractions';

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    let result;

    switch (action) {
      case 'initialize':
        result = initializeSheet(sheet);
        break;

      case 'getAll':
        result = getAllContractions(sheet);
        break;

      case 'append':
        result = appendContractions(sheet, e);
        break;

      case 'update':
        result = updateContraction(sheet, e);
        break;

      case 'delete':
        result = deleteContraction(sheet, params);
        break;

      case 'batchUpdate':
        result = batchUpdateContractions(sheet, e);
        break;

      case 'archive':
        result = archiveContraction(sheet, params);
        break;

      case 'archiveAll':
        result = archiveAllContractions(sheet, e);
        break;

      case 'test':
        result = { success: true, message: 'Connection successful' };
        break;

      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }

    return createCorsResponse(result);

  } catch (error) {
    return createCorsResponse({
      success: false,
      error: error.message
    });
  }
}

function createCorsResponse(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);

  // Add CORS headers
  return output;
}

function initializeSheet(sheet) {
  const lastRow = sheet.getLastRow();

  // If sheet is empty or only has one row, add headers
  if (lastRow === 0) {
    const headers = ['id', 'startTime', 'endTime', 'duration', 'intensity', 'notes', 'createdAt', 'updatedAt', 'deleted'];
    sheet.appendRow(headers);
    return { success: true, message: 'Sheet initialized with headers' };
  }

  return { success: true, message: 'Sheet already initialized' };
}

function getAllContractions(sheet) {
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return { success: true, data: [] };
  }

  const range = sheet.getRange(2, 1, lastRow - 1, 9);
  const values = range.getValues();

  const contractions = values
    .map((row, index) => {
      if (!row[0]) return null; // Skip empty rows

      return {
        id: row[0],
        startTime: row[1],
        endTime: row[2],
        duration: row[3],
        intensity: row[4],
        notes: row[5],
        createdAt: row[6],
        updatedAt: row[7],
        deleted: row[8],
        sheetRowId: index + 2
      };
    })
    .filter(c => c !== null && c.deleted !== 'DELETED');

  return { success: true, data: contractions };
}

function appendContractions(sheet, e) {
  try {
    const data = JSON.parse(e.parameter.data || e.postData?.contents || '{}');
    const rows = data.rows;

    if (!rows || rows.length === 0) {
      return { success: false, error: 'No rows to append' };
    }

    rows.forEach(row => {
      sheet.appendRow(row);
    });

    return { success: true, message: `Appended ${rows.length} row(s)` };
  } catch (error) {
    return { success: false, error: 'Failed to parse request: ' + error.message };
  }
}

function updateContraction(sheet, e) {
  try {
    const data = JSON.parse(e.parameter.data || e.postData?.contents || '{}');
    const rowIndex = data.rowIndex;
    const row = data.row;

    if (!rowIndex || !row) {
      return { success: false, error: 'Missing rowIndex or row data' };
    }

    const range = sheet.getRange(rowIndex, 1, 1, row.length);
    range.setValues([row]);

    return { success: true, message: 'Row updated' };
  } catch (error) {
    return { success: false, error: 'Failed to update: ' + error.message };
  }
}

function deleteContraction(sheet, params) {
  const rowIndex = parseInt(params.rowIndex);

  if (!rowIndex) {
    return { success: false, error: 'Missing rowIndex' };
  }

  sheet.getRange(rowIndex, 9).setValue('DELETED');

  return { success: true, message: 'Row marked as deleted' };
}

function batchUpdateContractions(sheet, e) {
  try {
    const data = JSON.parse(e.parameter.data || e.postData?.contents || '{}');
    const updates = data.updates;

    if (!updates || updates.length === 0) {
      return { success: false, error: 'No updates provided' };
    }

    updates.forEach(update => {
      const range = sheet.getRange(update.rowIndex, 1, 1, update.row.length);
      range.setValues([update.row]);
    });

    return { success: true, message: `Updated ${updates.length} row(s)` };
  } catch (error) {
    return { success: false, error: 'Failed to batch update: ' + error.message };
  }
}

function archiveContraction(sheet, params) {
  try {
    const rowIndex = parseInt(params.rowIndex);

    if (!rowIndex) {
      return { success: false, error: 'Missing rowIndex' };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let archiveSheet = ss.getSheetByName('Archived Contractions');

    // Create archive sheet if it doesn't exist
    if (!archiveSheet) {
      archiveSheet = ss.insertSheet('Archived Contractions');
      // Copy headers from main sheet
      const headers = sheet.getRange(1, 1, 1, 9).getValues();
      archiveSheet.getRange(1, 1, 1, 9).setValues(headers);
    }

    // Get the row data
    const rowData = sheet.getRange(rowIndex, 1, 1, 9).getValues();

    // Append to archive sheet
    archiveSheet.appendRow(rowData[0]);

    // Delete from main sheet
    sheet.deleteRow(rowIndex);

    return { success: true, message: 'Contraction archived' };
  } catch (error) {
    return { success: false, error: 'Failed to archive: ' + error.message };
  }
}

function archiveAllContractions(sheet, e) {
  try {
    const data = JSON.parse(e.parameter.data || e.postData?.contents || '{}');
    const contractionIds = data.contractionIds;

    if (!contractionIds || contractionIds.length === 0) {
      return { success: false, error: 'No contraction IDs provided' };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let archiveSheet = ss.getSheetByName('Archived Contractions');

    // Create archive sheet if it doesn't exist
    if (!archiveSheet) {
      archiveSheet = ss.insertSheet('Archived Contractions');
      // Copy headers from main sheet
      const headers = sheet.getRange(1, 1, 1, 9).getValues();
      archiveSheet.getRange(1, 1, 1, 9).setValues(headers);
    }

    // Get all data from main sheet
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { success: true, message: 'No contractions to archive' };
    }

    const allData = sheet.getRange(2, 1, lastRow - 1, 9).getValues();

    // Find rows matching contraction IDs
    const rowsToArchive = [];
    const rowIndexesToDelete = [];

    allData.forEach((row, index) => {
      if (contractionIds.includes(row[0])) {
        rowsToArchive.push(row);
        rowIndexesToDelete.push(index + 2); // +2 because of header and 0-based index
      }
    });

    // Append rows to archive sheet
    if (rowsToArchive.length > 0) {
      rowsToArchive.forEach(row => {
        archiveSheet.appendRow(row);
      });

      // Delete rows from main sheet (reverse order to maintain indices)
      rowIndexesToDelete.reverse().forEach(rowIndex => {
        sheet.deleteRow(rowIndex);
      });
    }

    return { success: true, message: `Archived ${rowsToArchive.length} contraction(s)` };
  } catch (error) {
    return { success: false, error: 'Failed to archive all: ' + error.message };
  }
}
