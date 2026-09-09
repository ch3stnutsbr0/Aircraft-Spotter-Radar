import type { AircraftMovement } from "../../domain/src/index.ts";
import type { ScoredAircraftMovement } from "../../spotter-ranking/src/index.ts";
import type {
  AircraftTypeNormalization,
  EnrichmentDataSources,
} from "../../spotter-interest-integration/src/types.ts";

export type SpotlightDataSource = "MOCK" | "FLIGHTAWARE";

export interface DailySpotlightMovement extends ScoredAircraftMovement {
  enrichmentSources?: EnrichmentDataSources;
  aircraftTypeNormalization?: AircraftTypeNormalization;
  movementRank?: number;
}

export interface DailySpotlightQuery {
  airport: string;
  start: Date;
  end: Date;
  maxPages: number;
}

export interface DailySpotlightSourceDiagnostics {
  fetchedMovements: number;
  logicalEndpointQueries?: number;
  httpRequests?: number;
  pages?: number;
  truncated?: boolean;
}

export interface DailySpotlightMovementBatch {
  movements: AircraftMovement[];
  observedAt: Date;
  diagnostics: DailySpotlightSourceDiagnostics;
  providerContext?: unknown;
}

export interface DailySpotlightResult {
  airport: string;
  source: SpotlightDataSource;
  generatedAt: string;
  windowStart: string;
  windowEnd: string;
  movements: DailySpotlightMovement[];
  spotlightMovements: DailySpotlightMovement[];
  diagnostics: DailySpotlightSourceDiagnostics & {
    scoredMovements: number;
    spotlightMovements: number;
  };
}

export interface DailySpotlightDependencies {
  source: SpotlightDataSource;
  getMovements(query: DailySpotlightQuery): Promise<DailySpotlightMovementBatch>;
  enrichAndScore(
    movements: readonly AircraftMovement[],
    airport: string,
  ): Promise<DailySpotlightMovement[]> | DailySpotlightMovement[];
  afterFreshGeneration?(context: {
    query: DailySpotlightQuery;
    batch: DailySpotlightMovementBatch;
    scoredMovements: readonly DailySpotlightMovement[];
  }): Promise<void> | void;
}
