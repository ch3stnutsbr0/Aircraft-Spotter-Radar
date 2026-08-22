import type { LocalTypeRarityFacts } from "../../../domain/src/index.ts";
import type {
  ScoreResult,
  SpotterDimensionScorer,
  SpotterReason,
} from "../types.ts";
import { roundScore } from "../utils.ts";

const scoreFrequency = (
  frequency: number,
  typeMovements: number,
): { score: number; band: string } => {
  if (typeMovements === 0) return { score: 100, band: "no recorded movements" };
  if (frequency >= 0.01) return { score: 0, band: ">= 1.0%" };
  if (frequency >= 0.005) return { score: 10, band: "0.5–<1.0%" };
  if (frequency >= 0.002) return { score: 20, band: "0.2–<0.5%" };
  if (frequency >= 0.0005) return { score: 40, band: "0.05–<0.2%" };
  if (frequency >= 0.0001) return { score: 65, band: "0.01–<0.05%" };
  return { score: 90, band: "< 0.01%" };
};

const reasonForScore = (score: number): SpotterReason[] => {
  if (score >= 65) return ["VERY_RARE_AT_HOME_AIRPORT"];
  if (score >= 40) return ["RARE_AT_HOME_AIRPORT"];
  return [];
};

export class LocalTypeRarityScorer
implements SpotterDimensionScorer<LocalTypeRarityFacts> {
  score(input: LocalTypeRarityFacts): ScoreResult {
    const typeMovements = Math.max(0, input.typeMovements);
    const totalMovements = Math.max(0, input.totalMovements);
    const hasSufficientData =
      input.dataQuality === "SUFFICIENT" && totalMovements > 0;
    const frequency = hasSufficientData ? typeMovements / totalMovements : 0;
    const result = hasSufficientData
      ? scoreFrequency(frequency, typeMovements)
      : { score: 0, band: "insufficient data" };

    return {
      score: result.score,
      reasons: reasonForScore(result.score),
      debug: {
        airportCode: input.airportCode,
        variant: input.variant,
        historicalWindowDays: input.historicalWindowDays,
        typeMovements,
        totalMovements,
        frequency: roundScore(frequency * 1000000) / 1000000,
        frequencyPercent: roundScore(frequency * 100),
        dataQuality: input.dataQuality,
        matchedFrequencyBand: result.band,
      },
    };
  }
}
