// Repository factory for dependency injection and configuration

import type {
  RepositoryFactory,
  LocationRepository,
  CourtRepository,
  MatchRepository,
  SignupRepository,
  MatchInvitationRepository,
} from "./interfaces";

import {
  GoogleSheetsLocationRepository,
  GoogleSheetsCourtRepository,
  GoogleSheetsMatchRepository,
  GoogleSheetsSignupRepository,
  GoogleSheetsMatchInvitationRepository,
} from "./google-sheets-repositories";
import {
  TursoLocationRepository,
  TursoCourtRepository,
  TursoMatchRepository,
  TursoSignupRepository,
  TursoMatchInvitationRepository,
} from "./turso-repositories";

// Configuration type
export type StorageProvider = "google-sheets" | "turso" | "local-db";

// Repository factory implementation
export class AppRepositoryFactory implements RepositoryFactory {
  public readonly locations: LocationRepository;
  public readonly courts: CourtRepository;
  public readonly matches: MatchRepository;
  public readonly signups: SignupRepository;
  public readonly invitations: MatchInvitationRepository;

  constructor(provider: StorageProvider = "google-sheets") {
    switch (provider) {
      case "google-sheets":
        this.locations = new GoogleSheetsLocationRepository();
        this.courts = new GoogleSheetsCourtRepository();
        this.matches = new GoogleSheetsMatchRepository();
        this.signups = new GoogleSheetsSignupRepository();
        this.invitations = new GoogleSheetsMatchInvitationRepository();
        break;

      case "turso":
      case "local-db":
        this.locations = new TursoLocationRepository();
        this.courts = new TursoCourtRepository();
        this.matches = new TursoMatchRepository();
        this.signups = new TursoSignupRepository();
        this.invitations = new TursoMatchInvitationRepository();
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

    const { env } = require("@/lib/env");
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
