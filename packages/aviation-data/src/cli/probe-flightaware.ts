import {
  buildMovementCoverageReport,
  formatMovementCoverageReport,
} from "../coverage-report.ts";
import {
  FlightAwareAviationDataProvider,
} from "../flightaware/flightaware-aviation-data-provider.ts";
import {
  FlightAwareApiError,
  FlightAwareClient,
  toAeroApiDateTime,
} from "../flightaware/flightaware-client.ts";

interface CliOptions {
  airport: string;
  start: Date;
  end: Date;
  maxPages: number;
  raw: boolean;
}

function usage(): string {
  return [
    "Usage: pnpm probe:flightaware -- [options]",
    "",
    "Options:",
    "  --airport KATL       Airport ICAO code (default: KATL)",
    "  --start ISO8601      Inclusive window start (default: now)",
    "  --end ISO8601        Exclusive window end (default: start + 4 hours)",
    "  --max-pages NUMBER   Total page safety cap per endpoint (default: 5)",
    "  --raw                Print at most two sanitized raw records per endpoint",
    "  --help               Show this help",
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
  return date;
}

function toAeroApiDate(date: Date): Date {
  return new Date(toAeroApiDateTime(date));
}

function parseArgs(args: string[], now = new Date()): CliOptions {
  let airport = "KATL";
  let start: Date | undefined;
  let end: Date | undefined;
  let maxPages = 5;
  let raw = false;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--") {
      continue;
    }
    if (flag === "--help") {
      console.log(usage());
      process.exitCode = 0;
      throw new Error("__HELP__");
    }
    if (flag === "--raw") {
      raw = true;
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
    throw new Error(`Unknown option: ${flag}`);
  }

  const resolvedStart = toAeroApiDate(start ?? now);
  const resolvedEnd = toAeroApiDate(
    end ?? new Date(resolvedStart.getTime() + 4 * 60 * 60 * 1_000),
  );

  if (!airport) {
    throw new Error("--airport cannot be empty.");
  }
  if (!Number.isInteger(maxPages) || maxPages < 1) {
    throw new Error("--max-pages must be a positive integer.");
  }

  return {
    airport,
    start: resolvedStart,
    end: resolvedEnd,
    maxPages,
    raw,
  };
}

async function main(): Promise<void> {
  let options: CliOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    if (error instanceof Error && error.message === "__HELP__") {
      return;
    }
    throw error;
  }

  const apiKey = process.env.FLIGHTAWARE_AEROAPI_KEY?.trim();
  if (!apiKey) {
    throw new FlightAwareApiError(
      "FLIGHTAWARE_AEROAPI_KEY is not configured.",
    );
  }

  const client = new FlightAwareClient({ apiKey });
  const provider = new FlightAwareAviationDataProvider({ client });
  const result = await provider.getAirportMovementsWithDiagnostics(
    options.airport,
    {
      start: options.start,
      end: options.end,
      maxPages: options.maxPages,
      rawSampleSize: options.raw ? 2 : 0,
    },
  );
  const report = buildMovementCoverageReport(
    result.movements,
    result.diagnostics.observedAt,
  );

  console.log(
    formatMovementCoverageReport(
      options.airport,
      options.start,
      options.end,
      report,
      result.diagnostics,
    ),
  );

  if (options.raw) {
    console.log("\nSanitized raw samples (no headers or credentials)");
    console.log("--------------------------------------");
    console.log(JSON.stringify({
      scheduled_arrivals: result.diagnostics.arrivalRawSamples,
      scheduled_departures: result.diagnostics.departureRawSamples,
    }, null, 2));
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FlightAware probe failed: ${message}`);
  process.exitCode = 1;
});
