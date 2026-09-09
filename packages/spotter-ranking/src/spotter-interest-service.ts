import type {
  RankableAircraftMovement,
  SpotterInterestFacts,
} from "../../domain/src/index.ts";
import { SPOTTER_INTEREST_V0_1_CONFIG } from "./config.ts";
import { AircraftNotabilityScorer } from "./scorers/aircraft-notability-scorer.ts";
import { GlobalTypeRarityScorer } from "./scorers/global-type-rarity-scorer.ts";
import { LocalTypeRarityScorer } from "./scorers/local-type-rarity-scorer.ts";
import { RegistrationRarityScorer } from "./scorers/registration-rarity-scorer.ts";
import type {
  ScoredAircraftMovement,
  SpotterInterestClassification,
  SpotterInterestResult,
} from "./types.ts";
import { roundScore, unique } from "./utils.ts";

export class SpotterInterestService {
  private readonly notabilityScorer: AircraftNotabilityScorer;
  private readonly globalTypeRarityScorer: GlobalTypeRarityScorer;
  private readonly localTypeRarityScorer: LocalTypeRarityScorer;
  private readonly registrationRarityScorer: RegistrationRarityScorer;

  constructor(
    notabilityScorer = new AircraftNotabilityScorer(),
    globalTypeRarityScorer = new GlobalTypeRarityScorer(),
    localTypeRarityScorer = new LocalTypeRarityScorer(),
    registrationRarityScorer = new RegistrationRarityScorer(),
  ) {
    this.notabilityScorer = notabilityScorer;
    this.globalTypeRarityScorer = globalTypeRarityScorer;
    this.localTypeRarityScorer = localTypeRarityScorer;
    this.registrationRarityScorer = registrationRarityScorer;
  }

  evaluate(facts: SpotterInterestFacts): SpotterInterestResult {
    const dimensions = {
      notability: this.notabilityScorer.score(facts.notability),
      globalTypeRarity: this.globalTypeRarityScorer.score(facts.globalTypeRarity),
      localTypeRarity: this.localTypeRarityScorer.score(facts.localTypeRarity),
      registrationRarity: this.registrationRarityScorer.score(
        facts.registrationRarity,
      ),
    };
    const weightedContributions = {
      notability: roundScore(
        dimensions.notability.score
          * SPOTTER_INTEREST_V0_1_CONFIG.weights.notability,
      ),
      globalTypeRarity: roundScore(
        dimensions.globalTypeRarity.score
          * SPOTTER_INTEREST_V0_1_CONFIG.weights.globalTypeRarity,
      ),
      localTypeRarity: roundScore(
        dimensions.localTypeRarity.score
          * SPOTTER_INTEREST_V0_1_CONFIG.weights.localTypeRarity,
      ),
      registrationRarity: roundScore(
        dimensions.registrationRarity.score
          * SPOTTER_INTEREST_V0_1_CONFIG.weights.registrationRarity,
      ),
    };
    const score = roundScore(
      Object.values(weightedContributions).reduce(
        (total, contribution) => total + contribution,
        0,
      ),
    );
    const classification: SpotterInterestClassification =
      score >= SPOTTER_INTEREST_V0_1_CONFIG.thresholds.spotlight
        ? "SPOTLIGHT"
        : score >= SPOTTER_INTEREST_V0_1_CONFIG.thresholds.interesting
          ? "INTERESTING"
          : "ROUTINE";

    return {
      score,
      dimensions,
      weightedContributions,
      reasons: unique(Object.values(dimensions).flatMap((result) => result.reasons)),
      classification,
    };
  }

  scoreMovement(movement: RankableAircraftMovement): ScoredAircraftMovement {
    return {
      ...movement,
      spotterInterest: this.evaluate(movement.spotterFacts),
    };
  }

  scoreMovements(movements: RankableAircraftMovement[]): ScoredAircraftMovement[] {
    return movements.map((movement) => this.scoreMovement(movement));
  }
}

export const spotterInterestService = new SpotterInterestService();
