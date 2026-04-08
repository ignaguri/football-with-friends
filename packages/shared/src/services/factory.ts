// Service factory for dependency injection

import { CourtService } from "./court-service";
import { MatchService } from "./match-service";
import { NotificationService } from "./notification-service";
import { PlayerStatsService } from "./player-stats-service";
import { RankingService } from "./ranking-service";
import { votingRepository } from "../repositories/voting-repository";
import {
  getRepositoryFactory,
  type AppRepositoryFactory,
} from "../repositories/factory";

export class ServiceFactory {
  public readonly matchService: MatchService;
  public readonly courtService: CourtService;
  public readonly playerStatsService: PlayerStatsService;
  public readonly rankingService: RankingService;
  public readonly notificationService: NotificationService;

  constructor(
    repositoryFactory?: AppRepositoryFactory,
    expoAccessToken?: string,
  ) {
    const repos = repositoryFactory || getRepositoryFactory();

    this.matchService = new MatchService(
      repos.matches,
      repos.signups,
      repos.locations,
      repos.courts,
    );
    this.courtService = new CourtService(repos.courts);
    this.playerStatsService = new PlayerStatsService(
      repos.playerStats,
      repos.matches,
      repos.signups,
    );
    this.rankingService = new RankingService(
      repos.playerStats,
      votingRepository,
    );
    this.notificationService = new NotificationService(
      repos.pushTokens,
      expoAccessToken,
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
    serviceFactory = new ServiceFactory(
      undefined,
      process.env.EXPO_ACCESS_TOKEN,
    );
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
export function createServiceFactory(
  repositoryFactory: AppRepositoryFactory,
): ServiceFactory {
  return new ServiceFactory(repositoryFactory);
}
