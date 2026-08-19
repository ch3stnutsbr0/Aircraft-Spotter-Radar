export type MovementType = "ARRIVAL" | "DEPARTURE";

export type AircraftCategory = "NARROWBODY" | "WIDEBODY" | "REGIONAL";

export type SpotterTag =
  | "SPECIAL_LIVERY"
  | "RARE_AIRCRAFT_TYPE"
  | "RARE_AIRLINE"
  | "WIDEBODY"
  | "LONG_HAUL";

export interface Airport {
  code: string;
  name: string;
  city: string;
}

export interface Airline {
  code: string;
  name: string;
}

export interface Livery {
  name: string;
  isSpecial: boolean;
}

export interface Aircraft {
  type: string;
  family: string;
  category: AircraftCategory;
  registration: string | null;
  livery: Livery;
}

export interface Flight {
  number: string;
  airline: Airline;
  origin: Airport;
  destination: Airport;
}

export interface SpotterMetadata {
  tags: SpotterTag[];
}

export type RunwayPredictionStatus = "PREDICTED" | "LIKELY" | "CONFIRMED";

export interface RunwayPrediction {
  runway: string;
  confidencePercent?: number;
  status: RunwayPredictionStatus;
  source?: string;
}

export type AirportFlowDirection =
  | "EAST"
  | "WEST"
  | "NORTH"
  | "SOUTH"
  | "MIXED"
  | "UNKNOWN";

export interface AirportOperations {
  flowDirection: AirportFlowDirection;
  arrivalRunways: string[];
  departureRunways: string[];
  source?: string;
}

export interface AirportMovementStats {
  scheduled: number;
  completed: number;
  cancelled: number;
}

export interface AirportWeather {
  temperatureCelsius: number;
  condition: string;
  windDirectionDegrees: number;
  windSpeedKt: number;
  visibilityMiles: number;
  visibilityIsGreaterThan: boolean;
  ceilingFt: number;
}

export interface AirportStatusSnapshot {
  airport: Airport;
  operations: AirportOperations;
  movements: AirportMovementStats;
  weather: AirportWeather;
  asOf: string;
  source: string;
}

export function getRemainingMovementCount(stats: AirportMovementStats): number {
  return Math.max(0, stats.scheduled - stats.completed - stats.cancelled);
}

export interface AircraftMovement {
  id: string;
  movementType: MovementType;
  scheduledTime: string;
  estimatedTime: string;
  flight: Flight;
  aircraft: Aircraft;
  spotter: SpotterMetadata;
  runwayPrediction?: RunwayPrediction;
}
