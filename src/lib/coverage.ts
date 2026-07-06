// Build-time coverage rollups derived from the series index.
import { getSeriesIndex } from "./data";
import { seriesStates } from "./geo";
import type { Series } from "./types";

export interface StateCoverage {
  direct: number; // series attributed to exactly this state (incl. sub-state)
  regional: number; // series covering it via a USFS-region / multi-state grain
  total: number;
}

let coverageCache: Record<string, StateCoverage> | null = null;

export function getStateCoverage(): Record<string, StateCoverage> {
  if (coverageCache) return coverageCache;
  const cov: Record<string, StateCoverage> = {};
  for (const s of getSeriesIndex().series) {
    for (const st of seriesStates(s)) {
      const c = (cov[st] ??= { direct: 0, regional: 0, total: 0 });
      if (s.state === st) c.direct++;
      else c.regional++;
      c.total++;
    }
  }
  coverageCache = cov;
  return cov;
}

export function getCoveredStates(): string[] {
  return Object.keys(getStateCoverage()).sort();
}

export function seriesForState(code: string): Series[] {
  return getSeriesIndex().series.filter((s) => seriesStates(s).includes(code));
}
