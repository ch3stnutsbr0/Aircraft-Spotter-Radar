import type { MovementFilter, SortMode } from "../lib/spotlight";
import styles from "../spotlight.module.css";

interface Props {
  movement: MovementFilter;
  aircraftFamilies: string[];
  airlines: string[];
  route: string;
  search: string;
  interestingOnly: boolean;
  sort: SortMode;
  aircraftOptions: string[];
  airlineOptions: { code: string; name: string }[];
  onMovementChange: (value: MovementFilter) => void;
  onAircraftToggle: (value: string) => void;
  onAirlineToggle: (value: string) => void;
  onRouteChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onInterestingChange: (value: boolean) => void;
  onSortChange: (value: SortMode) => void;
}

export function FilterBar(props: Props) {
  return (
    <div className={styles.filterPanel}>
      <div className={styles.filterLeadRow}>
        <label className={styles.searchField}>
          <span>Search movements</span>
          <input type="search" aria-label="Search movements" placeholder="Registration, flight, type, airline or airport" value={props.search} onChange={(event) => props.onSearchChange(event.target.value)} />
        </label>
        <label className={styles.routeField}>
          <span>Route airport</span>
          <input type="search" aria-label="Route airport" placeholder="e.g. HND" value={props.route} maxLength={4} onChange={(event) => props.onRouteChange(event.target.value)} />
        </label>
        <label className={styles.sortField}>
          <span>Sort by</span>
          <select aria-label="Sort movements" value={props.sort} onChange={(event) => props.onSortChange(event.target.value as SortMode)}>
            <option value="TIME">Time</option>
            <option value="INTEREST">Spotter Interest</option>
          </select>
        </label>
      </div>
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>Movement</span>
        <div className={styles.filterChips}>
          {(["ALL", "ARRIVAL", "DEPARTURE"] as MovementFilter[]).map((value) => (
            <button type="button" key={value} aria-pressed={props.movement === value} className={props.movement === value ? styles.filterChipActive : styles.filterChip} onClick={() => props.onMovementChange(value)}>
              {value === "ALL" ? "All" : value === "ARRIVAL" ? "Arrivals" : "Departures"}
            </button>
          ))}
        </div>
      </div>
      <details className={styles.filterDisclosure} open>
        <summary>Aircraft type</summary>
        <div className={styles.filterChips}>
          {props.aircraftOptions.map((family) => (
            <button type="button" key={family} aria-pressed={props.aircraftFamilies.includes(family)} className={props.aircraftFamilies.includes(family) ? styles.filterChipActive : styles.filterChip} onClick={() => props.onAircraftToggle(family)}>{family}</button>
          ))}
        </div>
      </details>
      <details className={styles.filterDisclosure}>
        <summary>Airline</summary>
        <div className={styles.filterChips}>
          {props.airlineOptions.map((airline) => (
            <button type="button" key={airline.code} aria-pressed={props.airlines.includes(airline.code)} className={props.airlines.includes(airline.code) ? styles.filterChipActive : styles.filterChip} onClick={() => props.onAirlineToggle(airline.code)}>{airline.name}</button>
          ))}
        </div>
      </details>
      <label className={styles.interestingToggle}>
        <input type="checkbox" checked={props.interestingOnly} onChange={(event) => props.onInterestingChange(event.target.checked)} />
        <span aria-hidden="true" />
        <strong>Interesting Only</strong>
        <small>Hide routine movements</small>
      </label>
    </div>
  );
}
