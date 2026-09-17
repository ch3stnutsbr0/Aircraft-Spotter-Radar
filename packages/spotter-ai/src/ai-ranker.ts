import type { AircraftMovement } from "../../domain/src/index.ts";
import type {
  MovementRanker,
  RankedMovement,
  RankingContext,
} from "../../daily-spotlight/src/index.ts";
import type { AIRankerConfig } from "./types.ts";

/** Future local AI ranker boundary. No model or inference runtime exists yet. */
export class AIRanker implements MovementRanker {
  readonly id = "ai";
  readonly config: AIRankerConfig;

  constructor(config: AIRankerConfig) {
    this.config = config;
  }

  async rank(
    _movements: readonly AircraftMovement[],
    _context: RankingContext,
  ): Promise<RankedMovement[]> {
    throw new Error("AIRanker is not implemented. Use SPOTLIGHT_RANKER=legacy-rule.");
  }
}
