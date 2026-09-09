import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { GitVersionMetadata } from "./types.ts";

const execFileAsync = promisify(execFile);
export const REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

async function gitOutput(
  repositoryRoot: string,
  args: string[],
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: repositoryRoot,
      encoding: "utf8",
    });
    return stdout;
  } catch {
    return null;
  }
}

export async function readGitVersionMetadata(
  repositoryRoot = REPOSITORY_ROOT,
): Promise<GitVersionMetadata> {
  const [commitOutput, branchOutput, statusOutput] = await Promise.all([
    gitOutput(repositoryRoot, ["rev-parse", "HEAD"]),
    gitOutput(repositoryRoot, ["branch", "--show-current"]),
    gitOutput(repositoryRoot, ["status", "--porcelain"]),
  ]);

  return {
    commit: commitOutput?.trim() || null,
    branch: branchOutput?.trim() || null,
    dirty: statusOutput === null ? null : statusOutput.trim().length > 0,
  };
}
