import type {
  AircraftMovement,
  RankableAircraftMovement,
} from "../../domain/src/index.ts";
import {
  SpotterInterestEnricher,
} from "../../spotter-interest-integration/src/index.ts";
import {
  SPOTTER_REASON_LABELS,
  SpotterInterestService,
  type SpotterInterestResult,
} from "../../spotter-ranking/src/index.ts";
import { toDailySpotlightMovement } from "./live-view-adapter.ts";
import type {
  MovementRanker,
  RankedMovement,
  RankingContext,
  SpotlightMovementView,
} from "./types.ts";

function isRankableMovement(
  movement: AircraftMovement,
): movement is RankableAircraftMovement {
  return "spotterFacts" in movement
    && "estimatedTime" in movement
    && "aircraft" in movement
    && "flight" in movement;
}

/** Adapter for the unchanged v0.1 rule scorer, now the baseline/fallback ranker. */
export class LegacyRuleRanker implements MovementRanker {
  readonly id = "legacy-rule";
  private readonly enricher: SpotterInterestEnricher;
  private readonly scorer: SpotterInterestService;

  constructor(
    enricher = new SpotterInterestEnricher(),
    scorer = new SpotterInterestService(),
  ) {
    this.enricher = enricher;
    this.scorer = scorer;
  }

  private scoreMovement(
    movement: AircraftMovement,
    airport: string,
  ): {
    movement: SpotlightMovementView & { spotterInterest: SpotterInterestResult };
    result: SpotterInterestResult;
  } {
    if (isRankableMovement(movement)) {
      const scored = this.scorer.scoreMovement(movement);
      return { movement: scored, result: scored.spotterInterest };
    }

    const enriched = this.enricher.enrich(movement, airport);
    const scored = {
      ...enriched,
      spotterInterest: this.scorer.evaluate(enriched.facts),
    };
    return {
      movement: toDailySpotlightMovement(scored),
      result: scored.spotterInterest,
    };
  }

  async rank(
    movements: readonly AircraftMovement[],
    context: RankingContext,
  ): Promise<RankedMovement[]> {
    const scored = movements.map((movement) =>
      this.scoreMovement(movement, context.airport)
    );

    return scored
      .sort((first, second) =>
        second.result.score - first.result.score
        || first.movement.estimatedTime.localeCompare(second.movement.estimatedTime)
      )
      .map(({ movement, result }, index) => ({
        movement,
        rank: index + 1,
        score: result.score,
        displayScore: result.score,
        tier: result.classification,
        reasons: result.reasons.map((code) => ({
          code,
          label: SPOTTER_REASON_LABELS[code],
        })),
        rankerId: this.id,
        metadata: { scoringVersion: "spotter-interest-v0.1" },
      }));
  }
}
