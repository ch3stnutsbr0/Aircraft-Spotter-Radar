import assert from "node:assert/strict";
import test from "node:test";
import { FlightAwareApiError } from "../../../../../packages/aviation-data/src/index.ts";
import { toDailySpotlightProviderError } from "../provider-errors.ts";

test("HTTP 429 maps to a readable controlled error without retrying", () => {
  const error = toDailySpotlightProviderError(
    new FlightAwareApiError("quota detail", 429, "Too Many Requests", "60"),
  );
  assert.equal(error.code, "RATE_LIMITED");
  assert.match(error.userMessage, /quota was reached/);
  assert.equal(error.userMessage.includes("quota detail"), false);
});

test("authentication and network failures remain distinguishable", () => {
  assert.equal(
    toDailySpotlightProviderError(new FlightAwareApiError("bad", 401)).code,
    "AUTHENTICATION",
  );
  assert.equal(
    toDailySpotlightProviderError(new Error("offline")).code,
    "PROVIDER_UNAVAILABLE",
  );
});
