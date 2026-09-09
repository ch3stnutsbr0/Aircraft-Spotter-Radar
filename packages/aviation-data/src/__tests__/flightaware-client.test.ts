import assert from "node:assert/strict";
import test from "node:test";
import {
  FlightAwareApiError,
  FlightAwareClient,
  toAeroApiDateTime,
} from "../flightaware/flightaware-client.ts";
import { makeFlightAwareFlight } from "./fixtures.ts";

test("follows FlightAware pagination links within the page budget", async () => {
  const urls: URL[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    urls.push(url);
    assert.equal(new Headers(init?.headers).get("x-apikey"), "test-key");

    if (urls.length === 1) {
      return new Response(JSON.stringify({
        scheduled_arrivals: [makeFlightAwareFlight()],
        links: {
          next: "/airports/KATL/flights/scheduled_arrivals?cursor=next",
        },
        num_pages: 1,
      }), { status: 200 });
    }

    return new Response(JSON.stringify({
      scheduled_arrivals: [makeFlightAwareFlight({
        fa_flight_id: "second-flight",
      })],
      links: null,
      num_pages: 1,
    }), { status: 200 });
  };

  const client = new FlightAwareClient({
    apiKey: "test-key",
    fetchImpl,
  });
  const result = await client.getScheduledArrivals({
    airport: "KATL",
    start: new Date("2026-08-23T14:00:00Z"),
    end: new Date("2026-08-23T18:00:00Z"),
    maxPages: 2,
  });

  assert.equal(result.records.length, 2);
  assert.equal(result.pages, 2);
  assert.equal(result.httpRequests, 2);
  assert.equal(result.truncated, false);
  assert.equal(urls[0].searchParams.get("start"), "2026-08-23T14:00:00Z");
  assert.equal(urls[0].searchParams.get("end"), "2026-08-23T18:00:00Z");
  assert.equal(urls[1].pathname, "/aeroapi/airports/KATL/flights/scheduled_arrivals");
  assert.equal(urls[1].searchParams.get("max_pages"), "1");
});

test("reports truncation when the page safety cap is reached", async () => {
  const client = new FlightAwareClient({
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({
      scheduled_departures: [makeFlightAwareFlight()],
      links: {
        next: "/airports/KATL/flights/scheduled_departures?cursor=next",
      },
      num_pages: 1,
    }), { status: 200 }),
  });

  const result = await client.getScheduledDepartures({
    airport: "KATL",
    start: new Date("2026-08-23T14:00:00Z"),
    end: new Date("2026-08-23T18:00:00Z"),
    maxPages: 1,
  });

  assert.equal(result.httpRequests, 1);
  assert.equal(result.truncated, true);
});

test("returns a descriptive authentication error without exposing the key", async () => {
  const client = new FlightAwareClient({
    apiKey: "super-secret-key",
    fetchImpl: async () => new Response(JSON.stringify({
      reason: "UNAUTHORIZED",
      detail: "Key super-secret-key is invalid",
    }), { status: 401 }),
  });

  await assert.rejects(
    client.getScheduledArrivals({
      airport: "KATL",
      start: new Date("2026-08-23T14:00:00Z"),
      end: new Date("2026-08-23T18:00:00Z"),
      maxPages: 1,
    }),
    (error: unknown) => {
      assert.ok(error instanceof FlightAwareApiError);
      assert.equal(error.status, 401);
      assert.doesNotMatch(error.message, /super-secret-key/);
      assert.match(error.message, /authentication or plan authorization/);
      return true;
    },
  );
});

test("returns rate-limit metadata for HTTP 429", async () => {
  const client = new FlightAwareClient({
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({
      reason: "RATE_LIMIT_ERROR",
      detail: "Quota reached",
    }), {
      status: 429,
      headers: { "retry-after": "60" },
    }),
  });

  await assert.rejects(
    client.getScheduledDepartures({
      airport: "KATL",
      start: new Date("2026-08-23T14:00:00Z"),
      end: new Date("2026-08-23T18:00:00Z"),
      maxPages: 1,
    }),
    (error: unknown) => {
      assert.ok(error instanceof FlightAwareApiError);
      assert.equal(error.status, 429);
      assert.equal(error.retryAfter, "60");
      return true;
    },
  );
});

test("serializes AeroAPI timestamps to whole seconds", () => {
  assert.equal(
    toAeroApiDateTime(new Date("2026-08-23T14:00:00.477Z")),
    "2026-08-23T14:00:00Z",
  );
});

test("counts multiple result pages in one HTTP response separately", async () => {
  let calls = 0;
  const client = new FlightAwareClient({
    apiKey: "test-key",
    fetchImpl: async () => {
      calls += 1;
      return new Response(JSON.stringify({
        scheduled_arrivals: [makeFlightAwareFlight()],
        links: null,
        num_pages: 2,
      }), { status: 200 });
    },
  });

  const result = await client.getScheduledArrivals({
    airport: "KATL",
    start: new Date("2026-08-23T14:00:00Z"),
    end: new Date("2026-08-23T14:30:00Z"),
    maxPages: 5,
  });

  assert.equal(calls, 1);
  assert.equal(result.httpRequests, 1);
  assert.equal(result.pages, 2);
  assert.equal(result.truncated, false);
});
