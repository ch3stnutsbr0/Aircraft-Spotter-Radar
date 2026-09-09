import type { AircraftMovement } from "../../domain/src/index.ts";
import type { FlightAwareProbeDiagnostics } from "../../aviation-data/src/index.ts";
import { SPOTTER_REASON_LABELS } from "../../spotter-ranking/src/index.ts";
import {
  buildEnrichmentCoverage,
  buildScoreDistribution,
  rankScoredMovements,
  selectTopRankedAircraft,
} from "./analysis.ts";
import {
  formatFindResults,
  formatWindowEdgeSummary,
} from "./audit-terminal.ts";
import type {
  AuditedMovement,
  EnrichmentDataSource,
  ProbeWindow,
  ScoredSpotterInterestMovement,
} from "./types.ts";

function row(label: string, value: string | number): string {
  return label.padEnd(37) + String(value).padStart(10);
}

function coverageRow(label: string, present: number, total: number): string {
  const percent = total === 0 ? "n/a" : `${((present / total) * 100).toFixed(1)}%`;
  return label.padEnd(31)
    + `${present} / ${total}`.padStart(10)
    + percent.padStart(10);
}

function movementTime(movement: AircraftMovement): Date | null {
  return movement.movementType === "ARRIVAL"
    ? movement.scheduledArrivalTime ?? movement.estimatedArrivalTime
    : movement.scheduledDepartureTime ?? movement.estimatedDepartureTime;
}

function route(movement: AircraftMovement): string {
  return `${movement.originAirport ?? "?"} → ${movement.destinationAirport ?? "?"}`;
}

function sourceLabel(source: EnrichmentDataSource): string {
  return source === "MISSING" ? "MISSING (neutral default)" : source;
}

function dimensionLines(
  item: ScoredSpotterInterestMovement,
): string[] {
  const dimensions = item.spotterInterest.dimensions;
  return [
    row("Aircraft Notability", dimensions.notability.score),
    `  source: ${sourceLabel(item.sources.notability)}`,
    `  input tags: ${item.facts.notability.tags.join(", ") || "none / unavailable"}`,
    row("Global Type Rarity", dimensions.globalTypeRarity.score),
    `  source: ${sourceLabel(item.sources.globalTypeRarity)}`,
    `  reference variant: ${item.aircraftTypeNormalization.referenceVariant ?? "unavailable"}`,
    row("Local Type Rarity", dimensions.localTypeRarity.score),
    `  source: ${sourceLabel(item.sources.localTypeRarity)}`,
    `  airport reference: ${item.facts.localTypeRarity.airportCode}`,
    row("Registration Rarity", dimensions.registrationRarity.score),
    `  source: ${sourceLabel(item.sources.registrationRarity)}`,
  ];
}

function rankedMovementLines(
  item: ScoredSpotterInterestMovement,
  index: number,
): string[] {
  const movement = item.movement;
  const time = movementTime(movement);
  const reasons = item.spotterInterest.reasons.map((reason) =>
    SPOTTER_REASON_LABELS[reason]
  );

  return [
    `#${index + 1}`,
    `${movement.ident || "(missing ident)"}  ${movement.registration ?? "(registration unknown)"}  ${movement.aircraftType ?? "(type unknown)"}`,
    `${route(movement)}  ${movement.movementType}`,
    `Movement time: ${time?.toISOString() ?? "unavailable"}`,
    "Movement facts source: LIVE (FlightAware)",
    `Type normalization: ${item.aircraftTypeNormalization.status} — ${item.aircraftTypeNormalization.note}`,
    "",
    `Final Score: ${item.spotterInterest.score.toFixed(1)}`,
    `Classification: ${item.spotterInterest.classification}`,
    "",
    "Dimensions",
    "-----------------------------------------",
    ...dimensionLines(item),
    "",
    "Primary reasons",
    ...(reasons.length ? reasons.map((reason) => `- ${reason}`) : ["- None"]),
    "",
    "-----------------------------------------",
  ];
}

function routineSampleLines(
  movements: readonly ScoredSpotterInterestMovement[],
): string[] {
  const routine = rankScoredMovements(movements)
    .filter((item) => item.spotterInterest.classification === "ROUTINE")
    .reverse()
    .slice(0, 5);

  return routine.length
    ? routine.map((item) => {
        const movement = item.movement;
        return [
          movement.ident || "(missing ident)",
          movement.registration ?? "(registration unknown)",
          movement.aircraftType ?? "(type unknown)",
          `score ${item.spotterInterest.score.toFixed(1)}`,
        ].join("  ");
      })
    : ["No routine movements returned."];
}

