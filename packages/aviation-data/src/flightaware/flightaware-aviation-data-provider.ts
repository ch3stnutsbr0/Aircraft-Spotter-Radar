import type { AircraftMovement } from "../../../domain/src/index.ts";
import type {
  AirportMovementQuery,
  AviationDataProvider,
} from "../aviation-data-provider.ts";
import {
  FlightAwareApiError,
  FlightAwareClient,
} from "./flightaware-client.ts";
import { normalizeFlightAwareMovement } from "./normalizer.ts";
import type {
  FlightAwareCollectionResult,
  FlightAwareFlight,
} from "./types.ts";

export const DEFAULT_FLIGHTAWARE_MAX_PAGES = 5;
const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1_000;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1_000;

export interface FlightAwareAirportMovementQuery extends AirportMovementQuery {
  rawSampleSize?: number;
}

export interface FlightAwareProbeDiagnostics {
  observedAt: Date;
  endpointQueries: number;
  arrivalEndpointQueries: number;
  departureEndpointQueries: number;
  arrivalHttpRequests: number;
  departureHttpRequests: number;
  totalHttpRequests: number;
  arrivalPages: number;
  departurePages: number;
  totalPages: number;
  maxPagesPerEndpoint: number;
  arrivalRecords: number;
  departureRecords: number;
  arrivalsTruncated: boolean;
  departuresTruncated: boolean;
  resultsTruncated: boolean;
  outsideRequestedWindow: number;
  arrivalRawSamples: FlightAwareFlight[];
  departureRawSamples: FlightAwareFlight[];
}

export interface FlightAwareAirportMovementResult {
  movements: AircraftMovement[];
  diagnostics: FlightAwareProbeDiagnostics;
}

export interface FlightAwareAviationDataProviderOptions {
  client: FlightAwareClient;
  now?: () => Date;
}

function validateWindow(start: Date, end: Date, now: Date): void {
  if (
    Number.isNaN(start.getTime())
    || Number.isNaN(end.getTime())
    || start >= end
  ) {
    throw new FlightAwareApiError(
      "A valid start time before the end time is required.",
    );
  }

  const earliest = now.getTime() - TEN_DAYS_MS;
  const latest = now.getTime() + TWO_DAYS_MS;
  if (
    start.getTime() < earliest
    || start.getTime() > latest
    || end.getTime() < earliest
    || end.getTime() > latest
  ) {
    throw new FlightAwareApiError(
      "AeroAPI airport-board start/end values must be within 10 days in the past and 2 days in the future.",
    );
  }
}

function isOutsideWindow(
  raw: FlightAwareFlight,
  kind: "ARRIVAL" | "DEPARTURE",
  start: Date,
  end: Date,
): boolean {
  const value = kind === "ARRIVAL"
    ? raw.estimated_on
    : raw.scheduled_off;

  if (!value) {
    return false;
  }

  const time = new Date(value);
  return !Number.isNaN(time.getTime())
    && (time < start || time >= end);
}

function normalizeBatch(
  result: FlightAwareCollectionResult,
  movementType: "ARRIVAL" | "DEPARTURE",
  observedAt: Date,
): AircraftMovement[] {
  return result.records.map((record) =>
    normalizeFlightAwareMovement(record, movementType, observedAt)
  );
}

export class FlightAwareAviationDataProvider
implements AviationDataProvider {
  private readonly client: FlightAwareClient;
  private readonly now: () => Date;

  constructor(options: FlightAwareAviationDataProviderOptions) {
    this.client = options.client;
    this.now = options.now ?? (() => new Date());
  }

  async getAirportMovements(
    airport: string,
    options: AirportMovementQuery,
  ): Promise<AircraftMovement[]> {
    const result = await this.getAirportMovementsWithDiagnostics(
      airport,
      options,
    );
    return result.movements;
  }

  async getAirportMovementsWithDiagnostics(
    airport: string,
    options: FlightAwareAirportMovementQuery,
  ): Promise<FlightAwareAirportMovementResult> {
    const requestStartedAt = this.now();
    validateWindow(options.start, options.end, requestStartedAt);

    const maxPages = options.maxPages ?? DEFAULT_FLIGHTAWARE_MAX_PAGES;
    const query = {
      airport,
      start: options.start,
      end: options.end,
      maxPages,
      rawSampleSize: options.rawSampleSize,
    };

    // Two logical endpoint queries. Each client method may issue more than one
    // network request if a cursor remains and the page budget allows it.
    const arrivals = await this.client.getScheduledArrivals(query);
    const departures = await this.client.getScheduledDepartures(query);
    const observedAt = this.now();

    const movements = [
      ...normalizeBatch(arrivals, "ARRIVAL", observedAt),
      ...normalizeBatch(departures, "DEPARTURE", observedAt),
    ];
    const outsideRequestedWindow = [
      ...arrivals.records.map((record) =>
        isOutsideWindow(
          record,
          "ARRIVAL",
          options.start,
          options.end,
        )
      ),
      ...departures.records.map((record) =>
        isOutsideWindow(
          record,
          "DEPARTURE",
          options.start,
          options.end,
        )
      ),
    ].filter(Boolean).length;

    return {
      movements,
      diagnostics: {
        observedAt,
        endpointQueries: 2,
        arrivalEndpointQueries: 1,
        departureEndpointQueries: 1,
        arrivalHttpRequests: arrivals.httpRequests,
        departureHttpRequests: departures.httpRequests,
        totalHttpRequests: arrivals.httpRequests + departures.httpRequests,
        arrivalPages: arrivals.pages,
        departurePages: departures.pages,
        totalPages: arrivals.pages + departures.pages,
        maxPagesPerEndpoint: maxPages,
        arrivalRecords: arrivals.records.length,
        departureRecords: departures.records.length,
        arrivalsTruncated: arrivals.truncated,
        departuresTruncated: departures.truncated,
        resultsTruncated: arrivals.truncated || departures.truncated,
        outsideRequestedWindow,
        arrivalRawSamples: arrivals.rawSamples,
        departureRawSamples: departures.rawSamples,
      },
    };
  }
}
