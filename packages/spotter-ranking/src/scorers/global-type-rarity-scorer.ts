import type { GlobalTypeRarityFacts } from "../../../domain/src/index.ts";
import type {
  ScoreResult,
  SpotterDimensionScorer,
  SpotterReason,
} from "../types.ts";

const scoreFleetSize = (fleetSize: number): { score: number; band: string } => {
  if (fleetSize > 1000) return { score: 0, band: "> 1000" };
  if (fleetSize >= 500) return { score: 10, band: "500–1000" };
  if (fleetSize >= 250) return { score: 20, band: "250–499" };
  if (fleetSize >= 100) return { score: 35, band: "100–249" };
  if (fleetSize >= 50) return { score: 50, band: "50–99" };
  if (fleetSize >= 20) return { score: 70, band: "20–49" };
  if (fleetSize >= 10) return { score: 85, band: "10–19" };
  return { score: 100, band: "< 10" };
};

const reasonForScore = (score: number): SpotterReason[] => {
  if (score === 100) return ["EXTREMELY_RARE_TYPE"];
  if (score >= 50) return ["GLOBALLY_RARE_TYPE"];
  if (score > 0) return ["GLOBALLY_UNCOMMON_TYPE"];
  return [];
};

export class GlobalTypeRarityScorer
implements SpotterDimensionScorer<GlobalTypeRarityFacts> {
  score(input: GlobalTypeRarityFacts): ScoreResult {
    const activeGlobalFleetSize = Math.max(0, input.activeGlobalFleetSize);
    const result = scoreFleetSize(activeGlobalFleetSize);

    return {
      score: result.score,
      reasons: reasonForScore(result.score),
      debug: {
        variant: input.variant,
        activeGlobalFleetSize,
        matchedFleetBand: result.band,
      },
    };
  }
}
