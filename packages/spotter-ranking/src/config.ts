import type { AircraftNotabilityTag } from "../../domain/src/index.ts";

export const SPOTTER_INTEREST_V0_1_CONFIG = {
  version: "0.1",
  weights: {
    notability: 0.35,
    globalTypeRarity: 0.30,
    localTypeRarity: 0.20,
    registrationRarity: 0.15,
  },
  thresholds: {
    interesting: 25,
    spotlight: 40,
  },
  maximumSpotlightCount: 5,
  notability: {
    scores: {
      SPECIAL_LIVERY: 70,
      RETRO_LIVERY: 55,
      ANNIVERSARY_LIVERY: 45,
      COMMEMORATIVE_LIVERY: 45,
      PROMOTIONAL_LIVERY: 30,
      ALLIANCE_LIVERY: 20,
      ONE_OFF_LIVERY: 90,
      FIRST_OF_TYPE_FOR_AIRLINE: 45,
      LAST_OF_TYPE_FOR_AIRLINE: 55,
      FIRST_DELIVERED_TO_AIRLINE: 50,
      LAST_DELIVERED_TO_AIRLINE: 55,
      FIRST_PRODUCTION_AIRFRAME: 80,
      LAST_PRODUCTION_AIRFRAME: 85,
      PROTOTYPE: 85,
      TEST_AIRCRAFT: 85,
      HISTORICALLY_SIGNIFICANT_AIRFRAME: 40,
      OTHER_NOTABLE_HISTORY: 40,
    } satisfies Record<AircraftNotabilityTag, number>,
    secondaryContribution: 0.25,
    tertiaryContribution: 0.10,
    maximumScore: 100,
    curatedHistoricalRange: {
      minimum: 40,
      maximum: 90,
    },
  },
  localTypeRarity: {
    historicalWindowDays: 90,
  },
  registrationRarity: {
    historicalWindowDays: 365,
  },
} as const;
