import type { RunwayPrediction as RunwayPredictionValue } from "@spotter/domain";
import styles from "../spotlight.module.css";

const statusLabels = {
  PREDICTED: "Predicted RWY",
  LIKELY: "Likely RWY",
  CONFIRMED: "Confirmed RWY",
} as const;

export function RunwayPrediction({
  prediction,
  showSource = false,
}: {
  prediction?: RunwayPredictionValue;
  showSource?: boolean;
}) {
  if (!prediction) {
    return (
      <span className={`${styles.runwayPrediction} ${styles.runwayUnavailable}`}>
        Runway prediction unavailable
      </span>
    );
  }

  return (
    <span className={styles.runwayPrediction}>
      <span>
        {statusLabels[prediction.status]} <strong>{prediction.runway}</strong>
        {prediction.confidencePercent !== undefined && ` · ${prediction.confidencePercent}%`}
      </span>
      {showSource && prediction.source && (
        <small>{prediction.source}</small>
      )}
    </span>
  );
}