export function formatSpotterInterestProbeReport({
  airport,
  start,
  end,
  top,
  movements,
  diagnostics,
  auditedMovements,
  window,
  find,
}: {
  airport: string;
  start: Date;
  end: Date;
  top: number;
  movements: readonly ScoredSpotterInterestMovement[];
  diagnostics: FlightAwareProbeDiagnostics;
  auditedMovements?: readonly AuditedMovement[];
  window?: ProbeWindow;
  find?: string | null;
}): string {
  const coverage = buildEnrichmentCoverage(movements);
  const distribution = buildScoreDistribution(movements);
  const topMovements = selectTopRankedAircraft(movements, top);
  const fetchedCount = auditedMovements?.length ?? movements.length;
  const primaryCount = auditedMovements
    ? auditedMovements.filter((audit) => audit.inPrimaryWindow).length
    : movements.length;
  const optionalWindowLines = window
    ? [
        `Fetch window (UTC): ${window.fetchStart.toISOString()} → ${window.fetchEnd.toISOString()}`,
        `Buffers: ${window.bufferBeforeMinutes} minutes before / ${window.bufferAfterMinutes} minutes after`,
      ]
    : [];
  const edgeLines = auditedMovements && window
    ? ["", ...formatWindowEdgeSummary(auditedMovements, window)]
    : [];
  const findLines = auditedMovements && find
    ? ["", ...formatFindResults({
        query: find,
        auditedMovements,
        scoredMovements: movements,
        top,
      })]
    : [];
  const lines = [
    "Real ATL Spotter Interest Probe",
    "",
    `Airport: ${airport}`,
    `Observed at (UTC): ${diagnostics.observedAt.toISOString()}`,
    "Primary window (UTC; start inclusive, end exclusive):",
    start.toISOString(),
    "→",
    end.toISOString(),
    ...optionalWindowLines,
    "",
    "Movement retrieval",
    "-----------------------------------------",
    row("Movements fetched", fetchedCount),
    row("Primary-window movements scored", primaryCount),
    row("Buffer/outside-primary movements", fetchedCount - primaryCount),
    row("Arrivals fetched", diagnostics.arrivalRecords),
    row("Departures fetched", diagnostics.departureRecords),
    row("Results truncated", diagnostics.resultsTruncated ? "yes" : "no"),
    row("Arrivals truncated", diagnostics.arrivalsTruncated ? "yes" : "no"),
    row("Departures truncated", diagnostics.departuresTruncated ? "yes" : "no"),
    row("Max pages per endpoint", diagnostics.maxPagesPerEndpoint),
    "",
    "Enrichment coverage (primary scored movements)",
    "-----------------------------------------",
    coverageRow("Notability reference match", coverage.matches.notability, coverage.total),
    coverageRow("Global type rarity match", coverage.matches.globalTypeRarity, coverage.total),
    coverageRow("Local type rarity match", coverage.matches.localTypeRarity, coverage.total),
    coverageRow("Registration history match", coverage.matches.registrationRarity, coverage.total),
    "",
    "Scoring input completeness",
    "-----------------------------------------",
    row("All 4 dimensions supported", coverage.supportedDimensionCounts.allFour),
    row("3 dimensions supported", coverage.supportedDimensionCounts.three),
    row("2 dimensions supported", coverage.supportedDimensionCounts.two),
    row("<2 dimensions supported", coverage.supportedDimensionCounts.fewerThanTwo),
    "",
    "Score distribution",
    "-----------------------------------------",
    row("0–<10", distribution.zeroToTen),
    row("10–<25", distribution.tenToTwentyFive),
    row("25–<40", distribution.twentyFiveToForty),
    row("40–<60", distribution.fortyToSixty),
    row("60+", distribution.sixtyPlus),
    row("Routine", distribution.classifications.ROUTINE),
    row("Interesting", distribution.classifications.INTERESTING),
    row("Spotlight", distribution.classifications.SPOTLIGHT),
    "",
    `Top ${topMovements.length} Spotter Interest (registration-deduplicated)`,
    "=========================================",
    "",
    ...(topMovements.length
      ? topMovements.flatMap(rankedMovementLines)
      : ["No primary-window movements were scored.", ""]),
    "Routine sample",
    "-----------------------------------------",
    ...routineSampleLines(movements),
    "",
    "Unmatched aircraft type codes",
    "-----------------------------------------",
    ...(coverage.unmatchedAircraftTypes.length
      ? coverage.unmatchedAircraftTypes.map(({ code, count }) => row(code, count))
      : ["No completely unmatched aircraft-type codes."]),
    "",
    "Registrations with no reference match (max 5)",
    "-----------------------------------------",
    ...(coverage.unmatchedRegistrations.length
      ? coverage.unmatchedRegistrations
      : ["No completely unmatched registrations."]),
    ...edgeLines,
    ...findLines,
    "",
    "API usage",
    "-----------------------------------------",
    row("Endpoint queries", diagnostics.endpointQueries),
    row("Actual HTTP requests", diagnostics.totalHttpRequests),
    row("Result pages", diagnostics.totalPages),
    row("Arrival result pages", diagnostics.arrivalPages),
    row("Departure result pages", diagnostics.departurePages),
    row("Results truncated", diagnostics.resultsTruncated ? "yes" : "no"),
    "",
    "Reference-data warning",
    "-----------------------------------------",
    "Movement identity, route, operator, movement type, and times are LIVE FlightAware facts.",
    "All four rarity/notability dimensions are either REFERENCE or MISSING; none is labeled live.",
    "Missing enrichment is scored with explicit neutral inputs and never fabricated as rare.",
  ];

  return lines.join("\n");
}
