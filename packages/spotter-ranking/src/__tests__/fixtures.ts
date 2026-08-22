import type {
  AircraftMovement,
  AircraftNotabilityTag,
  SpotterInterestFacts,
} from "../../../domain/src/index.ts";

export interface FactOptions {
  notabilityTags?: AircraftNotabilityTag[];
  activeGlobalFleetSize?: number;
  localTypeMovements?: number;
  totalAirportMovements?: number;
  dataQuality?: "SUFFICIENT" | "INSUFFICIENT";
  registration?: string | null;
  visits?: number;
  daysSinceLastVisit?: number | null;
  variant?: string;
}

export function makeFacts(options: FactOptions = {}): SpotterInterestFacts {
  const variant = options.variant ?? "A321-200";
  const registration = options.registration === undefined
    ? "N12345"
    : options.registration;

  return {
    notability: {
      tags: options.notabilityTags ?? [],
    },
    globalTypeRarity: {
      variant,
      activeGlobalFleetSize: options.activeGlobalFleetSize ?? 1500,
    },
    localTypeRarity: {
      airportCode: "ATL",
      variant,
      historicalWindowDays: 90,
      typeMovements: options.localTypeMovements ?? 1200,
      totalMovements: options.totalAirportMovements ?? 84000,
      dataQuality: options.dataQuality ?? "SUFFICIENT",
    },
    registrationRarity: {
      airportCode: "ATL",
      registration,
      historicalWindowDays: 365,
      visits: options.visits ?? 40,
      daysSinceLastVisit: options.daysSinceLastVisit === undefined
        ? 10
        : options.daysSinceLastVisit,
    },
  };
}

export function makeMovement(
  id: string,
  facts: SpotterInterestFacts,
  estimatedTime = "2026-08-19T15:00:00-04:00",
): AircraftMovement {
  return {
    id,
    movementType: "ARRIVAL",
    scheduledTime: estimatedTime,
    estimatedTime,
    flight: {
      number: `TEST${id}`,
      airline: { code: "TS", name: "Test Airways" },
      origin: { code: "JFK", name: "John F. Kennedy", city: "New York" },
      destination: { code: "ATL", name: "Hartsfield–Jackson", city: "Atlanta" },
    },
    aircraft: {
      type: facts.globalTypeRarity.variant,
      family: "Test Family",
      category: "NARROWBODY",
      registration: facts.registrationRarity.registration,
      livery: {
        name: facts.notability.tags.length ? "Notable livery" : "Standard fleet livery",
        isSpecial: facts.notability.tags.length > 0,
      },
    },
    spotterFacts: facts,
  };
}
