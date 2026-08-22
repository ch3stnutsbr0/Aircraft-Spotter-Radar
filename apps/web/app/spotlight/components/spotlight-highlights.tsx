import type { ScoredAircraftMovement } from "@spotter/ranking";
import { MovementTypeIndicator } from "./movement-type-indicator";
import { RunwayPrediction } from "./runway-prediction";
import { TagList } from "./tag-list";
import { formatTime, routeLabel } from "../lib/spotlight";
import styles from "../spotlight.module.css";

export function SpotlightHighlights({ movements, onSelect }: {
  movements: ScoredAircraftMovement[];
  onSelect: (movement: ScoredAircraftMovement) => void;
}) {
  return (
    <section className={styles.section} aria-labelledby="spotlight-heading">
      <div className={styles.sectionHeading}>
        <div><p className={styles.eyebrow}>Ranked for spotters</p><h2 id="spotlight-heading">Today’s Spotlight</h2></div>
        <p>Highest-interest movements in the selected time window.</p>
      </div>
      {movements.length ? <div className={styles.highlightGrid}>
        {movements.map((movement, index) => (
          <button className={styles.highlightCard} key={movement.id} onClick={() => onSelect(movement)} type="button">
            <div className={styles.highlightTopline}><span>{formatTime(movement.estimatedTime)}</span><span>0{index + 1}</span></div>
            <div className={styles.highlightMovement}>
              <MovementTypeIndicator movementType={movement.movementType} compact />
            </div>
            <strong className={styles.highlightType}>{movement.aircraft.type}</strong>
            <span className={styles.highlightRegistration}>{movement.aircraft.registration ?? "Assignment pending"}</span>
            <div className={styles.highlightAirline}>{movement.flight.airline.name}</div>
            <div className={styles.highlightRoute}>{routeLabel(movement)}</div>
            <div className={styles.highlightRunway}>
              <RunwayPrediction prediction={movement.runwayPrediction} />
            </div>
            <div className={styles.highlightTags}>
              <TagList tags={movement.spotterInterest.reasons} />
            </div>
          </button>
        ))}
      </div> : (
        <div className={styles.spotlightEmpty}>
          No movements currently meet the v0.1 Spotlight threshold.
        </div>
      )}
    </section>
  );
}
