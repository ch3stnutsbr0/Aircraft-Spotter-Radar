export { DailySpotlightService } from "./daily-spotlight-service.ts";
export { LegacyRuleRanker } from "./legacy-rule-ranker.ts";
export { DailySpotlightError, type DailySpotlightErrorCode } from "./errors.ts";
export { toDailySpotlightMovement } from "./live-view-adapter.ts";
export type {
  DailySpotlightDependencies,
  DailySpotlightMovement,
  DailySpotlightMovementBatch,
  DailySpotlightQuery,
  DailySpotlightResult,
  DailySpotlightSourceDiagnostics,
  MovementRanker,
  RankedMovement,
  RankerMetadata,
  RankingContext,
  RankingReason,
  RankingTier,
  SpotlightMovementView,
  SpotlightDataSource,
} from "./types.ts";
