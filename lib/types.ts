// Player status types for match participation
export const PLAYER_STATUSES = ["PAID", "PENDING", "CANCELLED"] as const;

export type PlayerStatus = (typeof PLAYER_STATUSES)[number];
