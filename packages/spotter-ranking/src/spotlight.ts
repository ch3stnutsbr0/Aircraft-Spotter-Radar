import { SPOTTER_INTEREST_V0_1_CONFIG } from "./config.ts";
import type { ScoredAircraftMovement } from "./types.ts";

export function getSpotterScore(movement: ScoredAircraftMovement): number {
  return movement.spotterInterest.score;
}

export function rankBySpotterInterest(
  movements: ScoredAircraftMovement[],
): ScoredAircraftMovement[] {
  return [...movements].sort((first, second) => {
    const scoreDifference = getSpotterScore(second) - getSpotterScore(first);
    return scoreDifference || first.estimatedTime.localeCompare(second.estimatedTime);
  });
}

export function getSpotlightMovements(
  movements: ScoredAircraftMovement[],
): ScoredAircraftMovement[] {
  const seenAircraft = new Set<string>();

  return rankBySpotterInterest(movements)
    .filter(
      (movement) =>
        movement.spotterInterest.score
          >= SPOTTER_INTEREST_V0_1_CONFIG.thresholds.spotlight,
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
