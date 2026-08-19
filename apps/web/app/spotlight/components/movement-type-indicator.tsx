import Image from "next/image";
import type { MovementType } from "@spotter/domain";
import styles from "../spotlight.module.css";

const movementConfig = {
  ARRIVAL: {
    label: "Arrival",
    icon: "/assets/icons/arrival.svg",
    className: styles.arrivalIndicator,
  },
  DEPARTURE: {
    label: "Departure",
    icon: "/assets/icons/departure.svg",
    className: styles.departureIndicator,
  },
} satisfies Record<MovementType, {
  label: string;
  icon: string;
  className: string;
}>;

export function MovementTypeIndicator({
  movementType,
  compact = false,
}: {
  movementType: MovementType;
  compact?: boolean;
}) {
  const config = movementConfig[movementType];

  return (
    <span
      className={`${styles.movementTypeIndicator} ${config.className} ${compact ? styles.movementTypeCompact : ""}`}
      aria-label={config.label}
    >
      <Image
        src={config.icon}
        alt=""
        aria-hidden="true"
        width={compact ? 17 : 20}
        height={compact ? 17 : 20}
        unoptimized
      />
      <span>{config.label}</span>
    </span>
  );
}
