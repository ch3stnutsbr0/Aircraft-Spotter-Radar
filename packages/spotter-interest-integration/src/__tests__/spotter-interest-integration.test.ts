import assert from "node:assert/strict";
import test from "node:test";
import type { FlightAwareProbeDiagnostics } from "../../../aviation-data/src/index.ts";
import {
  buildEnrichmentCoverage,
  buildScoreDistribution,
  formatSpotterInterestProbeReport,
  rankScoredMovements,
  scoreRealMovements,
  selectTopRankedAircraft,
  SpotterInterestEnricher,
} from "../index.ts";
import { makeRealMovement } from "./fixtures.ts";

const observedAt = new Date("2026-08-23T19:00:00Z");

function diagnostics(): FlightAwareProbeDiagnostics {
  return {
    observedAt,
    endpointQueries: 2,
    arrivalEndpointQueries: 1,
    departureEndpointQueries: 1,
    arrivalHttpRequests: 1,
    departureHttpRequests: 1,
    totalHttpRequests: 2,
    arrivalPages: 1,
    departurePages: 1,
    totalPages: 2,
    maxPagesPerEndpoint: 5,
    arrivalRecords: 1,
    departureRecords: 1,
    arrivalsTruncated: false,
    departuresTruncated: false,
    resultsTruncated: false,
    outsideRequestedWindow: 0,
    arrivalRawSamples: [],
    departureRawSamples: [],
  };
}

test("maps a normalized real movement into all known reference scorer inputs", () => {
  const movement = makeRealMovement({
    registration: "N509DN",
    aircraftType: "A359",
  });
  const enriched = new SpotterInterestEnricher().enrich(movement, "KATL");

  assert.equal(enriched.movement.provider, "flightaware");
  assert.equal(enriched.movement.registration, "N509DN");
  assert.equal(enriched.aircraftTypeNormalization.referenceVariant, "A350-900");
  assert.deepEqual(enriched.facts.notability.tags, ["ONE_OFF_LIVERY"]);
  assert.equal(enriched.facts.globalTypeRarity.activeGlobalFleetSize, 350);
  assert.equal(enriched.facts.localTypeRarity.typeMovements, 600);
  assert.equal(enriched.facts.registrationRarity.visits, 22);
  assert.equal(enriched.facts.registrationRarity.daysSinceLastVisit, 12);
  assert.deepEqual(enriched.sources, {
    movement: "LIVE",
    aircraftType: "LIVE",
    registration: "LIVE",
    notability: "REFERENCE",
    globalTypeRarity: "REFERENCE",
    localTypeRarity: "REFERENCE",
    registrationRarity: "REFERENCE",
  });
});

test("unknown type and registration produce visible missing sources and neutral scores", () => {
  const movement = makeRealMovement({
    registration: "N000XX",
    aircraftType: "ZZZZ",
  });
  const [scored] = scoreRealMovements([movement], "KATL");

  assert.equal(scored.sources.movement, "LIVE");
  assert.equal(scored.sources.aircraftType, "LIVE");
  assert.equal(scored.sources.registration, "LIVE");
  assert.equal(scored.sources.notability, "MISSING");
  assert.equal(scored.sources.globalTypeRarity, "MISSING");
  assert.equal(scored.sources.localTypeRarity, "MISSING");
  assert.equal(scored.sources.registrationRarity, "MISSING");
  assert.equal(scored.facts.registrationRarity.registration, null);
  assert.equal(scored.facts.localTypeRarity.dataQuality, "INSUFFICIENT");
  assert.equal(scored.spotterInterest.score, 0);
  assert.equal(scored.spotterInterest.classification, "ROUTINE");
});

