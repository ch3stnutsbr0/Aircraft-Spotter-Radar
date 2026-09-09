import type { DailySpotlightMovement } from "@spotter/daily-spotlight";
import { MovementTypeIndicator } from "./movement-type-indicator";
import { RunwayPrediction } from "./runway-prediction";
import { TagList } from "./tag-list";
import { formatTime, routeLabel } from "../lib/spotlight";
import styles from "../spotlight.module.css";

export function MovementList({ movements, onSelect }: {
  movements: DailySpotlightMovement[];
  onSelect: (movement: DailySpotlightMovement) => void;
}) {
  if (!movements.length) return <div className={styles.emptyState}><span aria-hidden="true">○</span><h3>No movements match this view</h3><p>Try removing a filter or using a broader search.</p></div>;
  return <div className={styles.movementList}>
    {movements.map((movement) => (
      <button className={styles.movementCard} type="button" key={movement.id} onClick={() => onSelect(movement)} aria-label={`View ${movement.aircraft.type} ${movement.aircraft.registration ?? "registration unavailable"} details`}>
        <div className={styles.timeBlock}><strong>{formatTime(movement.estimatedTime)}</strong><MovementTypeIndicator movementType={movement.movementType} compact /></div>
        <div className={styles.aircraftBlock}><strong>{movement.aircraft.type}</strong><span className={movement.aircraft.registration ? "" : styles.pendingRegistration}>{movement.aircraft.registration ?? "Registration unavailable"}</span></div>
        <div className={styles.flightBlock}><strong>{movement.flight.airline.name}</strong><span>{movement.flight.number}</span></div>
        <div className={styles.routeBlock}><strong>{routeLabel(movement)}</strong><span>{movement.aircraft.livery.name}</span></div>
        <div className={styles.cardMeta}><RunwayPrediction prediction={movement.runwayPrediction} /><div className={styles.cardTags}><TagList tags={movement.spotterInterest.reasons} /></div></div>
        <span className={styles.cardArrow} aria-hidden="true">↗</span>
      </button>
    ))}
  </div>;
}
