import { SPOTTER_INTEREST_V0_1_CONFIG } from "../../spotter-ranking/src/index.ts";
import { DailySpotlightError } from "./errors.ts";
import type {
  DailySpotlightDependencies,
  DailySpotlightMovement,
  DailySpotlightQuery,
  DailySpotlightResult,
} from "./types.ts";

function validateQuery(query: DailySpotlightQuery): void {
  if (!query.airport.trim()) throw new Error("Spotlight airport is required.");
  if (
    Number.isNaN(query.start.getTime())
    || Number.isNaN(query.end.getTime())
    || query.start >= query.end
  ) {
    throw new Error("Spotlight requires a valid start time before its end time.");
  }
  if (!Number.isInteger(query.maxPages) || query.maxPages < 1) {
    throw new Error("Spotlight maxPages must be a positive integer.");
  }
}

function rankMovements(
  movements: readonly DailySpotlightMovement[],
): DailySpotlightMovement[] {
  return [...movements].sort((first, second) => {
    const scoreDifference = second.spotterInterest.score - first.spotterInterest.score;
    return scoreDifference || first.estimatedTime.localeCompare(second.estimatedTime);
  });
}

function selectSpotlight(
  movements: readonly DailySpotlightMovement[],
): DailySpotlightMovement[] {
  const seenAircraft = new Set<string>();

  return rankMovements(movements)
    .filter((movement) =>
      movement.spotterInterest.score
        >= SPOTTER_INTEREST_V0_1_CONFIG.thresholds.spotlight
    )
    .filter((movement) => {
      const identity = movement.aircraft.registration
        ? `registration:${movement.aircraft.registration.toUpperCase()}`
        : `movement:${movement.id}`;
      if (seenAircraft.has(identity)) return false;
      seenAircraft.add(identity);
      return true;
    })
    .slice(0, SPOTTER_INTEREST_V0_1_CONFIG.maximumSpotlightCount);
}

export class DailySpotlightService {
  private readonly dependencies: DailySpotlightDependencies;

  constructor(dependencies: DailySpotlightDependencies) {
    this.dependencies = dependencies;
  }

  async generate(query: DailySpotlightQuery): Promise<DailySpotlightResult> {
    validateQuery(query);
    const airport = query.airport.trim().toUpperCase();
    const normalizedQuery = { ...query, airport };
    let batch;
    try {
      batch = await this.dependencies.getMovements(normalizedQuery);
    } catch (error) {
      if (error instanceof DailySpotlightError) throw error;
      throw new DailySpotlightError(
        "PROVIDER_UNAVAILABLE",
        "Live aircraft data is temporarily unavailable.",
        { cause: error },
      );
    }

    let scoredMovements;
    try {
      scoredMovements = await this.dependencies.enrichAndScore(
        batch.movements,
        airport,
      );
    } catch (error) {
      if (error instanceof DailySpotlightError) throw error;
      throw new DailySpotlightError(
        "INTEGRATION_FAILURE",
        "Aircraft movements could not be ranked for this window.",
        { cause: error },
      );
    }

    if (scoredMovements.length !== batch.movements.length) {
      throw new DailySpotlightError(
        "INTEGRATION_FAILURE",
        "Spotlight enrichment must preserve the complete movement list.",
      );
    }

    await this.dependencies.afterFreshGeneration?.({
      query: normalizedQuery,
      batch,
      scoredMovements,
    });

    const ranked = rankMovements(scoredMovements).map((movement, index) => ({
      ...movement,
      movementRank: index + 1,
    }));
    const spotlightMovements = selectSpotlight(ranked);

    return {
      airport,
      source: this.dependencies.source,
      generatedAt: batch.observedAt.toISOString(),
      windowStart: query.start.toISOString(),
      windowEnd: query.end.toISOString(),
      movements: ranked,
      spotlightMovements,
      diagnostics: {
        ...batch.diagnostics,
        scoredMovements: ranked.length,
        spotlightMovements: spotlightMovements.length,
      },
    };
  }
}
