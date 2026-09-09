# Real Spotter Interest developer probe v0.1

## Purpose

This developer-only pipeline evaluates normalized FlightAware airport-board
movements with the unchanged deterministic Spotter Interest v0.1 service:

~~~text
FlightAware AeroAPI
  -> FlightAwareAviationDataProvider
  -> AircraftMovement[]
  -> SpotterInterestEnricher
  -> SpotterInterestFacts + provenance
  -> SpotterInterestService v0.1
  -> ranked terminal report
~~~

It does not feed FlightAware data to `/spotlight`, persist responses, call
per-flight endpoints, or add any other aviation provider.

## Command

Run from `apps/web`:

~~~bash
pnpm probe:spotter-interest -- \
  --airport KATL \
  --start 2026-08-23T19:00:00Z \
  --end 2026-08-23T19:30:00Z \
  --max-pages 5 \
  --top 10
~~~

Defaults are KATL, a 30-minute window beginning now, five pages per endpoint,
and ten ranked aircraft. The CLI uses only the existing scheduled-arrivals and
scheduled-departures endpoints. HTTP 429 and other errors stop the command;
there is no automatic retry or window expansion.

## Provenance boundary

The live movement supplies the lookup keys and operational facts:
registration, raw aircraft-type code, operator, origin, destination, movement
type, status, and scheduled/estimated timestamps. These fields are marked
`LIVE` when present.

The four score dimensions require facts not supplied by FlightAware. Their
inputs are marked:

- `REFERENCE` when a strict entry exists in the existing reviewed mock/reference
  dataset;
- `MISSING` when it does not.

A missing match remains visibly different from a known reference input whose
score happens to be zero. Missing notability uses no tags, missing global fleet
size uses a score-neutral common-fleet input, missing local history uses
`INSUFFICIENT` data, and missing registration history passes a null registration
to the scorer. In particular, an unknown live registration is never converted
into a fabricated zero-visit or first-visit rarity fact.

## Aircraft-type normalization

The normalizer maps only reviewed, unambiguous ICAO type codes to the variants
used by the existing reference dataset. Examples include A359 to A350-900,
A35K to A350-1000, A21N to A321neo, B738 to B737-800, and B77W to
B777-300ER. A successful code normalization does not imply a reference-data
match; B777-300ER currently has no fleet/local entry in the dataset.

Ambiguous codes remain unmatched. In particular, B748 is not inferred as
B747-8I or B747-8F, B763 is not inferred as B767-300F, and B772 is not inferred
as B777-200ER. Unknown and missing codes are also preserved as missing rather
than assigned a rarity value.

## Ranking and report behavior

Every returned movement is enriched and evaluated with
`SpotterInterestService.evaluate`. The service, four scorers, weights,
thresholds, caps, and reason values are unchanged. Results are sorted by final
score, then movement time and stable identifiers.

The full scored movement list retains arrivals and departures. The aircraft-level
Top N uses the existing identity policy: normalized registration when present,
otherwise the movement ID. This prevents one tail from occupying multiple Top N
slots while avoiding ident-only deduplication.

The terminal report includes reference match rates, four-dimension completeness,
score bands, existing Routine/Interesting/Spotlight classification counts, a
routine sample, unmatched type codes, up to five registrations with no reference
match, actual FlightAware HTTP requests, result pages, and truncation status.

## Persistent local audit trail

Successful live ranking runs save automatically outside Git under:

~~~text
~/AircraftSpotterRadar/datasets/probe-runs/flightaware/<run-id>/
~~~

The base run ID is the whole-second observation timestamp plus airport, for
example `2026-08-23T212100Z_KATL`. If that directory exists, the writer reserves
`_002`, `_003`, and so on. Directories and files use exclusive creation, so a
manually edited audit is never overwritten. Use `--no-audit` only when an audit
is intentionally unnecessary.

Buffers expand the fetch once while preserving the primary ranking window:

~~~bash
pnpm probe:spotter-interest -- \
  --airport KATL \
  --start 2026-08-23T20:00:00Z \
  --end 2026-08-23T20:30:00Z \
  --buffer-before-minutes 5 \
  --buffer-after-minutes 5 \
  --find QTR
~~~

All fetched normalized movements, including buffer-only records, go to
`movements.csv`. Primary membership uses the relevant scheduled arrival or
departure time with an inclusive start and exclusive end. Only primary movements
enter scoring and `scores.csv`. The optional search reads the already-fetched
in-memory results and never makes another API call.

### movements.csv

The exact columns are:

~~~text
run_id,movement_id,provider,provider_flight_id,ident,operator_icao,registration,aircraft_type,origin_airport,destination_airport,movement_type,scheduled_departure_time_utc,scheduled_arrival_time_utc,estimated_departure_time_utc,estimated_arrival_time_utc,actual_departure_time_utc,actual_arrival_time_utc,scheduled_movement_time_utc,scheduled_movement_time_local,observed_at_utc,requested_window_start_utc,requested_window_end_utc,window_end_exclusive,in_primary_window,minutes_from_window_start,minutes_to_window_end,status,provider_status,cancelled,diverted
~~~

KATL local times use `America/New_York` through `Intl.DateTimeFormat`, so DST is
resolved for the timestamp instead of using a fixed EDT/EST offset.

### scores.csv

The exact columns are:

~~~text
run_id,provider_flight_id,ident,operator_icao,registration,aircraft_type,origin_airport,destination_airport,movement_type,scheduled_movement_time_utc,in_primary_window,final_score,classification,movement_rank,aircraft_level_rank,is_top_n,is_spotlight,notability_score,global_type_rarity_score,local_type_rarity_score,registration_rarity_score,notability_source,global_type_rarity_source,local_type_rarity_source,registration_rarity_source,notability_reasons,global_type_rarity_reasons,local_type_rarity_reasons,registration_rarity_reasons,supported_dimension_count,enrichment_completeness,manual_expected_priority,manual_should_be_top10,manual_expected_rank,manual_notes,reviewed_at
~~~

Reason arrays use a stable pipe-delimited representation. Every scored movement
has `movement_rank`. Only the registration-deduplicated representative has an
`aircraft_level_rank`; a duplicate movement leaves that field empty. Manual
review fields are generated empty.

### run.json

The manifest records the run ID, airport/provider, observation time, primary and
fetch windows, exclusive-end flag, both buffers, page limit, fetched and primary
counts, HTTP requests and result pages, endpoint truncation, basic field coverage,
enrichment match counts, `spotter-interest-v0.1`, the centralized weights and
thresholds, maximum Spotlight count, and nullable Git commit/branch/dirty state.
It contains no headers, credentials, cookies, or environment values.

CSV output is produced by a shared RFC-style escaping helper: fields containing
commas, quotes, carriage returns, or newlines are quoted, and embedded quotes
are doubled. Null and unavailable values remain empty fields.
