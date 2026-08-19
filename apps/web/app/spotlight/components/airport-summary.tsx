import type { AirportStatusSnapshot } from "@spotter/domain";
import { getRemainingMovementCount } from "@spotter/domain";
import styles from "../spotlight.module.css";

const flowLabels = {
  EAST: "East Flow",
  WEST: "West Flow",
  NORTH: "North Flow",
  SOUTH: "South Flow",
  MIXED: "Mixed Flow",
  UNKNOWN: "Flow Unknown",
} as const;

export function AirportSummary({ status }: { status: AirportStatusSnapshot }) {
  const remaining = getRemainingMovementCount(status.movements);
  const visibilityPrefix = status.weather.visibilityIsGreaterThan ? "+" : "";

  return (
    <section className={styles.airportSummaryGrid} aria-label="ATL airport operations summary">
      <article className={styles.airportSummaryCard}>
        <p className={styles.airportSummaryLabel}>Airport Operations</p>
        <div className={styles.flowHeading}>
          <span>Current Flow</span>
          <strong>{flowLabels[status.operations.flowDirection]}</strong>
        </div>
        <dl className={styles.runwayFlowGrid}>
          <div><dt>Arrivals</dt><dd>{status.operations.arrivalRunways.join(" / ")}</dd></div>
          <div><dt>Departures</dt><dd>{status.operations.departureRunways.join(" / ")}</dd></div>
        </dl>
      </article>

      <article className={styles.airportSummaryCard}>
        <p className={styles.airportSummaryLabel}>Today’s Movements</p>
        <dl className={styles.movementStatsGrid}>
          <div><dt>Scheduled</dt><dd>{status.movements.scheduled}</dd></div>
          <div><dt>Completed</dt><dd>{status.movements.completed}</dd></div>
          <div><dt>Cancelled</dt><dd>{status.movements.cancelled}</dd></div>
          <div><dt>Remaining</dt><dd>{remaining}</dd></div>
        </dl>
      </article>

      <article className={styles.airportSummaryCard}>
        <p className={styles.airportSummaryLabel}>Weather</p>
        <div className={styles.weatherHeading}>
          <strong>{status.weather.temperatureCelsius}°C</strong>
          <span>{status.weather.condition}</span>
        </div>
        <dl className={styles.weatherGrid}>
          <div><dt>Wind</dt><dd>{status.weather.windDirectionDegrees}° · {status.weather.windSpeedKt} kt</dd></div>
          <div><dt>Visibility</dt><dd>{status.weather.visibilityMiles}{visibilityPrefix} mi</dd></div>
          <div><dt>Ceiling</dt><dd>{status.weather.ceilingFt.toLocaleString("en-US")} ft</dd></div>
        </dl>
      </article>
    </section>
  );
}
