import {
  SPOTTER_REASON_LABELS,
  type SpotterReason,
} from "@spotter/ranking";
import styles from "../spotlight.module.css";

export function TagList({ tags }: { tags: SpotterReason[] }) {
  if (!tags.length) return <span className={styles.noTags}>Routine traffic</span>;

  return (
    <div className={styles.tagList} aria-label="Spotter interest tags">
      {tags.map((tag) => (
        <span className={`${styles.tag} ${styles[`tag${tag}`] ?? ""}`} key={tag}>
          {SPOTTER_REASON_LABELS[tag]}
        </span>
      ))}
    </div>
  );
}
