import type { AircraftMovement } from "../../domain/src/index.ts";
import type { AuditedMovement, ProbeWindow } from "./types.ts";

const MINUTE_MS = 60 * 1_000;
const AIRPORT_TIME_ZONE: Readonly<Record<string, string>> = {
  ATL: "America/New_York",
  KATL: "America/New_York",
};

export function buildProbeWindow({
  primaryStart,
  primaryEnd,
  bufferBeforeMinutes,
  bufferAfterMinutes,
}: {
  primaryStart: Date;
  primaryEnd: Date;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
}): ProbeWindow {
  if (
    Number.isNaN(primaryStart.getTime())
    || Number.isNaN(primaryEnd.getTime())
    || primaryStart >= primaryEnd
  ) {
    throw new Error("A valid primary start before the primary end is required.");
  }
  if (
    !Number.isFinite(bufferBeforeMinutes)
    || bufferBeforeMinutes < 0
    || !Number.isFinite(bufferAfterMinutes)
    || bufferAfterMinutes < 0
  ) {
    throw new Error("Buffer minutes must be non-negative numbers.");
  }

  return {
    primaryStart: new Date(primaryStart),
    primaryEnd: new Date(primaryEnd),
    fetchStart: new Date(primaryStart.getTime() - bufferBeforeMinutes * MINUTE_MS),
    fetchEnd: new Date(primaryEnd.getTime() + bufferAfterMinutes * MINUTE_MS),
    bufferBeforeMinutes,
    bufferAfterMinutes,
    windowEndExclusive: true,
  };
}

export function getScheduledMovementTime(
  movement: AircraftMovement,
): Date | null {
  return movement.movementType === "ARRIVAL"
    ? movement.scheduledArrivalTime
    : movement.scheduledDepartureTime;
}

export function formatAirportLocalTime(
  time: Date | null,
  airportCode: string,
): string | null {
  if (!time) return null;
  const timeZone = AIRPORT_TIME_ZONE[airportCode.trim().toUpperCase()];
  if (!timeZone) return null;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  });
  const values = Object.fromEntries(
    formatter.formatToParts(time).map((part) => [part.type, part.value]),
  );
  const offset = values.timeZoneName?.replace("GMT", "") || "Z";

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}${offset}[${timeZone}]`;
}

export function auditMovementWindow(
  movement: AircraftMovement,
  window: ProbeWindow,
  airportCode: string,
): AuditedMovement {
  const scheduledMovementTime = getScheduledMovementTime(movement);
  const movementTimeMs = scheduledMovementTime?.getTime() ?? null;
  const inPrimaryWindow = movementTimeMs !== null
    && movementTimeMs >= window.primaryStart.getTime()
    && movementTimeMs < window.primaryEnd.getTime();

  return {
    movement,
    scheduledMovementTime,
    scheduledMovementTimeLocal: formatAirportLocalTime(
      scheduledMovementTime,
      airportCode,
    ),
    inPrimaryWindow,
    minutesFromWindowStart: movementTimeMs === null
      ? null
      : (movementTimeMs - window.primaryStart.getTime()) / MINUTE_MS,
    minutesToWindowEnd: movementTimeMs === null
      ? null
      : (window.primaryEnd.getTime() - movementTimeMs) / MINUTE_MS,
  };
}

export function auditMovementWindows(
  movements: readonly AircraftMovement[],
  window: ProbeWindow,
  airportCode: string,
): AuditedMovement[] {
  return movements.map((movement) =>
    auditMovementWindow(movement, window, airportCode)
  );
}
