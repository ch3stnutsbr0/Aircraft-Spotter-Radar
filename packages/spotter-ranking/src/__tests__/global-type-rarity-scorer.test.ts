import assert from "node:assert/strict";
import test from "node:test";
import { GlobalTypeRarityScorer } from "../scorers/global-type-rarity-scorer.ts";

const scorer = new GlobalTypeRarityScorer();
const score = (activeGlobalFleetSize: number) =>
  scorer.score({ variant: "TEST", activeGlobalFleetSize }).score;

test("global rarity follows every reviewed fleet-size boundary", () => {
  assert.equal(score(1001), 0);
  assert.equal(score(1000), 10);
  assert.equal(score(500), 10);
  assert.equal(score(499), 20);
  assert.equal(score(250), 20);
  assert.equal(score(249), 35);
  assert.equal(score(100), 35);
  assert.equal(score(99), 50);
  assert.equal(score(50), 50);
  assert.equal(score(49), 70);
  assert.equal(score(20), 70);
  assert.equal(score(19), 85);
  assert.equal(score(10), 85);
  assert.equal(score(9), 100);
});

test("variant-level inputs can score independently", () => {
  const passenger = scorer.score({
    variant: "B747-8I",
    activeGlobalFleetSize: 19,
  });
  const freighter = scorer.score({
    variant: "B747-8F",
    activeGlobalFleetSize: 45,
  });

  assert.equal(passenger.score, 85);
  assert.equal(freighter.score, 70);
  assert.notEqual(passenger.score, freighter.score);
});
