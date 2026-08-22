import assert from "node:assert/strict";
import test from "node:test";
import {
  getSpotlightMovements,
  SpotterInterestService,
} from "../index.ts";
import { makeFacts, makeMovement } from "./fixtures.ts";

const service = new SpotterInterestService();

test("service applies the reviewed weights and exposes every dimension", () => {
  const result = service.evaluate(makeFacts({
    notabilityTags: ["SPECIAL_LIVERY"],
    activeGlobalFleetSize: 60,
    localTypeMovements: 42,
    visits: 4,
    daysSinceLastVisit: 30,
  }));

  assert.equal(result.dimensions.notability.score, 70);
  assert.equal(result.dimensions.globalTypeRarity.score, 50);
  assert.equal(result.dimensions.localTypeRarity.score, 40);
  assert.equal(result.dimensions.registrationRarity.score, 40);
  assert.deepEqual(result.weightedContributions, {
    notability: 24.5,
    globalTypeRarity: 15,
    localTypeRarity: 8,
    registrationRarity: 6,
  });
  assert.equal(result.score, 53.5);
  assert.equal(result.classification, "SPOTLIGHT");
});

test("Team USA A350 ranks far above an otherwise equivalent standard A350", () => {
  const standard = service.evaluate(makeFacts({
    variant: "A350-900",
    activeGlobalFleetSize: 350,
    localTypeMovements: 600,
  }));
  const teamUsa = service.evaluate(makeFacts({
    variant: "A350-900",
    notabilityTags: ["ONE_OFF_LIVERY"],
    activeGlobalFleetSize: 350,
    localTypeMovements: 600,
  }));

  assert.ok(teamUsa.score > standard.score);
  assert.equal(teamUsa.dimensions.notability.score, 90);
  assert.equal(standard.dimensions.notability.score, 0);
});

test("globally rare but locally common type remains interesting", () => {
  const result = service.evaluate(makeFacts({
    activeGlobalFleetSize: 15,
    localTypeMovements: 9000,
  }));

  assert.equal(result.dimensions.globalTypeRarity.score, 85);
  assert.equal(result.dimensions.localTypeRarity.score, 0);
  assert.equal(result.classification, "INTERESTING");
});

test("globally and locally rare type outranks routine traffic", () => {
  const routine = service.evaluate(makeFacts());
  const rareAtAtl = service.evaluate(makeFacts({
    variant: "B747-8I",
    activeGlobalFleetSize: 20,
    localTypeMovements: 30,
    visits: 3,
    daysSinceLastVisit: 45,
  }));

  assert.ok(rareAtAtl.score > routine.score);
  assert.equal(rareAtAtl.dimensions.localTypeRarity.score, 65);
});

test("registration rarity independently raises a common type", () => {
  const commonTail = service.evaluate(makeFacts());
  const rareTail = service.evaluate(makeFacts({
    visits: 1,
    daysSinceLastVisit: 180,
  }));

  assert.ok(rareTail.score > commonTail.score);
  assert.equal(rareTail.dimensions.registrationRarity.score, 90);
});

test("AN-124-like exceptional visitor ranks near the top", () => {
  const result = service.evaluate(makeFacts({
    variant: "AN-124",
    activeGlobalFleetSize: 5,
    localTypeMovements: 0,
    visits: 0,
    daysSinceLastVisit: null,
  }));

  assert.equal(result.dimensions.globalTypeRarity.score, 100);
  assert.equal(result.dimensions.localTypeRarity.score, 100);
  assert.equal(result.dimensions.registrationRarity.score, 100);
  assert.equal(result.score, 65);
  assert.equal(result.classification, "SPOTLIGHT");
});

test("standard common registration does not qualify for Spotlight", () => {
  const result = service.evaluate(makeFacts());
  assert.equal(result.score, 0);
  assert.equal(result.classification, "ROUTINE");
});

test("Spotlight excludes routine traffic, caps at five, and deduplicates registrations", () => {
  const exceptionalFacts = makeFacts({
    variant: "AN-124",
    activeGlobalFleetSize: 5,
    localTypeMovements: 0,
    visits: 0,
    daysSinceLastVisit: null,
  });
  const movements = Array.from({ length: 7 }, (_, index) => {
    const registration = index < 2 ? "UR-DUP" : `UR-TEST${index}`;
    const facts = {
      ...exceptionalFacts,
      registrationRarity: {
        ...exceptionalFacts.registrationRarity,
        registration,
      },
    };
    return service.scoreMovement(makeMovement(`exceptional-${index}`, facts));
  });
  movements.push(service.scoreMovement(makeMovement("routine", makeFacts())));

  const spotlight = getSpotlightMovements(movements);
  assert.equal(spotlight.length, 5);
  assert.equal(
    spotlight.filter(
      (movement) => movement.aircraft.registration === "UR-DUP",
    ).length,
    1,
  );
  assert.ok(spotlight.every((movement) => movement.spotterInterest.score >= 40));
});
