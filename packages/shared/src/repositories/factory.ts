// Repository factory for dependency injection and configuration

import type {
  RepositoryFactory,
  LocationRepository,
  CourtRepository,
  MatchRepository,
  SignupRepository,
  MatchInvitationRepository,
  PlayerStatsRepository,
  PushTokenRepository,
} from "./interfaces";

import {
  TursoLocationRepository,
  TursoCourtRepository,
  TursoMatchRepository,
  TursoSignupRepository,
  TursoMatchInvitationRepository,
  TursoPlayerStatsRepository,
  TursoMatchMediaRepository,
} from "./turso-repositories";

import { TursoPushTokenRepository } from "./push-token-repository";
import {
  TursoGroupRepository,
  TursoGroupMembershipRepository,
  TursoGroupInviteRepository,
  TursoGroupRosterRepository,
  TursoGroupSettingsRepository,
} from "./group-repositories";

// Configuration type
export type StorageProvider = "turso" | "local-db";

// Repository factory implementation
export class AppRepositoryFactory implements RepositoryFactory {
  public readonly locations: LocationRepository;
  public readonly courts: CourtRepository;
  public readonly matches: MatchRepository;
  public readonly signups: SignupRepository;
  public readonly invitations: MatchInvitationRepository;
  public readonly playerStats: PlayerStatsRepository;
  public readonly pushTokens: PushTokenRepository;
  public readonly matchMedia: TursoMatchMediaRepository;
  public readonly groups: TursoGroupRepository;
  public readonly groupMembers: TursoGroupMembershipRepository;
  public readonly groupInvites: TursoGroupInviteRepository;
  public readonly groupRoster: TursoGroupRosterRepository;
  public readonly groupSettings: TursoGroupSettingsRepository;

  constructor(provider: StorageProvider = "turso") {
    switch (provider) {
      case "turso":
      case "local-db":
        this.locations = new TursoLocationRepository();
        this.courts = new TursoCourtRepository();
        this.matches = new TursoMatchRepository();
        this.signups = new TursoSignupRepository();
        this.invitations = new TursoMatchInvitationRepository();
        this.playerStats = new TursoPlayerStatsRepository();
        this.pushTokens = new TursoPushTokenRepository();
        this.matchMedia = new TursoMatchMediaRepository();
        this.groups = new TursoGroupRepository();
        this.groupMembers = new TursoGroupMembershipRepository();
        this.groupInvites = new TursoGroupInviteRepository();
        this.groupRoster = new TursoGroupRosterRepository();
        this.groupSettings = new TursoGroupSettingsRepository();
        break;

      default:
        throw new Error(`Unknown storage provider: ${provider}`);
    }
  }
}

// Global repository factory instance
let repositoryFactory: AppRepositoryFactory | null = null;

/**
 * Get the global repository factory instance
 */
export function getRepositoryFactory(): AppRepositoryFactory {
  if (!repositoryFactory) {
    // Import env here to avoid circular dependencies
    const { env } = require("../env");
    repositoryFactory = new AppRepositoryFactory(env.STORAGE_PROVIDER);
  }
  return repositoryFactory;
}

/**
 * Reset the global repository factory (useful for testing)
 */
export function resetRepositoryFactory(): void {
  repositoryFactory = null;
}

/**
 * Create a repository factory for a specific provider (useful for testing)
 */
export function createRepositoryFactory(
  provider: StorageProvider,
): AppRepositoryFactory {
  return new AppRepositoryFactory(provider);
}
