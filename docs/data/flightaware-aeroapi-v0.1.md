# FlightAware AeroAPI probe v0.1

## Purpose

This integration measures whether FlightAware airport-board data has enough
aircraft, registration, route, time, operator, and status coverage for a later
Spotter Interest integration. It does not replace the mock-powered Daily
Spotlight UI.

FlightAware's current public OpenAPI document identifies this REST surface as
AeroAPI 4.17.1. Legacy AeroAPI v3 used FlightXML-style endpoints and is
end-of-life. The two REST endpoints requested for this milestone are current
v4 endpoints:

- GET /airports/{id}/flights/scheduled_arrivals
- GET /airports/{id}/flights/scheduled_departures

References:

- [Official AeroAPI OpenAPI specification](https://www.flightaware.com/commercial/aeroapi/resources/aeroapi-openapi.yml)
- [Official AeroAPI developer portal](https://www.flightaware.com/aeroapi/portal/documentation)
- [Official AeroAPI product and endpoint list](https://www.flightaware.com/commercial/aeroapi/)

## Configuration

Create an ignored file at the repository root named '.env.local':

~~~dotenv
FLIGHTAWARE_AEROAPI_KEY=your_key_here
~~~

The variable name is listed without a value in '.env.example'. Repository
'.gitignore' rules ignore '.env', '.env.local', and '.env.*.local'. The client
sends the key only in the 'x-apikey' request header and redacts it from error
messages.

## Running the KATL probe

From 'apps/web':

~~~bash
pnpm probe:flightaware -- --airport KATL
~~~

An explicit four-hour window and safety limit can be supplied:

~~~bash
pnpm probe:flightaware -- \
  --airport KATL \
  --start 2026-08-23T14:00:00Z \
  --end 2026-08-23T18:00:00Z \
  --max-pages 5
~~~

Add '--raw' to print at most two sanitized response records from each endpoint.
No request headers or credentials are printed.

When omitted, '--start' defaults to now, '--end' defaults to four hours after
the start, and '--max-pages' defaults to 5 per endpoint.

## Window and pagination behavior

The official schema documents 'start' as inclusive and 'end' as exclusive.
Both accept an ISO 8601 date or datetime and must be no more than 10 days in the
past or 2 days in the future.

The endpoint semantics are not identical:

- scheduled departures apply the window to 'scheduled_off';
- scheduled arrivals apply the window to 'estimated_on'.

The provider sends the requested values to both endpoints and does not discard
records returned outside those bounds. It reports any known out-of-window
records as a data-quality metric.

AeroAPI accepts 'max_pages' and may return 'links.next' with an opaque cursor.
The client requests up to the configured total page budget, follows a safe
same-origin cursor only when more budget remains, counts result-set pages
separately from HTTP requests, and marks the result truncated when a next link
remains at the safety limit. The default is intentionally conservative because
AeroAPI is usage-based.

The report treats three counters as separate facts:

- endpoint queries are the two high-level arrivals and departures operations;
- actual HTTP requests count each network call made by the client;
- result pages use AeroAPI `num_pages`, because one HTTP response can contain
  more than one result page.

Truncation is reported separately for arrivals and departures, together with
the number of records retained before the limit. The client serializes all
request bounds as UTC ISO 8601 timestamps at whole-second precision; this is
centralized in `toAeroApiDateTime` and covered by a regression test.

## Time-to-movement coverage

The probe records a single `observedAt` timestamp after retrieval and uses it
as the reference point for all timing analysis. Arrivals prefer
`scheduledArrivalTime`; departures prefer `scheduledDepartureTime`. If the
relevant scheduled value is unavailable, the matching estimated time is used
as an explicitly counted fallback. Actual times are never used for future
time-to-movement analysis.

Registration and aircraft-type coverage are reported in these non-overlapping
buckets: Past / due (`<= 0`), 0-3h (`> 0` and `< 3h`), 3-6h (`>= 3h` and
`< 6h`), 6-12h, 12-24h, 24-48h, 48h+, and Unavailable. Registration is also
summarized for all movements, arrivals, and departures. Samples are capped at
five missing registrations and five farthest-future known registrations.

## Provider boundary

~~~text
FlightAwareClient
  -> raw FlightAwareCollectionResponse
  -> FlightAwareAviationDataProvider
  -> normalizeFlightAwareMovement
  -> AircraftMovement[]
~~~

'AviationDataProvider' is shared by 'MockAviationDataProvider' and
'FlightAwareAviationDataProvider'. Higher-level services and React components
do not receive raw FlightAware objects. The existing mock Spotlight flow stays
unchanged.

## Normalized fields

| Internal field | FlightAware source |
| --- | --- |
| provider | constant 'flightaware' |
| providerFlightId | fa_flight_id |
| ident | ident_icao, then ident |
| operatorIcao | operator_icao |
| registration | registration |
| aircraftType | aircraft_type |
| originAirport | origin.code_icao, then code, code_iata, code_lid |
| destinationAirport | destination.code_icao, then code, code_iata, code_lid |
| movementType | endpoint/query context |
| scheduledDepartureTime | scheduled_out, then scheduled_off |
| estimatedDepartureTime | estimated_out, then estimated_off |
| actualDepartureTime | actual_out, then actual_off |
| scheduledArrivalTime | scheduled_in, then scheduled_on |
| estimatedArrivalTime | estimated_in, then estimated_on |
| actualArrivalTime | actual_in, then actual_on |
| cancelled | cancelled |
| diverted | diverted |
| providerStatus | status |
| status | flags, time facts, and normalized status text |
| observedAt | local retrieval/normalization time |
| lastUpdatedAt | last_updated when supplied; otherwise null |

Gate times ('out'/'in') are preferred and runway times ('off'/'on') are the
fallback. Scheduled, estimated, and actual values remain separate.

## Legitimately nullable data

Registration, aircraft type, operator, origin/destination, every time field,
provider status, and provider update time can be null. A future flight with an
unknown tail or aircraft type is preserved and included in the coverage report.

The current OpenAPI schema describes status as human-readable rather than a
closed enum. Normalization therefore uses cancellation/diversion flags first,
then known status terms and actual timestamps; unfamiliar values become
'UNKNOWN' while the original text remains in 'providerStatus'.

FlightAware also notes that 'cancelled' can mean tracking stopped for several
reasons, not only an airline-confirmed cancellation. The report should be read
with that limitation in mind. The schema also notes that diverted legs can
share a 'fa_flight_id', so duplicates are reported rather than aggressively
removed.

## Cost-conscious scope

A normal run makes one logical arrivals query and one logical departures query.
Each network response can contain one or more server-side result pages, only up
to the chosen limit. It makes no per-flight
detail requests, performs no retries, and stores nothing. Timeouts, non-2xx
errors, authentication/plan failures, rate limits, network failures, unsafe or
repeated cursor links, and truncation are reported explicitly.

This milestone intentionally does not implement persistence, polling,
historical ingestion, enrichment, Spotter Interest scoring, AI, notifications,
runway prediction, weather, ADS-B positions, scraping, or live UI replacement.

## Verification

Unit tests use sanitized mocked responses and never contact AeroAPI. Live probe
runs are deliberately manual, narrow, and cost-conscious; their timestamped
terminal output is the evidence for a particular window and should not be
assumed to describe every airport or planning horizon.
