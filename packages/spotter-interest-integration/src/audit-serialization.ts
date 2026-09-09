import type { AircraftMovement } from "../../domain/src/index.ts";
import type { FlightAwareProbeDiagnostics } from "../../aviation-data/src/index.ts";
import { SPOTTER_INTEREST_V0_1_CONFIG } from "../../spotter-ranking/src/index.ts";
import { buildEnrichmentCoverage } from "./analysis.ts";
import { serializeCsv, type CsvValue } from "./csv.ts";
import { buildScoreAuditEntries } from "./score-audit.ts";
import type {
  AuditBundle,
  AuditedMovement,
  GitVersionMetadata,
  ProbeWindow,
  RunManifest,
  ScoredSpotterInterestMovement,
} from "./types.ts";

export const MOVEMENT_CSV_HEADERS = [
  "run_id",
  "movement_id",
  "provider",
  "provider_flight_id",
  "ident",
  "operator_icao",
  "registration",
  "aircraft_type",
  "origin_airport",
  "destination_airport",
  "movement_type",
  "scheduled_departure_time_utc",
  "scheduled_arrival_time_utc",
  "estimated_departure_time_utc",
  "estimated_arrival_time_utc",
  "actual_departure_time_utc",
  "actual_arrival_time_utc",
  "scheduled_movement_time_utc",
  "scheduled_movement_time_local",
  "observed_at_utc",
  "requested_window_start_utc",
  "requested_window_end_utc",
  "window_end_exclusive",
  "in_primary_window",
  "minutes_from_window_start",
  "minutes_to_window_end",
  "status",
  "provider_status",
  "cancelled",
  "diverted",
] as const;

export const SCORE_CSV_HEADERS = [
  "run_id",
  "provider_flight_id",
  "ident",
  "operator_icao",
  "registration",
  "aircraft_type",
  "origin_airport",
  "destination_airport",
  "movement_type",
  "scheduled_movement_time_utc",
  "in_primary_window",
  "final_score",
  "classification",
  "movement_rank",
  "aircraft_level_rank",
  "is_top_n",
  "is_spotlight",
  "notability_score",
  "global_type_rarity_score",
  "local_type_rarity_score",
  "registration_rarity_score",
  "notability_source",
  "global_type_rarity_source",
  "local_type_rarity_source",
  "registration_rarity_source",
  "notability_reasons",
  "global_type_rarity_reasons",
  "local_type_rarity_reasons",
  "registration_rarity_reasons",
  "supported_dimension_count",
  "enrichment_completeness",
  "manual_expected_priority",
  "manual_should_be_top10",
  "manual_expected_rank",
  "manual_notes",
  "reviewed_at",
] as const;

function iso(value: Date | null): string {
  return value?.toISOString() ?? "";
}

function decimal(value: number | null): string {
  if (value === null) return "";
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
}

function percent(
  movements: readonly AircraftMovement[],
  select: (movement: AircraftMovement) => unknown,
): number | null {
  if (movements.length === 0) return null;
  const present = movements.filter((movement) => {
    const value = select(movement);
    return typeof value === "string" ? value.trim().length > 0 : value != null;
  }).length;
  return Number(((present / movements.length) * 100).toFixed(4));
}

export function createRunId(observedAt: Date, airport: string): string {
  const timestamp = observedAt.toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replaceAll(":", "");
  const safeAirport = airport.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "-");
  return `${timestamp}_${safeAirport}`;
}

