import type {
  AircraftMovement,
  MovementStatus,
  MovementType,
} from "../../../domain/src/index.ts";
import type {
  FlightAwareAirportRef,
  FlightAwareFlight,
} from "./types.ts";

function clean(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizeFlightAwareAirport(
  airport: FlightAwareAirportRef | null | undefined,
): string | null {
  return clean(
    airport?.code_icao
      ?? airport?.code
      ?? airport?.code_iata
      ?? airport?.code_lid,
  )?.toUpperCase() ?? null;
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeStatus(
  raw: FlightAwareFlight,
  actualDepartureTime: Date | null,
  actualArrivalTime: Date | null,
): MovementStatus {
  if (raw.cancelled) {
    return "CANCELLED";
  }
  if (raw.diverted) {
    return "DIVERTED";
  }

  const providerStatus = raw.status?.trim().toLowerCase() ?? "";
  if (providerStatus.includes("cancel")) {
    return "CANCELLED";
  }
  if (providerStatus.includes("divert")) {
    return "DIVERTED";
  }
  if (
    actualArrivalTime
    || providerStatus.includes("arriv")
    || providerStatus.includes("complete")
  ) {
    return "ARRIVED";
  }
  if (
    providerStatus.includes("en route")
    || providerStatus.includes("enroute")
    || providerStatus.includes("airborne")
    || providerStatus === "active"
  ) {
    return "ENROUTE";
  }
  if (providerStatus.includes("depart")) {
    return "DEPARTED";
  }
  if (actualDepartureTime) {
    return "ENROUTE";
  }
  if (
    providerStatus.includes("schedul")
    || providerStatus.includes("filed")
    || providerStatus.includes("pending")
  ) {
    return "SCHEDULED";
  }

  return "UNKNOWN";
}

export function normalizeFlightAwareMovement(
  raw: FlightAwareFlight,
  movementType: MovementType,
  observedAt: Date,
): AircraftMovement {
  const scheduledDepartureTime = toDate(
    raw.scheduled_out ?? raw.scheduled_off,
  );
  const scheduledArrivalTime = toDate(
    raw.scheduled_in ?? raw.scheduled_on,
  );
  const estimatedDepartureTime = toDate(
    raw.estimated_out ?? raw.estimated_off,
  );
  const estimatedArrivalTime = toDate(
    raw.estimated_in ?? raw.estimated_on,
  );
  const actualDepartureTime = toDate(raw.actual_out ?? raw.actual_off);
  const actualArrivalTime = toDate(raw.actual_in ?? raw.actual_on);
  const providerFlightId = clean(raw.fa_flight_id) ?? "";
  const ident = clean(raw.ident_icao ?? raw.ident) ?? "";
  const normalizedProviderStatus = raw.status?.trim().toLowerCase() ?? "";
  const cancelled = Boolean(
    raw.cancelled || normalizedProviderStatus.includes("cancel"),
  );
  const diverted = Boolean(
    raw.diverted || normalizedProviderStatus.includes("divert"),
  );
  const fallbackIdentity = [
    ident || "unknown-ident",
    scheduledDepartureTime?.toISOString()
      ?? scheduledArrivalTime?.toISOString()
      ?? observedAt.toISOString(),
  ].join(":");

  return {
    id: `flightaware:${providerFlightId || fallbackIdentity}:${movementType}`,
    provider: "flightaware",
    providerFlightId,
    ident,
    operatorIcao: clean(raw.operator_icao)?.toUpperCase() ?? null,
    registration: clean(raw.registration)?.toUpperCase() ?? null,
    aircraftType: clean(raw.aircraft_type)?.toUpperCase() ?? null,
    originAirport: normalizeFlightAwareAirport(raw.origin),
    destinationAirport: normalizeFlightAwareAirport(raw.destination),
    movementType,
    scheduledDepartureTime,
    scheduledArrivalTime,
    estimatedDepartureTime,
    estimatedArrivalTime,
    actualDepartureTime,
    actualArrivalTime,
    status: normalizeStatus(
      raw,
      actualDepartureTime,
      actualArrivalTime,
    ),
    cancelled,
    diverted,
    providerStatus: clean(raw.status),
    observedAt: new Date(observedAt),
    lastUpdatedAt: toDate(raw.last_updated),
  };
}
