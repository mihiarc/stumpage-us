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

export function rowMatchesSeries(row: PriceRow, s: Series): boolean {
  return (
    row.r === s.region &&
    row.sp === s.species &&
    row.p === s.product &&
    row.m === s.market
  );
}
