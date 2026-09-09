import type {
  AircraftMovement,
  MovementStatus,
  MovementType,
} from "../../domain/src/index.ts";
import type { FlightAwareProbeDiagnostics } from "./flightaware/flightaware-aviation-data-provider.ts";

const HOUR_MS = 60 * 60 * 1_000;
const STATUSES: MovementStatus[] = [
  "SCHEDULED",
  "DEPARTED",
  "ENROUTE",
  "ARRIVED",
  "CANCELLED",
  "DIVERTED",
  "UNKNOWN",
];

export type TimeToMovementBucket =
  | "PAST_DUE"
  | "ZERO_TO_THREE_HOURS"
  | "THREE_TO_SIX_HOURS"
  | "SIX_TO_TWELVE_HOURS"
  | "TWELVE_TO_TWENTY_FOUR_HOURS"
  | "TWENTY_FOUR_TO_FORTY_EIGHT_HOURS"
  | "FORTY_EIGHT_HOURS_PLUS"
  | "UNAVAILABLE";

export type MovementTimeSource =
  | "SCHEDULED"
  | "ESTIMATED_FALLBACK"
  | "UNAVAILABLE";

export interface MovementTimeSelection {
  time: Date | null;
  source: MovementTimeSource;
}

export interface FieldCoverage {
  present: number;
  percent: number | null;
}

export interface TimeBucketCoverage {
  bucket: TimeToMovementBucket;
  label: string;
  total: number;
  withRegistration: number;
  registrationCoverage: FieldCoverage;
  withAircraftType: number;
  aircraftTypeCoverage: FieldCoverage;
}

export interface FutureRegistrationSample {
  movement: AircraftMovement;
  timeToMovementMs: number;
  timeSource: MovementTimeSource;
}

export interface MovementCoverageReport {
  observedAt: Date;
  arrivals: number;
  departures: number;
  total: number;
  coverage: {
    providerFlightId: FieldCoverage;
    ident: FieldCoverage;
    originAirport: FieldCoverage;
    destinationAirport: FieldCoverage;
    aircraftType: FieldCoverage;
    registration: FieldCoverage;
    scheduledArrivalTime: FieldCoverage;
    scheduledDepartureTime: FieldCoverage;
    estimatedArrivalTime: FieldCoverage;
    estimatedDepartureTime: FieldCoverage;
    actualArrivalTime: FieldCoverage;
    actualDepartureTime: FieldCoverage;
    operatorIcao: FieldCoverage;
  };
  registrationByMovementType: Record<
    "ALL" | MovementType,
    FieldCoverage
  >;
  timeBuckets: TimeBucketCoverage[];
  movementTimeSources: Record<MovementTimeSource, number>;
  statuses: Record<MovementStatus, number>;
  missingRegistration: number;
  missingAircraftType: number;
  missingProviderFlightId: number;
  duplicateProviderIds: string[];
  topAircraftTypes: Array<{ code: string; count: number }>;
  samplesMissingRegistration: AircraftMovement[];
  farthestFutureWithRegistration: FutureRegistrationSample[];
}

const BUCKETS: Array<{
  bucket: TimeToMovementBucket;
  label: string;
}> = [
  { bucket: "PAST_DUE", label: "Past / due" },
  { bucket: "ZERO_TO_THREE_HOURS", label: "0–3h" },
  { bucket: "THREE_TO_SIX_HOURS", label: "3–6h" },
  { bucket: "SIX_TO_TWELVE_HOURS", label: "6–12h" },
  { bucket: "TWELVE_TO_TWENTY_FOUR_HOURS", label: "12–24h" },
  { bucket: "TWENTY_FOUR_TO_FORTY_EIGHT_HOURS", label: "24–48h" },
  { bucket: "FORTY_EIGHT_HOURS_PLUS", label: "48h+" },
  { bucket: "UNAVAILABLE", label: "Unavailable" },
];

function isValidDate(value: Date | null): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function isPresent(value: unknown): boolean {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }
  return typeof value === "string" ? value.trim().length > 0 : value != null;
}

function fieldCoverage(
  movements: AircraftMovement[],
  select: (movement: AircraftMovement) => unknown,
): FieldCoverage {
  const present = movements.filter((movement) =>
    isPresent(select(movement))
  ).length;

  return {
    present,
    percent: movements.length === 0
      ? null
      : (present / movements.length) * 100,
  };
}

function coverageFromCounts(present: number, total: number): FieldCoverage {
  return {
    present,
    percent: total === 0 ? null : (present / total) * 100,
  };
}

