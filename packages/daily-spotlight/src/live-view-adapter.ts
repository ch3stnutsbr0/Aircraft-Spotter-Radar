import type {
  AircraftCategory,
  AircraftNotabilityTag,
  Airport,
  RankableAircraftMovement,
} from "../../domain/src/index.ts";
import type { ScoredSpotterInterestMovement } from "../../spotter-interest-integration/src/types.ts";
import type { SpotterInterestResult } from "../../spotter-ranking/src/index.ts";
import type { SpotlightMovementView } from "./types.ts";

const WIDEBODY_PREFIXES = ["A300", "A310", "A330", "A340", "A350", "A380", "B747", "B767", "B777", "B787", "DC10", "MD11"];
const REGIONAL_PREFIXES = ["CRJ", "E135", "E145", "E170", "E175", "E190", "E195"];
const NARROWBODY_PREFIXES = ["A220", "A318", "A319", "A320", "A321", "B717", "B727", "B737", "B757", "DC9", "MD8", "MD9"];
const LIVERY_TAGS = new Set<AircraftNotabilityTag>([
  "SPECIAL_LIVERY",
  "RETRO_LIVERY",
  "ANNIVERSARY_LIVERY",
  "COMMEMORATIVE_LIVERY",
  "PROMOTIONAL_LIVERY",
  "ALLIANCE_LIVERY",
  "ONE_OFF_LIVERY",
]);

function categoryFor(code: string | null): AircraftCategory {
  const normalized = code?.toUpperCase() ?? "";
  if (WIDEBODY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return "WIDEBODY";
  if (REGIONAL_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return "REGIONAL";
  if (NARROWBODY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return "NARROWBODY";
  return "UNKNOWN";
}

function familyFor(code: string | null): string {
  if (!code) return "Unknown aircraft";
  const upper = code.toUpperCase();
  if (["A318", "A319", "A320", "A321"].some((value) => upper.startsWith(value))) return "A320 Family";
  if (upper.startsWith("CRJ")) return "CRJ Family";
  for (const prefix of [...WIDEBODY_PREFIXES, ...REGIONAL_PREFIXES, ...NARROWBODY_PREFIXES]) {
    if (upper.startsWith(prefix)) return prefix;
  }
  return code;
}

function airport(code: string | null): Airport {
  return { code: code ?? "—", name: "Airport details unavailable", city: "" };
}

function relevantTime(
  item: ScoredSpotterInterestMovement,
  kind: "scheduled" | "estimated",
): Date {
  const movement = item.movement;
  const scheduled = movement.movementType === "ARRIVAL"
    ? movement.scheduledArrivalTime
    : movement.scheduledDepartureTime;
  const estimated = movement.movementType === "ARRIVAL"
    ? movement.estimatedArrivalTime
    : movement.estimatedDepartureTime;
  return kind === "scheduled"
    ? scheduled ?? estimated ?? movement.observedAt
    : estimated ?? scheduled ?? movement.observedAt;
}

export function toDailySpotlightMovement(
  item: ScoredSpotterInterestMovement,
): SpotlightMovementView & { spotterInterest: SpotterInterestResult } {
  const movement = item.movement;
  const displayType = movement.aircraftType ?? "Type unavailable";
  const normalizedType = item.aircraftTypeNormalization.referenceVariant
    ?? movement.aircraftType;
  const hasLiveryEvidence = item.sources.notability === "REFERENCE"
    && item.facts.notability.tags.some((tag) => LIVERY_TAGS.has(tag));
  const rankable: RankableAircraftMovement = {
    ...movement,
    scheduledTime: relevantTime(item, "scheduled").toISOString(),
    estimatedTime: relevantTime(item, "estimated").toISOString(),
    flight: {
      number: movement.ident || "Flight unavailable",
      airline: {
        code: movement.operatorIcao ?? "—",
        name: movement.operatorIcao ? `Operator ${movement.operatorIcao}` : "Operator unavailable",
      },
      origin: airport(movement.originAirport),
      destination: airport(movement.destinationAirport),
    },
    aircraft: {
      type: displayType,
      family: familyFor(normalizedType),
      category: categoryFor(normalizedType),
      registration: movement.registration,
      livery: {
        name: hasLiveryEvidence ? "Reference livery match" : "Livery information unavailable",
        isSpecial: hasLiveryEvidence,
      },
    },
    spotterFacts: item.facts,
  };

  return {
    ...rankable,
    spotterInterest: item.spotterInterest,
    enrichmentSources: item.sources,
    aircraftTypeNormalization: item.aircraftTypeNormalization,
  };
}
