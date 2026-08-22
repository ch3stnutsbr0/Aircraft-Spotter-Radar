import assert from "node:assert/strict";
import test from "node:test";
import { AircraftNotabilityScorer } from "../scorers/aircraft-notability-scorer.ts";

const scorer = new AircraftNotabilityScorer();

test("standard aircraft has no intrinsic notability", () => {
  assert.deepEqual(scorer.score({ tags: [] }), {
    score: 0,
    reasons: [],
    debug: {
      tagScores: [],
      rawScore: 0,
      combination: "highest + 25% second + 10% third",
      maximumScore: 100,
    },
  });
});

test("major special livery uses the reviewed score", () => {
  const result = scorer.score({ tags: ["SPECIAL_LIVERY"] });
  assert.equal(result.score, 70);
  assert.deepEqual(result.reasons, ["SPECIAL_LIVERY"]);
});

test("multiple tags use reduced secondary and tertiary contributions", () => {
  const result = scorer.score({
    tags: [
      "ANNIVERSARY_LIVERY",
      "PROMOTIONAL_LIVERY",
      "ALLIANCE_LIVERY",
    ],
  });
  assert.equal(result.score, 54.5);
});

test("multiple exceptional tags are capped at 100", () => {
  const result = scorer.score({
    tags: ["ONE_OFF_LIVERY", "FIRST_OF_TYPE_FOR_AIRLINE"],
  });
  assert.equal(result.score, 100);
});

test("historical significance accepts a curated score within the reviewed range", () => {
  const result = scorer.score({
    tags: ["HISTORICALLY_SIGNIFICANT_AIRFRAME"],
    curatedScores: { HISTORICALLY_SIGNIFICANT_AIRFRAME: 72 },
  });
  assert.equal(result.score, 72);
});
