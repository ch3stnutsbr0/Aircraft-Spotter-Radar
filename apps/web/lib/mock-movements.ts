import type {
  AircraftCategory,
  RankableAircraftMovement,
  Airline,
  Airport,
  MovementType,
  RunwayPrediction,
  RunwayPredictionStatus,
} from "../../../packages/domain/src/index.ts";
import { MockAviationDataProvider } from "../../../packages/aviation-data/src/index.ts";
import {
  spotterInterestService,
  type ScoredAircraftMovement,
} from "../../../packages/spotter-ranking/src/index.ts";
import { SpotterInterestEnricher } from "../../../packages/spotter-interest-integration/src/index.ts";

const airportCities: Record<string, string> = {
  AMS: "Amsterdam", ANC: "Anchorage", ATL: "Atlanta", BOS: "Boston",
  BWI: "Baltimore", CDG: "Paris", DAL: "Dallas", DEN: "Denver",
  DFW: "Dallas–Fort Worth", DOH: "Doha", FLL: "Fort Lauderdale",
  FRA: "Frankfurt", HND: "Tokyo Haneda", HOU: "Houston",
  ICN: "Seoul Incheon", IST: "Istanbul", JFK: "New York",
  LAX: "Los Angeles", LGA: "New York LaGuardia", LHR: "London Heathrow",
  MCO: "Orlando", MEX: "Mexico City", MSP: "Minneapolis", ORD: "Chicago",
  RDU: "Raleigh–Durham", SAV: "Savannah", SDF: "Louisville",
  SEA: "Seattle", SLC: "Salt Lake City", TPA: "Tampa",
  VPS: "Destin–Fort Walton Beach", YYZ: "Toronto",
};

const airports = Object.fromEntries(
  Object.entries(airportCities).map(([code, city]) => [code, {
    code,
    city,
    name: code === "ATL"
      ? "Hartsfield–Jackson Atlanta International Airport"
      : `${city} Airport`,
  }]),
) as Record<string, Airport>;

const airlines: Record<string, Airline> = {
  AA: { code: "AA", name: "American Airlines" },
  AC: { code: "AC", name: "Air Canada" },
  AF: { code: "AF", name: "Air France" },
  AM: { code: "AM", name: "Aeromexico" },
  BA: { code: "BA", name: "British Airways" },
  B6: { code: "B6", name: "JetBlue" },
  DL: { code: "DL", name: "Delta Air Lines" },
  F9: { code: "F9", name: "Frontier Airlines" },
  GTI: { code: "GTI", name: "Atlas Air" },
  KE: { code: "KE", name: "Korean Air" },
  KL: { code: "KL", name: "KLM" },
  LH: { code: "LH", name: "Lufthansa" },
  NK: { code: "NK", name: "Spirit Airlines" },
  OO: { code: "OO", name: "SkyWest Airlines" },
  QR: { code: "QR", name: "Qatar Airways" },
  TK: { code: "TK", name: "Turkish Airlines" },
  UA: { code: "UA", name: "United Airlines" },
  WN: { code: "WN", name: "Southwest Airlines" },
  YX: { code: "YX", name: "Republic Airways" },
  "5X": { code: "5X", name: "UPS Airlines" },
  "9E": { code: "9E", name: "Endeavor Air" },
};

type Seed = [
  movementType: MovementType,
  scheduled: string,
  estimated: string,
  flightNumber: string,
  airlineCode: string,
  origin: string,
  destination: string,
  aircraftType: string,
  aircraftFamily: string,
  category: AircraftCategory,
  registration: string | null,
  livery?: string,
];

