// Build-time (server component / generateStaticParams) loaders for the
// vendored data artifacts in public/data/. The site is a static export, so
// these run only at build time.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Dims, Manifest, LatestByState, AnnualByState, SeriesIndex } from "./types";

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
