import type {
  AircraftMovement,
  AircraftNotabilityFacts,
  AircraftNotabilityTag,
  GlobalTypeRarityFacts,
  LocalTypeRarityFacts,
  RegistrationRarityFacts,
  RankableAircraftMovement,
  SpotterInterestFacts,
} from "../../domain/src/index.ts";

export type SpotterReason =
  | AircraftNotabilityTag
  | "GLOBALLY_UNCOMMON_TYPE"
  | "GLOBALLY_RARE_TYPE"
  | "EXTREMELY_RARE_TYPE"
  | "RARE_AT_HOME_AIRPORT"
  | "VERY_RARE_AT_HOME_AIRPORT"
  | "RARE_VISITOR"
  | "LONG_ABSENCE"
  | "FIRST_RECORDED_VISIT";

export interface ScoreResult {
  score: number;
  reasons: SpotterReason[];
  debug: Record<string, unknown>;
}

export interface SpotterInterestDimensions {
  notability: ScoreResult;
  globalTypeRarity: ScoreResult;
  localTypeRarity: ScoreResult;
  registrationRarity: ScoreResult;
}

export type SpotterInterestClassification =
  | "ROUTINE"
  | "INTERESTING"
  | "SPOTLIGHT";

export interface SpotterInterestResult {
  score: number;
  dimensions: SpotterInterestDimensions;
  weightedContributions: Record<keyof SpotterInterestDimensions, number>;
  reasons: SpotterReason[];
  classification: SpotterInterestClassification;
}

export type ScoredAircraftMovement = RankableAircraftMovement & {
  spotterInterest: SpotterInterestResult;
};

export interface SpotterDimensionScorer<TInput> {
  score(input: TInput): ScoreResult;
}

export type {
  AircraftMovement,
  AircraftNotabilityFacts,
  GlobalTypeRarityFacts,
  LocalTypeRarityFacts,
  RegistrationRarityFacts,
  RankableAircraftMovement,
  SpotterInterestFacts,
};
