import { readFile, stat } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import type {
  AircraftMovement,
  MovementStatus,
  MovementType,
} from "../../domain/src/index.ts";
import { buildEnrichmentCoverage, rankScoredMovements } from "./analysis.ts";
import { parseCsvObjects } from "./csv.ts";
import { scoreRealMovements } from "./spotter-interest-enricher.ts";
import { auditMovementWindows, buildProbeWindow } from "./window-analysis.ts";
import type {
  EnrichmentCoverage,
  ScoredSpotterInterestMovement,
} from "./types.ts";

const MOVEMENT_TYPES = new Set<MovementType>(["ARRIVAL", "DEPARTURE"]);
const MOVEMENT_STATUSES = new Set<MovementStatus>([
  "SCHEDULED",
  "DEPARTED",
  "ENROUTE",
  "ARRIVED",
  "CANCELLED",
  "DIVERTED",
  "UNKNOWN",
]);

interface AuditManifestInput {
  runId: string;
  airport: string;
  primaryWindowStart: string;
  primaryWindowEnd: string;
}

interface ExistingScore {
  providerFlightId: string;
  ident: string;
  score: number;
  classification: string;
}

export interface OfflineScoreChange {
  providerFlightId: string;
  ident: string;
  previousScore: number;
  currentScore: number;
  previousClassification: string;
  currentClassification: string;
}

export interface OfflineScoreComparison {
  matched: number;
  changed: OfflineScoreChange[];
  missing: string[];
  unexpected: string[];
  ambiguous: string[];
}

export interface OfflineRescoreResult {
  runId: string;
  airport: string;
  runDirectory: string;
  primaryMovements: number;
  coverage: EnrichmentCoverage;
  comparison: OfflineScoreComparison;
  scoredMovements: ScoredSpotterInterestMovement[];
}

function required(row: Record<string, string>, key: string, context: string): string {
  const value = row[key];
  if (value === undefined || value === "") {
    throw new Error(`${context}: required field '${key}' is missing.`);
  }
  return value;
}

function date(value: string, context: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${context}: invalid date '${value}'.`);
  return parsed;
}

function optionalDate(value: string | undefined, context: string): Date | null {
  return value ? date(value, context) : null;
}

function boolean(value: string, context: string): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${context}: expected true or false, received '${value}'.`);
}

function parseManifest(value: unknown): AuditManifestInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Invalid run.json: expected an object.");
  }
  const manifest = value as Record<string, unknown>;
  for (const field of [
    "runId",
    "airport",
    "primaryWindowStart",
    "primaryWindowEnd",
  ]) {
    if (typeof manifest[field] !== "string" || !manifest[field]) {
      throw new Error(`Invalid run.json: '${field}' must be a non-empty string.`);
    }
  }
  return manifest as unknown as AuditManifestInput;
}

function movementFromRow(
  row: Record<string, string>,
  index: number,
): AircraftMovement {
  const context = `movements.csv row ${index + 2}`;
  const movementType = required(row, "movement_type", context) as MovementType;
  const status = required(row, "status", context) as MovementStatus;
  if (!MOVEMENT_TYPES.has(movementType)) {
    throw new Error(`${context}: unknown movement type '${movementType}'.`);
  }
  if (!MOVEMENT_STATUSES.has(status)) {
    throw new Error(`${context}: unknown movement status '${status}'.`);
  }
  const provider = required(row, "provider", context);
  if (provider !== "flightaware" && provider !== "mock") {
    throw new Error(`${context}: unknown provider '${provider}'.`);
  }

  return {
    id: required(row, "movement_id", context),
    provider,
    providerFlightId: row.provider_flight_id ?? "",
    ident: row.ident ?? "",
    operatorIcao: row.operator_icao || null,
    registration: row.registration || null,
    aircraftType: row.aircraft_type || null,
    originAirport: row.origin_airport || null,
    destinationAirport: row.destination_airport || null,
    movementType,
    scheduledDepartureTime: optionalDate(
      row.scheduled_departure_time_utc,
      `${context} scheduled departure`,
    ),
    scheduledArrivalTime: optionalDate(
      row.scheduled_arrival_time_utc,
      `${context} scheduled arrival`,
    ),
    estimatedDepartureTime: optionalDate(
      row.estimated_departure_time_utc,
      `${context} estimated departure`,
    ),
    estimatedArrivalTime: optionalDate(
      row.estimated_arrival_time_utc,
      `${context} estimated arrival`,
    ),
    actualDepartureTime: optionalDate(
      row.actual_departure_time_utc,
      `${context} actual departure`,
    ),
    actualArrivalTime: optionalDate(
      row.actual_arrival_time_utc,
      `${context} actual arrival`,
    ),
    status,
    cancelled: boolean(required(row, "cancelled", context), `${context} cancelled`),
    diverted: boolean(required(row, "diverted", context), `${context} diverted`),
    providerStatus: row.provider_status || null,
    observedAt: date(required(row, "observed_at_utc", context), `${context} observed`),
    // The v0.1 movement audit did not persist lastUpdatedAt. It is not used by enrichment.
    lastUpdatedAt: null,
  };
}

function scoresFromCsv(contents: string): ExistingScore[] {
  return parseCsvObjects(contents).map((row, index) => {
    const context = `scores.csv row ${index + 2}`;
    const score = Number(required(row, "final_score", context));
    if (!Number.isFinite(score)) throw new Error(`${context}: final_score must be numeric.`);
    return {
      providerFlightId: row.provider_flight_id ?? "",
      ident: row.ident ?? "",
      score,
      classification: required(row, "classification", context),
    };
  });
}

function groupByProviderId<T>(
  values: readonly T[],
  select: (value: T) => string,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const key = select(value);
    const group = groups.get(key) ?? [];
    group.push(value);
    groups.set(key, group);
  }
  return groups;
}

