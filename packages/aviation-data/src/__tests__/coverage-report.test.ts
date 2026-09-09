import assert from "node:assert/strict";
import test from "node:test";
import type { AircraftMovement, MovementType } from "../../../domain/src/index.ts";
import {
  buildMovementCoverageReport,
  classifyTimeToMovement,
  formatMovementCoverageReport,
  selectMovementTime,
  type TimeToMovementBucket,
} from "../coverage-report.ts";
import type { FlightAwareProbeDiagnostics } from "../flightaware/flightaware-aviation-data-provider.ts";

const HOUR_MS = 60 * 60 * 1_000;
const observedAt = new Date("2026-08-23T12:00:00Z");
let sequence = 0;

interface MovementOptions {
  movementType?: MovementType;
  scheduledHours?: number | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  registration?: string | null;
  aircraftType?: string | null;
}

function timeAt(hours: number | null | undefined): Date | null {
  return hours == null
    ? null
    : new Date(observedAt.getTime() + hours * HOUR_MS);
}

function makeMovement(options: MovementOptions = {}): AircraftMovement {
  sequence += 1;
  const movementType = options.movementType ?? "ARRIVAL";
  const scheduled = timeAt(options.scheduledHours ?? null);
  const estimated = timeAt(options.estimatedHours ?? null);
  const actual = timeAt(options.actualHours ?? null);
  const providerFlightId = `fixture-${sequence}`;

  return {
    id: `flightaware:${providerFlightId}:${movementType}`,
    provider: "flightaware",
    providerFlightId,
    ident: `TST${sequence}`,
    operatorIcao: "TST",
    registration: options.registration === undefined
      ? `N${sequence}TEST`
      : options.registration,
    aircraftType: options.aircraftType === undefined
      ? "A320"
      : options.aircraftType,
    originAirport: movementType === "ARRIVAL" ? "KJFK" : "KATL",
    destinationAirport: movementType === "ARRIVAL" ? "KATL" : "KJFK",
    movementType,
    scheduledDepartureTime: movementType === "DEPARTURE" ? scheduled : null,
    scheduledArrivalTime: movementType === "ARRIVAL" ? scheduled : null,
    estimatedDepartureTime: movementType === "DEPARTURE" ? estimated : null,
    estimatedArrivalTime: movementType === "ARRIVAL" ? estimated : null,
    actualDepartureTime: movementType === "DEPARTURE" ? actual : null,
    actualArrivalTime: movementType === "ARRIVAL" ? actual : null,
    status: "SCHEDULED",
    cancelled: false,
    diverted: false,
    providerStatus: "Scheduled",
    observedAt,
    lastUpdatedAt: null,
  };
}

function bucket(
  report: ReturnType<typeof buildMovementCoverageReport>,
  name: TimeToMovementBucket,
) {
  const result = report.timeBuckets.find((item) => item.bucket === name);
  assert.ok(result, `Expected bucket ${name}`);
  return result;
}

function diagnostics(
  overrides: Partial<FlightAwareProbeDiagnostics> = {},
): FlightAwareProbeDiagnostics {
  return {
    observedAt,
    endpointQueries: 2,
    arrivalEndpointQueries: 1,
    departureEndpointQueries: 1,
    arrivalHttpRequests: 1,
    departureHttpRequests: 1,
    totalHttpRequests: 2,
    arrivalPages: 2,
    departurePages: 3,
    totalPages: 5,
    maxPagesPerEndpoint: 5,
    arrivalRecords: 30,
    departureRecords: 45,
    arrivalsTruncated: false,
    departuresTruncated: true,
    resultsTruncated: true,
    outsideRequestedWindow: 0,
    arrivalRawSamples: [],
    departureRawSamples: [],
    ...overrides,
  };
}

test("classifies every time-to-movement boundary", () => {
  const cases: Array<[number | null, TimeToMovementBucket]> = [
    [-1, "PAST_DUE"],
    [0, "PAST_DUE"],
    [1, "ZERO_TO_THREE_HOURS"],
    [3 * HOUR_MS - 1, "ZERO_TO_THREE_HOURS"],
    [3 * HOUR_MS, "THREE_TO_SIX_HOURS"],
    [6 * HOUR_MS, "SIX_TO_TWELVE_HOURS"],
    [12 * HOUR_MS, "TWELVE_TO_TWENTY_FOUR_HOURS"],
    [24 * HOUR_MS, "TWENTY_FOUR_TO_FORTY_EIGHT_HOURS"],
    [48 * HOUR_MS, "FORTY_EIGHT_HOURS_PLUS"],
    [null, "UNAVAILABLE"],
    [Number.NaN, "UNAVAILABLE"],
  ];

  for (const [value, expected] of cases) {
    assert.equal(classifyTimeToMovement(value), expected);
  }
});

