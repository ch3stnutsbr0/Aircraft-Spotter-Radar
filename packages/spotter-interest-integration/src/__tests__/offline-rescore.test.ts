import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { FlightAwareProbeDiagnostics } from "../../../aviation-data/src/index.ts";
import {
  auditMovementWindows,
  buildProbeWindow,
  compareOfflineScores,
  createAuditBundle,
  rescoreAudit,
  scoreRealMovements,
} from "../index.ts";
import { makeRealMovement } from "./fixtures.ts";

const start = new Date("2026-08-23T20:00:00Z");
const end = new Date("2026-08-23T20:30:00Z");
const window = buildProbeWindow({
  primaryStart: start,
  primaryEnd: end,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
});

function diagnostics(): FlightAwareProbeDiagnostics {
  return {
    observedAt: new Date("2026-08-23T19:59:30Z"),
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
    arrivalRecords: 2,
    departureRecords: 0,
    arrivalsTruncated: false,
    departuresTruncated: false,
    resultsTruncated: false,
    outsideRequestedWindow: 0,
    arrivalRawSamples: [],
    departureRawSamples: [],
  };
}

async function fixtureAudit(changeScore = false): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "spotter-rescore-"));
  const movements = [
    makeRealMovement({
      registration: "N509DN",
      aircraftType: "A359",
      overrides: { scheduled_in: "2026-08-23T20:05:00Z" },
    }),
    makeRealMovement({
      registration: "N000AA",
      aircraftType: "A321",
      overrides: { scheduled_in: "2026-08-23T20:10:00Z" },
    }),
  ];
  const audited = auditMovementWindows(movements, window, "KATL");
  const scored = scoreRealMovements(movements, "KATL");
  const bundle = createAuditBundle({
    runId: "fixture_KATL",
    airport: "KATL",
    window,
    auditedMovements: audited,
    scoredMovements: scored,
    diagnostics: diagnostics(),
    git: { commit: null, branch: null, dirty: null },
    top: 10,
  });
  const scoresCsv = changeScore
    ? bundle.scoresCsv.replace(",41,SPOTLIGHT,", ",40,SPOTLIGHT,")
    : bundle.scoresCsv;
  await Promise.all([
    writeFile(join(directory, "run.json"), bundle.runJson),
    writeFile(join(directory, "movements.csv"), bundle.movementsCsv),
    writeFile(join(directory, "scores.csv"), scoresCsv),
  ]);
  return directory;
}

test("saved audit loads and rescores with complete parity without network access", async () => {
  const directory = await fixtureAudit();
  try {
    const result = await rescoreAudit(join(directory, "movements.csv"));
    assert.equal(result.primaryMovements, 2);
    assert.equal(result.comparison.matched, 2);
    assert.deepEqual(result.comparison.changed, []);
    assert.deepEqual(result.comparison.missing, []);
    assert.deepEqual(result.comparison.ambiguous, []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("offline comparison reports an intentional score difference", async () => {
  const directory = await fixtureAudit(true);
  try {
    const result = await rescoreAudit(directory);
    assert.equal(result.comparison.matched, 1);
    assert.equal(result.comparison.changed.length, 1);
    assert.equal(result.comparison.changed[0].previousScore, 40);
    assert.equal(result.comparison.changed[0].currentScore, 41);
    assert.equal(result.comparison.changed[0].ident.startsWith("DAL"), true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("offline comparison reports duplicate provider IDs as ambiguous", () => {
  const first = makeRealMovement({ registration: "N001AA", aircraftType: "A321" });
  const second = makeRealMovement({ registration: "N002AA", aircraftType: "A321" });
  first.providerFlightId = "duplicate-provider-id";
  second.providerFlightId = "duplicate-provider-id";
  const scored = scoreRealMovements([first, second], "KATL");

  const comparison = compareOfflineScores(scored, [{
    providerFlightId: "duplicate-provider-id",
    ident: "DAL100",
    score: 0,
    classification: "ROUTINE",
  }]);

  assert.deepEqual(comparison.ambiguous, ["duplicate-provider-id"]);
  assert.equal(comparison.matched, 0);
});
