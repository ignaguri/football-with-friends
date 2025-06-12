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

// --- MASTER SHEET (METADATA) UTILS ---

export const MASTER_SHEET_NAME = "Master";

export interface MatchMetadata {
  matchId: string; // unique, e.g., UUID or timestamp
  sheetName: string; // tab name for the match (displayed as a hyperlink)
  sheetGid: string; // Google Sheets tab ID (gid)
  date: string; // ISO or DD-MM-YYYY
  time: string;
  courtNumber: string;
  status: string; // e.g., upcoming, cancelled, completed
  costCourt: string;
  costShirts: string;
}

const MASTER_HEADERS: (keyof MatchMetadata)[] = [
  "matchId",
  "sheetName",
  "sheetGid",
  "date",
  "time",
  "courtNumber",
  "status",
  "costCourt",
  "costShirts",
];

/**
 * Ensure the master sheet exists. If not, create it with correct headers.
 * Returns the sheet properties.
 */
export async function ensureMasterSheetExists(): Promise<sheets_v4.Schema$SheetProperties> {
  const sheets = getSheetsWriteClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const found = (meta.data.sheets || []).find(
    (s) => s.properties?.title === MASTER_SHEET_NAME,
  );
  if (found) return found.properties!;
  // Create the master sheet
  const resp = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title: MASTER_SHEET_NAME } } }],
    },
  });
  // Write header row
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${MASTER_SHEET_NAME}!A1:K1`,
    valueInputOption: "RAW",
    requestBody: { values: [MASTER_HEADERS] },
  });
  return resp.data.replies?.[0]?.addSheet?.properties!;
}

/**
 * Get all match metadata rows from the master sheet.
 */
export async function getAllMatchesMetadata(): Promise<MatchMetadata[]> {
  await ensureMasterSheetExists();
  const sheets = getSheetsClient();
  const range = `${MASTER_SHEET_NAME}`;
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  const rows = resp.data.values || [];
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: any = {};
    headers.forEach((h, i) => (obj[h] = row[i] ?? ""));
    return obj as MatchMetadata;
  });
}

/**
 * Add a new match metadata row to the master sheet, with sheetName as a clickable hyperlink to the tab.
 */
export async function addMatchMetadata(meta: MatchMetadata) {
  const sheets = getSheetsWriteClient();
  await ensureMasterSheetExists();
  // Write the sheetName as a HYPERLINK formula referencing the tab's gid
  const sheetNameFormula = `=HYPERLINK("#gid=${meta.sheetGid}", "${meta.sheetName}")`;
  const row = MASTER_HEADERS.map((h) =>
    h === "sheetName" ? sheetNameFormula : (meta[h] ?? ""),
  );
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${MASTER_SHEET_NAME}!A1:K1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

/**
 * Update a match metadata row by matchId.
 */
export async function updateMatchMetadata(
  matchId: string,
  updates: Partial<MatchMetadata>,
) {
  const sheets = getSheetsWriteClient();
  const all = await getAllMatchesMetadata();
  const idx = all.findIndex((m) => m.matchId === matchId);
  if (idx === -1) throw new Error("Match not found");
  const updated = { ...all[idx], ...updates };
  const row = MASTER_HEADERS.map((h) => updated[h] ?? "");
  const range = `${MASTER_SHEET_NAME}!A${idx + 2}:K${idx + 2}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
}

/**
 * Delete a match metadata row by matchId.
 */
export async function deleteMatchMetadata(matchId: string) {
  const sheets = getSheetsWriteClient();
  const all = await getAllMatchesMetadata();
  const idx = all.findIndex((m) => m.matchId === matchId);
  if (idx === -1) throw new Error("Match not found");
  // Delete the row (Google Sheets API: deleteDimension)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: (await ensureMasterSheetExists()).sheetId,
              dimension: "ROWS",
              startIndex: idx + 1, // skip header
              endIndex: idx + 2,
            },
          },
        },
      ],
    },
  });
}
