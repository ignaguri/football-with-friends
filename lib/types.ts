// Player status types for match participation
export const PLAYER_STATUSES = ["PAID", "PENDING", "CANCELLED"] as const;
export type PlayerStatus = (typeof PLAYER_STATUSES)[number];

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

export interface Match {
  matchId: string;
  name: string;
  date: string;
  time: string;
  status?: string;
  courtNumber?: string;
  costCourt?: string;
  costShirts?: string;
}
