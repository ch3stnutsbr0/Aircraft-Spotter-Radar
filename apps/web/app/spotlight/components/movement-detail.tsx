import { useEffect } from "react";
import {
  SPOTTER_REASON_LABELS,
  type ScoredAircraftMovement,
} from "@spotter/ranking";
import { MovementTypeIndicator } from "./movement-type-indicator";
import { RunwayPrediction } from "./runway-prediction";
import { SpotterInterestDebug } from "./spotter-interest-debug";
import { TagList } from "./tag-list";
import { formatTime, routeLabel } from "../lib/spotlight";
import styles from "../spotlight.module.css";

export function MovementDetail({ movement, onClose }: {
  movement: ScoredAircraftMovement;
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
          <span>{formatTime(movement.estimatedTime)} EDT</span>
        </div>
        <h2 id="movement-detail-title">{movement.aircraft.type}</h2>
        <div className={styles.detailRegistration}>{movement.aircraft.registration ?? "Registration not assigned yet"}</div>
        <div className={styles.detailRoute}>{routeLabel(movement)}</div>
        <div className={styles.detailRunway}>
          <RunwayPrediction prediction={movement.runwayPrediction} showSource />
        </div>
        <div className={styles.detailTags}>
          <TagList tags={movement.spotterInterest.reasons} />
        </div>
        <dl className={styles.detailGrid}>
          <div><dt>Airline</dt><dd>{movement.flight.airline.name}</dd></div>
          <div><dt>Flight</dt><dd>{movement.flight.number}</dd></div>
          <div><dt>Aircraft type</dt><dd>{movement.aircraft.type}</dd></div>
          <div><dt>Aircraft family</dt><dd>{movement.aircraft.family}</dd></div>
          <div><dt>Origin</dt><dd>{movement.flight.origin.code} · {movement.flight.origin.city}</dd></div>
          <div><dt>Destination</dt><dd>{movement.flight.destination.code} · {movement.flight.destination.city}</dd></div>
          <div><dt>Scheduled</dt><dd>{formatTime(movement.scheduledTime)} EDT</dd></div>
          <div><dt>Estimated</dt><dd>{formatTime(movement.estimatedTime)} EDT</dd></div>
          <div><dt>Runway</dt><dd>{movement.runwayPrediction?.runway ?? "Unavailable"}</dd></div>
          <div><dt>Status</dt><dd>{movement.runwayPrediction?.status ?? "Unavailable"}</dd></div>
          <div><dt>Confidence</dt><dd>{movement.runwayPrediction?.confidencePercent !== undefined ? movement.runwayPrediction.confidencePercent + "%" : "Unavailable"}</dd></div>
          <div><dt>Prediction source</dt><dd>{movement.runwayPrediction?.source ?? "Unavailable"}</dd></div>
          <div className={styles.detailWide}><dt>Livery</dt><dd>{movement.aircraft.livery.name}</dd></div>
        </dl>
        <div className={styles.whyHighlighted}>
          <span>Why it’s highlighted</span>
          <p>{movement.spotterInterest.reasons.length
            ? movement.spotterInterest.reasons
                .map((reason) => SPOTTER_REASON_LABELS[reason])
                .join(" · ")
            : "This is routine traffic with no v0.1 spotter-interest reasons."}</p>
        </div>
        {process.env.NODE_ENV === "development" && (
          <SpotterInterestDebug result={movement.spotterInterest} />
        )}
      </aside>
    </div>
  );
}
