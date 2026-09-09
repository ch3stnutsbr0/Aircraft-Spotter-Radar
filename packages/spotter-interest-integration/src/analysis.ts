import type { SpotterInterestClassification } from "../../spotter-ranking/src/index.ts";
import type {
  EnrichmentCoverage,
  EnrichmentDimension,
  ScoreDistribution,
  ScoredSpotterInterestMovement,
} from "./types.ts";

const DIMENSIONS: EnrichmentDimension[] = [
  "notability",
  "globalTypeRarity",
  "localTypeRarity",
  "registrationRarity",
];

function movementTime(item: ScoredSpotterInterestMovement): number {
  const movement = item.movement;
  const time = movement.movementType === "ARRIVAL"
    ? movement.scheduledArrivalTime ?? movement.estimatedArrivalTime
    : movement.scheduledDepartureTime ?? movement.estimatedDepartureTime;
  return time?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

export function rankScoredMovements(
  movements: readonly ScoredSpotterInterestMovement[],
): ScoredSpotterInterestMovement[] {
  return [...movements].sort((left, right) =>
    right.spotterInterest.score - left.spotterInterest.score
    || movementTime(left) - movementTime(right)
    || left.movement.ident.localeCompare(right.movement.ident)
    || left.movement.id.localeCompare(right.movement.id)
  );
}

export function deduplicateRankedAircraft(
  movements: readonly ScoredSpotterInterestMovement[],
): ScoredSpotterInterestMovement[] {
  const seen = new Set<string>();

  return movements.filter((item) => {
    const registration = item.movement.registration?.trim().toUpperCase();
    const identity = registration
      ? `registration:${registration}`
      : `movement:${item.movement.id}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export function selectTopRankedAircraft(
  movements: readonly ScoredSpotterInterestMovement[],
  limit: number,
): ScoredSpotterInterestMovement[] {
  return deduplicateRankedAircraft(rankScoredMovements(movements)).slice(
    0,
    limit,
  );
}

export function buildScoreDistribution(
  movements: readonly ScoredSpotterInterestMovement[],
): ScoreDistribution {
  const distribution: ScoreDistribution = {
    zeroToTen: 0,
    tenToTwentyFive: 0,
    twentyFiveToForty: 0,
    fortyToSixty: 0,
    sixtyPlus: 0,
    classifications: {
      ROUTINE: 0,
      INTERESTING: 0,
      SPOTLIGHT: 0,
    },
  };

  for (const item of movements) {
    const score = item.spotterInterest.score;
    if (score < 10) distribution.zeroToTen += 1;
    else if (score < 25) distribution.tenToTwentyFive += 1;
    else if (score < 40) distribution.twentyFiveToForty += 1;
    else if (score < 60) distribution.fortyToSixty += 1;
    else distribution.sixtyPlus += 1;

    const classification: SpotterInterestClassification =
      item.spotterInterest.classification;
    distribution.classifications[classification] += 1;
  }

  return distribution;
}

export function buildEnrichmentCoverage(
  movements: readonly ScoredSpotterInterestMovement[],
): EnrichmentCoverage {
  const matches = {
    notability: 0,
    globalTypeRarity: 0,
    localTypeRarity: 0,
    registrationRarity: 0,
  };
  const supportedDimensionCounts = {
    allFour: 0,
    three: 0,
    two: 0,
    fewerThanTwo: 0,
  };
  const unmatchedTypeCounts = new Map<string, number>();
  const unmatchedRegistrations = new Set<string>();

  for (const item of movements) {
    const supported = DIMENSIONS.filter((dimension) => {
      const matched = item.sources[dimension] === "REFERENCE";
      if (matched) matches[dimension] += 1;
      return matched;
    }).length;

    if (supported === 4) supportedDimensionCounts.allFour += 1;
    else if (supported === 3) supportedDimensionCounts.three += 1;
    else if (supported === 2) supportedDimensionCounts.two += 1;
    else supportedDimensionCounts.fewerThanTwo += 1;

    if (
      item.sources.globalTypeRarity === "MISSING"
      && item.sources.localTypeRarity === "MISSING"
    ) {
      const code = item.aircraftTypeNormalization.rawCode ?? "(missing)";
      unmatchedTypeCounts.set(code, (unmatchedTypeCounts.get(code) ?? 0) + 1);
    }

    if (
      item.movement.registration
      && item.sources.notability === "MISSING"
      && item.sources.registrationRarity === "MISSING"
    ) {
      unmatchedRegistrations.add(item.movement.registration);
    }
  }

  return {
    total: movements.length,
    matches,
    supportedDimensionCounts,
    unmatchedAircraftTypes: [...unmatchedTypeCounts.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((left, right) =>
        right.count - left.count || left.code.localeCompare(right.code)
      )
      .slice(0, 10),
    unmatchedRegistrations: [...unmatchedRegistrations]
      .sort()
      .slice(0, 5),
  };
}
