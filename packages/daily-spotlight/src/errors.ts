export type DailySpotlightErrorCode =
  | "CONFIGURATION"
  | "RATE_LIMITED"
  | "AUTHENTICATION"
  | "PROVIDER_UNAVAILABLE"
  | "INTEGRATION_FAILURE";

export class DailySpotlightError extends Error {
  readonly code: DailySpotlightErrorCode;
  readonly userMessage: string;

  constructor(
    code: DailySpotlightErrorCode,
    userMessage: string,
    options?: { cause?: unknown },
  ) {
    super(userMessage, options);
    this.name = "DailySpotlightError";
    this.code = code;
    this.userMessage = userMessage;
  }
}
