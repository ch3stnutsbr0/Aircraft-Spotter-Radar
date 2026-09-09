import assert from "node:assert/strict";
import test from "node:test";
import type { FlightAwareProbeDiagnostics } from "../../../aviation-data/src/index.ts";
import {
  auditMovementWindows,
  buildProbeWindow,
  buildRunManifest,
  createAuditBundle,
  createRunId,
  escapeCsvValue,
  formatSpotterInterestProbeReport,
  MOVEMENT_CSV_HEADERS,
  saveAuditRun,
  SCORE_CSV_HEADERS,
  scoreRealMovements,
  serializeMovementAuditCsv,
  serializeScoreAuditCsv,
  type AuditBundle,
  type AuditStorage,
} from "../index.ts";
import { makeRealMovement } from "./fixtures.ts";

const start = new Date("2026-08-23T20:00:00Z");
const end = new Date("2026-08-23T20:30:00Z");
const observedAt = new Date("2026-08-23T19:59:30Z");

function windowWithBuffer() {
  return buildProbeWindow({
    primaryStart: start,
    primaryEnd: end,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 5,
  });
}

function arrivalAt(time: string, registration: string | null = "N509DN") {
  return makeRealMovement({
    registration,
    aircraftType: "A359",
    overrides: {
      scheduled_in: time,
      scheduled_on: time,
      provider_status: undefined,
    } as never,
  });
}

function diagnostics(overrides: Partial<FlightAwareProbeDiagnostics> = {}) {
  return {
    observedAt,
    endpointQueries: 2,
    arrivalEndpointQueries: 1,
    departureEndpointQueries: 1,
    arrivalHttpRequests: 1,
    departureHttpRequests: 1,
    totalHttpRequests: 2,
    arrivalPages: 2,
    departurePages: 3,
    totalPages: 5,
    maxPagesPerEndpoint: 5,
    arrivalRecords: 3,
    departureRecords: 2,
    arrivalsTruncated: false,
    departuresTruncated: true,
    resultsTruncated: true,
    outsideRequestedWindow: 0,
    arrivalRawSamples: [],
    departureRawSamples: [],
    ...overrides,
  } satisfies FlightAwareProbeDiagnostics;
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  return rows;
}

function rowObjects(csv: string): Array<Record<string, string>> {
  const [headers, ...rows] = parseCsv(csv);
  return rows.map((row) => Object.fromEntries(
    headers.map((header, index) => [header, row[index] ?? ""]),
  ));
}

test("CSV escaping handles commas, quotes, newlines, and empty values", () => {
  assert.equal(escapeCsvValue("plain"), "plain");
  assert.equal(escapeCsvValue("comma,value"), '"comma,value"');
  assert.equal(escapeCsvValue('say "hello"'), '"say ""hello"""');
  assert.equal(escapeCsvValue("two\nlines"), '"two\nlines"');
  assert.equal(escapeCsvValue(null), "");
});

test("primary-window boundaries use inclusive start and exclusive end", () => {
  const movements = [
    arrivalAt("2026-08-23T19:59:59.999Z", "N001AA"),
    arrivalAt("2026-08-23T20:00:00.000Z", "N002AA"),
    arrivalAt("2026-08-23T20:29:59.999Z", "N003AA"),
    arrivalAt("2026-08-23T20:30:00.000Z", "N004AA"),
    arrivalAt("2026-08-23T20:30:00.001Z", "N005AA"),
  ];
  const audited = auditMovementWindows(movements, windowWithBuffer(), "KATL");

  assert.deepEqual(
    audited.map((audit) => audit.inPrimaryWindow),
    [false, true, true, false, false],
  );
  assert.ok((audited[0].minutesFromWindowStart ?? 0) < 0);
  assert.equal(audited[1].minutesFromWindowStart, 0);
  assert.ok((audited[2].minutesToWindowEnd ?? 0) > 0);
  assert.equal(audited[3].minutesToWindowEnd, 0);
  assert.ok((audited[4].minutesToWindowEnd ?? 0) < 0);
  assert.match(
    audited[1].scheduledMovementTimeLocal ?? "",
    /2026-08-23T16:00:00-04:00\[America\/New_York\]/,
  );
});

