import type { RankingReason } from "@spotter/daily-spotlight";
import styles from "../spotlight.module.css";

export function TagList({ tags }: { tags: RankingReason[] }) {
  if (!tags.length) return <span className={styles.noTags}>Routine traffic</span>;

  return (
    <div className={styles.tagList} aria-label="Spotter interest tags">
      {tags.map((tag) => (
        <span className={`${styles.tag} ${styles[`tag${tag.code}`] ?? ""}`} key={tag.code}>
          {tag.label}
        </span>
      ))}
    </div>
  );
}
