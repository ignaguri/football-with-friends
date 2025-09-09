// Legacy types file - most types moved to lib/domain/types.ts
// This file is kept for backward compatibility during migration

// Re-export domain types for backward compatibility
export type {
  Location,
  Match,
  MatchDetails,
  MatchMetadata, // Legacy type kept for migration
  MatchStatus,
  PlayerStatus,
  Signup,
  User,
} from "@/lib/domain/types";
export {
  API_ERROR_KEYS,
  isApiErrorKey,
  MATCH_STATUSES,
  PLAYER_STATUSES,
} from "@/lib/domain/types";

// Re-export display types
export type {
  MatchDetailsDisplay,
  MatchDisplay,
  MatchMetaDisplay,
  PlayerDisplay,
  PlayerStats,
} from "@/lib/mappers/display-mappers";
