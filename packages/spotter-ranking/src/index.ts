import type { AircraftMovement, SpotterTag } from "../../domain/src";

export const SPOTTER_TAG_WEIGHTS: Record<SpotterTag, number> = {
  SPECIAL_LIVERY: 40,
  RARE_AIRCRAFT_TYPE: 30,
  RARE_AIRLINE: 25,
  WIDEBODY: 5,
  LONG_HAUL: 5,
};

export const SPOTTER_TAG_LABELS: Record<SpotterTag, string> = {
  SPECIAL_LIVERY: "Special Livery",
  RARE_AIRCRAFT_TYPE: "Rare Aircraft",
  RARE_AIRLINE: "Rare Visitor",
  WIDEBODY: "Widebody",
  LONG_HAUL: "Long-haul",
};

export function getSpotterScore(movement: AircraftMovement): number {
  return movement.spotter.tags.reduce(
    (score, tag) => score + SPOTTER_TAG_WEIGHTS[tag],
    0,
  );
}

export function rankBySpotterInterest(
  movements: AircraftMovement[],
): AircraftMovement[] {
  return [...movements].sort((first, second) => {
    const scoreDifference = getSpotterScore(second) - getSpotterScore(first);
    return scoreDifference || first.estimatedTime.localeCompare(second.estimatedTime);
  });
}

export function getSpotlightMovements(
  movements: AircraftMovement[],
  limit = 4,
): AircraftMovement[] {
  return rankBySpotterInterest(movements)
    .filter((movement) => getSpotterScore(movement) > 0)
    .slice(0, limit);
}
