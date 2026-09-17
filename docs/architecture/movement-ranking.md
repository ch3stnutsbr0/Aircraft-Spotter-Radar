# Movement ranking boundary

Daily Spotlight now separates deterministic aviation enrichment from the product decision of which movements are worth spotting:

```text
AircraftMovement
     ↓
deterministic enrichment and reference-derived features
     ↓
MovementRanker
     ├─ LegacyRuleRanker (default baseline/fallback)
     └─ AIRanker (future; currently an explicit unsupported stub)
     ↓
DailySpotlight
     ↓
Web
```

`MovementRanker` is an asynchronous boundary owned by `packages/daily-spotlight`. Its generic result contains rank, raw and display scores, a product tier, reasons, a ranker identifier, and optional metadata. It does not require the dimensions used by the rule scorer.

`LegacyRuleRanker` adapts deterministic enrichment from `packages/spotter-interest-integration` and the unchanged v0.1 formulas in `packages/spotter-ranking`. Those packages remain the source of reference truth, feature construction, saved-score audit parity, and the legacy baseline. Legacy dimensions remain available only as optional debug data.

`packages/spotter-ai` establishes the future implementation boundary without choosing a model, adding an inference runtime, or owning aviation reference data. `SPOTLIGHT_RANKER` defaults to `legacy-rule`; `ai` fails clearly until a real implementation is supplied.

FlightAware ingestion and the web UI consume the same domain and Daily Spotlight contracts. Normal UI uses generic ranking fields, while the development-only legacy score panel appears only when those details are supplied.
