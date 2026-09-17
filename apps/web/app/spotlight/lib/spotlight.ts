import type { MovementType } from "@spotter/domain";
import type { DailySpotlightMovement } from "@spotter/daily-spotlight";

export type MovementFilter = "ALL" | MovementType;
export type SortMode = "TIME" | "INTEREST";

export interface SpotlightFilters {
  movement: MovementFilter;
  aircraftFamilies: string[];
  airlines: string[];
  route: string;
  search: string;
  interestingOnly: boolean;
  sort: SortMode;
}

export const defaultFilters: SpotlightFilters = {
  movement: "ALL",
  aircraftFamilies: [],
  airlines: [],
  route: "",
  search: "",
  interestingOnly: false,
  sort: "TIME",
};

export function formatTime(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/New_York",
  }).format(new Date(timestamp));
}

export const routeLabel = (movement: DailySpotlightMovement) =>
  `${movement.flight.origin.code} → ${movement.flight.destination.code}`;

const searchableText = (movement: DailySpotlightMovement): string =>
  [
    movement.aircraft.registration,
    movement.aircraft.type,
    movement.aircraft.family,
    movement.flight.number,
    movement.flight.airline.name,
    movement.flight.airline.code,
    movement.flight.origin.code,
    movement.flight.destination.code,
  ].filter(Boolean).join(" ").toLowerCase();

export function filterAndSortMovements<TMovement extends DailySpotlightMovement>(
  movements: TMovement[],
  filters: SpotlightFilters,
): TMovement[] {
  const search = filters.search.trim().toLowerCase();
  const route = filters.route.trim().toLowerCase();

  const filtered = movements.filter((movement) => {
    if (filters.movement !== "ALL" && movement.movementType !== filters.movement) return false;
    if (filters.aircraftFamilies.length && !filters.aircraftFamilies.includes(movement.aircraft.family)) return false;
    if (filters.airlines.length && !filters.airlines.includes(movement.flight.airline.code)) return false;
    if (route && !movement.flight.origin.code.toLowerCase().includes(route) && !movement.flight.destination.code.toLowerCase().includes(route)) return false;
    if (
      filters.interestingOnly
      && movement.ranking.tier === "ROUTINE"
    ) return false;
    return !search || searchableText(movement).includes(search);
  });

  return [...filtered].sort((first, second) => {
    if (filters.sort === "INTEREST") {
      const difference = second.ranking.displayScore - first.ranking.displayScore;
      if (difference) return difference;
    }
    return first.estimatedTime.localeCompare(second.estimatedTime);
  });
}
