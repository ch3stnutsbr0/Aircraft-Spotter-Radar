import type { AircraftNotabilityFacts } from "../../../domain/src/index.ts";
import { SPOTTER_INTEREST_V0_1_CONFIG } from "../config.ts";
import type { ScoreResult, SpotterDimensionScorer } from "../types.ts";
import { clampScore, roundScore, unique } from "../utils.ts";

const curatedTags = new Set([
  "HISTORICALLY_SIGNIFICANT_AIRFRAME",
  "OTHER_NOTABLE_HISTORY",
]);

export class AircraftNotabilityScorer
implements SpotterDimensionScorer<AircraftNotabilityFacts> {
  score(input: AircraftNotabilityFacts): ScoreResult {
    const tagScores = input.tags
      .map((tag) => {
        const configuredScore = SPOTTER_INTEREST_V0_1_CONFIG.notability.scores[tag];
        const curatedScore = curatedTags.has(tag)
          ? input.curatedScores?.[
              tag as keyof NonNullable<AircraftNotabilityFacts["curatedScores"]>
            ]
          : undefined;
        const score = curatedScore === undefined
          ? configuredScore
          : Math.min(
              SPOTTER_INTEREST_V0_1_CONFIG.notability.curatedHistoricalRange.maximum,
              Math.max(
                SPOTTER_INTEREST_V0_1_CONFIG.notability.curatedHistoricalRange.minimum,
                curatedScore,
              ),
            );

        return { tag, score };
      })
      .sort((first, second) => second.score - first.score);

    const rawScore = tagScores.reduce((total, item, index) => {
      if (index === 0) return total + item.score;
      if (index === 1) {
        return total
          + item.score * SPOTTER_INTEREST_V0_1_CONFIG.notability.secondaryContribution;
      }
      if (index === 2) {
        return total
          + item.score * SPOTTER_INTEREST_V0_1_CONFIG.notability.tertiaryContribution;
      }
      return total;
    }, 0);

    return {
      score: roundScore(clampScore(rawScore)),
      reasons: unique(input.tags),
      debug: {
        tagScores,
        rawScore: roundScore(rawScore),
        combination: "highest + 25% second + 10% third",
        maximumScore: SPOTTER_INTEREST_V0_1_CONFIG.notability.maximumScore,
      },
    };
  }
}
