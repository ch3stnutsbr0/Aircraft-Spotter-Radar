# Daily Spotlight Web data source v0.1

`/spotlight` is server-rendered from one reusable `DailySpotlightService` result. Its data source is an explicit environment choice; the presence of a FlightAware key never enables live mode by itself.

## Configuration

Copy the repository-root `.env.example` to `.env.local`, then choose one source:

```text
SPOTLIGHT_DATA_SOURCE=mock
```

or:

```text
SPOTLIGHT_DATA_SOURCE=flightaware
FLIGHTAWARE_AEROAPI_KEY=put-your-key-here
```

Optional development limits are:

```text
SPOTLIGHT_WINDOW_MINUTES=60
SPOTLIGHT_CACHE_SECONDS=300
SPOTLIGHT_MAX_PAGES=1
SPOTLIGHT_WEB_AUDIT=false
```

The defaults request a forward-looking 60-minute KATL window, permit one page from each of the scheduled-arrivals and scheduled-departures endpoints, and cache a successful server result for five minutes. Values are intentionally bounded: the window must be 15–180 minutes, cache TTL 60–3600 seconds, and page limit 1–5.

## Launch commands

From `apps/web`:

```text
pnpm dev
```

The `dev`, `build`, and `start` scripts load the repository-root `.env.local` if it exists.

For a one-command mock launch without editing `.env.local`:

```text
SPOTLIGHT_DATA_SOURCE=mock pnpm dev
```

For live mode, place the key in `.env.local`, then run:

```text
SPOTLIGHT_DATA_SOURCE=flightaware pnpm dev
```

Open `http://localhost:3000/spotlight` (or the alternate port printed by Next.js).

## Server and browser boundary

The Next.js page is a Server Component. It selects the provider, reads the secret, calls FlightAware, enriches and scores movements, and passes only the resulting display data to the client dashboard. The API key is not included in the `DailySpotlight` result, page props, HTML, or browser requests. Search, filters, sorting, and the detail drawer operate on the single loaded result and do not issue provider requests. There is no polling.

## Caching and API cost

The Web loader uses Next.js server data caching. A fresh live generation performs two logical endpoint queries—one scheduled-arrivals query and one scheduled-departures query. Each endpoint can consume up to `SPOTLIGHT_MAX_PAGES` HTTP result pages. Ordinary cached refreshes do not call FlightAware. This is a small development cache, not a distributed or persistent cache; separate app instances do not share it.

HTTP 429 is not retried. Quota, authentication, timeout, network, and response-shape failures render a labeled, usable error state. Live failures do not silently switch to mock aircraft.

## Audit policy

Web audit persistence is disabled by default. When `SPOTLIGHT_WEB_AUDIT=true`, a fresh live provider/scoring execution writes the existing `movements.csv`, `scores.csv`, and `run.json` bundle under `~/AircraftSpotterRadar/datasets/probe-runs/flightaware/`. Cached reads and client interactions do not write audits. Audit write failures are logged server-side and do not make the page unusable.

## Live-data limitations

FlightAware movement fields supply flight identity, operator code, type, registration, route, status, and distinct scheduled/estimated/actual timestamps. Spotter Interest enrichment continues to mark each supported dimension as `REFERENCE` or `MISSING`; missing evidence remains neutral and is visible in the development drawer.

FlightAware mode does not fabricate predicted runway, weather, runway flow, or airport movement statistics. Those mock-only panels remain available in mock mode and are omitted in live mode. Unknown operator names, airport descriptions, registrations, types, and liveries are labeled unavailable rather than inferred.
