export {
  buildEnrichmentCoverage,
  buildScoreDistribution,
  deduplicateRankedAircraft,
  rankScoredMovements,
  selectTopRankedAircraft,
} from "./analysis.ts";
export {
  buildRunManifest,
  createAuditBundle,
  createRunId,
  MOVEMENT_CSV_HEADERS,
  SCORE_CSV_HEADERS,
  serializeMovementAuditCsv,
  serializeScoreAuditCsv,
} from "./audit-serialization.ts";
export {
  DEFAULT_AUDIT_ROOT,
  saveAuditRun,
  type AuditStorage,
} from "./audit-writer.ts";
export { normalizeAircraftTypeCode } from "./aircraft-type-normalizer.ts";
export { escapeCsvValue, serializeCsv } from "./csv.ts";
export {
  readGitVersionMetadata,
  REPOSITORY_ROOT,
} from "./git-metadata.ts";
export { formatSpotterInterestProbeReport } from "./report.ts";
export { buildScoreAuditEntries } from "./score-audit.ts";
export {
  scoreRealMovements,
  SpotterInterestEnricher,
} from "./spotter-interest-enricher.ts";
export {
  auditMovementWindow,
  auditMovementWindows,
  buildProbeWindow,
  formatAirportLocalTime,
  getScheduledMovementTime,
} from "./window-analysis.ts";
export type {
  AircraftTypeNormalization,
  AircraftTypeNormalizationStatus,
  AuditedMovement,
  AuditBundle,
  AuditWriteResult,
  EnrichedSpotterInterestInput,
  EnrichmentCoverage,
  EnrichmentDataSource,
  EnrichmentDataSources,
  EnrichmentDimension,
  GitVersionMetadata,
  ProbeWindow,
  RunManifest,
  ScoreAuditEntry,
  ScoreDistribution,
  ScoredSpotterInterestMovement,
} from "./types.ts";
