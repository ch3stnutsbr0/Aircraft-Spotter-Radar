import type { MovementType } from "../../../domain/src/index.ts";
import {
  normalizeFlightAwareMovement,
  type FlightAwareFlight,
} from "../../../aviation-data/src/index.ts";
import { makeFlightAwareFlight } from "../../../aviation-data/src/__tests__/fixtures.ts";

const observedAt = new Date("2026-08-23T19:00:00Z");
let sequence = 0;

export function makeRealMovement({
  movementType = "ARRIVAL",
  registration = "N509DN",
  aircraftType = "A359",
  overrides = {},
}: {
  movementType?: MovementType;
  registration?: string | null;
  aircraftType?: string | null;
  overrides?: Partial<FlightAwareFlight>;
} = {}) {
  sequence += 1;
  return normalizeFlightAwareMovement(
    makeFlightAwareFlight({
      fa_flight_id: `real-fixture-${sequence}`,
      ident: `DAL${100 + sequence}`,
      ident_icao: `DAL${100 + sequence}`,
      registration,
      aircraft_type: aircraftType,
      ...overrides,
    }),
    movementType,
    observedAt,
  );
}
