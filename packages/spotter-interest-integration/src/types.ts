import type {
  AircraftMovement,
  SpotterInterestFacts,
} from "../../domain/src/index.ts";
import type { SpotterInterestResult } from "../../spotter-ranking/src/index.ts";

export type EnrichmentDataSource = "LIVE" | "REFERENCE" | "MISSING";

export type EnrichmentDimension =
  | "notability"
  | "globalTypeRarity"
  | "localTypeRarity"
  | "registrationRarity";

export interface EnrichmentDataSources {
  movement: "LIVE";
  aircraftType: "LIVE" | "MISSING";
  registration: "LIVE" | "MISSING";
  notability: "REFERENCE" | "MISSING";
  globalTypeRarity: "REFERENCE" | "MISSING";
  localTypeRarity: "REFERENCE" | "MISSING";
  registrationRarity: "REFERENCE" | "MISSING";
}

export type AircraftTypeNormalizationStatus =
  | "MATCHED"
  | "AMBIGUOUS"
  | "UNKNOWN"
  | "MISSING";

export interface AircraftTypeNormalization {
  rawCode: string | null;
  referenceVariant: string | null;
  status: AircraftTypeNormalizationStatus;
  note: string;
}

export interface EnrichedSpotterInterestInput {
  movement: AircraftMovement;
  airportCode: string;
  facts: SpotterInterestFacts;
  sources: EnrichmentDataSources;
  aircraftTypeNormalization: AircraftTypeNormalization;
}

export interface ScoredSpotterInterestMovement
extends EnrichedSpotterInterestInput {
  spotterInterest: SpotterInterestResult;
}

export interface ScoreDistribution {
  zeroToTen: number;
  tenToTwentyFive: number;
  twentyFiveToForty: number;
  fortyToSixty: number;
  sixtyPlus: number;
  classifications: {
    ROUTINE: number;
    INTERESTING: number;
    SPOTLIGHT: number;
  };
}

export interface EnrichmentCoverage {
  total: number;
  matches: Record<EnrichmentDimension, number>;
  supportedDimensionCounts: {
    allFour: number;
    three: number;
    two: number;
    fewerThanTwo: number;
  };
  unmatchedAircraftTypes: Array<{ code: string; count: number }>;
  unmatchedRegistrations: string[];
}

export interface ProbeWindow {
  primaryStart: Date;
  primaryEnd: Date;
  fetchStart: Date;
  fetchEnd: Date;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  windowEndExclusive: true;
}

export interface AuditedMovement {
  movement: AircraftMovement;
  scheduledMovementTime: Date | null;
  scheduledMovementTimeLocal: string | null;
  inPrimaryWindow: boolean;
  minutesFromWindowStart: number | null;
  minutesToWindowEnd: number | null;
}

export interface ScoreAuditEntry {
  item: ScoredSpotterInterestMovement;
  movementRank: number;
  aircraftLevelRank: number | null;
  isTopN: boolean;
  supportedDimensionCount: number;
  enrichmentCompleteness: string;
}

export interface GitVersionMetadata {
  commit: string | null;
  branch: string | null;
  dirty: boolean | null;
}

export interface RunManifest {
  runId: string;
  airport: string;
  provider: "flightaware";
  observedAt: string;
  primaryWindowStart: string;
  primaryWindowEnd: string;
  windowEndExclusive: true;
  fetchWindowStart: string;
  fetchWindowEnd: string;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  maxPagesPerEndpoint: number;
  arrivalsFetched: number;
  departuresFetched: number;
  totalMovementsFetched: number;
  primaryWindowMovements: number;
  bufferOnlyMovements: number;
  httpRequests: number;
  arrivalPages: number;
  departurePages: number;
  resultPages: number;
  arrivalsTruncated: boolean;
  departuresTruncated: boolean;
  registrationCoverage: number | null;
  aircraftTypeCoverage: number | null;
  operatorCoverage: number | null;
  enrichmentCoverage: {
    notabilityReferenceMatches: number;
    globalTypeRarityReferenceMatches: number;
    localTypeRarityReferenceMatches: number;
    registrationHistoryReferenceMatches: number;
    allFourDimensionsSupported: number;
  };
  scoringVersion: "spotter-interest-v0.1";
  scoringConfig: {
    weights: {
      notability: number;
      globalTypeRarity: number;
      localTypeRarity: number;
      registrationRarity: number;
    };
    thresholds: {
      interesting: number;
      spotlight: number;
    };
    maximumSpotlightCount: number;
  };
  gitCommit: string | null;
  gitBranch: string | null;
  gitDirty: boolean | null;
}

export interface AuditBundle {
  runId: string;
  movementsCsv: string;
  scoresCsv: string;
  runJson: string;
}

export interface AuditWriteResult {
  runId: string;
  directory: string;
  files: ["movements.csv", "scores.csv", "run.json"];
}
