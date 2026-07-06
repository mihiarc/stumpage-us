// Types for the data artifacts exported by timber-prices/scripts/export_public.py
// (vendored under public/data/). Format documented in public/data/manifest.json.

export interface SeriesLatest {
  y: number;
  q: number | null;
  t: number | null; // price per green ton
  o: number | null; // price in the original unit
  u: string | null;
}

export interface Series {
  source: string;
  region: string;
  region_name: string;
  region_type: string;
  state: string | null;
  macro: string | null;
  species: string;
  species_name: string;
  species_group: string;
  product: string;
  product_name: string;
  market: "stumpage" | "delivered";
  basis: string;
  ownership: string;
  unit: string;
  n: number;
  y0: number;
  y1: number;
  cadence: "annual" | "quarterly" | "mixed";
  latest: SeriesLatest;
}

export interface SeriesIndex {
  series: Series[];
}

/** Compact price row in prices/{source}.json (keys per manifest chunk_keys). */
export interface PriceRow {
  r: string; // region_code
  sp: string; // species_code
  p: string; // product_code
  m: string; // market_type
  y: number;
  q?: number; // absent = annual
  t?: number; // price_per_ton
  tl?: number;
  th?: number;
  o?: number; // original_price
  ol?: number;
  oh?: number;
  u?: string; // original_unit
  e?: 1; // is_estimated
}

export interface PriceChunk {
  source: string;
  rows: PriceRow[];
}

export interface SourceDim {
  source_code: string;
  source_name: string;
  description: string;
  coverage_start: string;
  coverage_end: string;
  geographic_coverage: string;
  ownership_basis: string;
}

export interface Dims {
  sources: SourceDim[];
  species: { species_code: string; species_name: string; species_group: string }[];
  products: {
    product_code: string;
    product_name: string;
    timber_class: string;
    end_market: string;
  }[];
  regions: {
    region_code: string;
    region_name: string;
    region_type: string;
    state_code: string | null;
    macro_region_code: string | null;
  }[];
  states: { state_code: string; state_name: string }[];
  units: {
    original_unit: string;
    tons_per_unit: number | null;
    conversion_source: string | null;
  }[];
}

export interface Manifest {
  name: string;
  built_at: string;
  source_view: string;
  dbt_build_ran: boolean;
  format_version: number;
  row_count: number;
  series_count: number;
  sources: {
    source_code: string;
    n: number;
    y0: number;
    y1: number;
    latest_period_key: number;
  }[];
  chunk_keys: Record<string, string>;
  license_note: string;
}

export interface AnnualByState {
  rows: {
    state: string;
    y: number;
    sg: string;
    p: string;
    m: string;
    t: number;
    n: number;
  }[];
}

export interface LatestByState {
  rows: {
    state: string;
    y: number;
    sg: string;
    p: string;
    m: string;
    t: number;
    n: number;
  }[];
}
