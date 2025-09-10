import { getGoogleSheetsEnv } from "@/lib/env";
import { google } from "googleapis";

import type { MatchMetadata } from "@/lib/types";
import type { sheets_v4 } from "googleapis";

// Lazy load environment variables to avoid build-time errors
let env: ReturnType<typeof getGoogleSheetsEnv> | null = null;
let SPREADSHEET_ID: string | null = null;

function getEnv() {
  if (!env) {
    env = getGoogleSheetsEnv();
    SPREADSHEET_ID = env.GOOGLE_SHEETS_ID;
  }
  return { env, SPREADSHEET_ID: SPREADSHEET_ID! };
}

function getSpreadsheetId(): string {
  return getEnv().SPREADSHEET_ID;
}

// Auth setup (service account)
function getSheetsClient() {
  const { env } = getEnv();
  return google.sheets({
    version: "v4",
    auth: new google.auth.GoogleAuth({
      credentials: {
        client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(
          /\\n/g,
          "\n",
        ),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    }),
  });
}

// --- WRITE HELPERS ---

// Use write scope for write operations
function getSheetsWriteClient() {
  const { env } = getEnv();
  return google.sheets({
    version: "v4",
    auth: new google.auth.GoogleAuth({
      credentials: {
        client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(
          /\\n/g,
          "\n",
        ),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    }),
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
    spreadsheetId: getSpreadsheetId(),
  });
  // Exclude master sheet (assume first sheet is master, or filter by name)
  return (response.data.sheets || []).filter(
    (sheet) => sheet.properties?.title !== MASTER_SHEET_NAME,
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
    spreadsheetId: getSpreadsheetId(),
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
  const sheetProps = response.data.replies?.[0]?.addSheet?.properties;
  if (!sheetProps) {
    throw new Error("Failed to create sheet - no properties returned");
  }

  // Write header row: Name, Email, Status
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${matchName}!A1:C1`,
    valueInputOption: "RAW",
    requestBody: { values: [["Name", "Email", "Status"]] },
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
    spreadsheetId: getSpreadsheetId(),
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
  player: {
    name: string;
    email: string;
    status: string;
    isGuest?: boolean;
    ownerEmail?: string;
    guestName?: string;
    ownerName?: string;
  },
) {
  const sheets = getSheetsWriteClient();
  const data = await getMatchSheetData(sheetName);
  // Ensure header has new columns
  const header = data[0] || [];
  let needsUpdate = false;
  if (!header.includes("IsGuest")) {
    header.push("IsGuest");
    needsUpdate = true;
  }
  if (!header.includes("OwnerEmail")) {
    header.push("OwnerEmail");
    needsUpdate = true;
  }
  if (!header.includes("GuestName")) {
    header.push("GuestName");
    needsUpdate = true;
  }
  if (needsUpdate) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSpreadsheetId(),
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [header] },
    });
  }
  // Map header indices
  const nameIdx = header.indexOf("Name");
  const emailIdx = header.indexOf("Email");
  const statusIdx = header.indexOf("Status");
  const isGuestIdx = header.indexOf("IsGuest");
  const ownerEmailIdx = header.indexOf("OwnerEmail");
  const guestNameIdx = header.indexOf("GuestName");
  // Compose row
  const row: string[] = Array(header.length).fill("");
  row[nameIdx] = player.name;
  row[emailIdx] = player.email;
  row[statusIdx] = player.status;
  row[isGuestIdx] = player.isGuest ? "1" : "0";
  row[ownerEmailIdx] = player.ownerEmail || "";
  row[guestNameIdx] = player.guestName || "";
  // For guests, always append; for users, update or append
  if (player.isGuest) {
    const range = `${sheetName}!A1`;
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId(),
      range,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
  } else {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIdx] === player.email) {
        // Update row
        const lastColLetter = columnToLetter(header.length);
        const range = `${sheetName}!A${i + 1}:${lastColLetter}${i + 1}`;
        await sheets.spreadsheets.values.update({
          spreadsheetId: getSpreadsheetId(),
          range,
          valueInputOption: "RAW",
          requestBody: { values: [row] },
        });
        found = true;
        break;
      }
    }
    if (!found) {
      const range = `${sheetName}!A1`;
      await sheets.spreadsheets.values.append({
        spreadsheetId: getSpreadsheetId(),
        range,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [row] },
      });
    }
  }
}

// --- MASTER SHEET (METADATA) UTILS ---

export const MASTER_SHEET_NAME = "Master";

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
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
  });
  const found = (meta.data.sheets || []).find(
    (s) => s.properties?.title === MASTER_SHEET_NAME,
  );
  if (found) return found.properties!;
  // Create the master sheet
  const resp = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      requests: [{ addSheet: { properties: { title: MASTER_SHEET_NAME } } }],
    },
  });
  // Write header row
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${MASTER_SHEET_NAME}!A1:K1`,
    valueInputOption: "RAW",
    requestBody: { values: [MASTER_HEADERS] },
  });
  const properties = resp.data.replies?.[0]?.addSheet?.properties;
  if (!properties) {
    throw new Error("Failed to create sheet - no properties returned");
  }
  return properties;
}

/**
 * Get all match metadata rows from the master sheet.
 */
export async function getAllMatchesMetadata(): Promise<MatchMetadata[]> {
  await ensureMasterSheetExists();
  const sheets = getSheetsClient();
  const range = `${MASTER_SHEET_NAME}`;
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range,
  });
  const rows = resp.data.values || [];
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = row[i] ?? ""));
    return obj as unknown as MatchMetadata;
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
    spreadsheetId: getSpreadsheetId(),
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
    spreadsheetId: getSpreadsheetId(),
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
    spreadsheetId: getSpreadsheetId(),
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

/**
 * Get match metadata by matchId.
 */
export async function getMatchMetadataById(
  matchId: string,
): Promise<MatchMetadata | null> {
  const all = await getAllMatchesMetadata();
  return all.find((m) => m.matchId === matchId) || null;
}

/**
 * Get the sheet/tab name by sheetId (sheetGid).
 */
export async function getSheetNameById(
  sheetId: string,
): Promise<string | null> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
  });
  const sheet = (response.data.sheets || []).find(
    (s) => s.properties?.sheetId?.toString() === sheetId,
  );
  return sheet?.properties?.title || null;
}