test("buffered movements are audited but excluded from primary scoring", () => {
  const movements = [
    arrivalAt("2026-08-23T19:58:00Z", "N001AA"),
    arrivalAt("2026-08-23T20:10:00Z", "N002AA"),
    arrivalAt("2026-08-23T20:32:00Z", "N003AA"),
  ];
  const audited = auditMovementWindows(movements, windowWithBuffer(), "KATL");
  const primary = audited
    .filter((audit) => audit.inPrimaryWindow)
    .map((audit) => audit.movement);
  const scored = scoreRealMovements(primary, "KATL");

  assert.equal(audited.length, 3);
  assert.equal(scored.length, 1);
  assert.equal(scored[0].movement.registration, "N002AA");
});

test("movement and score CSVs contain every applicable record and full audit fields", () => {
  const first = arrivalAt("2026-08-23T20:05:00Z", "N509DN");
  const second = arrivalAt("2026-08-23T20:10:00Z", null);
  second.providerStatus = 'Delayed, "weather"\nreview';
  const third = arrivalAt("2026-08-23T20:32:00Z", "N003AA");
  const audited = auditMovementWindows(
    [first, second, third],
    windowWithBuffer(),
    "KATL",
  );
  const scored = scoreRealMovements([first, second], "KATL");
  const movementsCsv = serializeMovementAuditCsv("run-1", audited, windowWithBuffer());
  const scoresCsv = serializeScoreAuditCsv("run-1", scored, audited, 10);
  const movementRows = rowObjects(movementsCsv);
  const scoreRows = rowObjects(scoresCsv);

  assert.deepEqual(parseCsv(movementsCsv)[0], [...MOVEMENT_CSV_HEADERS]);
  assert.deepEqual(parseCsv(scoresCsv)[0], [...SCORE_CSV_HEADERS]);
  assert.equal(movementRows.length, 3);
  assert.equal(scoreRows.length, 2);
  assert.equal(movementRows[1].provider_status, second.providerStatus);
  assert.equal(movementRows[1].registration, "");
  assert.equal(scoreRows[1].registration, "");
  assert.equal(movementRows[2].in_primary_window, "false");
  assert.equal(scoreRows[0].in_primary_window, "true");
  assert.notEqual(scoreRows[0].movement_rank, "");
  assert.notEqual(scoreRows[0].aircraft_level_rank, "");
  assert.equal(scoreRows[1].notability_source, "MISSING");
  assert.equal(scoreRows[1].notability_score, "0");
  assert.equal(scoreRows[1].manual_expected_priority, "");
  assert.equal(scoreRows[1].manual_should_be_top10, "");
  assert.equal(scoreRows[1].manual_expected_rank, "");
  assert.equal(scoreRows[1].manual_notes, "");
  assert.equal(scoreRows[1].reviewed_at, "");
});

test("duplicate registration preserves movement rank and blanks deduplicated aircraft rank", () => {
  const first = arrivalAt("2026-08-23T20:05:00Z", "N509DN");
  const duplicate = arrivalAt("2026-08-23T20:10:00Z", "N509DN");
  const audited = auditMovementWindows([first, duplicate], windowWithBuffer(), "KATL");
  const scored = scoreRealMovements([first, duplicate], "KATL");
  const rows = rowObjects(serializeScoreAuditCsv("run-1", scored, audited, 10));

  assert.deepEqual(rows.map((row) => row.movement_rank), ["1", "2"]);
  assert.deepEqual(rows.map((row) => row.aircraft_level_rank), ["1", ""]);
  assert.deepEqual(rows.map((row) => row.is_top_n), ["true", "false"]);
});

test("run manifest records windows, API usage, scoring config, enrichment, and safe Git metadata", () => {
  const movements = [
    arrivalAt("2026-08-23T20:05:00Z", "N509DN"),
    arrivalAt("2026-08-23T20:32:00Z", "N000XX"),
  ];
  const audited = auditMovementWindows(movements, windowWithBuffer(), "KATL");
  const scored = scoreRealMovements([movements[0]], "KATL");
  const manifest = buildRunManifest({
    runId: "2026-08-23T195930Z_KATL",
    airport: "KATL",
    window: windowWithBuffer(),
    auditedMovements: audited,
    scoredMovements: scored,
    diagnostics: diagnostics({ arrivalRecords: 2, departureRecords: 0 }),
    git: { commit: null, branch: null, dirty: null },
  });
  const serialized = JSON.stringify(manifest);

  assert.equal(manifest.scoringVersion, "spotter-interest-v0.1");
  assert.equal(manifest.scoringConfig.weights.notability, 0.35);
  assert.equal(manifest.scoringConfig.thresholds.interesting, 25);
  assert.equal(manifest.scoringConfig.thresholds.spotlight, 40);
  assert.equal(manifest.windowEndExclusive, true);
  assert.equal(manifest.primaryWindowMovements, 1);
  assert.equal(manifest.bufferOnlyMovements, 1);
  assert.equal(manifest.httpRequests, 2);
  assert.equal(manifest.arrivalPages, 2);
  assert.equal(manifest.departurePages, 3);
  assert.equal(manifest.departuresTruncated, true);
  assert.equal(manifest.gitCommit, null);
  assert.doesNotMatch(serialized, /api.?key|authorization|secret/i);
});

