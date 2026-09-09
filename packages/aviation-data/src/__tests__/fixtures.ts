import type { FlightAwareFlight } from "../flightaware/types.ts";

export function makeFlightAwareFlight(
  overrides: Partial<FlightAwareFlight> = {},
): FlightAwareFlight {
  return {
    ident: "DAL123",
    ident_icao: "DAL123",
    fa_flight_id: "DAL123-1787500000-airline-001p",
    operator: "DAL",
    operator_icao: "DAL",
    registration: "N501DN",
    aircraft_type: "A359",
    origin: {
      code: "KJFK",
      code_icao: "KJFK",
      code_iata: "JFK",
      code_lid: "JFK",
    },
    destination: {
      code: "KATL",
      code_icao: "KATL",
      code_iata: "ATL",
      code_lid: "ATL",
    },
    cancelled: false,
    diverted: false,
    status: "Scheduled",
    scheduled_out: "2026-08-23T14:00:00Z",
    estimated_out: "2026-08-23T14:05:00Z",
    actual_out: null,
    scheduled_off: "2026-08-23T14:10:00Z",
    estimated_off: "2026-08-23T14:15:00Z",
    actual_off: null,
    scheduled_on: "2026-08-23T16:00:00Z",
    estimated_on: "2026-08-23T16:05:00Z",
    actual_on: null,
    scheduled_in: "2026-08-23T16:10:00Z",
    estimated_in: "2026-08-23T16:15:00Z",
    actual_in: null,
    ...overrides,
  };
}