const seeds: Seed[] = [
  ["DEPARTURE", "14:02", "14:05", "DL1482", "DL", "ATL", "MCO", "A321-200", "A320 Family", "NARROWBODY", "N347DN"],
  ["ARRIVAL", "14:07", "14:11", "WN2187", "WN", "DAL", "ATL", "B737 MAX 8", "B737", "NARROWBODY", "N8840Q"],
  ["ARRIVAL", "14:12", "14:09", "9E5214", "9E", "RDU", "ATL", "CRJ-900", "Regional Jet", "REGIONAL", "N302PQ"],
  ["DEPARTURE", "14:18", "14:18", "DL295", "DL", "ATL", "HND", "A350-900", "A350", "WIDEBODY", "N502DN"],
  ["ARRIVAL", "14:24", "14:31", "DL1196", "DL", "LAX", "ATL", "A321neo", "A320 Family", "NARROWBODY", "N528DN"],
  ["ARRIVAL", "14:29", "14:27", "F91470", "F9", "DEN", "ATL", "A320neo", "A320 Family", "NARROWBODY", "N395FR", "Virginia the Wolf"],
  ["DEPARTURE", "14:35", "14:39", "WN1438", "WN", "ATL", "HOU", "B737-800", "B737", "NARROWBODY", "N8551Q"],
  ["ARRIVAL", "14:41", "14:43", "5X1264", "5X", "SDF", "ATL", "B767-300F", "B767", "WIDEBODY", "N353UP"],
  ["DEPARTURE", "14:47", "14:47", "DL1640", "DL", "ATL", "MSP", "A321-200", "A320 Family", "NARROWBODY", "N365DN"],
  ["ARRIVAL", "14:53", "14:58", "DL2011", "DL", "JFK", "ATL", "B737-900ER", "B737", "NARROWBODY", "N932DZ"],
  ["ARRIVAL", "14:59", "15:03", "QR755", "QR", "DOH", "ATL", "A350-1000", "A350", "WIDEBODY", "A7-ANJ"],
  ["DEPARTURE", "15:05", "15:08", "DL72", "DL", "ATL", "AMS", "A330-300", "A330", "WIDEBODY", "N820NW"],
  ["ARRIVAL", "15:11", "15:10", "9E4872", "9E", "VPS", "ATL", "CRJ-900", "Regional Jet", "REGIONAL", "N181PQ"],
  ["ARRIVAL", "15:18", "15:22", "LH444", "LH", "FRA", "ATL", "B747-8I", "B747", "WIDEBODY", "D-ABYT"],
  ["DEPARTURE", "15:24", "15:26", "NK1078", "NK", "ATL", "FLL", "A320-200", "A320 Family", "NARROWBODY", "N678NK"],
  ["ARRIVAL", "15:31", "15:35", "AF30", "AF", "CDG", "ATL", "A350-900", "A350", "WIDEBODY", "F-HUVG"],
  ["DEPARTURE", "15:38", "15:41", "DL1092", "DL", "ATL", "BOS", "A220-300", "A220", "NARROWBODY", "N306DU"],
  ["ARRIVAL", "15:44", "15:42", "AA1502", "AA", "DFW", "ATL", "A321-200", "A320 Family", "NARROWBODY", "N167AN"],
  ["DEPARTURE", "15:50", "15:55", "DL82", "DL", "ATL", "CDG", "A350-900", "A350", "WIDEBODY", "N509DN", "Team USA"],
  ["ARRIVAL", "15:57", "16:01", "OO5508", "OO", "ORD", "ATL", "E175", "Regional Jet", "REGIONAL", "N143SY"],
  ["ARRIVAL", "16:04", "16:07", "KL621", "KL", "AMS", "ATL", "B787-10", "B787", "WIDEBODY", "PH-BKA"],
  ["DEPARTURE", "16:10", "16:13", "DL1754", "DL", "ATL", "TPA", "B757-200", "B757", "NARROWBODY", "N6714Q"],
  ["ARRIVAL", "16:17", "16:15", "B61097", "B6", "BOS", "ATL", "A220-300", "A220", "NARROWBODY", "N3158J"],
  ["ARRIVAL", "16:24", "16:30", "BA227", "BA", "LHR", "ATL", "B777-200ER", "B777", "WIDEBODY", "G-YMMR"],
  ["DEPARTURE", "16:31", "16:34", "WN1963", "WN", "ATL", "BWI", "B737-700", "B737", "NARROWBODY", "N7828A"],
  ["ARRIVAL", "16:38", "16:42", "KE35", "KE", "ICN", "ATL", "B747-8I", "B747", "WIDEBODY", "HL7630"],
  ["DEPARTURE", "16:46", "16:48", "DL1559", "DL", "ATL", "SLC", "A321neo", "A320 Family", "NARROWBODY", null],
  ["ARRIVAL", "16:53", "16:57", "AC1307", "AC", "YYZ", "ATL", "A220-300", "A220", "NARROWBODY", "C-GMZN"],
  ["DEPARTURE", "17:01", "17:05", "DL2136", "DL", "ATL", "SAV", "B717-200", "B717", "NARROWBODY", "N955AT"],
  ["ARRIVAL", "17:08", "17:11", "YX4386", "YX", "LGA", "ATL", "E175", "Regional Jet", "REGIONAL", "N126HQ"],
  ["DEPARTURE", "17:15", "17:18", "TK32", "TK", "ATL", "IST", "B787-9", "B787", "WIDEBODY", "TC-LLL"],
  ["ARRIVAL", "17:22", "17:19", "DL842", "DL", "SEA", "ATL", "A330-300", "A330", "WIDEBODY", "N810NW"],
  ["DEPARTURE", "17:30", "17:33", "UA1892", "UA", "ATL", "DEN", "B737 MAX 9", "B737", "NARROWBODY", "N37509"],
  ["ARRIVAL", "17:38", "17:42", "AM3270", "AM", "MEX", "ATL", "B737 MAX 8", "B737", "NARROWBODY", "XA-MAY"],
  ["DEPARTURE", "17:46", "17:52", "DL30", "DL", "ATL", "LHR", "A330-900neo", "A330", "WIDEBODY", "N411DX"],
  ["ARRIVAL", "17:54", "17:58", "GTI8156", "GTI", "ANC", "ATL", "B747-8F", "B747", "WIDEBODY", "N859GT", "Polar Air Cargo hybrid"],
];

