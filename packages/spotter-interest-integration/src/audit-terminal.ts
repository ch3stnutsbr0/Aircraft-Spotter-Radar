import { buildScoreAuditEntries } from "./score-audit.ts";
import type {
  AuditedMovement,
  ProbeWindow,
  ScoredSpotterInterestMovement,
} from "./types.ts";

function scheduledTime(audit: AuditedMovement): number | null {
  return audit.scheduledMovementTime?.getTime() ?? null;
}

function auditLine(label: string, audit: AuditedMovement | undefined): string {
  if (!audit) return `${label}: none`;
  const movement = audit.movement;
  return `${label}: ${movement.ident || "(missing ident)"}  ${movement.registration ?? "(registration unknown)"}  ${audit.scheduledMovementTime?.toISOString() ?? "scheduled time unavailable"}`;
}

export function formatWindowEdgeSummary(
  auditedMovements: readonly AuditedMovement[],
  window: ProbeWindow,
): string[] {
  const withTime = auditedMovements.filter(
    (audit) => audit.scheduledMovementTime !== null,
  );
  const beforeStart = [...withTime]
    .filter((audit) => (scheduledTime(audit) ?? 0) < window.primaryStart.getTime())
    .sort((left, right) =>
      (scheduledTime(right) ?? 0) - (scheduledTime(left) ?? 0)
    )[0];
  const inside = [...withTime]
    .filter((audit) => audit.inPrimaryWindow)
    .sort((left, right) =>
      (scheduledTime(right) ?? 0) - (scheduledTime(left) ?? 0)
    )[0];
  const afterEnd = [...withTime]
    .filter((audit) => (scheduledTime(audit) ?? 0) >= window.primaryEnd.getTime())
    .sort((left, right) =>
      (scheduledTime(left) ?? 0) - (scheduledTime(right) ?? 0)
    )[0];

  return [
    "Window-edge movements",
    "-----------------------------------------",
    auditLine("Closest before start", beforeStart),
    auditLine("Last movement inside", inside),
    auditLine("Closest at/after end", afterEnd),
    auditLine("First buffered outside end", afterEnd),
  ];
}

function matchesQuery(audit: AuditedMovement, normalizedQuery: string): boolean {
  const movement = audit.movement;
  return [
    movement.ident,
    movement.operatorIcao,
    movement.registration,
    movement.aircraftType,
    movement.originAirport,
    movement.destinationAirport,
  ].some((value) => value?.toUpperCase().includes(normalizedQuery));
}

export function formatFindResults({
  query,
  auditedMovements,
  scoredMovements,
  top,
}: {
  query: string;
  auditedMovements: readonly AuditedMovement[];
  scoredMovements: readonly ScoredSpotterInterestMovement[];
  top: number;
}): string[] {
  const normalizedQuery = query.trim().toUpperCase();
  if (!normalizedQuery) return [];
  const scoreEntries = buildScoreAuditEntries(scoredMovements, top);
  const scoreByMovement = new Map(
    scoreEntries.map((entry) => [entry.item.movement, entry]),
  );
  const matches = auditedMovements
    .filter((audit) => matchesQuery(audit, normalizedQuery))
    .slice(0, 20);

  const lines = [
    `Find results: ${query}`,
    "-----------------------------------------",
  ];
  if (matches.length === 0) {
    lines.push("No matching movement was fetched. No extra API request was made.");
    return lines;
  }

  for (const audit of matches) {
    const movement = audit.movement;
    const score = scoreByMovement.get(movement);
    lines.push(
      `${movement.ident || "(missing ident)"}  ${movement.registration ?? "(registration unknown)"}  ${movement.aircraftType ?? "(type unknown)"}  ${movement.originAirport ?? "?"}→${movement.destinationAirport ?? "?"}`,
      `  fetched: yes; in primary window: ${audit.inPrimaryWindow ? "yes" : "no"}; scored: ${score ? "yes" : "no"}`,
    );
    if (score) {
      const dimensions = score.item.spotterInterest.dimensions;
      lines.push(
        `  score ${score.item.spotterInterest.score.toFixed(1)}; movement rank ${score.movementRank}; aircraft rank ${score.aircraftLevelRank ?? "deduplicated"}; Top N ${score.isTopN ? "yes" : "no"}`,
        `  dimensions N/G/L/R: ${dimensions.notability.score}/${dimensions.globalTypeRarity.score}/${dimensions.localTypeRarity.score}/${dimensions.registrationRarity.score}`,
        `  sources N/G/L/R: ${score.item.sources.notability}/${score.item.sources.globalTypeRarity}/${score.item.sources.localTypeRarity}/${score.item.sources.registrationRarity}`,
      );
    }
  }

  return lines;
}
