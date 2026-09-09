import type { AirportStatusSnapshot } from "@spotter/domain";
import type { DailySpotlightResult } from "@spotter/daily-spotlight";
import { AirportSummary } from "./airport-summary";
import { formatAtlantaDate, formatAtlantaTimeWithZone, formatAtlantaWindow } from "../lib/time";
import styles from "../spotlight.module.css";

export function SpotlightHeader({
  dailySpotlight,
  airportStatus,
  showDataSource,
}: {
  dailySpotlight: DailySpotlightResult;
  airportStatus: AirportStatusSnapshot | null;
  showDataSource: boolean;
}) {
  const movements = dailySpotlight.movements;
  const interesting = movements.filter(
    (item) => item.spotterInterest.classification !== "ROUTINE",
  ).length;
  const airportLabel = dailySpotlight.airport.replace(/^K(?=[A-Z]{3}$)/, "");

  return (
    <header className={styles.hero}>
      <div className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">ASR</span>
          <span>Aircraft Spotter Radar</span>
        </div>
        {showDataSource && (
          <div className={styles.dataStatus}>
            <span aria-hidden="true" /> Data: {dailySpotlight.source} · ATL local time
          </div>
        )}
      </div>
      <div className={styles.heroMain}>
        <div className={styles.airportCode} aria-label="Atlanta airport code">{airportLabel}</div>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Home Airport</p>
          <h1>Daily Spotlight</h1>
          <p className={styles.date}>
            {formatAtlantaDate(dailySpotlight.windowStart)} · {formatAtlantaWindow(dailySpotlight.windowStart, dailySpotlight.windowEnd)}
          </p>
          {dailySpotlight.source === "FLIGHTAWARE" && (
            <p className={styles.generatedAt}>Updated {formatAtlantaTimeWithZone(dailySpotlight.generatedAt)}</p>
          )}
        </div>
        <div className={styles.heroQuestion}>
          <span>Today’s brief</span>
          <strong>What’s worth watching?</strong>
          <p>{dailySpotlight.spotlightMovements.length} standouts from {interesting} noteworthy aircraft across this {movements.length}-movement preview.</p>
        </div>
      </div>
      {airportStatus && <AirportSummary status={airportStatus} />}
    </header>
  );
}
