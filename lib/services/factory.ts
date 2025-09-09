// Service factory for dependency injection

import { MatchService } from './match-service';
import { getRepositoryFactory, type AppRepositoryFactory } from '@/lib/repositories/factory';

export class ServiceFactory {
  public readonly matchService: MatchService;

  constructor(repositoryFactory?: AppRepositoryFactory) {
    const repos = repositoryFactory || getRepositoryFactory();
    
    this.matchService = new MatchService(
      repos.matches,
      repos.signups,
      repos.locations
    );
  }
}

// Global service factory instance
let serviceFactory: ServiceFactory | null = null;

/**
 * Get the global service factory instance
 */
export function getServiceFactory(): ServiceFactory {
  if (!serviceFactory) {
    serviceFactory = new ServiceFactory();
  }
  return serviceFactory;
}

/**
 * Reset the global service factory (useful for testing)
 */
export function resetServiceFactory(): void {
  serviceFactory = null;
}

/**
 * Create a service factory with specific repositories (useful for testing)
 */
export function createServiceFactory(repositoryFactory: AppRepositoryFactory): ServiceFactory {
  return new ServiceFactory(repositoryFactory);
}