import type {
  Aircraft,
  AircraftMovement,
  Flight,
  RunwayPrediction,
  SpotterInterestFacts,
} from "../../domain/src/index.ts";
import type { SpotterInterestResult } from "../../spotter-ranking/src/index.ts";
import type {
  AircraftTypeNormalization,
  EnrichmentDataSources,
} from "../../spotter-interest-integration/src/types.ts";

export type SpotlightDataSource = "MOCK" | "FLIGHTAWARE";

export type RankingTier = "ROUTINE" | "INTERESTING" | "SPOTLIGHT";

export interface RankingReason {
  code: string;
  label: string;
}

export interface RankingContext {
  airport: string;
  windowStart: Date;
  windowEnd: Date;
}

export interface RankerMetadata {
  [key: string]: unknown;
}

export interface SpotlightMovementView extends AircraftMovement {
  scheduledTime: string;
  estimatedTime: string;
  flight: Flight;
  aircraft: Aircraft;
  runwayPrediction?: RunwayPrediction;
  enrichmentSources?: EnrichmentDataSources;
  aircraftTypeNormalization?: AircraftTypeNormalization;
}

export interface RankedMovement {
  movement: SpotlightMovementView;
  rank: number;
  score: number;
  displayScore: number;
  tier: RankingTier;
  reasons: RankingReason[];
  rankerId: string;
  metadata?: RankerMetadata;
}

export interface MovementRanker {
  rank(
    movements: readonly AircraftMovement[],
    context: RankingContext,
  ): Promise<RankedMovement[]>;
}

export interface DailySpotlightMovement extends SpotlightMovementView {
  ranking: Omit<RankedMovement, "movement">;
  /** Legacy deterministic features, available only when that path supplies them. */
  spotterFacts?: SpotterInterestFacts;
  /** Present when the active ranker exposes the legacy rule scorer's debug result. */
  spotterInterest?: SpotterInterestResult;
  /** Compatibility alias for existing debug UI and audit output. */
  movementRank: number;
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
  ranker: MovementRanker;
  getMovements(query: DailySpotlightQuery): Promise<DailySpotlightMovementBatch>;
  afterFreshGeneration?(context: {
    query: DailySpotlightQuery;
    batch: DailySpotlightMovementBatch;
    scoredMovements: readonly DailySpotlightMovement[];
  }): Promise<void> | void;
}
