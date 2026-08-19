import type { SpotlightFilters } from "../lib/spotlight";
import styles from "../spotlight.module.css";

export function ActiveFilters({ filters, airlineNames, matchingCount, clear, update }: {
  filters: SpotlightFilters;
  airlineNames: Map<string, string>;
  matchingCount: number;
  clear: () => void;
  update: (next: Partial<SpotlightFilters>) => void;
}) {
  const count = (filters.movement === "ALL" ? 0 : 1) + filters.aircraftFamilies.length + filters.airlines.length + Number(Boolean(filters.route)) + Number(Boolean(filters.search)) + Number(filters.interestingOnly);
  return (
    <div className={styles.activeFilters}>
      <div className={styles.matchingCount}><strong>{matchingCount}</strong> matching movement{matchingCount === 1 ? "" : "s"}</div>
      {count > 0 && <div className={styles.activeFilterList} aria-label="Active filters">
        {filters.movement !== "ALL" && <button type="button" onClick={() => update({ movement: "ALL" })}>{filters.movement === "ARRIVAL" ? "Arrivals" : "Departures"} <span>×</span></button>}
        {filters.aircraftFamilies.map((family) => <button type="button" key={family} onClick={() => update({ aircraftFamilies: filters.aircraftFamilies.filter((item) => item !== family) })}>{family} <span>×</span></button>)}
        {filters.airlines.map((code) => <button type="button" key={code} onClick={() => update({ airlines: filters.airlines.filter((item) => item !== code) })}>{airlineNames.get(code) ?? code} <span>×</span></button>)}
        {filters.route && <button type="button" onClick={() => update({ route: "" })}>Route: {filters.route.toUpperCase()} <span>×</span></button>}
        {filters.search && <button type="button" onClick={() => update({ search: "" })}>“{filters.search}” <span>×</span></button>}
        {filters.interestingOnly && <button type="button" onClick={() => update({ interestingOnly: false })}>Interesting only <span>×</span></button>}
        <button type="button" className={styles.clearAll} onClick={clear}>Clear All</button>
      </div>}
    </div>
  );
}
