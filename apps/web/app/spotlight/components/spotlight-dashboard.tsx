"use client";

import { useMemo, useState } from "react";
import type { AirportStatusSnapshot } from "@spotter/domain";
import {
  getSpotlightMovements,
  type ScoredAircraftMovement,
} from "@spotter/ranking";
import { SpotlightHeader } from "./spotlight-header";
import { SpotlightHighlights } from "./spotlight-highlights";
import { FilterBar } from "./filter-bar";
import { ActiveFilters } from "./active-filters";
import { MovementList } from "./movement-list";
import { MovementDetail } from "./movement-detail";
import { defaultFilters, filterAndSortMovements, type SpotlightFilters } from "../lib/spotlight";
import styles from "../spotlight.module.css";

const toggle = (values: string[], value: string) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

export function SpotlightDashboard({
  movements,
  airportStatus,
}: {
  movements: ScoredAircraftMovement[];
  airportStatus: AirportStatusSnapshot;
}) {
  const [filters, setFilters] = useState<SpotlightFilters>(defaultFilters);
  const [selected, setSelected] = useState<ScoredAircraftMovement | null>(null);
  const spotlight = useMemo(() => getSpotlightMovements(movements), [movements]);
  const filtered = useMemo(() => filterAndSortMovements(movements, filters), [movements, filters]);
  const aircraftOptions = useMemo(() => [...new Set(movements.map((item) => item.aircraft.family))].sort(), [movements]);
  const airlineOptions = useMemo(() => Array.from(new Map(movements.map((item) => [item.flight.airline.code, item.flight.airline])).values()).sort((a, b) => a.name.localeCompare(b.name)), [movements]);
  const airlineNames = useMemo(() => new Map(airlineOptions.map((airline) => [airline.code, airline.name])), [airlineOptions]);
  const update = (next: Partial<SpotlightFilters>) => setFilters((current) => ({ ...current, ...next }));

  return (
    <main className={styles.pageShell}>
      <SpotlightHeader
        total={movements.length}
        interesting={movements.filter((item) => item.spotterInterest.classification !== "ROUTINE").length}
        spotlight={spotlight.length}
        airportStatus={airportStatus}
      />
      <div className={styles.content}>
        <SpotlightHighlights movements={spotlight} onSelect={setSelected} />
        <section className={styles.section} aria-labelledby="movements-heading">
          <div className={styles.sectionHeading}>
            <div><p className={styles.eyebrow}>14:00–18:00 · Atlanta</p><h2 id="movements-heading">All Movements</h2></div>
            <p>Filter the schedule around the aircraft you want to photograph.</p>
          </div>
          <FilterBar {...filters} aircraftOptions={aircraftOptions} airlineOptions={airlineOptions}
            onMovementChange={(movement) => update({ movement })}
            onAircraftToggle={(value) => update({ aircraftFamilies: toggle(filters.aircraftFamilies, value) })}
            onAirlineToggle={(value) => update({ airlines: toggle(filters.airlines, value) })}
            onRouteChange={(route) => update({ route })}
            onSearchChange={(search) => update({ search })}
            onInterestingChange={(interestingOnly) => update({ interestingOnly })}
            onSortChange={(sort) => update({ sort })} />
          <ActiveFilters filters={filters} airlineNames={airlineNames} matchingCount={filtered.length} clear={() => setFilters(defaultFilters)} update={update} />
          <MovementList movements={filtered} onSelect={setSelected} />
        </section>
        <footer className={styles.footer}><span>Aircraft Spotter Radar · Prototype 01</span><span>Mock data only · Times shown in ATL local time</span></footer>
      </div>
      {selected && <MovementDetail movement={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
