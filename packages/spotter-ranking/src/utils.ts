export const clampScore = (score: number): number =>
  Math.min(100, Math.max(0, score));

export const roundScore = (score: number): number =>
  Math.round(score * 100) / 100;

export const unique = <T>(values: T[]): T[] => [...new Set(values)];
