# Aviation Data

This directory documents aviation data schemas, providers, licensing considerations, and data processing decisions.

- `flightaware-aeroapi-v0.1.md` describes the normalized FlightAware coverage probe.
- `real-spotter-interest-probe-v0.1.md` describes the developer-only real-movement ranking pipeline.
- `daily-spotlight-web-v0.1.md` describes the server-only mock/live Web pipeline, cost controls, and audit policy.

The canonical v0.1 enrichment data is
`packages/spotter-interest-integration/reference/spotter-reference-v0.1.json`.
It is owned and validated by the Spotter Interest integration package and is
shared by live and mock scoring. Its current values are migrated prototype
fixtures, not externally verified aviation facts.
