import { useEffect } from "react";
import type { DailySpotlightMovement } from "@spotter/daily-spotlight";
import { MovementTypeIndicator } from "./movement-type-indicator";
import { RunwayPrediction } from "./runway-prediction";
import { SpotterInterestDebug } from "./spotter-interest-debug";
import { TagList } from "./tag-list";
import { routeLabel } from "../lib/spotlight";
import { formatAtlantaTimeWithZone } from "../lib/time";
import styles from "../spotlight.module.css";

const airportDisplay = (code: string, city: string) =>
  city ? `${code} · ${city}` : code;

export function MovementDetail({ movement, onClose }: {
  movement: DailySpotlightMovement;
  onClose: () => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className={styles.detailBackdrop} role="presentation" onMouseDown={onClose}>
      <aside className={styles.detailPanel} role="dialog" aria-modal="true" aria-labelledby="movement-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className={styles.detailClose} type="button" onClick={onClose} aria-label="Close details">×</button>
        <div className={styles.detailMovementMeta}>
          <MovementTypeIndicator movementType={movement.movementType} />
          <span>{formatAtlantaTimeWithZone(movement.estimatedTime)}</span>
        </div>
        <h2 id="movement-detail-title">{movement.aircraft.type}</h2>
        <div className={styles.detailRegistration}>{movement.aircraft.registration ?? "Registration unavailable"}</div>
        <div className={styles.detailRoute}>{routeLabel(movement)}</div>
        <div className={styles.detailRunway}><RunwayPrediction prediction={movement.runwayPrediction} showSource /></div>
        <div className={styles.detailTags}><TagList tags={movement.ranking.reasons} /></div>
        <dl className={styles.detailGrid}>
          <div><dt>Airline / operator</dt><dd>{movement.flight.airline.name}</dd></div>
          <div><dt>Flight</dt><dd>{movement.flight.number}</dd></div>
          <div><dt>Aircraft type</dt><dd>{movement.aircraft.type}</dd></div>
          <div><dt>Aircraft family</dt><dd>{movement.aircraft.family}</dd></div>
          <div><dt>Origin</dt><dd>{airportDisplay(movement.flight.origin.code, movement.flight.origin.city)}</dd></div>
          <div><dt>Destination</dt><dd>{airportDisplay(movement.flight.destination.code, movement.flight.destination.city)}</dd></div>
          <div><dt>Scheduled</dt><dd>{formatAtlantaTimeWithZone(movement.scheduledTime)}</dd></div>
          <div><dt>Estimated</dt><dd>{formatAtlantaTimeWithZone(movement.estimatedTime)}</dd></div>
          <div><dt>Runway</dt><dd>{movement.runwayPrediction?.runway ?? "Unavailable"}</dd></div>
          <div><dt>Status</dt><dd>{movement.runwayPrediction?.status ?? "Unavailable"}</dd></div>
          <div><dt>Confidence</dt><dd>{movement.runwayPrediction?.confidencePercent !== undefined ? movement.runwayPrediction.confidencePercent + "%" : "Unavailable"}</dd></div>
          <div><dt>Prediction source</dt><dd>{movement.runwayPrediction?.source ?? "Unavailable"}</dd></div>
          <div className={styles.detailWide}><dt>Livery</dt><dd>{movement.aircraft.livery.name}</dd></div>
        </dl>
        <div className={styles.whyHighlighted}>
          <span>Why it’s highlighted</span>
          <p>{movement.ranking.reasons.length
            ? movement.ranking.reasons.map((reason) => reason.label).join(" · ")
            : "This is routine traffic with no v0.1 spotter-interest reasons."}</p>
        </div>
        {process.env.NODE_ENV === "development" && <SpotterInterestDebug movement={movement} />}
      </aside>
    </div>
  );
}
