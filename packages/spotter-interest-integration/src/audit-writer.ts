import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import type { AuditBundle, AuditWriteResult } from "./types.ts";

export const DEFAULT_AUDIT_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../datasets/probe-runs/flightaware",
);

export interface AuditStorage {
  ensureDirectory(path: string): Promise<void>;
  createDirectoryExclusive(path: string): Promise<void>;
  writeFileExclusive(path: string, contents: string): Promise<void>;
}

const nodeAuditStorage: AuditStorage = {
  async ensureDirectory(path) {
    await mkdir(path, { recursive: true });
  },
  async createDirectoryExclusive(path) {
    await mkdir(path, { recursive: false });
  },
  async writeFileExclusive(path, contents) {
    await writeFile(path, contents, { encoding: "utf8", flag: "wx" });
  },
};

function isAlreadyExists(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "EEXIST";
}

export async function saveAuditRun({
  baseRunId,
  createBundle,
  auditRoot = DEFAULT_AUDIT_ROOT,
  storage = nodeAuditStorage,
}: {
  baseRunId: string;
  createBundle: (runId: string) => AuditBundle;
  auditRoot?: string;
  storage?: AuditStorage;
}): Promise<AuditWriteResult> {
  await storage.ensureDirectory(auditRoot);

  for (let attempt = 1; attempt <= 999; attempt += 1) {
    const runId = attempt === 1
      ? baseRunId
      : `${baseRunId}_${String(attempt).padStart(3, "0")}`;
    const directory = join(auditRoot, runId);

    try {
      await storage.createDirectoryExclusive(directory);
    } catch (error) {
      if (isAlreadyExists(error)) continue;
      throw error;
    }

    const bundle = createBundle(runId);
    if (bundle.runId !== runId) {
      throw new Error("Audit bundle run ID does not match the reserved directory.");
    }

    await storage.writeFileExclusive(
      join(directory, "movements.csv"),
      bundle.movementsCsv,
    );
    await storage.writeFileExclusive(
      join(directory, "scores.csv"),
      bundle.scoresCsv,
    );
    await storage.writeFileExclusive(
      join(directory, "run.json"),
      bundle.runJson,
    );

    return {
      runId,
      directory,
      files: ["movements.csv", "scores.csv", "run.json"],
    };
  }

  throw new Error("Could not allocate a unique audit run directory.");
}
