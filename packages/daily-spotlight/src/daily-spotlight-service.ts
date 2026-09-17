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

const MAXIMUM_SPOTLIGHT_COUNT = 5;

function selectSpotlight(
  movements: readonly DailySpotlightMovement[],
): DailySpotlightMovement[] {
  const seenAircraft = new Set<string>();

  return movements
    .filter((movement) => movement.ranking.tier === "SPOTLIGHT")
    .filter((movement) => {
      const identity = movement.aircraft.registration
        ? `registration:${movement.aircraft.registration.toUpperCase()}`
        : `movement:${movement.id}`;
      if (seenAircraft.has(identity)) return false;
      seenAircraft.add(identity);
      return true;
    })
    .slice(0, MAXIMUM_SPOTLIGHT_COUNT);
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

    let rankedMovements;
    try {
      rankedMovements = await this.dependencies.ranker.rank(
        batch.movements,
        {
          airport,
          windowStart: query.start,
          windowEnd: query.end,
        },
      );
    } catch (error) {
      if (error instanceof DailySpotlightError) throw error;
      throw new DailySpotlightError(
        "INTEGRATION_FAILURE",
        "Aircraft movements could not be ranked for this window.",
        { cause: error },
      );
    }

    if (rankedMovements.length !== batch.movements.length) {
      throw new DailySpotlightError(
        "INTEGRATION_FAILURE",
        "The movement ranker must preserve the complete movement list.",
      );
    }

    const ordered = [...rankedMovements].sort((first, second) => first.rank - second.rank);
    const ranked: DailySpotlightMovement[] = ordered.map(({ movement, ...ranking }) => ({
      ...movement,
      ranking,
      movementRank: ranking.rank,
    }));

    await this.dependencies.afterFreshGeneration?.({
      query: normalizedQuery,
      batch,
      scoredMovements: ranked,
    });
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
