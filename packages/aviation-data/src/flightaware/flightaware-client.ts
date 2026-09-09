import type {
  FlightAwareCollectionResponse,
  FlightAwareCollectionResult,
  FlightAwareFlight,
  FlightAwareMovementKind,
} from "./types.ts";

const DEFAULT_BASE_URL = "https://aeroapi.flightaware.com/aeroapi";
const DEFAULT_TIMEOUT_MS = 15_000;

export function toAeroApiDateTime(date: Date): string {
  return date.toISOString().slice(0, -5) + "Z";
}

export interface FlightAwareClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface FlightAwareClientQuery {
  airport: string;
  start: Date;
  end: Date;
  maxPages: number;
  rawSampleSize?: number;
}

export class FlightAwareApiError extends Error {
  readonly status?: number;
  readonly reason?: string;
  readonly retryAfter?: string | null;

  constructor(
    message: string,
    status?: number,
    reason?: string,
    retryAfter?: string | null,
  ) {
    super(message);
    this.name = "FlightAwareApiError";
    this.status = status;
    this.reason = reason;
    this.retryAfter = retryAfter;
  }
}

function isCollectionResponse(
  value: unknown,
): value is FlightAwareCollectionResponse {
  return typeof value === "object" && value !== null;
}

export class FlightAwareClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: FlightAwareClientOptions) {
    const apiKey = options.apiKey.trim();

    if (!apiKey) {
      throw new FlightAwareApiError(
        "FLIGHTAWARE_AEROAPI_KEY is not configured.",
      );
    }

    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  getScheduledArrivals(
    query: FlightAwareClientQuery,
  ): Promise<FlightAwareCollectionResult> {
    return this.getCollection("scheduled_arrivals", query);
  }

  getScheduledDepartures(
    query: FlightAwareClientQuery,
  ): Promise<FlightAwareCollectionResult> {
    return this.getCollection("scheduled_departures", query);
  }

  private async getCollection(
    kind: FlightAwareMovementKind,
    query: FlightAwareClientQuery,
  ): Promise<FlightAwareCollectionResult> {
    const airport = query.airport.trim().toUpperCase();
    const maxPages = Math.floor(query.maxPages);

    if (!airport) {
      throw new FlightAwareApiError("Airport is required.");
    }

    if (!Number.isInteger(maxPages) || maxPages < 1) {
      throw new FlightAwareApiError("maxPages must be a positive integer.");
    }

    let nextUrl: URL | null = this.buildInitialUrl(kind, {
      ...query,
      airport,
      maxPages,
    });
    let pages = 0;
    let httpRequests = 0;
    let truncated = false;
    const records: FlightAwareFlight[] = [];
    const rawSamples: FlightAwareFlight[] = [];
    const visitedUrls = new Set<string>();

    while (nextUrl) {
      if (visitedUrls.has(nextUrl.href)) {
        throw new FlightAwareApiError(
          "FlightAware returned a repeated pagination link.",
        );
      }
      visitedUrls.add(nextUrl.href);

      const remainingPages = maxPages - pages;
      if (remainingPages <= 0) {
        truncated = true;
        break;
      }
      nextUrl.searchParams.set("max_pages", String(remainingPages));

      const response = await this.request(nextUrl);
      httpRequests += 1;
      const pageRecords = response[kind] ?? [];
      records.push(...pageRecords);

      const rawSampleSize = query.rawSampleSize ?? 0;
      for (const record of pageRecords) {
        if (rawSamples.length >= rawSampleSize) {
          break;
        }
        rawSamples.push(record);
      }

      const returnedPages = Number.isInteger(response.num_pages)
        ? Math.max(1, response.num_pages ?? 1)
        : 1;
      pages += returnedPages;

      const next = response.links?.next;
      if (!next) {
        nextUrl = null;
      } else if (pages >= maxPages) {
        truncated = true;
        nextUrl = null;
      } else {
        nextUrl = this.resolveNextLink(next);
      }
    }

    return {
      records,
      pages,
      httpRequests,
      truncated,
      rawSamples,
    };
  }

  private buildInitialUrl(
    kind: FlightAwareMovementKind,
    query: FlightAwareClientQuery,
  ): URL {
    const url = new URL(
      `${this.baseUrl}/airports/${encodeURIComponent(query.airport)}/flights/${kind}`,
    );
    url.searchParams.set("start", toAeroApiDateTime(query.start));
    url.searchParams.set("end", toAeroApiDateTime(query.end));
    url.searchParams.set("max_pages", String(query.maxPages));
    return url;
  }

  private resolveNextLink(next: string): URL {
    const base = new URL(this.baseUrl);
    let resolved: URL;

    if (next.startsWith("/aeroapi/")) {
      resolved = new URL(next, base.origin);
    } else if (next.startsWith("/")) {
      resolved = new URL(`${this.baseUrl}${next}`);
    } else {
      resolved = new URL(next, `${this.baseUrl}/`);
    }

    const apiPath = base.pathname.replace(/\/$/, "");
    if (
      resolved.origin !== base.origin
      || !resolved.pathname.startsWith(`${apiPath}/`)
    ) {
      throw new FlightAwareApiError(
        "FlightAware returned an unsafe pagination link.",
      );
    }

    return resolved;
  }

  private async request(
    url: URL,
  ): Promise<FlightAwareCollectionResponse> {
    let response: Response;

    try {
      response = await this.fetchImpl(url, {
        headers: {
          accept: "application/json; charset=UTF-8",
          "x-apikey": this.apiKey,
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new FlightAwareApiError(
        `FlightAware request failed: ${this.redact(message)}`,
      );
    }

    if (!response.ok) {
      throw await this.toApiError(response);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new FlightAwareApiError(
        "FlightAware returned an invalid JSON response.",
        response.status,
      );
    }

    if (!isCollectionResponse(body)) {
      throw new FlightAwareApiError(
        "FlightAware returned an unexpected response shape.",
        response.status,
      );
    }

    return body;
  }

  private async toApiError(response: Response): Promise<FlightAwareApiError> {
    let reason: string | undefined;
    let detail: string | undefined;

    try {
      const body = await response.json() as {
        title?: unknown;
        reason?: unknown;
        detail?: unknown;
      };
      reason = typeof body.reason === "string" ? body.reason : undefined;
      detail = typeof body.detail === "string"
        ? body.detail
        : typeof body.title === "string"
          ? body.title
          : undefined;
    } catch {
      // Status-specific message below is sufficient when the body is not JSON.
    }

    const suffix = detail ? ` ${this.redact(detail)}` : "";
    if (response.status === 401 || response.status === 403) {
      return new FlightAwareApiError(
        `FlightAware authentication or plan authorization failed (HTTP ${response.status}).${suffix}`,
        response.status,
        reason,
      );
    }
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      return new FlightAwareApiError(
        `FlightAware rate limit reached (HTTP 429).${suffix}`,
        response.status,
        reason,
        retryAfter,
      );
    }

    return new FlightAwareApiError(
      `FlightAware request failed (HTTP ${response.status}).${suffix}`,
      response.status,
      reason,
    );
  }

  private redact(value: string): string {
    return value.split(this.apiKey).join("[REDACTED]");
  }
}
