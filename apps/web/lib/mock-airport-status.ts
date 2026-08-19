import type { AirportStatusSnapshot } from "@spotter/domain";

export const mockAtlAirportStatus: AirportStatusSnapshot = {
  airport: {
    code: "ATL",
    name: "Hartsfield–Jackson Atlanta International Airport",
    city: "Atlanta",
  },
  operations: {
    flowDirection: "WEST",
    arrivalRunways: ["27L", "27R"],
    departureRunways: ["26L", "26R"],
    source: "Mock airport operations scenario",
  },
  movements: {
    scheduled: 742,
    completed: 418,
    cancelled: 12,
  },
  weather: {
    temperatureCelsius: 23,
    condition: "Partly cloudy",
    windDirectionDegrees: 270,
    windSpeedKt: 9,
    visibilityMiles: 10,
    visibilityIsGreaterThan: true,
    ceilingFt: 8000,
  },
  asOf: "2026-08-19T14:00:00-04:00",
  source: "Aircraft Spotter Radar mock provider",
};