test("prefers scheduled time, falls back to the matching estimate, and never uses actual time", () => {
  const scheduled = makeMovement({
    movementType: "ARRIVAL",
    scheduledHours: 5,
    estimatedHours: 1,
    actualHours: 2,
  });
  const fallback = makeMovement({
    movementType: "DEPARTURE",
    scheduledHours: null,
    estimatedHours: 7,
    actualHours: 2,
  });
  const unavailable = makeMovement({
    movementType: "ARRIVAL",
    scheduledHours: null,
    estimatedHours: null,
    actualHours: 10,
  });

  assert.deepEqual(selectMovementTime(scheduled), {
    time: timeAt(5),
    source: "SCHEDULED",
  });
  assert.deepEqual(selectMovementTime(fallback), {
    time: timeAt(7),
    source: "ESTIMATED_FALLBACK",
  });
  assert.deepEqual(selectMovementTime(unavailable), {
    time: null,
    source: "UNAVAILABLE",
  });

  const report = buildMovementCoverageReport(
    [scheduled, fallback, unavailable],
    observedAt,
  );
  assert.equal(bucket(report, "THREE_TO_SIX_HOURS").total, 1);
  assert.equal(bucket(report, "SIX_TO_TWELVE_HOURS").total, 1);
  assert.equal(bucket(report, "UNAVAILABLE").total, 1);
  assert.deepEqual(report.movementTimeSources, {
    SCHEDULED: 1,
    ESTIMATED_FALLBACK: 1,
    UNAVAILABLE: 1,
  });
});

test("reports registration and aircraft-type coverage by timing bucket and movement type", () => {
  const movements = [
    makeMovement({
      movementType: "ARRIVAL",
      scheduledHours: 1,
      registration: "N100AA",
      aircraftType: "A320",
    }),
    makeMovement({
      movementType: "ARRIVAL",
      scheduledHours: 1.5,
      registration: null,
      aircraftType: "B738",
    }),
    makeMovement({
      movementType: "DEPARTURE",
      scheduledHours: 4,
      registration: "N200BB",
      aircraftType: null,
    }),
    makeMovement({
      movementType: "DEPARTURE",
      scheduledHours: null,
      estimatedHours: null,
      registration: null,
      aircraftType: null,
    }),
  ];

  const report = buildMovementCoverageReport(movements, observedAt);
  const near = bucket(report, "ZERO_TO_THREE_HOURS");
  const medium = bucket(report, "THREE_TO_SIX_HOURS");
  const unavailable = bucket(report, "UNAVAILABLE");

  assert.equal(near.total, 2);
  assert.equal(near.registrationCoverage.percent, 50);
  assert.equal(near.aircraftTypeCoverage.percent, 100);
  assert.equal(medium.registrationCoverage.percent, 100);
  assert.equal(medium.aircraftTypeCoverage.percent, 0);
  assert.equal(unavailable.registrationCoverage.percent, 0);
  assert.equal(unavailable.aircraftTypeCoverage.percent, 0);
  assert.equal(report.registrationByMovementType.ALL.percent, 50);
  assert.equal(report.registrationByMovementType.ARRIVAL.percent, 50);
  assert.equal(report.registrationByMovementType.DEPARTURE.percent, 50);
});

test("caps missing-registration and farthest-future samples at five", () => {
  const missing = Array.from({ length: 7 }, (_, index) =>
    makeMovement({ scheduledHours: index + 1, registration: null })
  );
  const registered = Array.from({ length: 7 }, (_, index) =>
    makeMovement({ scheduledHours: index + 10 })
  );
  const report = buildMovementCoverageReport(
    [...missing, ...registered],
    observedAt,
  );

  assert.equal(report.samplesMissingRegistration.length, 5);
  assert.equal(report.farthestFutureWithRegistration.length, 5);
  assert.deepEqual(
    report.farthestFutureWithRegistration.map((sample) =>
      sample.timeToMovementMs / HOUR_MS
    ),
    [16, 15, 14, 13, 12],
  );
});

test("formats endpoint-specific truncation and distinct usage counters", () => {
  const report = buildMovementCoverageReport([], observedAt);
  const output = formatMovementCoverageReport(
    "KATL",
    new Date("2026-08-23T12:00:00Z"),
    new Date("2026-08-23T12:30:00Z"),
    report,
    diagnostics(),
  );

  assert.match(output, /Arrivals truncated\s+no/);
  assert.match(output, /Departures truncated\s+yes/);
  assert.match(output, /Arrival records returned\s+30/);
  assert.match(output, /Departure records returned\s+45/);
  assert.match(output, /Endpoint queries\s+2/);
  assert.match(output, /Actual HTTP requests\s+2/);
  assert.match(output, /Result pages\s+5/);
  assert.match(output, /multiple result pages in one HTTP response/);
  assert.match(output, /No missing-registration samples\./);
});
