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

export const MARKET_LABELS: Record<string, string> = {
  stumpage: "Stumpage",
  delivered: "Delivered",
};

export const OWNERSHIP_LABELS: Record<string, string> = {
  public_federal_sale: "Federal (National Forest) sales",
  public_state_sale: "State land sales",
  public_tribal_sale: "Tribal trust sales",
  private_survey: "Private-market survey",
  mixed: "Mixed ownership bases",
};

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
