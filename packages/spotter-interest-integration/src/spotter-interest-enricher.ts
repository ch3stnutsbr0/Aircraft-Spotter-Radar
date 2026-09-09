import type {
  AircraftMovement,
  SpotterInterestFacts,
} from "../../domain/src/index.ts";
import { SpotterInterestService } from "../../spotter-ranking/src/index.ts";
import { normalizeAircraftTypeCode } from "./aircraft-type-normalizer.ts";
import {
  ACTIVE_FLEET_BY_VARIANT,
  ATL_MOVEMENTS_BY_VARIANT,
  ATL_REFERENCE_AIRPORT,
  ATL_REFERENCE_TOTAL_MOVEMENTS_90D,
  ATL_REGISTRATION_HISTORY,
  LOCAL_REFERENCE_WINDOW_DAYS,
  NOTABILITY_BY_REGISTRATION,
  REGISTRATION_REFERENCE_WINDOW_DAYS,
  toReferenceAirportCode,
} from "./reference-data.ts";
import type {
  EnrichedSpotterInterestInput,
  ScoredSpotterInterestMovement,
} from "./types.ts";

const NEUTRAL_GLOBAL_FLEET_SIZE = 1001;

function hasOwn(record: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

export class SpotterInterestEnricher {
  enrich(
    movement: AircraftMovement,
    airportCode: string,
  ): EnrichedSpotterInterestInput {
    const registration = movement.registration?.trim().toUpperCase() || null;
    const typeNormalization = normalizeAircraftTypeCode(movement.aircraftType);
    const referenceVariant = typeNormalization.referenceVariant;
    const referenceAirport = toReferenceAirportCode(airportCode);
    const hasAtlReference = referenceAirport === ATL_REFERENCE_AIRPORT;

    const notabilityMatch = registration !== null
      && hasOwn(NOTABILITY_BY_REGISTRATION, registration);
    const globalTypeMatch = referenceVariant !== null
      && hasOwn(ACTIVE_FLEET_BY_VARIANT, referenceVariant);
    const localTypeMatch = hasAtlReference
      && referenceVariant !== null
      && hasOwn(ATL_MOVEMENTS_BY_VARIANT, referenceVariant);
    const registrationMatch = hasAtlReference
      && registration !== null
      && hasOwn(ATL_REGISTRATION_HISTORY, registration);

    const facts: SpotterInterestFacts = {
      notability: {
        tags: notabilityMatch
          ? [...NOTABILITY_BY_REGISTRATION[registration]]
          : [],
      },
      globalTypeRarity: {
        variant: referenceVariant ?? typeNormalization.rawCode ?? "UNKNOWN",
        // Unknown fleet size must be numerically neutral, not treated as rare.
        activeGlobalFleetSize: globalTypeMatch
          ? ACTIVE_FLEET_BY_VARIANT[referenceVariant]
          : NEUTRAL_GLOBAL_FLEET_SIZE,
      },
      localTypeRarity: localTypeMatch
        ? {
            airportCode: referenceAirport,
            variant: referenceVariant,
            historicalWindowDays: LOCAL_REFERENCE_WINDOW_DAYS,
            typeMovements: ATL_MOVEMENTS_BY_VARIANT[referenceVariant],
            totalMovements: ATL_REFERENCE_TOTAL_MOVEMENTS_90D,
            dataQuality: "SUFFICIENT",
          }
        : {
            airportCode: referenceAirport,
            variant: referenceVariant ?? typeNormalization.rawCode ?? "UNKNOWN",
            historicalWindowDays: LOCAL_REFERENCE_WINDOW_DAYS,
            typeMovements: 0,
            totalMovements: 0,
            dataQuality: "INSUFFICIENT",
          },
      registrationRarity: registrationMatch
        ? {
            airportCode: referenceAirport,
            registration,
            historicalWindowDays: REGISTRATION_REFERENCE_WINDOW_DAYS,
            ...ATL_REGISTRATION_HISTORY[registration],
          }
        : {
            airportCode: referenceAirport,
            // Passing an unknown real registration with zero visits would
            // fabricate a first visit. Null is the scorer's neutral contract.
            registration: null,
            historicalWindowDays: REGISTRATION_REFERENCE_WINDOW_DAYS,
            visits: 0,
            daysSinceLastVisit: null,
          },
    };

    return {
      movement,
      airportCode: referenceAirport,
      facts,
      sources: {
        movement: "LIVE",
        aircraftType: movement.aircraftType ? "LIVE" : "MISSING",
        registration: registration ? "LIVE" : "MISSING",
        notability: notabilityMatch ? "REFERENCE" : "MISSING",
        globalTypeRarity: globalTypeMatch ? "REFERENCE" : "MISSING",
        localTypeRarity: localTypeMatch ? "REFERENCE" : "MISSING",
        registrationRarity: registrationMatch ? "REFERENCE" : "MISSING",
      },
      aircraftTypeNormalization: typeNormalization,
    };
  }
}

export function scoreRealMovements(
  movements: readonly AircraftMovement[],
  airportCode: string,
  enricher = new SpotterInterestEnricher(),
  service = new SpotterInterestService(),
): ScoredSpotterInterestMovement[] {
  return movements.map((movement) => {
    const enriched = enricher.enrich(movement, airportCode);
    return {
      ...enriched,
      spotterInterest: service.evaluate(enriched.facts),
    };
  });
}
