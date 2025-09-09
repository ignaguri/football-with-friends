// Repository factory for dependency injection and configuration

import type { RepositoryFactory } from './interfaces';
import {
  GoogleSheetsLocationRepository,
  GoogleSheetsMatchRepository,
  GoogleSheetsSignupRepository,
  GoogleSheetsMatchInvitationRepository,
} from './google-sheets-repositories';

// Configuration type
export type StorageProvider = 'google-sheets' | 'turso';

// Repository factory implementation
export class AppRepositoryFactory implements RepositoryFactory {
  public readonly locations: GoogleSheetsLocationRepository;
  public readonly matches: GoogleSheetsMatchRepository;
  public readonly signups: GoogleSheetsSignupRepository;
  public readonly invitations: GoogleSheetsMatchInvitationRepository;

  constructor(provider: StorageProvider = 'google-sheets') {
    switch (provider) {
      case 'google-sheets':
        this.locations = new GoogleSheetsLocationRepository();
        this.matches = new GoogleSheetsMatchRepository();
        this.signups = new GoogleSheetsSignupRepository();
        this.invitations = new GoogleSheetsMatchInvitationRepository();
        break;
      
      case 'turso':
        // TODO: Implement Turso repositories
        throw new Error('Turso repositories not yet implemented');
      
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
    const provider = (process.env.STORAGE_PROVIDER as StorageProvider) || 'google-sheets';
    repositoryFactory = new AppRepositoryFactory(provider);
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
export function createRepositoryFactory(provider: StorageProvider): AppRepositoryFactory {
  return new AppRepositoryFactory(provider);
}