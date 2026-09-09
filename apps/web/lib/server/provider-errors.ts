import { FlightAwareApiError } from "../../../../packages/aviation-data/src/index.ts";
import { DailySpotlightError } from "../../../../packages/daily-spotlight/src/index.ts";

export function toDailySpotlightProviderError(error: unknown): DailySpotlightError {
  if (error instanceof DailySpotlightError) return error;
  if (error instanceof FlightAwareApiError) {
    if (error.status === 429) {
      return new DailySpotlightError(
        "RATE_LIMITED",
        "Live FlightAware data is temporarily unavailable because the API quota was reached.",
        { cause: error },
      );
    }
    if (error.status === 401 || error.status === 403) {
      return new DailySpotlightError(
        "AUTHENTICATION",
        "FlightAware rejected the configured API key.",
        { cause: error },
      );
    }
  }
  return new DailySpotlightError(
    "PROVIDER_UNAVAILABLE",
    "Live FlightAware data is temporarily unavailable.",
    { cause: error },
  );
}
