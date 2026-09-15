import type { AircraftTypeNormalization } from "./types.ts";
import {
  spotterReferenceCatalog,
  type SpotterReferenceCatalog,
} from "./reference-catalog.ts";

const AMBIGUOUS_CODES: Readonly<Record<string, string>> = {
  B748: "B748 does not distinguish the reference data's passenger and freighter variants.",
  B763: "B763 does not establish the freighter-specific variant used by the reference data.",
  B772: "B772 does not establish the exact B777-200 reference variant.",
};

export function normalizeAircraftTypeCode(
  aircraftType: string | null,
  catalog: SpotterReferenceCatalog = spotterReferenceCatalog,
): AircraftTypeNormalization {
  const rawCode = aircraftType?.trim().toUpperCase() || null;

  if (!rawCode) {
    return {
      rawCode: null,
      referenceVariant: null,
      status: "MISSING",
      note: "FlightAware aircraft type is unavailable.",
    };
  }

  const referenceType = catalog.findAircraftType(rawCode);
  if (referenceType) {
    return {
      rawCode,
      referenceVariant: referenceType.typeId,
      status: "MATCHED",
      note: `${rawCode} maps to the established reference variant ${referenceType.typeId}.`,
    };
  }

  const ambiguity = AMBIGUOUS_CODES[rawCode];
  if (ambiguity) {
    return {
      rawCode,
      referenceVariant: null,
      status: "AMBIGUOUS",
      note: ambiguity,
    };
  }

  return {
    rawCode,
    referenceVariant: null,
    status: "UNKNOWN",
    note: `No reviewed reference-variant mapping exists for ${rawCode}.`,
  };
}
