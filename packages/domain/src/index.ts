export type MovementType = "ARRIVAL" | "DEPARTURE";

export type AircraftCategory = "NARROWBODY" | "WIDEBODY" | "REGIONAL";

export type AircraftNotabilityTag =
  | "SPECIAL_LIVERY"
  | "RETRO_LIVERY"
  | "ANNIVERSARY_LIVERY"
  | "COMMEMORATIVE_LIVERY"
  | "PROMOTIONAL_LIVERY"
  | "ALLIANCE_LIVERY"
  | "ONE_OFF_LIVERY"
  | "FIRST_OF_TYPE_FOR_AIRLINE"
  | "LAST_OF_TYPE_FOR_AIRLINE"
  | "FIRST_DELIVERED_TO_AIRLINE"
  | "LAST_DELIVERED_TO_AIRLINE"
  | "FIRST_PRODUCTION_AIRFRAME"
  | "LAST_PRODUCTION_AIRFRAME"
  | "PROTOTYPE"
  | "TEST_AIRCRAFT"
  | "HISTORICALLY_SIGNIFICANT_AIRFRAME"
  | "OTHER_NOTABLE_HISTORY";

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

export interface AircraftNotabilityFacts {
  tags: AircraftNotabilityTag[];
  curatedScores?: Partial<Record<
    "HISTORICALLY_SIGNIFICANT_AIRFRAME" | "OTHER_NOTABLE_HISTORY",
    number
  >>;
}

export interface GlobalTypeRarityFacts {
  variant: string;
  activeGlobalFleetSize: number;
}

export interface LocalTypeRarityFacts {
  airportCode: string;
  variant: string;
  historicalWindowDays: number;
  typeMovements: number;
  totalMovements: number;
  dataQuality: "SUFFICIENT" | "INSUFFICIENT";
}

export interface RegistrationRarityFacts {
  airportCode: string;
  registration: string | null;
  historicalWindowDays: number;
  visits: number;
  daysSinceLastVisit: number | null;
}

export interface SpotterInterestFacts {
  notability: AircraftNotabilityFacts;
  globalTypeRarity: GlobalTypeRarityFacts;
  localTypeRarity: LocalTypeRarityFacts;
  registrationRarity: RegistrationRarityFacts;
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
  spotterFacts: SpotterInterestFacts;
  runwayPrediction?: RunwayPrediction;
}
