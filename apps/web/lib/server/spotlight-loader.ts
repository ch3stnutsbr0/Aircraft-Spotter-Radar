import { unstable_cache } from "next/cache";
import type { AirportStatusSnapshot } from "@spotter/domain";
import {
  DailySpotlightError,
  DailySpotlightService,
  type DailySpotlightResult,
  type SpotlightDataSource,
} from "@spotter/daily-spotlight";
import { mockAtlAirportStatus } from "@/lib/mock-airport-status";
import { mockMovementInputs } from "@/lib/mock-movements";
import { generateFreshFlightAwareSpotlight } from "./flightaware-spotlight";
import {
  createSpotlightRanker,
  readSpotlightConfig,
  type SpotlightRuntimeConfig,
} from "./spotlight-config";

export interface SpotlightPageData {
  dailySpotlight: DailySpotlightResult;
  airportStatus: AirportStatusSnapshot | null;
  errorMessage: string | null;
  errorCode: string | null;
  showDataSource: boolean;
}

const liveLoaders = new Map<string, () => Promise<DailySpotlightResult>>();

function liveLoader(config: SpotlightRuntimeConfig): () => Promise<DailySpotlightResult> {
  const cacheIdentity = [
    config.airport,
    config.windowMinutes,
    config.maxPagesPerEndpoint,
    config.ranker,
    config.auditFreshLiveRuns ? "audit" : "no-audit",
    config.cacheSeconds,
  ].join(":");
  const existing = liveLoaders.get(cacheIdentity);
  if (existing) return existing;

  const loader = unstable_cache(
    async () => generateFreshFlightAwareSpotlight(readSpotlightConfig()),
    ["daily-spotlight-flightaware-v0.1", cacheIdentity],
    { revalidate: config.cacheSeconds },
  );
  liveLoaders.set(cacheIdentity, loader);
  return loader;
}

async function loadMockSpotlight(
  config: SpotlightRuntimeConfig,
): Promise<DailySpotlightResult> {
  const service = new DailySpotlightService({
    source: "MOCK",
    ranker: createSpotlightRanker(config.ranker),
    async getMovements() {
      return {
        movements: mockMovementInputs,
        observedAt: new Date(mockAtlAirportStatus.asOf),
        diagnostics: { fetchedMovements: mockMovementInputs.length },
      };
    },
  });

  return service.generate({
    airport: "KATL",
    start: new Date("2026-08-19T14:00:00-04:00"),
    end: new Date("2026-08-19T18:00:00-04:00"),
    maxPages: 1,
  });
}

function emptyResult(
  source: SpotlightDataSource,
  config: SpotlightRuntimeConfig | null,
): DailySpotlightResult {
  const generatedAt = new Date();
  const end = new Date(
    generatedAt.getTime() + (config?.windowMinutes ?? 60) * 60_000,
  );
  return {
    airport: "KATL",
    source,
    generatedAt: generatedAt.toISOString(),
    windowStart: generatedAt.toISOString(),
    windowEnd: end.toISOString(),
    movements: [],
    spotlightMovements: [],
    diagnostics: {
      fetchedMovements: 0,
      scoredMovements: 0,
      spotlightMovements: 0,
    },
  };
}

export async function loadSpotlightPageData(): Promise<SpotlightPageData> {
  let config: SpotlightRuntimeConfig | null = null;
  let source: SpotlightDataSource = process.env.SPOTLIGHT_DATA_SOURCE
    ?.trim().toLowerCase() === "flightaware" ? "FLIGHTAWARE" : "MOCK";

  try {
    config = readSpotlightConfig();
    source = config.dataSource;
    const dailySpotlight = source === "MOCK"
      ? await loadMockSpotlight(config)
      : await liveLoader(config)();
    return {
      dailySpotlight,
      airportStatus: source === "MOCK" ? mockAtlAirportStatus : null,
      errorMessage: null,
      errorCode: null,
      showDataSource: process.env.NODE_ENV === "development",
    };
  } catch (error) {
    const controlled = error instanceof DailySpotlightError
      ? error
      : new DailySpotlightError(
          "PROVIDER_UNAVAILABLE",
          "Daily Spotlight data is temporarily unavailable.",
          { cause: error },
        );
    console.error(`Daily Spotlight ${controlled.code}: ${controlled.message}`);
    return {
      dailySpotlight: emptyResult(source, config),
      airportStatus: null,
      errorMessage: controlled.userMessage,
      errorCode: controlled.code,
      showDataSource: true,
    };
  }
}
