import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMovementCoverageReport,
} from "../coverage-report.ts";
import {
  normalizeFlightAwareAirport,
  normalizeFlightAwareMovement,
} from "../flightaware/normalizer.ts";
import { makeFlightAwareFlight } from "./fixtures.ts";

const observedAt = new Date("2026-08-23T13:30:00Z");

test("normalizes a scheduled arrival", () => {
  const movement = normalizeFlightAwareMovement(
    makeFlightAwareFlight(),
    "ARRIVAL",
    observedAt,
  );

  assert.equal(movement.provider, "flightaware");
  assert.equal(
    movement.providerFlightId,
    "DAL123-1787500000-airline-001p",
  );
  assert.equal(movement.ident, "DAL123");
  assert.equal(movement.operatorIcao, "DAL");
  assert.equal(movement.registration, "N501DN");
  assert.equal(movement.aircraftType, "A359");
  assert.equal(movement.originAirport, "KJFK");
  assert.equal(movement.destinationAirport, "KATL");
  assert.equal(movement.movementType, "ARRIVAL");
  assert.equal(movement.status, "SCHEDULED");
  assert.deepEqual(movement.observedAt, observedAt);
});

test("normalizes a scheduled departure from query context", () => {
  const movement = normalizeFlightAwareMovement(
    makeFlightAwareFlight({
      origin: { code_icao: "KATL", code_iata: "ATL" },
      destination: { code_icao: "KLAX", code_iata: "LAX" },
    }),
    "DEPARTURE",
    observedAt,
  );

  assert.equal(movement.movementType, "DEPARTURE");
  assert.equal(movement.originAirport, "KATL");
  assert.equal(movement.destinationAirport, "KLAX");
});

test("preserves a movement with missing registration", () => {
  const movement = normalizeFlightAwareMovement(
    makeFlightAwareFlight({ registration: null }),
    "ARRIVAL",
    observedAt,
  );

  assert.equal(movement.registration, null);
});

test("preserves a movement with missing aircraft type", () => {
  const movement = normalizeFlightAwareMovement(
    makeFlightAwareFlight({ aircraft_type: null }),
    "ARRIVAL",
    observedAt,
  );

  assert.equal(movement.aircraftType, null);
  assert.equal(movement.ident, "DAL123");
});

test("normalizes a cancelled flight", () => {
  const movement = normalizeFlightAwareMovement(
    makeFlightAwareFlight({
      cancelled: true,
      status: "Cancelled",
    }),
    "DEPARTURE",
    observedAt,
  );

  assert.equal(movement.cancelled, true);
  assert.equal(movement.status, "CANCELLED");
});

test("normalizes a diverted flight", () => {
  const movement = normalizeFlightAwareMovement(
    makeFlightAwareFlight({
      diverted: true,
      status: "Diverted",
    }),
    "ARRIVAL",
    observedAt,
  );

  assert.equal(movement.diverted, true);
  assert.equal(movement.status, "DIVERTED");
});

test("keeps scheduled, estimated, and actual timestamps distinct", () => {
  const movement = normalizeFlightAwareMovement(
    makeFlightAwareFlight({
      actual_out: "2026-08-23T14:07:00Z",
      actual_in: "2026-08-23T16:17:00Z",
      status: "Arrived",
    }),
    "ARRIVAL",
    observedAt,
  );

  assert.equal(
    movement.scheduledDepartureTime?.toISOString(),
    "2026-08-23T14:00:00.000Z",
  );
  assert.equal(
    movement.estimatedDepartureTime?.toISOString(),
    "2026-08-23T14:05:00.000Z",
  );
  assert.equal(
    movement.actualDepartureTime?.toISOString(),
    "2026-08-23T14:07:00.000Z",
  );
  assert.equal(
    movement.scheduledArrivalTime?.toISOString(),
    "2026-08-23T16:10:00.000Z",
  );
  assert.equal(
    movement.estimatedArrivalTime?.toISOString(),
    "2026-08-23T16:15:00.000Z",
  );
  assert.equal(
    movement.actualArrivalTime?.toISOString(),
    "2026-08-23T16:17:00.000Z",
  );
  assert.equal(movement.status, "ARRIVED");
});

test("normalizes airport identifiers preferring ICAO", () => {
  assert.equal(normalizeFlightAwareAirport({
    code: "ATL",
    code_icao: "KATL",
    code_iata: "ATL",
    code_lid: "ATL",
  }), "KATL");
  assert.equal(normalizeFlightAwareAirport({
    code: null,
    code_icao: null,
    code_iata: "lhr",
    code_lid: null,
  }), "LHR");
  assert.equal(normalizeFlightAwareAirport(null), null);
});

test("coverage logic reports duplicate provider IDs", () => {
  const first = normalizeFlightAwareMovement(
    makeFlightAwareFlight(),
    "ARRIVAL",
    observedAt,
  );
  const second = normalizeFlightAwareMovement(
    makeFlightAwareFlight({ registration: null }),
    "DEPARTURE",
    observedAt,
  );
  const report = buildMovementCoverageReport([first, second]);

  assert.deepEqual(
    report.duplicateProviderIds,
    ["DAL123-1787500000-airline-001p"],
  );
  assert.equal(report.missingRegistration, 1);
  assert.equal(report.coverage.registration.percent, 50);
});
