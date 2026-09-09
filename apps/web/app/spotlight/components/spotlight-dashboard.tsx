"use client";

import { useMemo, useState } from "react";
import type { AirportStatusSnapshot } from "@spotter/domain";
import type {
  DailySpotlightMovement,
  DailySpotlightResult,
} from "@spotter/daily-spotlight";
import { SpotlightHeader } from "./spotlight-header";
import { SpotlightHighlights } from "./spotlight-highlights";
import { FilterBar } from "./filter-bar";
import { ActiveFilters } from "./active-filters";
import { MovementList } from "./movement-list";
import { MovementDetail } from "./movement-detail";
import { defaultFilters, filterAndSortMovements, type SpotlightFilters } from "../lib/spotlight";
import { formatAtlantaWindow } from "../lib/time";
import styles from "../spotlight.module.css";

const toggle = (values: string[], value: string) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

export function SpotlightDashboard({
  dailySpotlight,
  airportStatus,
  errorMessage,
  errorCode,
  showDataSource,
}: {
  dailySpotlight: DailySpotlightResult;
  airportStatus: AirportStatusSnapshot | null;
  errorMessage: string | null;
  errorCode: string | null;
  showDataSource: boolean;
}) {
  const movements = dailySpotlight.movements;
  const spotlight = dailySpotlight.spotlightMovements;
  const [filters, setFilters] = useState<SpotlightFilters>(defaultFilters);
  const [selected, setSelected] = useState<DailySpotlightMovement | null>(null);
  const filtered = useMemo(() => filterAndSortMovements(movements, filters), [movements, filters]);
  const aircraftOptions = useMemo(() => [...new Set(movements.map((item) => item.aircraft.family))].sort(), [movements]);
  const airlineOptions = useMemo(() => Array.from(new Map(movements.map((item) => [item.flight.airline.code, item.flight.airline])).values()).sort((a, b) => a.name.localeCompare(b.name)), [movements]);
  const airlineNames = useMemo(() => new Map(airlineOptions.map((airline) => [airline.code, airline.name])), [airlineOptions]);
  const update = (next: Partial<SpotlightFilters>) => setFilters((current) => ({ ...current, ...next }));
  const windowLabel = formatAtlantaWindow(dailySpotlight.windowStart, dailySpotlight.windowEnd);

  return (
    <main className={styles.pageShell}>
      <SpotlightHeader
        dailySpotlight={dailySpotlight}
        airportStatus={airportStatus}
        showDataSource={showDataSource}
      />
      <div className={styles.content}>
        {errorMessage && (
          <div className={styles.dataError} role="status">
            <strong>Live data unavailable</strong>
            <span>{errorMessage}</span>
            {showDataSource && errorCode && <small>Error: {errorCode}</small>}
          </div>
        )}
        {dailySpotlight.source === "FLIGHTAWARE" && !errorMessage && (
          <div className={styles.liveContextNote}>
            FlightAware movement data{dailySpotlight.diagnostics.truncated ? " · Page limit reached" : ""} · Live runway, weather, and airport-operations context is not available in this milestone.
          </div>
        )}
        <SpotlightHighlights movements={spotlight} onSelect={setSelected} />
        <section className={styles.section} aria-labelledby="movements-heading">
          <div className={styles.sectionHeading}>
            <div><p className={styles.eyebrow}>{windowLabel} · Atlanta</p><h2 id="movements-heading">All Movements</h2></div>
            <p>Filter the loaded schedule around the aircraft you want to photograph.</p>
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
        <footer className={styles.footer}>
          <span>Aircraft Spotter Radar · Prototype 01</span>
          <span>Data: {dailySpotlight.source} · Times shown in ATL local time</span>
        </footer>
      </div>
      {selected && <MovementDetail movement={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
