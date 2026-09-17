import {
  SPOTTER_INTEREST_V0_1_CONFIG,
  SPOTTER_REASON_LABELS,
  type SpotterInterestDimensions,
} from "@spotter/ranking";
import type { DailySpotlightMovement } from "@spotter/daily-spotlight";
import styles from "../spotlight.module.css";

const dimensionLabels: Record<keyof SpotterInterestDimensions, string> = {
  notability: "Aircraft Notability",
  globalTypeRarity: "Global Type Rarity",
  localTypeRarity: "Local Type Rarity",
  registrationRarity: "Registration Rarity",
};

export function SpotterInterestDebug({
  movement,
}: {
  movement: DailySpotlightMovement;
}) {
  const result = movement.spotterInterest;
  if (!result) return null;
  const dimensionKeys = Object.keys(dimensionLabels) as Array<keyof SpotterInterestDimensions>;

  return (
    <details className={styles.interestDebug}>
      <summary><span>Spotter Interest Debug · v0.1</span><strong>{result.score}</strong></summary>
      <div className={styles.interestDebugBody}>
        <div className={styles.interestDebugStatus}>
          <span>Classification</span><strong>{result.classification}</strong>
        </div>
        <div className={styles.interestDebugStatus}>
          <span>Movement rank</span><strong>{movement.movementRank ?? "Unavailable"}</strong>
        </div>
        <div className={styles.interestDebugGrid}>
          {dimensionKeys.map((key) => {
            const dimension = result.dimensions[key];
            const weight = SPOTTER_INTEREST_V0_1_CONFIG.weights[key];
            const source = movement.enrichmentSources?.[key] ?? "MOCK";
            return (
              <details className={styles.interestDebugDimension} key={key}>
                <summary>
                  <span>{dimensionLabels[key]} · {source}</span>
                  <strong>{dimension.score} × {weight.toFixed(2)} = {result.weightedContributions[key]}</strong>
                </summary>
                <pre>{JSON.stringify(dimension.debug, null, 2)}</pre>
              </details>
            );
          })}
        </div>
        {movement.aircraftTypeNormalization && (
          <div className={styles.interestDebugReasons}>
            <span>Aircraft type normalization</span>
            <p>{movement.aircraftTypeNormalization.rawCode ?? "Missing"} → {movement.aircraftTypeNormalization.referenceVariant ?? "No reference match"} · {movement.aircraftTypeNormalization.status}</p>
          </div>
        )}
        <div className={styles.interestDebugReasons}>
          <span>Reasons</span>
          <p>{result.reasons.length ? result.reasons.map((reason) => SPOTTER_REASON_LABELS[reason]).join(" · ") : "None"}</p>
        </div>
      </div>
    </details>
  );
}
