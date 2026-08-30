/**
 * Builds the public coverage record: what is published about US timber prices,
 * by whom, how current, under what licence — and where we searched and found
 * nothing.
 *
 * Run with `bun run export:coverage`. Writes to public/coverage/, which is a
 * different thing from public/data/: public/data/ is generated upstream by
 * timber-prices/scripts/export_public.py and must never be hand-edited, while
 * public/coverage/ is generated *here* from this repo's editorial content
 * (src/content/directory.ts) joined against that upstream data.
 *
 * The two halves are the point. A catalogue alone says who publishes; the
 * price rollup alone says what we ingested. Only together do they support a
 * claim about what a national timber price statistic would require versus what
 * actually exists.
 *
 * Output is deterministic apart from `generated_at`: `version` is derived from
 * the inputs, so re-running without new research produces the same record.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DIRECTORY,
  DIRECTORY_VERIFIED_DATE,
  STATE_RESEARCH,
  entryVerified,
  type DirectoryEntry,
  type EntryStatus,
  type Provenance,
} from "../src/content/directory";
import type {
  CoverageRecord,
  CoverageSource,
  CoverageStateRecord,
  Evidence,
} from "../src/lib/coverage-record";
import { getManifest, getSeriesIndex } from "../src/lib/data";
import { STATE_NAMES, seriesStates } from "../src/lib/geo";
import type { Series } from "../src/lib/types";

const OUT_DIR = join(process.cwd(), "public", "coverage");
const FORMAT_VERSION = 1;

function serializeEntry(e: DirectoryEntry): CoverageSource {
  return {
    org: e.org,
    report: e.report,
    url: e.url,
    status: e.status,
    provenance: e.provenance,
    frequency: e.frequency ?? null,
    units: e.units ?? null,
    latest_known: e.latestKnown ?? null,
    verified: entryVerified(e),
    // Set only when the source is actually ingested into the price dataset —
    // most catalogued sources are not.
    in_dataset: e.inDataset ?? null,
    notes: e.notes ?? null,
  };
}

const STATUSES: EntryStatus[] = ["live", "stale", "dead", "paywalled", "unverified"];
const PROVENANCES: Provenance[] = ["independent", "tms", "commercial", "tax", "derived"];

function tally<K extends string>(keys: readonly K[], got: K[]): Record<K, number> {
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  for (const g of got) out[g]++;
  return out;
}

function uniqSorted(xs: string[]): string[] {
  return [...new Set(xs)].sort();
}

function buildStateRecord(
  state: string,
  seriesByState: Map<string, Series[]>,
): CoverageStateRecord {
  const entries = DIRECTORY.filter((e) => e.state === state);
  const research = STATE_RESEARCH.find((r) => r.state === state);
  const series = seriesByState.get(state) ?? [];
  const direct = series.filter((s) => s.state === state);

  const years = series.flatMap((s) => [s.y0, s.y1]);
  const evidence: Evidence =
    direct.length > 0 ? "state-series" : series.length > 0 ? "regional-only" : "none";

  return {
    state,
    state_name: STATE_NAMES[state] ?? state,
    research: {
      searched: research?.searched ?? null,
      // A state we have never swept is NOT a state with nothing in it. The
      // third value exists so this file can never be read as asserting one
      // when it means the other.
      outcome: research?.outcome ?? "not-searched",
      checked: research?.checked ?? [],
      note: research?.note ?? null,
    },
    directory: {
      entries: entries.length,
      by_status: tally(
        STATUSES,
        entries.map((e) => e.status),
      ),
      by_provenance: tally(
        PROVENANCES,
        entries.map((e) => e.provenance),
      ),
      has_live_independent: entries.some(
        (e) => e.status === "live" && e.provenance === "independent",
      ),
      has_live_any: entries.some((e) => e.status === "live"),
      last_verified: entries.length
        ? entries.map(entryVerified).sort().at(-1)!
        : null,
      sources: entries.map(serializeEntry),
    },
    prices: {
      evidence,
      series: series.length,
      series_direct: direct.length,
      series_regional: series.length - direct.length,
      observations: series.reduce((n, s) => n + s.n, 0),
      year_min: years.length ? Math.min(...years) : null,
      year_max: years.length ? Math.max(...years) : null,
      sources: uniqSorted(series.map((s) => s.source)),
      products: uniqSorted(series.map((s) => s.product)),
      markets: uniqSorted(series.map((s) => s.market)),
    },
  };
}

function csv(rows: (string | number | boolean | null)[][]): string {
  const cell = (v: (typeof rows)[number][number]) => {
    if (v === null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(",")).join("\n") + "\n";
}

function main() {
  const manifest = getManifest();
  const index = getSeriesIndex();

  // Fan each series out to the states it covers, using the one canonical
  // mapping (src/lib/geo.ts). National-forest series map to no state on
  // purpose — see the comment on seriesStates.
  const seriesByState = new Map<string, Series[]>();
  for (const s of index.series) {
    for (const st of seriesStates(s)) {
      const list = seriesByState.get(st) ?? [];
      list.push(s);
      seriesByState.set(st, list);
    }
  }

  const states = Object.keys(STATE_NAMES).sort();
  const records = states.map((st) => buildStateRecord(st, seriesByState));

  const directoryAsOf = STATE_RESEARCH.map((r) => r.searched).sort().at(-1)!;
  const dataAsOf = manifest.built_at.slice(0, 10);

  const nationalEntries = DIRECTORY.filter((e) => e.state === "US" || e.state === "INTL");

  const record: CoverageRecord = {
    name: "US timber price coverage record",
    description:
      "Who publishes US timber prices, state by state, how current each report is and whose data it is — joined against the price series actually present in the stumpage.us dataset. Includes states searched with no source found, recorded as a positive finding.",
    format_version: FORMAT_VERSION,
    // Derived from the inputs, not the clock: re-running without new research
    // or a new upstream data build reproduces this exact version string.
    version: `${directoryAsOf}+data.${dataAsOf}`,
    generated_at: new Date().toISOString(),
    directory_as_of: directoryAsOf,
    directory_floor_verified: DIRECTORY_VERIFIED_DATE,
    prices_built_at: manifest.built_at,
    license: "CC-BY-4.0",
    license_url: "https://creativecommons.org/licenses/by/4.0/",
    cite_as:
      "Mihiar, C. US public timber stumpage & delivered price data (stumpage.us). CC BY 4.0. See CITATION.cff in mihiarc/stumpage-us.",
    source_repository: "https://github.com/mihiarc/stumpage-us",
    definitions: {
      outcome: {
        found: "We searched this state and catalogued at least one price reporting service, whatever its current status.",
        "none-known":
          "We searched this state and found no public timber price reporting service. `checked` lists what was searched; this is a finding, not a blank.",
        "not-searched":
          "We have not searched this state. Do not read this as an absence of sources.",
      },
      status: {
        live: "Currently published on its stated schedule.",
        stale: "Still online, but behind its stated schedule — see latest_known.",
        dead: "Discontinued; any archive is historical only.",
        paywalled: "Exists but requires a paid subscription.",
        unverified: "Catalogued but not confirmed at the last sweep.",
      },
      provenance: {
        independent: "The publisher collects its own survey or sale data — genuinely public.",
        tms: "Licensed TimberMart-South redistribution. Free to read; the numbers are copyrighted survey data, not public data, and are excluded from the price dataset by construction.",
        commercial: "Paid commercial service.",
        tax: "Administrative or tax-assessed values, not observed market transactions.",
        derived: "Derived from another listed source.",
      },
      evidence: {
        "state-series":
          "The price dataset carries at least one series attributed to this state.",
        "regional-only":
          "The state is covered only by multi-state or USFS-region series — no state-grain observation.",
        none: "No series in the price dataset covers this state at any grain.",
      },
    },
    totals: {
      states: records.length,
      searched: records.filter((r) => r.research.outcome !== "not-searched").length,
      not_searched: records.filter((r) => r.research.outcome === "not-searched").length,
      searched_none_known: records.filter((r) => r.research.outcome === "none-known").length,
      with_any_entry: records.filter((r) => r.directory.entries > 0).length,
      with_live_source: records.filter((r) => r.directory.has_live_any).length,
      with_live_independent_source: records.filter((r) => r.directory.has_live_independent)
        .length,
      evidence: {
        "state-series": records.filter((r) => r.prices.evidence === "state-series").length,
        "regional-only": records.filter((r) => r.prices.evidence === "regional-only").length,
        none: records.filter((r) => r.prices.evidence === "none").length,
      },
      directory_entries: DIRECTORY.length,
      directory_entries_by_status: tally(
        STATUSES,
        DIRECTORY.map((e) => e.status),
      ),
      directory_entries_by_provenance: tally(
        PROVENANCES,
        DIRECTORY.map((e) => e.provenance),
      ),
      price_series: index.series.length,
      price_observations: manifest.row_count,
      price_sources: manifest.sources.length,
    },
    national_and_international: nationalEntries.map((e) => ({
      scope: e.state,
      ...serializeEntry(e),
    })),
    states: records,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    join(OUT_DIR, "coverage.json"),
    JSON.stringify(record, null, 2) + "\n",
    "utf-8",
  );

  writeFileSync(
    join(OUT_DIR, "coverage_by_state.csv"),
    csv([
      [
        "state", "state_name", "searched", "outcome", "checked_count",
        "directory_entries", "live", "stale", "dead", "paywalled", "unverified",
        "independent", "tms", "commercial", "tax", "derived",
        "has_live_source", "has_live_independent_source", "last_verified",
        "price_evidence", "price_series", "price_series_direct",
        "price_series_regional", "price_observations", "price_year_min",
        "price_year_max", "price_sources",
      ],
      ...records.map((r) => [
        r.state, r.state_name, r.research.searched, r.research.outcome,
        r.research.checked.length, r.directory.entries,
        r.directory.by_status.live, r.directory.by_status.stale,
        r.directory.by_status.dead, r.directory.by_status.paywalled,
        r.directory.by_status.unverified,
        r.directory.by_provenance.independent, r.directory.by_provenance.tms,
        r.directory.by_provenance.commercial, r.directory.by_provenance.tax,
        r.directory.by_provenance.derived,
        r.directory.has_live_any, r.directory.has_live_independent,
        r.directory.last_verified, r.prices.evidence, r.prices.series,
        r.prices.series_direct, r.prices.series_regional, r.prices.observations,
        r.prices.year_min, r.prices.year_max, r.prices.sources.join(" "),
      ]),
    ]),
    "utf-8",
  );

  writeFileSync(
    join(OUT_DIR, "directory.csv"),
    csv([
      [
        "state", "org", "report", "url", "status", "provenance", "frequency",
        "units", "latest_known", "verified", "in_dataset",
      ],
      ...DIRECTORY.map((e) => [
        e.state, e.org, e.report, e.url, e.status, e.provenance,
        e.frequency ?? null, e.units ?? null, e.latestKnown ?? null,
        entryVerified(e), e.inDataset ?? null,
      ]),
    ]),
    "utf-8",
  );

  const t = record.totals;
  console.log(`coverage ${record.version} -> public/coverage/`);
  console.log(
    `  ${t.directory_entries} entries across ${t.with_any_entry} states; ` +
      `${t.with_live_independent_source} states have a live independent source`,
  );
  console.log(
    `  ${t.searched_none_known} searched with none known, ` +
      `${t.not_searched} not searched`,
  );
  console.log(
    `  price evidence: ${t.evidence["state-series"]} state-series, ` +
      `${t.evidence["regional-only"]} regional-only, ${t.evidence.none} none`,
  );
}

main();
