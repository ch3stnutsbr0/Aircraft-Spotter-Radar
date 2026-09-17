import {
  DailySpotlightError,
  LegacyRuleRanker,
  type MovementRanker,
  type SpotlightDataSource,
} from "../../../../packages/daily-spotlight/src/index.ts";

export interface SpotlightRuntimeConfig {
  dataSource: SpotlightDataSource;
  ranker: "legacy-rule";
  airport: "KATL";
  windowMinutes: number;
  cacheSeconds: number;
  maxPagesPerEndpoint: number;
  auditFreshLiveRuns: boolean;
}

export function createSpotlightRanker(
  ranker: SpotlightRuntimeConfig["ranker"],
): MovementRanker {
  switch (ranker) {
    case "legacy-rule":
      return new LegacyRuleRanker();
  }
}

const numberSetting = (
  value: string | undefined,
  fallback: number,
  name: string,
  minimum: number,
  maximum: number,
): number => {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new DailySpotlightError(
      "CONFIGURATION",
      `${name} must be a whole number from ${minimum} to ${maximum}.`,
    );
  }
  return parsed;
};

const booleanSetting = (value: string | undefined, name: string): boolean => {
  if (value === undefined || value.trim() === "") return false;
  if (["1", "true", "yes"].includes(value.trim().toLowerCase())) return true;
  if (["0", "false", "no"].includes(value.trim().toLowerCase())) return false;
  throw new DailySpotlightError(
    "CONFIGURATION",
    `${name} must be true or false.`,
  );
};

export function readSpotlightConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): SpotlightRuntimeConfig {
  const rawSource = environment.SPOTLIGHT_DATA_SOURCE?.trim().toLowerCase()
    || "mock";
  if (rawSource !== "mock" && rawSource !== "flightaware") {
    throw new DailySpotlightError(
      "CONFIGURATION",
      "SPOTLIGHT_DATA_SOURCE must be mock or flightaware.",
    );
  }
  const rawRanker = environment.SPOTLIGHT_RANKER?.trim().toLowerCase()
    || "legacy-rule";
  if (rawRanker !== "legacy-rule") {
    throw new DailySpotlightError(
      "CONFIGURATION",
      rawRanker === "ai"
        ? "SPOTLIGHT_RANKER=ai is reserved but not implemented. Use legacy-rule."
        : "SPOTLIGHT_RANKER must be legacy-rule.",
    );
  }

  return {
    dataSource: rawSource === "mock" ? "MOCK" : "FLIGHTAWARE",
    ranker: rawRanker,
    airport: "KATL",
    windowMinutes: numberSetting(
      environment.SPOTLIGHT_WINDOW_MINUTES,
      60,
      "SPOTLIGHT_WINDOW_MINUTES",
      15,
      180,
    ),
    cacheSeconds: numberSetting(
      environment.SPOTLIGHT_CACHE_SECONDS,
      300,
      "SPOTLIGHT_CACHE_SECONDS",
      60,
      3600,
    ),
    maxPagesPerEndpoint: numberSetting(
      environment.SPOTLIGHT_MAX_PAGES,
      1,
      "SPOTLIGHT_MAX_PAGES",
      1,
      5,
    ),
    auditFreshLiveRuns: booleanSetting(
      environment.SPOTLIGHT_WEB_AUDIT,
      "SPOTLIGHT_WEB_AUDIT",
    ),
  };
}

export function readFlightAwareApiKey(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const key = environment.FLIGHTAWARE_AEROAPI_KEY?.trim();
  if (!key) {
    throw new DailySpotlightError(
      "CONFIGURATION",
      "FlightAware mode requires FLIGHTAWARE_AEROAPI_KEY in .env.local.",
    );
  }
  return key;
}