type PredictionSeed = [
  runway: string,
  status: RunwayPredictionStatus,
  confidencePercent?: number,
];

const predictionSeeds: Array<PredictionSeed | undefined> = [
  ["26R", "PREDICTED", 78], ["27R", "PREDICTED", 84], ["27L", "LIKELY", 69],
  ["26L", "PREDICTED", 81], ["27R", "PREDICTED", 74], ["27L", "PREDICTED", 77],
  ["26R", "PREDICTED", 72], ["27R", "PREDICTED", 66], ["26L", "PREDICTED", 79],
  ["27L", "PREDICTED", 71], ["27R", "LIKELY", 86], ["26R", "PREDICTED", 76],
  undefined, ["27L", "PREDICTED", 82], ["26L", "PREDICTED", 67],
  ["27R", "LIKELY", 88], ["26R", "PREDICTED", 73], ["27L", "PREDICTED", 70],
  ["26L", "PREDICTED", 83], ["27R", "PREDICTED", 64], ["27L", "PREDICTED", 85],
  ["26R", "PREDICTED", 75], ["27R", "PREDICTED", 68], ["27L", "LIKELY", 87],
  ["26L", "PREDICTED", 72], ["27R", "CONFIRMED", 90], undefined,
  ["27L", "PREDICTED", 74], ["26R", "PREDICTED", 69], undefined,
  ["26L", "PREDICTED", 80], ["27R", "PREDICTED", 76], ["26R", "PREDICTED", 71],
  ["27L", "PREDICTED", 65], ["26L", "LIKELY", 84], undefined,
];

const toRunwayPrediction = (
  seed: PredictionSeed | undefined,
): RunwayPrediction | undefined => seed
  ? {
      runway: seed[0],
      status: seed[1],
      confidencePercent: seed[2],
      source: seed[1] === "CONFIRMED"
        ? "Mock airport operations desk"
        : "Mock runway prediction model v1",
    }
  : undefined;

const atlTimestamp = (time: string) => `2026-08-19T${time}:00-04:00`;
const referenceEnricher = new SpotterInterestEnricher();

export const mockMovementInputs: RankableAircraftMovement[] = seeds.map((seed, index) => {
  const [movementType, scheduled, estimated, flightNumber, airlineCode,
    origin, destination, type, family, category, registration, livery] = seed;

  const id = `atl-${String(index + 1).padStart(3, "0")}`;
  const scheduledTimestamp = atlTimestamp(scheduled);
  const estimatedTimestamp = atlTimestamp(estimated);

  return {
    id,
    provider: "mock",
    providerFlightId: id,
    ident: flightNumber,
    operatorIcao: airlineCode,
    registration,
    aircraftType: type,
    originAirport: origin,
    destinationAirport: destination,
    movementType,
    scheduledDepartureTime: movementType === "DEPARTURE" ? new Date(scheduledTimestamp) : null,
    scheduledArrivalTime: movementType === "ARRIVAL" ? new Date(scheduledTimestamp) : null,
    estimatedDepartureTime: movementType === "DEPARTURE" ? new Date(estimatedTimestamp) : null,
    estimatedArrivalTime: movementType === "ARRIVAL" ? new Date(estimatedTimestamp) : null,
    actualDepartureTime: null,
    actualArrivalTime: null,
    status: "SCHEDULED",
    cancelled: false,
    diverted: false,
    providerStatus: "Mock scheduled",
    observedAt: new Date("2026-08-19T18:00:00Z"),
    lastUpdatedAt: null,
    scheduledTime: scheduledTimestamp,
    estimatedTime: estimatedTimestamp,
    flight: {
      number: flightNumber,
      airline: airlines[airlineCode],
      origin: airports[origin],
      destination: airports[destination],
    },
    aircraft: {
      type,
      family,
      category,
      registration,
      livery: { name: livery ?? "Standard fleet livery", isSpecial: Boolean(livery) },
    },
    spotterFacts: referenceEnricher.lookup({
      aircraftType: type,
      registration,
      airportCode: "KATL",
    }).facts,
    runwayPrediction: toRunwayPrediction(predictionSeeds[index]),
  };
});

export const mockAviationDataProvider = new MockAviationDataProvider(
  mockMovementInputs,
);

export const mockMovements: ScoredAircraftMovement[] =
  spotterInterestService.scoreMovements(mockMovementInputs);