class MemoryAuditStorage implements AuditStorage {
  readonly directories = new Set<string>();
  readonly files = new Map<string, string>();

  async ensureDirectory(path: string) {
    this.directories.add(path);
  }

  async createDirectoryExclusive(path: string) {
    if (this.directories.has(path)) {
      throw Object.assign(new Error("exists"), { code: "EEXIST" });
    }
    this.directories.add(path);
  }

  async writeFileExclusive(path: string, contents: string) {
    if (this.files.has(path)) {
      throw Object.assign(new Error("exists"), { code: "EEXIST" });
    }
    this.files.set(path, contents);
  }
}

test("audit writer allocates a unique directory and never overwrites an existing run", async () => {
  const storage = new MemoryAuditStorage();
  const root = "/external/audits";
  const baseRunId = createRunId(observedAt, "KATL");
  storage.directories.add(root);
  storage.directories.add(`${root}/${baseRunId}`);
  storage.files.set(`${root}/${baseRunId}/scores.csv`, "user edited");

  const result = await saveAuditRun({
    baseRunId,
    auditRoot: root,
    storage,
    createBundle: (runId): AuditBundle => ({
      runId,
      movementsCsv: `run_id\n${runId}\n`,
      scoresCsv: `run_id\n${runId}\n`,
      runJson: JSON.stringify({ runId }),
    }),
  });

  assert.equal(result.runId, `${baseRunId}_002`);
  assert.equal(storage.files.get(`${root}/${baseRunId}/scores.csv`), "user edited");
  assert.equal(storage.files.size, 4);
  assert.ok(storage.files.has(`${result.directory}/movements.csv`));
  assert.ok(storage.files.has(`${result.directory}/scores.csv`));
  assert.ok(storage.files.has(`${result.directory}/run.json`));
});

test("terminal report searches fetched buffer records without scoring them", () => {
  const inside = arrivalAt("2026-08-23T20:05:00Z", "N509DN");
  const buffered = arrivalAt("2026-08-23T20:32:00Z", "A7-QTR");
  buffered.ident = "QTR999";
  const audited = auditMovementWindows([inside, buffered], windowWithBuffer(), "KATL");
  const scored = scoreRealMovements([inside], "KATL");
  const output = formatSpotterInterestProbeReport({
    airport: "KATL",
    start,
    end,
    top: 10,
    movements: scored,
    diagnostics: diagnostics({ arrivalRecords: 2, departureRecords: 0 }),
    auditedMovements: audited,
    window: windowWithBuffer(),
    find: "QTR",
  });

  assert.match(output, /Find results: QTR/);
  assert.match(output, /QTR999/);
  assert.match(output, /in primary window: no; scored: no/);
  assert.match(output, /First buffered outside end: QTR999/);
});

test("audit bundle uses one run ID across both CSVs and the manifest", () => {
  const movement = arrivalAt("2026-08-23T20:05:00Z", "N509DN");
  const audited = auditMovementWindows([movement], windowWithBuffer(), "KATL");
  const scored = scoreRealMovements([movement], "KATL");
  const bundle = createAuditBundle({
    runId: "2026-08-23T195930Z_KATL",
    airport: "KATL",
    window: windowWithBuffer(),
    auditedMovements: audited,
    scoredMovements: scored,
    diagnostics: diagnostics({ arrivalRecords: 1, departureRecords: 0 }),
    git: { commit: "abc123", branch: "main", dirty: true },
    top: 10,
  });

  assert.equal(bundle.runId, "2026-08-23T195930Z_KATL");
  assert.equal(rowObjects(bundle.movementsCsv)[0].run_id, bundle.runId);
  assert.equal(rowObjects(bundle.scoresCsv)[0].run_id, bundle.runId);
  assert.equal(JSON.parse(bundle.runJson).runId, bundle.runId);
});
