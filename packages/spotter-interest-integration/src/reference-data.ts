import type {
  AircraftNotabilityTag,
  RegistrationRarityFacts,
} from "../../domain/src/index.ts";

// This is the existing reviewed mock/reference dataset from
// apps/web/lib/mock-spotter-facts.ts. No new rarity or notability facts are
// introduced for the real-data probe.
export const ATL_REFERENCE_AIRPORT = "ATL";
export const LOCAL_REFERENCE_WINDOW_DAYS = 90;
export const REGISTRATION_REFERENCE_WINDOW_DAYS = 365;
export const ATL_REFERENCE_TOTAL_MOVEMENTS_90D = 84_000;

export const ACTIVE_FLEET_BY_VARIANT: Readonly<Record<string, number>> = {
  "A220-300": 300,
  "A320-200": 4000,
  A320neo: 1900,
  "A321-200": 1400,
  A321neo: 1300,
  "A330-300": 450,
  "A330-900neo": 150,
  "A350-900": 350,
  "A350-1000": 90,
  "B717-200": 100,
  "B737-700": 1000,
  "B737-800": 4000,
  "B737-900ER": 500,
  "B737 MAX 8": 1500,
  "B737 MAX 9": 400,
  "B747-8I": 20,
  "B747-8F": 45,
  "B757-200": 450,
  "B767-300F": 300,
  "B777-200ER": 350,
  "B787-9": 650,
  "B787-10": 100,
  "CRJ-900": 450,
  E175: 900,
};

export const ATL_MOVEMENTS_BY_VARIANT: Readonly<Record<string, number>> = {
  "A220-300": 760,
  "A320-200": 1250,
  A320neo: 900,
  "A321-200": 1800,
  A321neo: 1000,
  "A330-300": 220,
  "A330-900neo": 180,
  "A350-900": 600,
  "A350-1000": 80,
  "B717-200": 900,
  "B737-700": 620,
  "B737-800": 2500,
  "B737-900ER": 1150,
  "B737 MAX 8": 900,
  "B737 MAX 9": 250,
  "B747-8I": 30,
  "B747-8F": 12,
  "B757-200": 360,
  "B767-300F": 300,
  "B777-200ER": 100,
  "B787-9": 90,
  "B787-10": 70,
  "CRJ-900": 850,
  E175: 1050,
};

export const NOTABILITY_BY_REGISTRATION: Readonly<
  Record<string, readonly AircraftNotabilityTag[]>
> = {
  N395FR: ["SPECIAL_LIVERY"],
  N509DN: ["ONE_OFF_LIVERY"],
  N859GT: ["PROMOTIONAL_LIVERY"],
};

export const ATL_REGISTRATION_HISTORY: Readonly<Record<
  string,
  Pick<RegistrationRarityFacts, "visits" | "daysSinceLastVisit">
>> = {
  "A7-ANJ": { visits: 1, daysSinceLastVisit: 210 },
  "C-GMZN": { visits: 7, daysSinceLastVisit: 42 },
  "D-ABYT": { visits: 3, daysSinceLastVisit: 45 },
  "F-HUVG": { visits: 4, daysSinceLastVisit: 60 },
  "G-YMMR": { visits: 2, daysSinceLastVisit: 120 },
  HL7630: { visits: 2, daysSinceLastVisit: 70 },
  N353UP: { visits: 18, daysSinceLastVisit: 16 },
  N395FR: { visits: 10, daysSinceLastVisit: 20 },
  N509DN: { visits: 22, daysSinceLastVisit: 12 },
  N859GT: { visits: 1, daysSinceLastVisit: 210 },
  "PH-BKA": { visits: 4, daysSinceLastVisit: 47 },
  "TC-LLL": { visits: 3, daysSinceLastVisit: 95 },
  "XA-MAY": { visits: 4, daysSinceLastVisit: 80 },
};

export function toReferenceAirportCode(airportCode: string): string {
  const normalized = airportCode.trim().toUpperCase();
  return normalized === "KATL" ? ATL_REFERENCE_AIRPORT : normalized;
}
