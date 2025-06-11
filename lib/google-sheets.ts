// Google Sheets structure sample (from RESERVA 2024 25.html):
// Row 1: Title
// Row 2: Empty/headers
// Row 3: Match dates and status (columns C+)
// Row 4+: Player rows: [number, name, payment per match...]
// ...
// There are also summary rows at the bottom (cost, recaudado, etc.)

import { google } from "googleapis";

import type { sheets_v4 } from "googleapis";

// Types for match and player row (to be refined based on actual sheet structure)
export interface PlayerRow {
  number: string;
  name: string;
  payments: string[]; // One per match column
}

export interface MatchColumn {
  date: string;
  status: string;
  // Add more fields as needed
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || "<YOUR_SPREADSHEET_ID>";
const SHEET_NAME = process.env.GOOGLE_SHEETS_SHEET || "Sheet1";

// Auth setup (service account)
function getSheetsClient() {
  return google.sheets({
    version: "v4",
    auth: new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
          /\\n/g,
          "\n",
        ),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    }),
  });
}

export async function fetchSheetData() {
  const sheets = getSheetsClient();
  const range = `${SHEET_NAME}`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  return response.data.values;
}

// --- WRITE HELPERS ---

// Use write scope for write operations
function getSheetsWriteClient() {
  return google.sheets({
    version: "v4",
    auth: new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
          /\\n/g,
          "\n",
        ),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    }),
  });
}

/**
 * Update a player's payment status for a match.
 * @param playerRowIdx Row index (0-based, including header rows)
 * @param matchColIdx Column index (0-based, including A/B columns)
 * @param value Value to write (e.g., 'PAID')
 */
export async function updatePlayerPayment(
  playerRowIdx: number,
  matchColIdx: number,
  value: string,
) {
  const sheets = getSheetsWriteClient();
  const range = `${SHEET_NAME}!${columnToLetter(matchColIdx + 1)}${playerRowIdx + 1}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [[value]] },
  });
}

/**
 * Add a new match column (date/status) at the end.
 * @param date Match date string
 * @param status Status string
 */
export async function addMatchColumn(date: string, status: string) {
  const sheets = getSheetsWriteClient();
  // Fetch current data to determine where to insert
  const values = await fetchSheetData();
  if (!values || values.length < 3)
    throw new Error("Sheet data is missing match columns");
  const matchColCount = values[2].length - 2; // C+ columns
  const newColIdx = matchColCount + 2;
  // Update row 3 (dates/status)
  const dateCell = `${SHEET_NAME}!${columnToLetter(newColIdx + 1)}3`;
  const statusCell = `${SHEET_NAME}!${columnToLetter(newColIdx + 1)}4`;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      data: [
        { range: dateCell, values: [[date]] },
        { range: statusCell, values: [[status]] },
      ],
      valueInputOption: "RAW",
    },
  });
}

/**
 * Update a summary row (e.g., costs, rules, recaudado).
 * @param rowIdx Row index (0-based)
 * @param values Array of values to write
 */
export async function updateSummaryRow(rowIdx: number, values: string[]) {
  const sheets = getSheetsWriteClient();
  const range = `${SHEET_NAME}!A${rowIdx + 1}:${columnToLetter(values.length)}${rowIdx + 1}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [values] },
  });
}

// Helper: Convert column index (0-based) to letter (A, B, C...)
function columnToLetter(col: number): string {
  let temp = "";
  let n = col;
  while (n > 0) {
    const rem = (n - 1) % 26;
    temp = String.fromCharCode(65 + rem) + temp;
    n = Math.floor((n - 1) / 26);
  }
  return temp;
}

/**
 * List all match sheets (tabs) in the spreadsheet, excluding the master sheet.
 * Optionally, filter by a naming convention (e.g., YYYY-MM-DD or 'Match: ' prefix).
 */
export async function listMatchSheets(): Promise<sheets_v4.Schema$Sheet[]> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  // Exclude master sheet (assume first sheet is master, or filter by name)
  return (response.data.sheets || []).filter(
    (sheet) => sheet.properties?.title !== SHEET_NAME,
  );
}

/**
 * Create a new sheet for a match. Name is date-based (e.g., '2025-07-01').
 * Returns the new sheet's properties.
 */
export async function createMatchSheet(
  matchName: string,
): Promise<sheets_v4.Schema$SheetProperties> {
  const sheets = getSheetsWriteClient();
  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: matchName,
            },
          },
        },
      ],
    },
  });
  const sheetProps = response.data.replies?.[0]?.addSheet?.properties!;

  // Write header row: Name, Email, Paid
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${matchName}!A1:C1`,
    valueInputOption: "RAW",
    requestBody: { values: [["Name", "Email", "Paid"]] },
  });

  return sheetProps;
}

/**
 * Get all rows from a match sheet (by sheet name).
 */
export async function getMatchSheetData(
  sheetName: string,
): Promise<string[][]> {
  const sheets = getSheetsClient();
  const range = `${sheetName}`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  return response.data.values || [];
}

/**
 * Add or update a player row in a match sheet.
 * If player (by email) exists, update payment status; else, append new row.
 */
export async function addOrUpdatePlayerRow(
  sheetName: string,
  player: { name: string; email: string; paid: boolean },
) {
  const sheets = getSheetsWriteClient();
  const data = await getMatchSheetData(sheetName);
  // Assume header row: [Name, Email, Paid]
  const header = data[0] || [];
  const emailIdx = header.indexOf("Email");
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][emailIdx] === player.email) {
      // Update row
      const range = `${sheetName}!A${i + 1}:C${i + 1}`;
      const row = [player.name, player.email, player.paid ? "PAID" : "PENDING"];
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range,
        valueInputOption: "RAW",
        requestBody: { values: [row] },
      });
      found = true;
      break;
    }
  }
  if (!found) {
    // Append new row
    const range = `${sheetName}!A1:C1`;
    const row = [player.name, player.email, player.paid ? "PAID" : "PENDING"];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
  }
}