export function selectMovementTime(
  movement: AircraftMovement,
): MovementTimeSelection {
  const scheduled = movement.movementType === "ARRIVAL"
    ? movement.scheduledArrivalTime
    : movement.scheduledDepartureTime;

  if (isValidDate(scheduled)) {
    return { time: scheduled, source: "SCHEDULED" };
  }

  const estimated = movement.movementType === "ARRIVAL"
    ? movement.estimatedArrivalTime
    : movement.estimatedDepartureTime;

  if (isValidDate(estimated)) {
    return { time: estimated, source: "ESTIMATED_FALLBACK" };
  }

  return { time: null, source: "UNAVAILABLE" };
}

export function classifyTimeToMovement(
  timeToMovementMs: number | null,
): TimeToMovementBucket {
  if (timeToMovementMs === null || Number.isNaN(timeToMovementMs)) {
    return "UNAVAILABLE";
  }
  if (timeToMovementMs <= 0) {
    return "PAST_DUE";
  }
  if (timeToMovementMs < 3 * HOUR_MS) {
    return "ZERO_TO_THREE_HOURS";
  }
  if (timeToMovementMs < 6 * HOUR_MS) {
    return "THREE_TO_SIX_HOURS";
  }
  if (timeToMovementMs < 12 * HOUR_MS) {
    return "SIX_TO_TWELVE_HOURS";
  }
  if (timeToMovementMs < 24 * HOUR_MS) {
    return "TWELVE_TO_TWENTY_FOUR_HOURS";
  }
  if (timeToMovementMs < 48 * HOUR_MS) {
    return "TWENTY_FOUR_TO_FORTY_EIGHT_HOURS";
  }
  return "FORTY_EIGHT_HOURS_PLUS";
}

