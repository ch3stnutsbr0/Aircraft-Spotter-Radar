import type { AirportStatusSnapshot } from "@spotter/domain";
import { AirportSummary } from "./airport-summary";
import styles from "../spotlight.module.css";

export function SpotlightHeader({ total, interesting, spotlight, airportStatus }: {
  total: number;
  interesting: number;
  spotlight: number;
  airportStatus: AirportStatusSnapshot;
}) {
  const snapshotDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(airportStatus.asOf));

  return (
    <header className={styles.hero}>
      <div className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">ASR</span>
          <span>Aircraft Spotter Radar</span>
        </div>
        <div className={styles.dataStatus}><span aria-hidden="true" /> Mock airport status · ATL local time</div>
      </div>
      <div className={styles.heroMain}>
        <div className={styles.airportCode} aria-label="Atlanta airport code">ATL</div>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Home Airport</p>
          <h1>Daily Spotlight</h1>
          <p className={styles.date}>{snapshotDate} · 14:00–18:00 EDT</p>
        </div>
        <div className={styles.heroQuestion}>
          <span>Today’s brief</span>
          <strong>What’s worth watching?</strong>
          <p>{spotlight} standouts from {interesting} noteworthy aircraft across this {total}-movement preview.</p>
        </div>
      </div>
      <AirportSummary status={airportStatus} />
    </header>
  );
}
