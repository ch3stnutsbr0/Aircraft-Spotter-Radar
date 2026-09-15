import assert from "node:assert/strict";
import test from "node:test";
import { mockMovements } from "../mock-movements.ts";

const expected = [
  ["atl-001", 0, "ROUTINE"],
  ["atl-002", 0, "ROUTINE"],
  ["atl-003", 6, "ROUTINE"],
  ["atl-004", 8, "ROUTINE"],
  ["atl-005", 0, "ROUTINE"],
  ["atl-006", 27.5, "INTERESTING"],
  ["atl-007", 0, "ROUTINE"],
  ["atl-008", 11.5, "ROUTINE"],
  ["atl-009", 0, "ROUTINE"],
  ["atl-010", 3, "ROUTINE"],
  ["atl-011", 36.5, "INTERESTING"],
  ["atl-012", 10, "ROUTINE"],
  ["atl-013", 6, "ROUTINE"],
  ["atl-014", 42.25, "SPOTLIGHT"],
  ["atl-015", 0, "ROUTINE"],
  ["atl-016", 14, "ROUTINE"],
  ["atl-017", 8, "ROUTINE"],
  ["atl-018", 0, "ROUTINE"],
  ["atl-019", 41, "SPOTLIGHT"],
  ["atl-020", 3, "ROUTINE"],
  ["atl-021", 24.5, "ROUTINE"],
  ["atl-022", 10, "ROUTINE"],
  ["atl-023", 8, "ROUTINE"],
  ["atl-024", 23, "ROUTINE"],
  ["atl-025", 5, "ROUTINE"],
  ["atl-026", 42.25, "SPOTLIGHT"],
  ["atl-027", 0, "ROUTINE"],
  ["atl-028", 14, "ROUTINE"],
  ["atl-029", 10.5, "ROUTINE"],
  ["atl-030", 3, "ROUTINE"],
  ["atl-031", 20, "ROUTINE"],
  ["atl-032", 10, "ROUTINE"],
  ["atl-033", 10, "ROUTINE"],
  ["atl-034", 6, "ROUTINE"],
  ["atl-035", 14.5, "ROUTINE"],
  ["atl-036", 58, "SPOTLIGHT"],
] as const;

test("canonical reference migration preserves all mock scores", () => {
  assert.deepEqual(
    mockMovements.map((movement) => [
      movement.id,
      movement.spotterInterest.score,
      movement.spotterInterest.classification,
    ]),
    expected,
  );
});
