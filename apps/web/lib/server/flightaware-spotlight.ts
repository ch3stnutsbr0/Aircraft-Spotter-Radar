import {
  FlightAwareAviationDataProvider,
  FlightAwareClient,
  type FlightAwareAirportMovementResult,
} from "@spotter/aviation-data";
import {
  DailySpotlightError,
  DailySpotlightService,
  toDailySpotlightMovement,
  type DailySpotlightMovement,
  type DailySpotlightResult,
} from "@spotter/daily-spotlight";
import {
  auditMovementWindows,
  buildProbeWindow,
  createAuditBundle,
  createRunId,
  readGitVersionMetadata,
  saveAuditRun,
  scoreRealMovements,
  type AuditedMovement,
  type ScoredSpotterInterestMovement,
} from "@spotter/interest-integration";
import type { SpotlightRuntimeConfig } from "./spotlight-config";
import { readFlightAwareApiKey } from "./spotlight-config";
import { toDailySpotlightProviderError } from "./provider-errors";

interface LiveAuditContext {
  providerResult: FlightAwareAirportMovementResult;
  auditedMovements: AuditedMovement[];
  window: ReturnType<typeof buildProbeWindow>;
}

function asAuditScoredMovement(
  movement: DailySpotlightMovement,
): ScoredSpotterInterestMovement {
  if (!movement.enrichmentSources || !movement.aircraftTypeNormalization) {
    throw new DailySpotlightError(
      "INTEGRATION_FAILURE",
      "Live enrichment provenance is unavailable for audit output.",
    );
  }
  return {
    movement,
    airportCode: "KATL",
    facts: movement.spotterFacts,
    sources: movement.enrichmentSources,
    aircraftTypeNormalization: movement.aircraftTypeNormalization,
    spotterInterest: movement.spotterInterest,
  };
}

async function persistFreshAudit(
  context: LiveAuditContext,
  scoredMovements: readonly DailySpotlightMovement[],
): Promise<void> {
  const git = await readGitVersionMetadata();
  const scored = scoredMovements.map(asAuditScoredMovement);
  await saveAuditRun({
    baseRunId: createRunId(context.providerResult.diagnostics.observedAt, "KATL"),
    createBundle: (runId) => createAuditBundle({
      runId,
      airport: "KATL",
      window: context.window,
      auditedMovements: context.auditedMovements,
      scoredMovements: scored,
      diagnostics: context.providerResult.diagnostics,
      git,
      top: 5,
    }),
  });
}

export async function generateFreshFlightAwareSpotlight(
  config: SpotlightRuntimeConfig,
  options: { now?: () => Date; apiKey?: string } = {},
): Promise<DailySpotlightResult> {
  const now = options.now ?? (() => new Date());
  const start = now();
  const end = new Date(start.getTime() + config.windowMinutes * 60_000);
  const apiKey = options.apiKey ?? readFlightAwareApiKey();
  const provider = new FlightAwareAviationDataProvider({
    client: new FlightAwareClient({ apiKey }),
    now,
  });
  let auditContext: LiveAuditContext | null = null;

  const service = new DailySpotlightService({
    source: "FLIGHTAWARE",
    async getMovements(query) {
      const window = buildProbeWindow({
        primaryStart: query.start,
        primaryEnd: query.end,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
      });
      let providerResult;
      try {
        providerResult = await provider.getAirportMovementsWithDiagnostics(
          query.airport,
          { start: window.fetchStart, end: window.fetchEnd, maxPages: query.maxPages },
        );
      } catch (error) {
        throw toDailySpotlightProviderError(error);
      }
      const auditedMovements = auditMovementWindows(
        providerResult.movements,
        window,
        query.airport,
      );
      auditContext = { providerResult, auditedMovements, window };
      const primaryMovements = auditedMovements
        .filter((entry) => entry.inPrimaryWindow)
        .map((entry) => entry.movement);
      return {
        movements: primaryMovements,
        observedAt: providerResult.diagnostics.observedAt,
        diagnostics: {
          fetchedMovements: primaryMovements.length,
          logicalEndpointQueries: providerResult.diagnostics.endpointQueries,
          httpRequests: providerResult.diagnostics.totalHttpRequests,
          pages: providerResult.diagnostics.totalPages,
          truncated: providerResult.diagnostics.resultsTruncated,
        },
      };
    },
    enrichAndScore(movements, airport) {
      return scoreRealMovements(movements, airport).map(toDailySpotlightMovement);
    },
    async afterFreshGeneration({ scoredMovements }) {
      const context: LiveAuditContext | null = auditContext;
      if (!config.auditFreshLiveRuns || context === null) return;
      try {
        await persistFreshAudit(context, scoredMovements);
      } catch (error) {
        console.warn("Daily Spotlight audit could not be saved.", error instanceof Error ? error.message : "Unknown audit error");
      }
    },
  });

  return service.generate({
    airport: config.airport,
    start,
    end,
    maxPages: config.maxPagesPerEndpoint,
  });
}