export function serializeMovementAuditCsv(
  runId: string,
  auditedMovements: readonly AuditedMovement[],
  window: ProbeWindow,
): string {
  const rows = auditedMovements.map((audit) => {
    const movement = audit.movement;
    return {
      run_id: runId,
      movement_id: movement.id,
      provider: movement.provider,
      provider_flight_id: movement.providerFlightId,
      ident: movement.ident,
      operator_icao: movement.operatorIcao,
      registration: movement.registration,
      aircraft_type: movement.aircraftType,
      origin_airport: movement.originAirport,
      destination_airport: movement.destinationAirport,
      movement_type: movement.movementType,
      scheduled_departure_time_utc: iso(movement.scheduledDepartureTime),
      scheduled_arrival_time_utc: iso(movement.scheduledArrivalTime),
      estimated_departure_time_utc: iso(movement.estimatedDepartureTime),
      estimated_arrival_time_utc: iso(movement.estimatedArrivalTime),
      actual_departure_time_utc: iso(movement.actualDepartureTime),
      actual_arrival_time_utc: iso(movement.actualArrivalTime),
      scheduled_movement_time_utc: iso(audit.scheduledMovementTime),
      scheduled_movement_time_local: audit.scheduledMovementTimeLocal,
      observed_at_utc: movement.observedAt.toISOString(),
      requested_window_start_utc: window.primaryStart.toISOString(),
      requested_window_end_utc: window.primaryEnd.toISOString(),
      window_end_exclusive: true,
      in_primary_window: audit.inPrimaryWindow,
      minutes_from_window_start: decimal(audit.minutesFromWindowStart),
      minutes_to_window_end: decimal(audit.minutesToWindowEnd),
      status: movement.status,
      provider_status: movement.providerStatus,
      cancelled: movement.cancelled,
      diverted: movement.diverted,
    } satisfies Record<(typeof MOVEMENT_CSV_HEADERS)[number], CsvValue>;
  });

  return serializeCsv(MOVEMENT_CSV_HEADERS, rows);
}

export function serializeScoreAuditCsv(
  runId: string,
  scoredMovements: readonly ScoredSpotterInterestMovement[],
  auditedMovements: readonly AuditedMovement[],
  top: number,
): string {
  const auditByMovement = new Map(
    auditedMovements.map((audit) => [audit.movement, audit]),
  );
  const rows = buildScoreAuditEntries(scoredMovements, top).map((entry) => {
    const item = entry.item;
    const movement = item.movement;
    const audit = auditByMovement.get(movement);
    const dimensions = item.spotterInterest.dimensions;

    return {
      run_id: runId,
      provider_flight_id: movement.providerFlightId,
      ident: movement.ident,
      operator_icao: movement.operatorIcao,
      registration: movement.registration,
      aircraft_type: movement.aircraftType,
      origin_airport: movement.originAirport,
      destination_airport: movement.destinationAirport,
      movement_type: movement.movementType,
      scheduled_movement_time_utc: iso(audit?.scheduledMovementTime ?? null),
      in_primary_window: audit?.inPrimaryWindow ?? false,
      final_score: item.spotterInterest.score,
      classification: item.spotterInterest.classification,
      movement_rank: entry.movementRank,
      aircraft_level_rank: entry.aircraftLevelRank,
      is_top_n: entry.isTopN,
      is_spotlight: item.spotterInterest.classification === "SPOTLIGHT",
      notability_score: dimensions.notability.score,
      global_type_rarity_score: dimensions.globalTypeRarity.score,
      local_type_rarity_score: dimensions.localTypeRarity.score,
      registration_rarity_score: dimensions.registrationRarity.score,
      notability_source: item.sources.notability,
      global_type_rarity_source: item.sources.globalTypeRarity,
      local_type_rarity_source: item.sources.localTypeRarity,
      registration_rarity_source: item.sources.registrationRarity,
      notability_reasons: dimensions.notability.reasons.join("|"),
      global_type_rarity_reasons: dimensions.globalTypeRarity.reasons.join("|"),
      local_type_rarity_reasons: dimensions.localTypeRarity.reasons.join("|"),
      registration_rarity_reasons: dimensions.registrationRarity.reasons.join("|"),
      supported_dimension_count: entry.supportedDimensionCount,
      enrichment_completeness: entry.enrichmentCompleteness,
      manual_expected_priority: "",
      manual_should_be_top10: "",
      manual_expected_rank: "",
      manual_notes: "",
      reviewed_at: "",
    } satisfies Record<(typeof SCORE_CSV_HEADERS)[number], CsvValue>;
  });

  return serializeCsv(SCORE_CSV_HEADERS, rows);
}