export function buildMovementCoverageReport(
  movements: AircraftMovement[],
  observedAt = movements[0]?.observedAt ?? new Date(0),
  sampleSize = 5,
): MovementCoverageReport {
  const providerIdCounts = new Map<string, number>();
  const aircraftTypeCounts = new Map<string, number>();
  const statuses = Object.fromEntries(
    STATUSES.map((status) => [status, 0]),
  ) as Record<MovementStatus, number>;
  const movementTimeSources: Record<MovementTimeSource, number> = {
    SCHEDULED: 0,
    ESTIMATED_FALLBACK: 0,
    UNAVAILABLE: 0,
  };
  const analyses = movements.map((movement) => {
    const selection = selectMovementTime(movement);
    movementTimeSources[selection.source] += 1;
    const timeToMovementMs = selection.time
      ? selection.time.getTime() - observedAt.getTime()
      : null;

    return {
      movement,
      selection,
      timeToMovementMs,
      bucket: classifyTimeToMovement(timeToMovementMs),
    };
  });

  for (const movement of movements) {
    statuses[movement.status] += 1;

    if (movement.providerFlightId) {
      providerIdCounts.set(
        movement.providerFlightId,
        (providerIdCounts.get(movement.providerFlightId) ?? 0) + 1,
      );
    }

    if (movement.aircraftType) {
      aircraftTypeCounts.set(
        movement.aircraftType,
        (aircraftTypeCounts.get(movement.aircraftType) ?? 0) + 1,
      );
    }
  }

  const arrivals = movements.filter((movement) =>
    movement.movementType === "ARRIVAL"
  );
  const departures = movements.filter((movement) =>
    movement.movementType === "DEPARTURE"
  );
  const timeBuckets = BUCKETS.map(({ bucket, label }) => {
    const bucketMovements = analyses
      .filter((analysis) => analysis.bucket === bucket)
      .map((analysis) => analysis.movement);
    const withRegistration = bucketMovements.filter((movement) =>
      Boolean(movement.registration)
    ).length;
    const withAircraftType = bucketMovements.filter((movement) =>
      Boolean(movement.aircraftType)
    ).length;

    return {
      bucket,
      label,
      total: bucketMovements.length,
      withRegistration,
      registrationCoverage: coverageFromCounts(
        withRegistration,
        bucketMovements.length,
      ),
      withAircraftType,
      aircraftTypeCoverage: coverageFromCounts(
        withAircraftType,
        bucketMovements.length,
      ),
    };
  });

  return {
    observedAt: new Date(observedAt),
    arrivals: arrivals.length,
    departures: departures.length,
    total: movements.length,
    coverage: {
      providerFlightId: fieldCoverage(
        movements,
        (movement) => movement.providerFlightId,
      ),
      ident: fieldCoverage(movements, (movement) => movement.ident),
      originAirport: fieldCoverage(
        movements,
        (movement) => movement.originAirport,
      ),
      destinationAirport: fieldCoverage(
        movements,
        (movement) => movement.destinationAirport,
      ),
      aircraftType: fieldCoverage(
        movements,
        (movement) => movement.aircraftType,
      ),
      registration: fieldCoverage(
        movements,
        (movement) => movement.registration,
      ),
      scheduledArrivalTime: fieldCoverage(
        movements,
        (movement) => movement.scheduledArrivalTime,
      ),
      scheduledDepartureTime: fieldCoverage(
        movements,
        (movement) => movement.scheduledDepartureTime,
      ),
      estimatedArrivalTime: fieldCoverage(
        movements,
        (movement) => movement.estimatedArrivalTime,
      ),
      estimatedDepartureTime: fieldCoverage(
        movements,
        (movement) => movement.estimatedDepartureTime,
      ),
      actualArrivalTime: fieldCoverage(
        movements,
        (movement) => movement.actualArrivalTime,
      ),
      actualDepartureTime: fieldCoverage(
        movements,
        (movement) => movement.actualDepartureTime,
      ),
      operatorIcao: fieldCoverage(
        movements,
        (movement) => movement.operatorIcao,
      ),
    },
    registrationByMovementType: {
      ALL: fieldCoverage(movements, (movement) => movement.registration),
      ARRIVAL: fieldCoverage(arrivals, (movement) => movement.registration),
      DEPARTURE: fieldCoverage(
        departures,
        (movement) => movement.registration,
      ),
    },
    timeBuckets,
    movementTimeSources,
    statuses,
    missingRegistration: movements.filter((movement) =>
      !movement.registration
    ).length,
    missingAircraftType: movements.filter((movement) =>
      !movement.aircraftType
    ).length,
    missingProviderFlightId: movements.filter((movement) =>
      !movement.providerFlightId
    ).length,
    duplicateProviderIds: [...providerIdCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([providerFlightId]) => providerFlightId)
      .sort(),
    topAircraftTypes: [...aircraftTypeCounts.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((left, right) =>
        right.count - left.count || left.code.localeCompare(right.code)
      )
      .slice(0, 10),
    samplesMissingRegistration: movements
      .filter((movement) => !movement.registration)
      .slice(0, sampleSize),
    farthestFutureWithRegistration: analyses
      .filter((analysis) =>
        analysis.timeToMovementMs !== null
        && analysis.timeToMovementMs > 0
        && Boolean(analysis.movement.registration)
      )
      .sort((left, right) =>
        (right.timeToMovementMs ?? 0) - (left.timeToMovementMs ?? 0)
      )
      .slice(0, sampleSize)
      .map((analysis) => ({
        movement: analysis.movement,
        timeToMovementMs: analysis.timeToMovementMs ?? 0,
        timeSource: analysis.selection.source,
      })),
  };
}

function percent(value: FieldCoverage): string {
  return value.percent === null ? "n/a" : value.percent.toFixed(1) + "%";
}

function row(label: string, value: string | number): string {
  return label.padEnd(31) + String(value).padStart(10);
}

function timingRow(
  label: string,
  present: number,
  total: number,
  coverage: FieldCoverage,
): string {
  const counts = String(present) + " / " + String(total);
  return label.padEnd(18)
    + counts.padStart(12)
    + percent(coverage).padStart(11);
}

function movementRoute(movement: AircraftMovement): string {
  return (movement.originAirport ?? "?")
    + "→"
    + (movement.destinationAirport ?? "?");
}

function movementSample(movement: AircraftMovement): string {
  const selection = selectMovementTime(movement);
  const timeLabel = selection.source === "SCHEDULED"
    ? "scheduled"
    : selection.source === "ESTIMATED_FALLBACK"
      ? "estimated fallback"
      : "time unavailable";
  const time = selection.time ? " " + selection.time.toISOString() : "";

  return [
    movement.ident || "(missing ident)",
    movement.movementType,
    movementRoute(movement),
    movement.aircraftType ?? "(type unknown)",
    timeLabel + time,
  ].join("  ");
}

function futureRegistrationSample(
  sample: FutureRegistrationSample,
): string {
  const hours = sample.timeToMovementMs / HOUR_MS;
  return [
    sample.movement.ident || "(missing ident)",
    "+" + hours.toFixed(1) + "h",
    sample.movement.registration ?? "(registration unknown)",
    sample.movement.aircraftType ?? "(type unknown)",
    sample.movement.movementType,
  ].join("  ");
}

export function formatMovementCoverageReport(
  airport: string,
  start: Date,
  end: Date,
  report: MovementCoverageReport,
  diagnostics: FlightAwareProbeDiagnostics,
): string {
  const unknownStatusCount = report.statuses.UNKNOWN;
  const lines = [
    "FlightAware AeroAPI Probe",
    "",
    "Airport: " + airport,
    "Observed at (UTC): " + report.observedAt.toISOString(),
    "Requested window (UTC; start inclusive, end exclusive):",
    start.toISOString(),
    "→",
    end.toISOString(),
    "",
    "Results",
    "-----------------------------------------",
    row("Arrivals", report.arrivals),
    row("Departures", report.departures),
    row("Total movements", report.total),
    "",
    "Completeness",
    "-----------------------------------------",
    row("Arrivals truncated", diagnostics.arrivalsTruncated ? "yes" : "no"),
    row(
      "Departures truncated",
      diagnostics.departuresTruncated ? "yes" : "no",
    ),
    row("Max pages per endpoint", diagnostics.maxPagesPerEndpoint),
    row("Arrival records returned", diagnostics.arrivalRecords),
    row("Departure records returned", diagnostics.departureRecords),
    "",
    "Basic coverage",
    "-----------------------------------------",
    row("Registration", percent(report.coverage.registration)),
    row("Aircraft type", percent(report.coverage.aircraftType)),
    row("Operator ICAO", percent(report.coverage.operatorIcao)),
    row("Origin", percent(report.coverage.originAirport)),
    row("Destination", percent(report.coverage.destinationAirport)),
    "",
    "Registration coverage by movement type",
    "-----------------------------------------",
    row("All movements", percent(report.registrationByMovementType.ALL)),
    row("Arrivals", percent(report.registrationByMovementType.ARRIVAL)),
    row("Departures", percent(report.registrationByMovementType.DEPARTURE)),
    "",
    "Registration coverage by time to movement",
    "-----------------------------------------",
    ...report.timeBuckets.map((bucket) =>
      timingRow(
        bucket.label,
        bucket.withRegistration,
        bucket.total,
        bucket.registrationCoverage,
      )
    ),
    "",
    "Aircraft-type coverage by time to movement",
    "-----------------------------------------",
    ...report.timeBuckets.map((bucket) =>
      timingRow(
        bucket.label,
        bucket.withAircraftType,
        bucket.total,
        bucket.aircraftTypeCoverage,
      )
    ),
    "",
    "Movement-time source",
    "-----------------------------------------",
    row("Scheduled time", report.movementTimeSources.SCHEDULED),
    row(
      "Estimated fallback",
      report.movementTimeSources.ESTIMATED_FALLBACK,
    ),
    row("Unavailable", report.movementTimeSources.UNAVAILABLE),
    "Arrivals use scheduledArrivalTime; departures use "
      + "scheduledDepartureTime. Estimated time is fallback only.",
    "",
    "Sample movements missing registration",
    "-----------------------------------------",
    ...(report.samplesMissingRegistration.length
      ? report.samplesMissingRegistration.map(movementSample)
      : ["No missing-registration samples."]),
    "",
    "Farthest-future movements with registration",
    "-----------------------------------------",
    ...(report.farthestFutureWithRegistration.length
      ? report.farthestFutureWithRegistration.map(futureRegistrationSample)
      : ["No future-registration samples."]),
    "",
    "Top aircraft type codes",
    "-----------------------------------------",
    ...(report.topAircraftTypes.length
      ? report.topAircraftTypes.map(({ code, count }) => row(code, count))
      : ["(none returned)"]),
    "",
    "API usage",
    "-----------------------------------------",
    row("Endpoint queries", diagnostics.endpointQueries),
    row(
      "  scheduled_arrivals",
      diagnostics.arrivalEndpointQueries,
    ),
    row(
      "  scheduled_departures",
      diagnostics.departureEndpointQueries,
    ),
    row("Actual HTTP requests", diagnostics.totalHttpRequests),
    row("  arrivals HTTP requests", diagnostics.arrivalHttpRequests),
    row("  departures HTTP requests", diagnostics.departureHttpRequests),
    row("Result pages", diagnostics.totalPages),
    row("  arrivals result pages", diagnostics.arrivalPages),
    row("  departures result pages", diagnostics.departurePages),
    row("Results truncated", diagnostics.resultsTruncated ? "yes" : "no"),
    "AeroAPI may return multiple result pages in one HTTP response.",
    "",
    "Data quality",
    "-----------------------------------------",
    row("Duplicate provider IDs", report.duplicateProviderIds.length),
    row("Missing registration", report.missingRegistration),
    row("Missing aircraft type", report.missingAircraftType),
    row("Missing provider ID", report.missingProviderFlightId),
    row("Unknown status", unknownStatusCount),
    row("Outside API filter window", diagnostics.outsideRequestedWindow),
  ];

  return lines.join("\n");
}
