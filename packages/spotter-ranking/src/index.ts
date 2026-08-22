export { SPOTTER_INTEREST_V0_1_CONFIG } from "./config.ts";
export { SPOTTER_REASON_LABELS } from "./reasons.ts";
export { AircraftNotabilityScorer } from "./scorers/aircraft-notability-scorer.ts";
export { GlobalTypeRarityScorer } from "./scorers/global-type-rarity-scorer.ts";
export { LocalTypeRarityScorer } from "./scorers/local-type-rarity-scorer.ts";
export { RegistrationRarityScorer } from "./scorers/registration-rarity-scorer.ts";
export {
  SpotterInterestService,
  spotterInterestService,
} from "./spotter-interest-service.ts";
export {
  getSpotlightMovements,
  getSpotterScore,
  rankBySpotterInterest,
} from "./spotlight.ts";
export type {
  ScoreResult,
  ScoredAircraftMovement,
  SpotterDimensionScorer,
  SpotterInterestClassification,
  SpotterInterestDimensions,
  SpotterInterestResult,
  SpotterReason,
} from "./types.ts";
