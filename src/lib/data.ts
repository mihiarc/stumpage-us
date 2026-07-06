// Build-time (server component / generateStaticParams) loaders for the
// vendored data artifacts in public/data/. The site is a static export, so
// these run only at build time.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Dims, Manifest, LatestByState, AnnualByState, SeriesIndex } from "./types";

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