export function buildRunManifest({
  runId,
  airport,
  window,
  auditedMovements,
  scoredMovements,
  diagnostics,
  git,
}: {
  runId: string;
  airport: string;
  window: ProbeWindow;
  auditedMovements: readonly AuditedMovement[];
  scoredMovements: readonly ScoredSpotterInterestMovement[];
  diagnostics: FlightAwareProbeDiagnostics;
  git: GitVersionMetadata;
}): RunManifest {
  const movements = auditedMovements.map((audit) => audit.movement);
  const primaryWindowMovements = auditedMovements.filter(
    (audit) => audit.inPrimaryWindow,
  ).length;
  const enrichment = buildEnrichmentCoverage(scoredMovements);

  return {
    runId,
    airport,
    provider: "flightaware",
    observedAt: diagnostics.observedAt.toISOString(),
    primaryWindowStart: window.primaryStart.toISOString(),
    primaryWindowEnd: window.primaryEnd.toISOString(),
    windowEndExclusive: true,
    fetchWindowStart: window.fetchStart.toISOString(),
    fetchWindowEnd: window.fetchEnd.toISOString(),
    bufferBeforeMinutes: window.bufferBeforeMinutes,
    bufferAfterMinutes: window.bufferAfterMinutes,
    maxPagesPerEndpoint: diagnostics.maxPagesPerEndpoint,
    arrivalsFetched: diagnostics.arrivalRecords,
    departuresFetched: diagnostics.departureRecords,
    totalMovementsFetched: movements.length,
    primaryWindowMovements,
    bufferOnlyMovements: movements.length - primaryWindowMovements,
    httpRequests: diagnostics.totalHttpRequests,
    arrivalPages: diagnostics.arrivalPages,
    departurePages: diagnostics.departurePages,
    resultPages: diagnostics.totalPages,
    arrivalsTruncated: diagnostics.arrivalsTruncated,
    departuresTruncated: diagnostics.departuresTruncated,
    registrationCoverage: percent(movements, (movement) => movement.registration),
    aircraftTypeCoverage: percent(movements, (movement) => movement.aircraftType),
    operatorCoverage: percent(movements, (movement) => movement.operatorIcao),
    enrichmentCoverage: {
      notabilityReferenceMatches: enrichment.matches.notability,
      globalTypeRarityReferenceMatches: enrichment.matches.globalTypeRarity,
      localTypeRarityReferenceMatches: enrichment.matches.localTypeRarity,
      registrationHistoryReferenceMatches: enrichment.matches.registrationRarity,
      allFourDimensionsSupported: enrichment.supportedDimensionCounts.allFour,
    },
    scoringVersion: "spotter-interest-v0.1",
    scoringConfig: {
      weights: { ...SPOTTER_INTEREST_V0_1_CONFIG.weights },
      thresholds: { ...SPOTTER_INTEREST_V0_1_CONFIG.thresholds },
      maximumSpotlightCount:
        SPOTTER_INTEREST_V0_1_CONFIG.maximumSpotlightCount,
    },
    gitCommit: git.commit,
    gitBranch: git.branch,
    gitDirty: git.dirty,
  };
}

export function createAuditBundle({
  runId,
  airport,
  window,
  auditedMovements,
  scoredMovements,
  diagnostics,
  git,
  top,
}: {
  runId: string;
  airport: string;
  window: ProbeWindow;
  auditedMovements: readonly AuditedMovement[];
  scoredMovements: readonly ScoredSpotterInterestMovement[];
  diagnostics: FlightAwareProbeDiagnostics;
  git: GitVersionMetadata;
  top: number;
}): AuditBundle {
  const manifest = buildRunManifest({
    runId,
    airport,
    window,
    auditedMovements,
    scoredMovements,
    diagnostics,
    git,
  });

  return {
    runId,
    movementsCsv: serializeMovementAuditCsv(runId, auditedMovements, window),
    scoresCsv: serializeScoreAuditCsv(
      runId,
      scoredMovements,
      auditedMovements,
      top,
    ),
    runJson: JSON.stringify(manifest, null, 2) + "\n",
  };
}
