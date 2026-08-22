import assert from "node:assert/strict";
import test from "node:test";
import { RegistrationRarityScorer } from "../scorers/registration-rarity-scorer.ts";

const scorer = new RegistrationRarityScorer();
const score = (
  visits: number,
  daysSinceLastVisit: number | null,
  registration: string | null = "N12345",
) => scorer.score({
  airportCode: "ATL",
  registration,
  historicalWindowDays: 365,
  visits,
  daysSinceLastVisit,
});

test("frequent recent visitor has no registration rarity", () => {
  assert.equal(score(31, 10).score, 0);
});

test("one visit produces the reviewed base score", () => {
  assert.equal(score(1, 10).score, 70);
});

test("visit rarity and long absence combine independently", () => {
  const result = score(2, 180);
  assert.equal(result.score, 70);
  assert.ok(result.reasons.includes("RARE_VISITOR"));
  assert.ok(result.reasons.includes("LONG_ABSENCE"));
});

test("never-recorded registration is capped at 100", () => {
  const result = score(0, null);
  assert.equal(result.score, 100);
  assert.ok(result.reasons.includes("FIRST_RECORDED_VISIT"));
});

test("missing registration does not fabricate a first visit", () => {
  const result = score(0, null, null);
  assert.equal(result.score, 0);
  assert.deepEqual(result.reasons, []);
});