test("mixed live, reference, and missing provenance stays explicit", () => {
  const movement = makeRealMovement({
    registration: null,
    aircraftType: "A21N",
  });
  const enriched = new SpotterInterestEnricher().enrich(movement, "KATL");

  assert.equal(enriched.sources.movement, "LIVE");
  assert.equal(enriched.sources.aircraftType, "LIVE");
  assert.equal(enriched.sources.registration, "MISSING");
  assert.equal(enriched.sources.globalTypeRarity, "REFERENCE");
  assert.equal(enriched.sources.localTypeRarity, "REFERENCE");
  assert.equal(enriched.sources.notability, "MISSING");
  assert.equal(enriched.sources.registrationRarity, "MISSING");
});

test("known special reference aircraft ranks above routine real traffic", () => {
  const special = makeRealMovement({
    registration: "N509DN",
    aircraftType: "A359",
  });
  const routine = makeRealMovement({
    registration: "N000AA",
    aircraftType: "A321",
  });
  const ranked = rankScoredMovements(
    scoreRealMovements([routine, special], "KATL"),
  );

  assert.equal(ranked[0].movement.registration, "N509DN");
  assert.equal(ranked[0].spotterInterest.classification, "SPOTLIGHT");
  assert.equal(ranked[1].spotterInterest.score, 0);
  assert.equal(ranked[1].spotterInterest.classification, "ROUTINE");
});

test("aircraft-level Top N deduplicates arrival and departure by registration", () => {
  const arrival = makeRealMovement({
    movementType: "ARRIVAL",
    registration: "N509DN",
    aircraftType: "A359",
  });
  const departure = makeRealMovement({
    movementType: "DEPARTURE",
    registration: "N509DN",
    aircraftType: "A359",
  });
  const other = makeRealMovement({
    registration: "A7-ANJ",
    aircraftType: "A35K",
  });
  const scored = scoreRealMovements([arrival, departure, other], "KATL");
  const top = selectTopRankedAircraft(scored, 10);

  assert.equal(scored.length, 3);
  assert.equal(top.length, 2);
  assert.equal(
    top.filter((item) => item.movement.registration === "N509DN").length,
    1,
  );
});

test("score distribution and enrichment completeness counts are exact", () => {
  const movements = [
    makeRealMovement({ registration: "N509DN", aircraftType: "A359" }),
    makeRealMovement({ registration: "A7-ANJ", aircraftType: "A35K" }),
    makeRealMovement({ registration: "N000AA", aircraftType: "A321" }),
    makeRealMovement({ registration: "N000XX", aircraftType: "ZZZZ" }),
  ];
  const scored = scoreRealMovements(movements, "KATL");
  const distribution = buildScoreDistribution(scored);
  const coverage = buildEnrichmentCoverage(scored);

  assert.deepEqual(distribution, {
    zeroToTen: 2,
    tenToTwentyFive: 0,
    twentyFiveToForty: 1,
    fortyToSixty: 1,
    sixtyPlus: 0,
    classifications: {
      ROUTINE: 2,
      INTERESTING: 1,
      SPOTLIGHT: 1,
    },
  });
  assert.deepEqual(coverage.supportedDimensionCounts, {
    allFour: 1,
    three: 1,
    two: 1,
    fewerThanTwo: 1,
  });
  assert.deepEqual(coverage.unmatchedAircraftTypes, [
    { code: "ZZZZ", count: 1 },
  ]);
});

test("terminal report distinguishes zero reference score from missing input", () => {
  const knownZero = makeRealMovement({
    registration: "N000AA",
    aircraftType: "A321",
  });
  const missing = makeRealMovement({
    registration: "N000XX",
    aircraftType: "ZZZZ",
  });
  const output = formatSpotterInterestProbeReport({
    airport: "KATL",
    start: new Date("2026-08-23T19:00:00Z"),
    end: new Date("2026-08-23T19:30:00Z"),
    top: 2,
    movements: scoreRealMovements([knownZero, missing], "KATL"),
    diagnostics: diagnostics(),
  });

  assert.match(output, /Global Type Rarity\s+0\n  source: REFERENCE/);
  assert.match(output, /Global Type Rarity\s+0\n  source: MISSING \(neutral default\)/);
  assert.match(output, /Movement facts source: LIVE \(FlightAware\)/);
  assert.match(output, /Actual HTTP requests\s+2/);
});
