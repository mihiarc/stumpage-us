// Build-time (server component / generateStaticParams) loaders for the
// vendored data artifacts in public/data/. The site is a static export, so
// these run only at build time.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Dims,
  Manifest,
  LatestByState,
  AnnualByState,
  PriceChunk,
  PriceRow,
  Series,
  SeriesIndex,
} from "./types";
import { rowSeriesId, seriesId } from "./format";
import type { CoverageRecord } from "./coverage-record";

// Candor blocks: machine-readable expert caveats per source (plus a
// dataset-level block), following the five CANDID-core categories. Authored
// as YAML in the private data repo; exported into candor.json.
export interface CandorLimitation {
  id: string;
  statement: string;
  guard?: string;
}
export interface CandorBlock {
  schema: string;
  id: string;
  name: string;
  suitability_and_limitations: {
    suitability_summary: string;
    application_limitations: CandorLimitation[];
    data_quality_metrics: string[];
    known_gaps: string[];
  };
  use_cases_and_target_users?: {
    suggested_uses?: string[];
    discouraged_uses?: string[];
  };
}
export interface CandorFile {
  framework: string;
  blocks: Record<string, CandorBlock>;
}

const DATA_DIR = join(process.cwd(), "public", "data");
// Generated in this repo by scripts/export-coverage.ts, unlike public/data/
// which comes from upstream. `bun run build` regenerates it before next build.
const COVERAGE_DIR = join(process.cwd(), "public", "coverage");

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, name), "utf-8")) as T;
}

const cache: {
  dims?: Dims;
  manifest?: Manifest;
  seriesIndex?: SeriesIndex;
  latestByState?: LatestByState;
  annualByState?: AnnualByState;
  candor?: CandorFile;
  coverage?: CoverageRecord;
} = {};

export function getDims(): Dims {
  return (cache.dims ??= readJson<Dims>("dims.json"));
}

export function getManifest(): Manifest {
  return (cache.manifest ??= readJson<Manifest>("manifest.json"));
}

export function getSeriesIndex(): SeriesIndex {
  return (cache.seriesIndex ??= readJson<SeriesIndex>("series_index.json"));
}

export function getLatestByState(): LatestByState {
  return (cache.latestByState ??= readJson<LatestByState>("latest_by_state.json"));
}

export function getAnnualByState(): AnnualByState {
  return (cache.annualByState ??= readJson<AnnualByState>("annual_by_state.json"));
}

export function getCandor(): CandorFile {
  return (cache.candor ??= readJson<CandorFile>("candor.json"));
}

export function getCoverage(): CoverageRecord {
  return (cache.coverage ??= JSON.parse(
    readFileSync(join(COVERAGE_DIR, "coverage.json"), "utf-8"),
  ) as CoverageRecord);
}

const seriesByIdCache = new Map<string, Series>();

/** One series by its `seriesId`. Index built once per process, not per lookup. */
export function getSeriesById(id: string): Series | undefined {
  if (seriesByIdCache.size === 0) {
    for (const s of getSeriesIndex().series) seriesByIdCache.set(seriesId(s), s);
  }
  return seriesByIdCache.get(id);
}

let seriesByRegionCache: Map<string, Series[]> | null = null;

/**
 * Every series reported for one region — the unit a record page covers.
 *
 * Region codes are globally unique across sources (checked: 0 of 224 appear
 * under more than one source), so a region determines its source and a page
 * needs only one provenance block for all of its series.
 */
export function getSeriesByRegion(region: string): Series[] {
  if (!seriesByRegionCache) {
    seriesByRegionCache = new Map<string, Series[]>();
    for (const s of getSeriesIndex().series) {
      const list = seriesByRegionCache.get(s.region);
      if (list) list.push(s);
      else seriesByRegionCache.set(s.region, [s]);
    }
  }
  return seriesByRegionCache.get(region) ?? [];
}

/** All region codes that have at least one series, sorted. */
export function getRegionCodes(): string[] {
  getSeriesByRegion("");
  return [...seriesByRegionCache!.keys()].sort();
}

const rowsBySourceCache = new Map<string, Map<string, PriceRow[]>>();

/**
 * Every price row for one source, grouped by `seriesId` and sorted by period.
 *
 * Build-time only — this reads prices/{source}.json with node:fs, the same
 * files the explorer fetches over HTTP at runtime. Series pages take the
 * build-time path deliberately: the median series is 8 observations, while
 * prices/usfs_cutsold.json is 4.0 MB, so fetching the chunk client-side would
 * make a visitor download four megabytes to read eight numbers.
 *
 * Grouped once per source rather than filtered per page: 3,490 pages each
 * scanning a chunk of up to ~25k rows is 3,490 full passes, and static export
 * runs these in parallel workers that each pay the cost.
 */
export function getRowsBySeries(source: string): Map<string, PriceRow[]> {
  let grouped = rowsBySourceCache.get(source);
  if (!grouped) {
    const chunk = JSON.parse(
      readFileSync(join(DATA_DIR, "prices", `${source}.json`), "utf-8"),
    ) as PriceChunk;
    grouped = new Map<string, PriceRow[]>();
    for (const r of chunk.rows) {
      const key = rowSeriesId(source, r);
      const list = grouped.get(key);
      if (list) list.push(r);
      else grouped.set(key, [r]);
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => a.y - b.y || (a.q ?? 0) - (b.q ?? 0));
    }
    rowsBySourceCache.set(source, grouped);
  }
  return grouped;
}

/** The observations behind one series, oldest first. */
export function getSeriesRows(s: Series): PriceRow[] {
  return getRowsBySeries(s.source).get(seriesId(s)) ?? [];
}

export interface UnitConversion {
  tonsPerUnit: number;
  /** The published basis for the factor, e.g. a USFS GTR table and species. */
  source: string;
}

/**
 * The published unit -> green ton conversion behind a harmonized $/ton figure,
 * so a page can disclose it rather than assert the number bare (ROADMAP
 * invariant 3: national views harmonize, and they say so).
 *
 * `dims.units` is keyed on unit *and species*, not unit alone: 16 of the 17
 * units carry exactly one factor, but `cord` carries eleven, one per species.
 * Where the unit alone is unambiguous that row is the answer. Where it isn't,
 * `observedRatio` — the median of original ÷ per-ton across the series' own
 * rows — picks the row that actually produced these numbers. Returns null
 * rather than guessing when nothing matches, because a cited conversion that
 * is wrong is worse than an uncited one.
 */
export function resolveConversion(
  unit: string,
  observedRatio: number | null,
): UnitConversion | null {
  const candidates = getDims().units.filter(
    (u) => u.original_unit === unit && u.tons_per_unit != null,
  );
  if (candidates.length === 0) return null;
  const pick =
    candidates.length === 1
      ? candidates[0]
      : observedRatio == null
        ? null
        : candidates.reduce((best, c) =>
            Math.abs(c.tons_per_unit! - observedRatio) <
            Math.abs(best.tons_per_unit! - observedRatio)
              ? c
              : best,
          );
  if (!pick) return null;
  // Reject a nearest-match that isn't actually near: the series is using a
  // factor this export doesn't document.
  if (
    candidates.length > 1 &&
    observedRatio != null &&
    Math.abs(pick.tons_per_unit! - observedRatio) / observedRatio > 0.01
  ) {
    return null;
  }
  return {
    tonsPerUnit: pick.tons_per_unit!,
    source: pick.conversion_source ?? "unattributed in the export",
  };
}
