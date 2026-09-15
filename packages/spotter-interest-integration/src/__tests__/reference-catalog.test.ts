import assert from "node:assert/strict";
import test from "node:test";
import {
  parseReferenceCatalog,
  spotterReferenceCatalog,
  SpotterInterestEnricher,
  SpotterReferenceCatalog,
} from "../index.ts";
import { makeRealMovement } from "./fixtures.ts";

test("canonical reference catalog loads and indexes existing facts", () => {
  assert.equal(spotterReferenceCatalog.data.schemaVersion, "1");
  assert.equal(spotterReferenceCatalog.data.datasetVersion, "spotter-reference-v0.1");
  assert.equal(spotterReferenceCatalog.data.sources[0].id, "legacy-reviewed-fixture");
  assert.equal(
    spotterReferenceCatalog.findAircraftType("A359")?.typeId,
    "A350-900",
  );
  assert.equal(
    spotterReferenceCatalog.findGlobalType("A350-900")?.activeGlobalFleetSize,
    350,
  );
  assert.equal(
    spotterReferenceCatalog.findAirportType("KATL", "A350-900")?.typeMovements,
    600,
  );
  assert.equal(
    spotterReferenceCatalog.findRegistrationHistory("KATL", "n509dn")?.visits,
    22,
  );
  assert.deepEqual(
    spotterReferenceCatalog.findNotability("n509dn")?.tags,
    ["ONE_OFF_LIVERY"],
  );
  assert.equal(spotterReferenceCatalog.findAircraftType("B77W")?.typeId, "B777-300ER");
  assert.equal(spotterReferenceCatalog.findGlobalType("B777-300ER"), undefined);
});

test("identity-only aircraft types do not fabricate rarity coverage", () => {
  const cases: Array<[string, string]> = [
    ["A319", "A319-100"],
    ["B753", "B757-300"],
    ["B77W", "B777-300ER"],
    ["CL35", "Challenger 350"],
  ];

  for (const [rawCode, typeId] of cases) {
    assert.equal(spotterReferenceCatalog.findAircraftType(rawCode)?.typeId, typeId);
    assert.equal(spotterReferenceCatalog.findGlobalType(typeId), undefined);
    assert.equal(spotterReferenceCatalog.findAirportType("KATL", typeId), undefined);

    const enriched = new SpotterInterestEnricher().enrich(
      makeRealMovement({ aircraftType: rawCode }),
      "KATL",
    );
    assert.equal(enriched.aircraftTypeNormalization.referenceVariant, typeId);
    assert.equal(enriched.sources.globalTypeRarity, "MISSING");
    assert.equal(enriched.sources.localTypeRarity, "MISSING");
  }
});

test("catalog parser rejects malformed essential structures clearly", () => {
  assert.throws(
    () => parseReferenceCatalog({}),
    /schemaVersion must be '1'/,
  );
  assert.throws(
    () => new SpotterReferenceCatalog({
      schemaVersion: "1",
      datasetVersion: "test",
      sources: [],
      aircraftTypes: [],
      airportTypeStatistics: [],
      registrationHistory: [],
      aircraftNotability: [],
    }),
    /sources must not be empty/,
  );
});

test("catalog migration preserves established live enrichment facts and score", () => {
  const movement = makeRealMovement({
    registration: "N509DN",
    aircraftType: "A359",
  });
  const enriched = new SpotterInterestEnricher().enrich(movement, "KATL");

  assert.equal(enriched.facts.globalTypeRarity.activeGlobalFleetSize, 350);
  assert.equal(enriched.facts.localTypeRarity.typeMovements, 600);
  assert.equal(enriched.facts.localTypeRarity.totalMovements, 84_000);
  assert.deepEqual(enriched.facts.notability.tags, ["ONE_OFF_LIVERY"]);
  assert.equal(enriched.facts.registrationRarity.visits, 22);
  assert.equal(enriched.facts.registrationRarity.daysSinceLastVisit, 12);
  assert.equal(enriched.aircraftTypeNormalization.referenceVariant, "A350-900");
});
