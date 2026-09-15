import { formatOfflineRescoreReport, rescoreAudit } from "../offline-rescore.ts";

function usage(): string {
  return [
    "Usage: pnpm rescore:audit -- <run-directory-or-movements.csv>",
    "",
    "Re-enriches and rescores a saved audit without network access or file writes.",
  ].join("\n");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((argument) => argument !== "--");
  if (args.includes("--help")) {
    console.log(usage());
    return;
  }
  if (args.length !== 1) throw new Error(usage());
  const result = await rescoreAudit(args[0]);
  console.log(formatOfflineRescoreReport(result));
  if (
    result.comparison.changed.length
    || result.comparison.missing.length
    || result.comparison.unexpected.length
    || result.comparison.ambiguous.length
  ) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
