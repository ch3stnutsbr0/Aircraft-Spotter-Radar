import assert from "node:assert/strict";
import test from "node:test";
import { rankScoredMovements, scoreRealMovements } from "../../../spotter-interest-integration/src/index.ts";
import { makeRealMovement } from "../../../spotter-interest-integration/src/__tests__/fixtures.ts";
import { LegacyRuleRanker } from "../index.ts";

test("LegacyRuleRanker preserves legacy ordering and scores", async () => {
  const movements = [
    makeRealMovement({ registration: "N000AA", aircraftType: "A321" }),
    makeRealMovement({ registration: "N509DN", aircraftType: "A359" }),
  ];
  const legacy = rankScoredMovements(scoreRealMovements(movements, "KATL"));
  const ranked = await new LegacyRuleRanker().rank(movements, {
    airport: "KATL",
    windowStart: new Date("2026-08-23T15:00:00Z"),
    windowEnd: new Date("2026-08-23T16:00:00Z"),
  });

  assert.deepEqual(
    ranked.map((item) => item.movement.id),
    legacy.map((item) => item.movement.id),
  );
  assert.deepEqual(
    ranked.map((item) => item.score),
    legacy.map((item) => item.spotterInterest.score),
  );
});
