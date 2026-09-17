import assert from "node:assert/strict";
import test from "node:test";
import { DailySpotlightError } from "../../../../../packages/daily-spotlight/src/index.ts";
import { readFlightAwareApiKey, readSpotlightConfig } from "../spotlight-config.ts";

test("mock is the safe default and requires no FlightAware credential", () => {
  const config = readSpotlightConfig({});
  assert.equal(config.dataSource, "MOCK");
  assert.equal(config.ranker, "legacy-rule");
  assert.equal(config.windowMinutes, 60);
  assert.equal(config.cacheSeconds, 300);
  assert.equal(config.maxPagesPerEndpoint, 1);
});

test("ranker configuration defaults to legacy and rejects unavailable AI", () => {
  assert.equal(readSpotlightConfig({}).ranker, "legacy-rule");
  assert.throws(
    () => readSpotlightConfig({ SPOTLIGHT_RANKER: "ai" }),
    /reserved but not implemented/,
  );
  assert.throws(
    () => readSpotlightConfig({ SPOTLIGHT_RANKER: "unknown" }),
    /must be legacy-rule/,
  );
});

test("flightaware configuration selects the live source explicitly", () => {
  const config = readSpotlightConfig({ SPOTLIGHT_DATA_SOURCE: "flightaware" });
  assert.equal(config.dataSource, "FLIGHTAWARE");
});

test("missing FlightAware key has a readable controlled error", () => {
  assert.throws(
    () => readFlightAwareApiKey({}),
    (error: unknown) => error instanceof DailySpotlightError
      && error.code === "CONFIGURATION"
      && error.userMessage.includes("FLIGHTAWARE_AEROAPI_KEY"),
  );
});

test("configuration never includes secret-bearing values", () => {
  const secret = "secret-test-key";
  const config = readSpotlightConfig({
    SPOTLIGHT_DATA_SOURCE: "flightaware",
    FLIGHTAWARE_AEROAPI_KEY: secret,
  });
  assert.equal(JSON.stringify(config).includes(secret), false);
});
