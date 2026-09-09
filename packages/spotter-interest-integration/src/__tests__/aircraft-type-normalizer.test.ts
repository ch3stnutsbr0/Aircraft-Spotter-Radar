import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAircraftTypeCode } from "../aircraft-type-normalizer.ts";

test("normalizes reviewed unambiguous ICAO aircraft type codes", () => {
  const cases: Array<[string, string]> = [
    ["A359", "A350-900"],
    ["A35K", "A350-1000"],
    ["B77W", "B777-300ER"],
    ["A21N", "A321neo"],
    ["B738", "B737-800"],
  ];

  for (const [rawCode, expectedVariant] of cases) {
    const result = normalizeAircraftTypeCode(rawCode);
    assert.equal(result.status, "MATCHED");
    assert.equal(result.referenceVariant, expectedVariant);
    assert.equal(result.rawCode, rawCode);
  }
});

test("preserves B748 ambiguity instead of inferring passenger or freighter", () => {
  const result = normalizeAircraftTypeCode("B748");
  assert.equal(result.status, "AMBIGUOUS");
  assert.equal(result.rawCode, "B748");
  assert.equal(result.referenceVariant, null);
  assert.match(result.note, /passenger and freighter/);
});

test("unknown and missing aircraft codes remain safely unmatched", () => {
  const unknown = normalizeAircraftTypeCode("ZZZZ");
  assert.equal(unknown.status, "UNKNOWN");
  assert.equal(unknown.referenceVariant, null);

  const missing = normalizeAircraftTypeCode(null);
  assert.equal(missing.status, "MISSING");
  assert.equal(missing.rawCode, null);
  assert.equal(missing.referenceVariant, null);
});
