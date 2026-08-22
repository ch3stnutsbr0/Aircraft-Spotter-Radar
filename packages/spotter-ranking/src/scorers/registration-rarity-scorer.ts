import type { RegistrationRarityFacts } from "../../../domain/src/index.ts";
import type {
  ScoreResult,
  SpotterDimensionScorer,
  SpotterReason,
} from "../types.ts";
import { clampScore, unique } from "../utils.ts";

const visitScore = (visits: number): { score: number; band: string } => {
  if (visits > 30) return { score: 0, band: "> 30" };
  if (visits >= 15) return { score: 10, band: "15–30" };
  if (visits >= 8) return { score: 20, band: "8–14" };
  if (visits >= 4) return { score: 35, band: "4–7" };
  if (visits >= 2) return { score: 50, band: "2–3" };
  if (visits === 1) return { score: 70, band: "1" };
  return { score: 90, band: "0" };
};

const absenceBonus = (
  daysSinceLastVisit: number | null,
): { bonus: number; band: string } => {
  if (daysSinceLastVisit === null) return { bonus: 40, band: "never recorded" };
  if (daysSinceLastVisit >= 365) return { bonus: 30, band: ">= 365 days" };
  if (daysSinceLastVisit >= 180) return { bonus: 20, band: "180–364 days" };
  if (daysSinceLastVisit >= 90) return { bonus: 10, band: "90–179 days" };
  if (daysSinceLastVisit >= 30) return { bonus: 5, band: "30–89 days" };
  return { bonus: 0, band: "< 30 days" };
};

export class RegistrationRarityScorer
implements SpotterDimensionScorer<RegistrationRarityFacts> {
  score(input: RegistrationRarityFacts): ScoreResult {
    if (!input.registration) {
      return {
        score: 0,
        reasons: [],
        debug: {
          airportCode: input.airportCode,
          registration: null,
          historicalWindowDays: input.historicalWindowDays,
          status: "registration unavailable",
        },
      };
    }

    const visits = Math.max(0, Math.floor(input.visits));
    const daysSinceLastVisit = input.daysSinceLastVisit === null
      ? null
      : Math.max(0, Math.floor(input.daysSinceLastVisit));
    const base = visitScore(visits);
    const absence = absenceBonus(daysSinceLastVisit);
    const reasons: SpotterReason[] = [];

    if (base.score >= 50) reasons.push("RARE_VISITOR");
    if (absence.bonus >= 20) reasons.push("LONG_ABSENCE");
    if (daysSinceLastVisit === null) reasons.push("FIRST_RECORDED_VISIT");

    return {
      score: clampScore(base.score + absence.bonus),
      reasons: unique(reasons),
      debug: {
        airportCode: input.airportCode,
        registration: input.registration,
        historicalWindowDays: input.historicalWindowDays,
        visits,
        daysSinceLastVisit,
        visitCountScore: base.score,
        visitCountBand: base.band,
        lastVisitBonus: absence.bonus,
        lastVisitBand: absence.band,
        uncappedScore: base.score + absence.bonus,
      },
    };
  }
}
