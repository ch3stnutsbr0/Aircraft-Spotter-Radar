import assert from "node:assert/strict";
import test from "node:test";
import { makeRealMovement } from "../../../spotter-interest-integration/src/__tests__/fixtures.ts";
import { scoreRealMovements } from "../../../spotter-interest-integration/src/index.ts";
import { toDailySpotlightMovement } from "../index.ts";

test("live adapter keeps scheduled and estimated timestamps distinct", () => {
  const movement = makeRealMovement({ aircraftType: "A359", registration: "N509DN" });
  movement.scheduledArrivalTime = new Date("2026-08-23T16:00:00Z");
  movement.estimatedArrivalTime = new Date("2026-08-23T16:12:00Z");
  const [scored] = scoreRealMovements([movement], "KATL");
  const view = toDailySpotlightMovement(scored);
  assert.equal(view.scheduledTime, "2026-08-23T16:00:00.000Z");
  assert.equal(view.estimatedTime, "2026-08-23T16:12:00.000Z");
  assert.equal(view.runwayPrediction, undefined);
});

test("unknown live aircraft uses truthful unavailable display values", () => {
  const movement = makeRealMovement({ aircraftType: null, registration: null, overrides: { operator: null, operator_icao: null } });
  const [scored] = scoreRealMovements([movement], "KATL");
  const view = toDailySpotlightMovement(scored);
  assert.equal(view.aircraft.type, "Type unavailable");
  assert.equal(view.aircraft.category, "UNKNOWN");
  assert.equal(view.aircraft.livery.name, "Livery information unavailable");
  assert.equal(view.flight.airline.name, "Operator unavailable");
});
