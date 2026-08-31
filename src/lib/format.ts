import type { PriceRow, Series } from "./types";

export function fmtUsd(v: number | null | undefined, digits = 2): string {
  if (v == null) return "—";
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtPeriod(y: number, q: number | null | undefined): string {
  return q ? `${y} Q${q}` : String(y);
}

/** Numeric time position: annual points at mid-year, quarterly at mid-quarter. */
export function periodX(y: number, q: number | null | undefined): number {
  return q ? y + (q - 0.5) / 4 : y + 0.5;
}

/**
 * Codes that should read as acronyms rather than sentence-cased words.
 * `humanizeCode` is the only consumer.
 */
const ACRONYMS = new Set([
  "usfs", "blm", "dnr", "dnrc", "odf", "bber", "fia", "mbf", "cns", "dor",
]);

/**
 * Turn a raw export code into readable prose: `private_transaction_filing` ->
 * "Private transaction filing", `usfs_region` -> "USFS region".
 *
 * This is the floor under every label map below. The maps are *overrides* —
 * they exist for codes where we have something better to say than the
 * mechanical rendering ("public_federal_sale" reads far better as "Federal
 * (National Forest) sales") — not a definition of the vocabulary. A code the
 * export invents tomorrow renders acceptably instead of leaking snake_case
 * into the UI.
 *
 * Why this rather than reading labels from the export: `dims.json` carries
 * `region_type`, `ownership_basis`, `market_type` and `original_unit` as bare
 * codes with no label column. Only `products` and `species` ship names, which
 * is why those two are already data-driven and these are not. Fully honouring
 * ROADMAP invariant 7 needs the export to emit label columns; until it does,
 * this removes the failure mode that invariant predicts — silent disagreement
 * between the frontend's vocabulary and the data's.
 */
export function humanizeCode(code: string): string {
  const words = code.split(/[_\-\s]+/).filter(Boolean);
  if (words.length === 0) return code;
  return words
    .map((w, i) => {
      if (ACRONYMS.has(w.toLowerCase())) return w.toUpperCase();
      return i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w;
    })
    .join(" ");
}

/**
 * Identity colour per dataset, as an index into the --viz-series-* palette.
 *
 * Colour on this site answers a question rather than decorating: this one
 * answers "which dataset is this number from?", and it answers it the same way
 * on the home cards, /sources, a source page, and the explorer's Source column.
 * Drawn from the chart palette so no new hues enter the system, and rendered
 * only ever as a solid swatch beside the name — a legend key. That keeps it a
 * different kind of object from the filled --status-* pills, which is what lets
 * the two co-exist on a state page without a reader having to guess whether an
 * orange pill means "Montana BBER" or "licensed redistribution".
 *
 * The explorer is the one place that shows a source without a swatch: there the
 * chart assigns each of up to five selections a --viz-series-* colour by slot,
 * so the same hues already answer "which selection is this". Giving them a
 * second meaning in that viewport actively misleads — a Michigan series can
 * hold the blue slot while blue is USFS Cut-and-Sold's identity. The Source
 * column there gets `sourceShortLabel` alone.
 *
 * Slots 4 and 6 are deliberately unused: 4 is a second green too close to
 * mi_dnr's, and 6 is the red that --destructive and "Discontinued" already own.
 * The two federal series sit next to each other in the palette (blue, purple)
 * because they are the same kind of thing.
 */
const SOURCE_SERIES_SLOT: Record<string, number> = {
  usfs_cutsold: 1, // blue   — National Forest Cut-and-Sold, the largest
  mi_dnr: 2, // green  — Michigan DNR, the largest state source
  or_odf: 3, // amber  — Oregon ODF
  pnw: 5, // purple — PNW Research Station, the other federal series
  mt_dnrc: 7, // pink   — Montana DNRC trust land
  mt_bber: 8, // orange — Montana BBER delivered survey
};

/**
 * The CSS variable holding a dataset's identity colour. Returns a var()
 * reference rather than a value so it follows the palette into dark mode on its
 * own; a source the export adds tomorrow renders muted rather than throwing.
 */
export function sourceColorVar(code: string): string {
  const slot = SOURCE_SERIES_SLOT[code];
  return slot ? `var(--viz-series-${slot})` : "var(--viz-ink-muted)";
}

/**
 * Short names for the datasets, for places too narrow for `source_name` (which
 * runs 34-55 characters) — the explorer's Source column above all, which
 * otherwise leaks the raw `mi_dnr` code into the UI. An override map over
 * `humanizeCode`, exactly like MARKET_LABELS and OWNERSHIP_LABELS below: a
 * source the export adds tomorrow renders acceptably instead of breaking.
 */
export const SOURCE_SHORT_LABELS: Record<string, string> = {
  mi_dnr: "Michigan DNR",
  mt_bber: "Montana BBER",
  mt_dnrc: "Montana DNRC",
  or_odf: "Oregon ODF",
  pnw: "USFS PNW",
  usfs_cutsold: "USFS Cut-and-Sold",
};

export function sourceShortLabel(code: string): string {
  return SOURCE_SHORT_LABELS[code] ?? humanizeCode(code);
}

export const UNIT_LABELS: Record<string, string> = {
  ton: "$/green ton",
  cord: "$/cord",
};

/** Human label for an original_unit code. */
export function unitLabel(unit: string): string {
  if (UNIT_LABELS[unit]) return UNIT_LABELS[unit];
  if (unit.startsWith("mbf_scribner")) return "$/MBF (Scribner)";
  if (unit.startsWith("mbf_international")) return "$/MBF (International ¼″)";
  if (unit.startsWith("mbf")) return "$/MBF";
  return `$/${unit}`;
}

/** Overrides for market_type codes; see humanizeCode for the fallback. */
export const MARKET_LABELS: Record<string, string> = {
  stumpage: "Stumpage",
  delivered: "Delivered",
};

export function marketLabel(market: string): string {
  return MARKET_LABELS[market] ?? humanizeCode(market);
}

/** Overrides for ownership_basis codes; see humanizeCode for the fallback. */
export const OWNERSHIP_LABELS: Record<string, string> = {
  public_federal_sale: "Federal (National Forest) sales",
  public_state_sale: "State land sales",
  public_tribal_sale: "Tribal trust sales",
  private_survey: "Private-market survey",
  mixed: "Mixed ownership bases",
};

export function ownershipLabel(ownership: string): string {
  return OWNERSHIP_LABELS[ownership] ?? humanizeCode(ownership);
}

/** Stable id for a series, used in URLs and chart keys. */
export function seriesId(s: Series): string {
  return [s.source, s.region, s.species, s.product, s.market].join("~");
}

/**
 * The same id as `seriesId`, built from a chunk row plus the source the chunk
 * belongs to (rows don't carry their own source). Lives next to `seriesId` so
 * the two constructions cannot drift — the id is the join key between the
 * series index and the price chunks.
 */
export function rowSeriesId(source: string, r: PriceRow): string {
  return [source, r.r, r.sp, r.p, r.m].join("~");
}

/**
 * A series' address on the site.
 *
 * Series do not get their own route. The record lives at the grain the source
 * reports it — the region — and a series is a section within that page. This
 * is not only a size decision: 3,490 routes cost ~390 MB of per-route
 * scaffolding before any data, while the observations themselves are 6 MB.
 * It is also the honest grain, because a lone series is not a place and a
 * reader arriving at one wants the other assortments beside it.
 *
 * Region codes are globally unique (verified across all 224), so the region
 * alone identifies the page and the remaining three components identify the
 * section. Keep this the only place a series URL is constructed.
 */
export function seriesAnchor(s: Series): string {
  return [s.species, s.product, s.market].join("~");
}

export function seriesHref(s: Series): string {
  return `/regions/${s.region}#${seriesAnchor(s)}`;
}

export function rowMatchesSeries(row: PriceRow, s: Series): boolean {
  return (
    row.r === s.region &&
    row.sp === s.species &&
    row.p === s.product &&
    row.m === s.market
  );
}
