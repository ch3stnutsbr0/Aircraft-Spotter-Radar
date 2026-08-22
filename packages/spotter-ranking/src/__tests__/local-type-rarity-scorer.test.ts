import assert from "node:assert/strict";
import test from "node:test";
import { LocalTypeRarityScorer } from "../scorers/local-type-rarity-scorer.ts";

const scorer = new LocalTypeRarityScorer();
const score = (
  typeMovements: number,
  totalMovements = 10000,
  dataQuality: "SUFFICIENT" | "INSUFFICIENT" = "SUFFICIENT",
) => scorer.score({
  airportCode: "ATL",
  variant: "TEST",
  historicalWindowDays: 90,
  typeMovements,
  totalMovements,
  dataQuality,
});

test("local rarity follows the reviewed frequency boundaries", () => {
  assert.equal(score(100).score, 0);
  assert.equal(score(50).score, 10);
  assert.equal(score(20).score, 20);
  assert.equal(score(5).score, 40);
  assert.equal(score(1).score, 65);
  assert.equal(score(5, 100000).score, 90);
});

test("no historical occurrences receive 100 with sufficient data", () => {
  const result = score(0);
  assert.equal(result.score, 100);
  assert.deepEqual(result.reasons, ["VERY_RARE_AT_HOME_AIRPORT"]);
});

test("insufficient historical data does not fabricate local rarity", () => {
  const result = score(0, 0, "INSUFFICIENT");
  assert.equal(result.score, 0);
  assert.deepEqual(result.reasons, []);
});

test("local commonness is a zero bonus, never a penalty", () => {
  const result = score(300);
  assert.equal(result.score, 0);
  assert.ok(result.score >= 0);
});
