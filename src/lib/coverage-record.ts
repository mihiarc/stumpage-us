// Shape of public/coverage/coverage.json — the citable coverage record.
//
// One definition, two consumers: scripts/export-coverage.ts writes it and
// /coverage renders it, so the page cannot disagree with the artifact people
// download. `bun run build` regenerates the file before `next build`, so the
// page is never rendered from a stale record.
import type { EntryStatus, Provenance } from "@/content/directory";

/** How well the price dataset actually speaks to a given state. */
export type Evidence = "state-series" | "regional-only" | "none";

/**
 * Three values, not two. A state we have never swept is not a state with
 * nothing in it, and the record exists precisely to keep those apart.
 */
export type ResearchOutcome = "found" | "none-known" | "not-searched";

export interface CoverageSource {
  org: string;
  report: string;
  url: string;
  status: EntryStatus;
  provenance: Provenance;
  frequency: string | null;
  units: string | null;
  latest_known: string | null;
  verified: string;
  in_dataset: string | null;
  notes: string | null;
}

export interface CoverageStateRecord {
  state: string;
  state_name: string;
  research: {
    searched: string | null;
    outcome: ResearchOutcome;
    checked: string[];
    note: string | null;
  };
  directory: {
    entries: number;
    by_status: Record<EntryStatus, number>;
    by_provenance: Record<Provenance, number>;
    /** A live report the state can be cited for directly, not a TMS reprint. */
    has_live_independent: boolean;
    has_live_any: boolean;
    last_verified: string | null;
    sources: CoverageSource[];
  };
  prices: {
    evidence: Evidence;
    series: number;
    series_direct: number;
    series_regional: number;
    observations: number;
    year_min: number | null;
    year_max: number | null;
    sources: string[];
    products: string[];
    markets: string[];
  };
}

export interface CoverageTotals {
  states: number;
  searched: number;
  not_searched: number;
  searched_none_known: number;
  with_any_entry: number;
  with_live_source: number;
  with_live_independent_source: number;
  evidence: Record<Evidence, number>;
  directory_entries: number;
  directory_entries_by_status: Record<EntryStatus, number>;
  directory_entries_by_provenance: Record<Provenance, number>;
  price_series: number;
  price_observations: number;
  price_sources: number;
}

export interface CoverageRecord {
  name: string;
  description: string;
  format_version: number;
  /** Derived from the inputs, not the clock — see the export script. */
  version: string;
  generated_at: string;
  directory_as_of: string;
  directory_floor_verified: string;
  prices_built_at: string;
  license: string;
  license_url: string;
  cite_as: string;
  source_repository: string;
  definitions: {
    outcome: Record<string, string>;
    status: Record<string, string>;
    provenance: Record<string, string>;
    evidence: Record<string, string>;
  };
  totals: CoverageTotals;
  national_and_international: (CoverageSource & { scope: string })[];
  states: CoverageStateRecord[];
}
