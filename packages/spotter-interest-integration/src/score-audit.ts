import {
  deduplicateRankedAircraft,
  rankScoredMovements,
} from "./analysis.ts";
import type {
  EnrichmentDimension,
  ScoreAuditEntry,
  ScoredSpotterInterestMovement,
} from "./types.ts";

const DIMENSIONS: EnrichmentDimension[] = [
  "notability",
  "globalTypeRarity",
  "localTypeRarity",
  "registrationRarity",
];

export function buildScoreAuditEntries(
  movements: readonly ScoredSpotterInterestMovement[],
  top: number,
): ScoreAuditEntry[] {
  const ranked = rankScoredMovements(movements);
  const movementRanks = new Map(
    ranked.map((item, index) => [item, index + 1]),
  );
  const aircraftRanked = deduplicateRankedAircraft(ranked);
  const aircraftRanks = new Map(
    aircraftRanked.map((item, index) => [item, index + 1]),
  );

  return ranked.map((item) => {
    const supportedDimensionCount = DIMENSIONS.filter(
      (dimension) => item.sources[dimension] === "REFERENCE",
    ).length;
    const aircraftLevelRank = aircraftRanks.get(item) ?? null;

    return {
      item,
      movementRank: movementRanks.get(item) ?? 0,
      aircraftLevelRank,
      isTopN: aircraftLevelRank !== null && aircraftLevelRank <= top,
      supportedDimensionCount,
      enrichmentCompleteness: `${supportedDimensionCount}/4`,
    };
  });
}
