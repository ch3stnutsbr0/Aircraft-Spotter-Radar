import type { AircraftTypeNormalization } from "./types.ts";

const REFERENCE_VARIANT_BY_ICAO_TYPE: Readonly<Record<string, string>> = {
  A20N: "A320neo",
  A21N: "A321neo",
  A320: "A320-200",
  A321: "A321-200",
  A333: "A330-300",
  A339: "A330-900neo",
  A359: "A350-900",
  A35K: "A350-1000",
  B38M: "B737 MAX 8",
  B39M: "B737 MAX 9",
  B712: "B717-200",
  B737: "B737-700",
  B738: "B737-800",
  B739: "B737-900ER",
  B752: "B757-200",
  B77W: "B777-300ER",
  B789: "B787-9",
  B78X: "B787-10",
  BCS3: "A220-300",
  CRJ9: "CRJ-900",
  E75L: "E175",
};

const AMBIGUOUS_CODES: Readonly<Record<string, string>> = {
  B748: "B748 does not distinguish the reference data's passenger and freighter variants.",
  B763: "B763 does not establish the freighter-specific variant used by the reference data.",
  B772: "B772 does not establish the exact B777-200 reference variant.",
};

export function normalizeAircraftTypeCode(
  aircraftType: string | null,
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

  const referenceVariant = REFERENCE_VARIANT_BY_ICAO_TYPE[rawCode];
  if (referenceVariant) {
    return {
      rawCode,
      referenceVariant,
      status: "MATCHED",
      note: `${rawCode} maps to the established reference variant ${referenceVariant}.`,
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