export function compareOfflineScores(
  scoredMovements: readonly ScoredSpotterInterestMovement[],
  existingScores: readonly ExistingScore[],
): OfflineScoreComparison {
  const current = groupByProviderId(
    scoredMovements,
    (item) => item.movement.providerFlightId,
  );
  const previous = groupByProviderId(existingScores, (item) => item.providerFlightId);
  const ambiguous = new Set<string>();
  const missing: string[] = [];
  const unexpected: string[] = [];
  const changed: OfflineScoreChange[] = [];
  let matched = 0;

  for (const [providerFlightId, currentItems] of current) {
    const previousItems = previous.get(providerFlightId);
    if (!providerFlightId || currentItems.length !== 1 || (previousItems?.length ?? 0) > 1) {
      ambiguous.add(providerFlightId || "(empty provider flight id)");
      continue;
    }
    if (!previousItems?.length) {
      missing.push(providerFlightId);
      continue;
    }
    const item = currentItems[0];
    const prior = previousItems[0];
    if (
      item.spotterInterest.score === prior.score
      && item.spotterInterest.classification === prior.classification
    ) {
      matched += 1;
    } else {
      changed.push({
        providerFlightId,
        ident: item.movement.ident || prior.ident,
        previousScore: prior.score,
        currentScore: item.spotterInterest.score,
        previousClassification: prior.classification,
        currentClassification: item.spotterInterest.classification,
      });
    }
  }

  for (const [providerFlightId, previousItems] of previous) {
    if (!providerFlightId || previousItems.length !== 1) {
      ambiguous.add(providerFlightId || "(empty provider flight id)");
    } else if (!current.has(providerFlightId)) {
      unexpected.push(providerFlightId);
    }
  }

  return {
    matched,
    changed,
    missing: missing.sort(),
    unexpected: unexpected.sort(),
    ambiguous: [...ambiguous].sort(),
  };
}

async function auditDirectory(inputPath: string): Promise<string> {
  const absolute = resolve(inputPath);
  const inputStat = await stat(absolute);
  if (inputStat.isDirectory()) return absolute;
  if (inputStat.isFile() && basename(absolute) === "movements.csv") {
    return dirname(absolute);
  }
  throw new Error("Audit input must be a run directory or its movements.csv file.");
}

export async function rescoreAudit(inputPath: string): Promise<OfflineRescoreResult> {
  const runDirectory = await auditDirectory(inputPath);
  const [manifestContents, movementContents, scoreContents] = await Promise.all([
    readFile(join(runDirectory, "run.json"), "utf8"),
    readFile(join(runDirectory, "movements.csv"), "utf8"),
    readFile(join(runDirectory, "scores.csv"), "utf8"),
  ]);
  const manifest = parseManifest(JSON.parse(manifestContents));
  const window = buildProbeWindow({
    primaryStart: date(manifest.primaryWindowStart, "run.json primaryWindowStart"),
    primaryEnd: date(manifest.primaryWindowEnd, "run.json primaryWindowEnd"),
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
  });
  const movements = parseCsvObjects(movementContents).map(movementFromRow);
  const primaryMovements = auditMovementWindows(movements, window, manifest.airport)
    .filter((entry) => entry.inPrimaryWindow)
    .map((entry) => entry.movement);
  const scoredMovements = scoreRealMovements(primaryMovements, manifest.airport);
  const existingScores = scoresFromCsv(scoreContents);

  return {
    runId: manifest.runId,
    airport: manifest.airport,
    runDirectory,
    primaryMovements: primaryMovements.length,
    coverage: buildEnrichmentCoverage(scoredMovements),
    comparison: compareOfflineScores(scoredMovements, existingScores),
    scoredMovements,
  };
}

export function formatOfflineRescoreReport(result: OfflineRescoreResult): string {
  const coverage = result.coverage;
  const comparison = result.comparison;
  const lines = [
    "Offline rescore",
    `Run: ${result.runId}`,
    `Airport: ${result.airport}`,
    "",
    `Primary movements: ${result.primaryMovements}`,
    "",
    "Reference coverage:",
    `Global type: ${coverage.matches.globalTypeRarity}/${coverage.total}`,
    `Local type: ${coverage.matches.localTypeRarity}/${coverage.total}`,
    `Registration history: ${coverage.matches.registrationRarity}/${coverage.total}`,
    `Notability: ${coverage.matches.notability}/${coverage.total}`,
    `All dimensions: ${coverage.supportedDimensionCounts.allFour}/${coverage.total}`,
    "",
    "Score parity:",
    `Matched: ${comparison.matched}/${result.primaryMovements}`,
    `Changed: ${comparison.changed.length}`,
    `Missing: ${comparison.missing.length}`,
    `Unexpected: ${comparison.unexpected.length}`,
    `Ambiguous: ${comparison.ambiguous.length}`,
  ];

  if (comparison.changed.length) {
    lines.push("", "Changed scores:");
    for (const change of comparison.changed) {
      lines.push(
        `${change.ident || change.providerFlightId}: ${change.previousScore} ${change.previousClassification} -> ${change.currentScore} ${change.currentClassification}`,
      );
    }
  }
  if (comparison.ambiguous.length) {
    lines.push("", `Ambiguous provider IDs: ${comparison.ambiguous.join(", ")}`);
  }

  lines.push("", "Top scores:");
  for (const item of rankScoredMovements(result.scoredMovements).slice(0, 10)) {
    lines.push(
      `${item.movement.ident || item.movement.providerFlightId} | ${item.movement.aircraftType ?? "unknown type"} | ${item.movement.registration ?? "unknown registration"} | ${item.spotterInterest.score}`,
    );
  }
  return lines.join("\n");
}
