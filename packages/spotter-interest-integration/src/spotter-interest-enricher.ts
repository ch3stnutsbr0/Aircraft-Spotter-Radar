import type {
  AircraftMovement,
  SpotterInterestFacts,
} from "../../domain/src/index.ts";
import {
  SPOTTER_INTEREST_V0_1_CONFIG,
  SpotterInterestService,
} from "../../spotter-ranking/src/index.ts";
import { normalizeAircraftTypeCode } from "./aircraft-type-normalizer.ts";
import {
  normalizeReferenceAirportCode,
  spotterReferenceCatalog,
  type SpotterReferenceCatalog,
} from "./reference-catalog.ts";
import type {
  EnrichedSpotterInterestInput,
  ScoredSpotterInterestMovement,
} from "./types.ts";

const NEUTRAL_GLOBAL_FLEET_SIZE = 1001;

export interface SpotterInterestLookupInput {
  aircraftType: string | null;
  registration: string | null;
  airportCode: string;
}

export interface SpotterInterestReferenceFacts {
  facts: SpotterInterestFacts;
  sources: EnrichedSpotterInterestInput["sources"];
  aircraftTypeNormalization: EnrichedSpotterInterestInput["aircraftTypeNormalization"];
}

export class SpotterInterestEnricher {
  private readonly catalog: SpotterReferenceCatalog;

  constructor(catalog: SpotterReferenceCatalog = spotterReferenceCatalog) {
    this.catalog = catalog;
  }

  lookup(input: SpotterInterestLookupInput): SpotterInterestReferenceFacts {
    const registration = input.registration?.trim().toUpperCase() || null;
    const typeNormalization = normalizeAircraftTypeCode(
      input.aircraftType,
      this.catalog,
    );
    const referenceVariant = typeNormalization.referenceVariant;
    const referenceAirport = normalizeReferenceAirportCode(input.airportCode);
    const notability = registration
      ? this.catalog.findNotability(registration)
      : undefined;
    const globalType = referenceVariant
      ? this.catalog.findGlobalType(referenceVariant)
      : undefined;
    const localType = referenceVariant
      ? this.catalog.findAirportType(referenceAirport, referenceVariant)
      : undefined;
    const registrationHistory = registration
      ? this.catalog.findRegistrationHistory(referenceAirport, registration)
      : undefined;

    return {
      facts: {
        notability: {
          tags: notability ? [...notability.tags] : [],
          ...(notability?.curatedScores
            ? { curatedScores: { ...notability.curatedScores } }
            : {}),
        },
        globalTypeRarity: globalType ?? {
          variant: referenceVariant ?? typeNormalization.rawCode ?? "UNKNOWN",
          // Unknown fleet size must be numerically neutral, not treated as rare.
          activeGlobalFleetSize: NEUTRAL_GLOBAL_FLEET_SIZE,
        },
        localTypeRarity: localType
          ? {
              airportCode: localType.airportCode,
              variant: localType.variant,
              historicalWindowDays: localType.historicalWindowDays,
              typeMovements: localType.typeMovements,
              totalMovements: localType.totalMovements,
              dataQuality: localType.dataQuality,
            }
          : {
              airportCode: referenceAirport,
              variant: referenceVariant ?? typeNormalization.rawCode ?? "UNKNOWN",
              historicalWindowDays:
                SPOTTER_INTEREST_V0_1_CONFIG.localTypeRarity.historicalWindowDays,
              typeMovements: 0,
              totalMovements: 0,
              dataQuality: "INSUFFICIENT",
            },
        registrationRarity: registrationHistory
          ? {
              airportCode: registrationHistory.airportCode,
              registration: registrationHistory.registration,
              historicalWindowDays: registrationHistory.historicalWindowDays,
              visits: registrationHistory.visits,
              daysSinceLastVisit: registrationHistory.daysSinceLastVisit,
            }
          : {
              airportCode: referenceAirport,
              // An unknown real registration must not become a fabricated first visit.
              registration: null,
              historicalWindowDays:
                SPOTTER_INTEREST_V0_1_CONFIG.registrationRarity.historicalWindowDays,
              visits: 0,
              daysSinceLastVisit: null,
            },
      },
      sources: {
        movement: "LIVE",
        aircraftType: input.aircraftType ? "LIVE" : "MISSING",
        registration: registration ? "LIVE" : "MISSING",
        notability: notability ? "REFERENCE" : "MISSING",
        globalTypeRarity: globalType ? "REFERENCE" : "MISSING",
        localTypeRarity: localType ? "REFERENCE" : "MISSING",
        registrationRarity: registrationHistory ? "REFERENCE" : "MISSING",
      },
      aircraftTypeNormalization: typeNormalization,
    };
  }

  enrich(
    movement: AircraftMovement,
    airportCode: string,
  ): EnrichedSpotterInterestInput {
    const reference = this.lookup({
      aircraftType: movement.aircraftType,
      registration: movement.registration,
      airportCode,
    });

    return {
      movement,
      airportCode: normalizeReferenceAirportCode(airportCode),
      ...reference,
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
