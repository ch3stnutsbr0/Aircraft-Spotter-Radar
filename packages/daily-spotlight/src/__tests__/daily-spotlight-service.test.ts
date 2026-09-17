import assert from "node:assert/strict";
import test from "node:test";
import type { RankableAircraftMovement } from "../../../domain/src/index.ts";
import { makeFacts, makeMovement } from "../../../spotter-ranking/src/__tests__/fixtures.ts";
import { makeRealMovement } from "../../../spotter-interest-integration/src/__tests__/fixtures.ts";
import {
  DailySpotlightError,
  DailySpotlightService,
  LegacyRuleRanker,
  type MovementRanker,
} from "../index.ts";

const query = {
  airport: "KATL",
  start: new Date("2026-08-23T15:00:00Z"),
  end: new Date("2026-08-23T16:00:00Z"),
  maxPages: 1,
};

function mockService(movements: RankableAircraftMovement[]) {
  return new DailySpotlightService({
    source: "MOCK",
    ranker: new LegacyRuleRanker(),
    async getMovements() {
      return {
        movements,
        observedAt: new Date("2026-08-23T15:00:00Z"),
        diagnostics: { fetchedMovements: movements.length },
      };
    },
  });
}

test("DailySpotlightService produces a valid mock result and full movement list", async () => {
  const movements = [makeMovement("routine", makeFacts())];
  const result = await mockService(movements).generate(query);
  assert.equal(result.source, "MOCK");
  assert.equal(result.airport, "KATL");
  assert.equal(result.movements.length, 1);
  assert.equal(result.movements[0].movementRank, 1);
  assert.equal(result.diagnostics.fetchedMovements, 1);
});

test("a normalized FlightAware fixture is enriched, scored, and ranked", async () => {
  const real = [
    makeRealMovement({ registration: "N000AA", aircraftType: "A321" }),
    makeRealMovement({ registration: "N509DN", aircraftType: "A359" }),
  ];
  const service = new DailySpotlightService({
    source: "FLIGHTAWARE",
    ranker: new LegacyRuleRanker(),
    async getMovements() {
      return { movements: real, observedAt: query.start, diagnostics: { fetchedMovements: 2 } };
    },
  });
  const result = await service.generate(query);
  assert.equal(result.movements[0].registration, "N509DN");
  assert.equal(result.movements[0].provider, "flightaware");
  assert.equal(result.movements[0].enrichmentSources?.notability, "REFERENCE");
});

test("no qualifying movements returns an empty Spotlight list", async () => {
  const result = await mockService([
    makeMovement("routine", makeFacts()),
  ]).generate(query);
  assert.deepEqual(result.spotlightMovements, []);
  assert.equal(result.movements.length, 1);
});

test("missing real enrichment stays visible and safe", async () => {
  const real = makeRealMovement({ registration: null, aircraftType: "ZZZZ" });
  const service = new DailySpotlightService({
    source: "FLIGHTAWARE",
    ranker: new LegacyRuleRanker(),
    async getMovements() {
      return { movements: [real], observedAt: query.start, diagnostics: { fetchedMovements: 1 } };
    },
  });
  const result = await service.generate(query);
  assert.equal(result.movements[0].enrichmentSources?.notability, "MISSING");
  assert.equal(result.movements[0].enrichmentSources?.registrationRarity, "MISSING");
  assert.equal(result.movements[0].spotterInterest?.score, 0);
});

test("Spotlight aircraft are deduplicated by registration without filling", async () => {
  const facts = makeFacts({
    registration: "N509DN",
    variant: "AN-124",
    notabilityTags: ["ONE_OFF_LIVERY"],
    activeGlobalFleetSize: 5,
    localTypeMovements: 0,
    visits: 0,
    daysSinceLastVisit: null,
  });
  const first = makeMovement("first", facts, "2026-08-23T15:10:00Z");
  const second = makeMovement("second", facts, "2026-08-23T15:20:00Z");
  const result = await mockService([first, second]).generate(query);
  assert.equal(result.movements.length, 2);
  assert.equal(result.spotlightMovements.length, 1);
});

test("provider failures become a controlled application error", async () => {
  const service = new DailySpotlightService({
    source: "FLIGHTAWARE",
    ranker: new LegacyRuleRanker(),
    async getMovements(): Promise<never> { throw new Error("network detail"); },
  });
  await assert.rejects(
    service.generate(query),
    (error: unknown) => error instanceof DailySpotlightError
      && error.code === "PROVIDER_UNAVAILABLE"
      && !error.userMessage.includes("network detail"),
  );
});

test("a scorer cannot silently drop movements", async () => {
  const movement = makeMovement("one", makeFacts());
  const service = new DailySpotlightService({
    source: "MOCK",
    ranker: { async rank() { return []; } },
    async getMovements() {
      return { movements: [movement], observedAt: query.start, diagnostics: { fetchedMovements: 1 } };
    },
  });
  await assert.rejects(service.generate(query), /preserve the complete movement list/);
});

test("DailySpotlightService uses the supplied ranker abstraction", async () => {
  const movement = makeMovement("one", makeFacts());
  let called = false;
  const ranker: MovementRanker = {
    async rank(items, context) {
      called = true;
      assert.equal(items[0], movement);
      assert.equal(context.airport, "KATL");
      return [{
        movement,
        rank: 1,
        score: 77,
        displayScore: 77,
        tier: "INTERESTING",
        reasons: [{ code: "FAKE", label: "Fake ranker reason" }],
        rankerId: "test-fake",
      }];
    },
  };
  const service = new DailySpotlightService({
    source: "MOCK",
    ranker,
    async getMovements() {
      return { movements: [movement], observedAt: query.start, diagnostics: { fetchedMovements: 1 } };
    },
  });

  const result = await service.generate(query);
  assert.equal(called, true);
  assert.equal(result.movements[0].ranking.rankerId, "test-fake");
  assert.equal(result.movements[0].ranking.displayScore, 77);
});
