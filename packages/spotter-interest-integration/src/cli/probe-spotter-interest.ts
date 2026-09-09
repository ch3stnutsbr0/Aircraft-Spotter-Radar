import {
  DEFAULT_FLIGHTAWARE_MAX_PAGES,
  FlightAwareApiError,
  FlightAwareAviationDataProvider,
  FlightAwareClient,
  toAeroApiDateTime,
} from "../../../aviation-data/src/index.ts";
import {
  auditMovementWindows,
  buildProbeWindow,
  createAuditBundle,
  createRunId,
  formatSpotterInterestProbeReport,
  readGitVersionMetadata,
  saveAuditRun,
  scoreRealMovements,
} from "../index.ts";

interface CliOptions {
  airport: string;
  start: Date;
  end: Date;
  maxPages: number;
  top: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  audit: boolean;
  find: string | null;
}

function usage(): string {
  return [
    "Usage: pnpm probe:spotter-interest -- [options]",
    "",
    "Options:",
    "  --airport KATL                   Airport ICAO code (default: KATL)",
    "  --start ISO8601                  Primary inclusive start (default: now)",
    "  --end ISO8601                    Primary exclusive end (default: start + 30 minutes)",
    "  --max-pages NUMBER               Page safety cap per endpoint (default: 5)",
    "  --top NUMBER                     Aircraft-level results to print (default: 10)",
    "  --buffer-before-minutes NUMBER   Expand fetch before primary start (default: 0)",
    "  --buffer-after-minutes NUMBER    Expand fetch after primary end (default: 0)",
    "  --find TEXT                      Search already-fetched movement fields",
    "  --no-audit                       Do not save the external local audit files",
    "  --help                           Show this help",
  ].join("\n");
}

function readValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function parseDate(value: string, flag: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${flag} must be a valid ISO8601 date or datetime.`);
  }
  return new Date(toAeroApiDateTime(date));
}

function toWholeSecond(date: Date): Date {
  return new Date(toAeroApiDateTime(date));
}

export function parseSpotterInterestProbeArgs(
  args: string[],
  now = new Date(),
): CliOptions {
  let airport = "KATL";
  let start: Date | undefined;
  let end: Date | undefined;
  let maxPages = DEFAULT_FLIGHTAWARE_MAX_PAGES;
  let top = 10;
  let bufferBeforeMinutes = 0;
  let bufferAfterMinutes = 0;
  let audit = true;
  let find: string | null = null;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--") continue;
    if (flag === "--help") {
      console.log(usage());
      process.exitCode = 0;
      throw new Error("__HELP__");
    }
    if (flag === "--no-audit") {
      audit = false;
      continue;
    }
    if (flag === "--airport") {
      airport = readValue(args, index, flag).trim().toUpperCase();
      index += 1;
      continue;
    }
    if (flag === "--start") {
      start = parseDate(readValue(args, index, flag), flag);
      index += 1;
      continue;
    }
    if (flag === "--end") {
      end = parseDate(readValue(args, index, flag), flag);
      index += 1;
      continue;
    }
    if (flag === "--max-pages") {
      maxPages = Number(readValue(args, index, flag));
      index += 1;
      continue;
    }
    if (flag === "--top") {
      top = Number(readValue(args, index, flag));
      index += 1;
      continue;
    }
    if (flag === "--buffer-before-minutes") {
      bufferBeforeMinutes = Number(readValue(args, index, flag));
      index += 1;
      continue;
    }
    if (flag === "--buffer-after-minutes") {
      bufferAfterMinutes = Number(readValue(args, index, flag));
      index += 1;
      continue;
    }
    if (flag === "--find") {
      find = readValue(args, index, flag).trim();
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${flag}`);
  }

  const resolvedStart = toWholeSecond(start ?? now);
  const resolvedEnd = toWholeSecond(
    end ?? new Date(resolvedStart.getTime() + 30 * 60 * 1_000),
  );

  if (!airport) throw new Error("--airport cannot be empty.");
  if (resolvedStart >= resolvedEnd) {
    throw new Error("--start must be before --end.");
  }
  if (!Number.isInteger(maxPages) || maxPages < 1) {
    throw new Error("--max-pages must be a positive integer.");
  }
  if (!Number.isInteger(top) || top < 1) {
    throw new Error("--top must be a positive integer.");
  }
  if (!Number.isFinite(bufferBeforeMinutes) || bufferBeforeMinutes < 0) {
    throw new Error("--buffer-before-minutes must be a non-negative number.");
  }
  if (!Number.isFinite(bufferAfterMinutes) || bufferAfterMinutes < 0) {
    throw new Error("--buffer-after-minutes must be a non-negative number.");
  }

  return {
    airport,
    start: resolvedStart,
    end: resolvedEnd,
    maxPages,
    top,
    bufferBeforeMinutes,
    bufferAfterMinutes,
    audit,
    find,
  };
}

async function main(): Promise<void> {
  let options: CliOptions;
  try {
    options = parseSpotterInterestProbeArgs(process.argv.slice(2));
  } catch (error) {
    if (error instanceof Error && error.message === "__HELP__") return;
    throw error;
  }

  const apiKey = process.env.FLIGHTAWARE_AEROAPI_KEY?.trim();
  if (!apiKey) {
    throw new FlightAwareApiError(
      "FLIGHTAWARE_AEROAPI_KEY is not configured.",
    );
  }

  const window = buildProbeWindow({
    primaryStart: options.start,
    primaryEnd: options.end,
    bufferBeforeMinutes: options.bufferBeforeMinutes,
    bufferAfterMinutes: options.bufferAfterMinutes,
  });
  const provider = new FlightAwareAviationDataProvider({
    client: new FlightAwareClient({ apiKey }),
  });
  const result = await provider.getAirportMovementsWithDiagnostics(
    options.airport,
    {
      start: window.fetchStart,
      end: window.fetchEnd,
      maxPages: options.maxPages,
    },
  );
  const auditedMovements = auditMovementWindows(
    result.movements,
    window,
    options.airport,
  );
  const primaryMovements = auditedMovements
    .filter((auditEntry) => auditEntry.inPrimaryWindow)
    .map((auditEntry) => auditEntry.movement);
  const scored = scoreRealMovements(primaryMovements, options.airport);

  const auditResult = options.audit
    ? await saveAuditRun({
        baseRunId: createRunId(
          result.diagnostics.observedAt,
          options.airport,
        ),
        createBundle: (runId) => createAuditBundle({
          runId,
          airport: options.airport,
          window,
          auditedMovements,
          scoredMovements: scored,
          diagnostics: result.diagnostics,
          git: gitMetadata,
          top: options.top,
        }),
      })
    : null;

  console.log(formatSpotterInterestProbeReport({
    airport: options.airport,
    start: window.primaryStart,
    end: window.primaryEnd,
    top: options.top,
    movements: scored,
    diagnostics: result.diagnostics,
    auditedMovements,
    window,
    find: options.find,
  }));

  if (auditResult) {
    console.log("\nAudit saved to:");
    console.log(`${auditResult.directory}/`);
    for (const file of auditResult.files) console.log(`- ${file}`);
  } else {
    console.log("\nAudit disabled for this run (--no-audit).");
  }
}

const gitMetadata = await readGitVersionMetadata();

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Spotter Interest probe failed: ${message}`);
  process.exitCode = 1;
});
