// The historical register at series depth: one permanent page per
// (source, region, species, product, market) tuple.
//
// This is the page the explorer's deletion is waiting on. The explorer is
// currently the only place the record exists at this depth, and ROADMAP
// §Risks says that deleting it before these land collapses "historical" to a
// sparkline. Everything a reader needs to cite one number lives here.
//
// Structure follows invariant 4 — three registers, always: what the price is
// now, how it has moved, and how far back the record reaches. There is no
// staleness threshold anywhere on this page. A 2008 figure is a fine
// historical number; it just has to say which question it answers, which is
// what naming the period on every figure does.
//
// Data comes from the build-time path (src/lib/data.ts, node:fs), never the
// explorer's client-side chunk fetch — see getRowsBySeries for why.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ChartPoint, ChartSeries } from "@/components/price-chart";
import { SeriesChart } from "@/components/series-chart";
import { SOURCE_NOTES } from "@/content/source-notes";
import {
  getCandor,
  getDims,
  getSeriesById,
  getSeriesIndex,
  getSeriesRows,
  resolveConversion,
} from "@/lib/data";
import {
  fmtPeriod,
  fmtUsd,
  marketLabel,
  ownershipLabel,
  periodX,
  seriesId,
  unitLabel,
} from "@/lib/format";
import { regionTypeLabel, seriesStates, STATE_NAMES } from "@/lib/geo";
import type { PriceRow, Series } from "@/lib/types";

interface Params {
  id: string;
}

export function generateStaticParams(): Params[] {
  // Every series, not a subset above some observation threshold. A threshold
  // would mean some series have a permalink and others don't, which is exactly
  // the citability the paper depends on. Measured cost of the full set: the
  // static export goes from 68 pages to ~3,558 and the build from ~5s to ~10s,
  // for a 21 MB Pages artifact — well inside the 1 GB limit.
  return getSeriesIndex().series.map((s) => ({ id: seriesId(s) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const s = getSeriesById(decodeURIComponent(id));
  if (!s) return { title: "Series" };
  return {
    title: `${s.species_name} ${s.product_name.toLowerCase()} — ${s.region_name}`,
    description:
      `${marketLabel(s.market)} prices for ${s.species_name.toLowerCase()} ` +
      `${s.product_name.toLowerCase()} in ${s.region_name}, ${s.y0}–${s.y1}, ` +
      `from ${s.source}. ${s.n} observations.`,
  };
}

/** The figure a source actually published, with the unit it published it in. */
function published(r: PriceRow, s: Series): { value: number; unit: string } | null {
  if (r.o != null) return { value: r.o, unit: r.u ?? s.unit };
  if (r.t != null) return { value: r.t, unit: "ton" };
  return null;
}

function toPoints(rows: PriceRow[], mode: "orig" | "ton"): ChartPoint[] {
  const points: ChartPoint[] = [];
  for (const r of rows) {
    const y = mode === "orig" ? r.o : r.t;
    if (y == null) continue;
    points.push({
      x: periodX(r.y, r.q ?? null),
      y,
      // Where the source reported a range, carry it. Invariant 8: show the
      // band, resist explaining what drove it.
      yLo: mode === "orig" ? r.ol : r.tl,
      yHi: mode === "orig" ? r.oh : r.th,
      year: r.y,
      quarter: r.q ?? null,
      estimated: r.e === 1,
    });
  }
  return points.sort((a, b) => a.x - b.x);
}

/** Percentage change, formatted with an explicit sign. Null if not computable. */
function pctChange(from: number, to: number): string | null {
  if (!from) return null;
  const p = ((to - from) / from) * 100;
  const rounded = Math.abs(p) >= 10 ? p.toFixed(0) : p.toFixed(1);
  return `${p >= 0 ? "+" : ""}${rounded}%`;
}

const CADENCE_NOTE: Record<Series["cadence"], string> = {
  annual: "annual",
  quarterly: "quarterly",
  mixed: "mixed annual and quarterly",
};

/**
 * Plain markup rather than the shadcn Card/Badge/Table primitives used
 * elsewhere in the site, and deliberately so. Those components carry long
 * variant class strings (focus-visible, aria-invalid, ring-destructive,
 * --card-spacing) that a static export serializes about four times per page —
 * once in the HTML, once in the inlined flight payload, and again in the RSC
 * segment files. At 68 pages that is invisible; at 3,490 it measured as
 * roughly 600 MB of the export, most of it class strings this page never
 * uses. These render identically and cost a fraction. Nothing else in the
 * repo should copy this — it is a consequence of the page count, not a
 * preference.
 */
function Register({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
      {children}
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const s = getSeriesById(decodeURIComponent(id));
  if (!s) notFound();

  const rows = getSeriesRows(s);
  const priced = rows.filter((r) => r.o != null || r.t != null);
  const latest = priced.at(-1) ?? null;
  const earliest = priced[0] ?? null;
  const previous = priced.length >= 2 ? priced.at(-2)! : null;

  const dims = getDims();
  const source = dims.sources.find((d) => d.source_code === s.source);
  const sourceName = source?.source_name ?? s.source;
  const candor = getCandor().blocks[s.source];

  const publishedUnit = latest ? (published(latest, s)?.unit ?? s.unit) : s.unit;
  const origLabel = unitLabel(publishedUnit);
  const isTonNative = publishedUnit === "ton";

  // Median of original ÷ per-ton across this series' own rows. Individual
  // rows are stored rounded, so a single row's ratio drifts; the median
  // identifies which of dims.units' factors actually produced these numbers.
  const ratios = rows
    .filter((r) => r.o != null && r.t)
    .map((r) => r.o! / r.t!)
    .sort((a, b) => a - b);
  const observedRatio = ratios.length ? ratios[Math.floor(ratios.length / 2)] : null;
  const conversion = isTonNative ? null : resolveConversion(publishedUnit, observedRatio);

  const tonSeries: ChartSeries = {
    id: `${id}-ton`,
    label: `${s.region_name} · ${s.species_name} ${s.product_name.toLowerCase()}`,
    colorVar: "var(--viz-series-1)",
    points: toPoints(rows, "ton"),
  };
  const origPoints = isTonNative ? [] : toPoints(rows, "orig");
  const origSeries: ChartSeries | null =
    origPoints.length > 0 ? { ...tonSeries, id: `${id}-orig`, points: origPoints } : null;

  const latestPublished = latest ? published(latest, s) : null;
  const states = seriesStates(s);
  const anyBand = rows.some((r) => r.ol != null || r.tl != null);
  const anyEstimated = rows.some((r) => r.e === 1);

  // Trend is stated, never interpreted (invariant 1's corollary: no
  // "now is a good time to sell"). Percentage change is unit-invariant, so it
  // is computed on whatever basis both endpoints share.
  const basis = (r: PriceRow) => (r.o != null ? r.o : r.t) ?? null;
  const sincePrevious =
    previous && latest && basis(previous) != null && basis(latest) != null
      ? pctChange(basis(previous)!, basis(latest)!)
      : null;
  const sinceStart =
    earliest && latest && earliest !== latest && basis(earliest) != null && basis(latest) != null
      ? pctChange(basis(earliest)!, basis(latest)!)
      : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-1 text-sm text-muted-foreground">
        <Link href="/sources" className="underline underline-offset-2">
          Sources
        </Link>{" "}
        /{" "}
        <Link
          href={`/sources/${s.source}`}
          className="underline underline-offset-2"
        >
          {sourceName}
        </Link>{" "}
        /
      </div>
      <h1 className="text-2xl font-bold tracking-tight">
        {s.species_name} {s.product_name.toLowerCase()}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{s.region_name}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Tag>{marketLabel(s.market)}</Tag>
        <Tag>{ownershipLabel(s.ownership)}</Tag>
        <Tag>{regionTypeLabel(s.region_type)}</Tag>
        <Tag>{origLabel}</Tag>
      </div>

      {/* The three registers of invariant 4. All three are always present —
          at n=1 the trend register says so rather than disappearing. */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Register label="Most recent figure">
          {latestPublished ? (
            <>
              <div className="mt-2 text-2xl font-semibold tabular-nums">
                {fmtUsd(latestPublished.value)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {unitLabel(latestPublished.unit).replace("$/", "/")}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                {fmtPeriod(latest!.y, latest!.q ?? null)}
              </p>
              {!isTonNative && latest?.t != null && (
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                  {fmtUsd(latest.t)}/green ton harmonized
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No priced observation in this series.
            </p>
          )}
        </Register>

        <Register label="Movement">
          {priced.length < 2 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              A single observation. There is no movement to report — the figure
              above is the whole series.
            </p>
          ) : (
            <>
              <div className="mt-2 text-2xl font-semibold tabular-nums">
                {sincePrevious ?? "—"}
              </div>
              <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                since {fmtPeriod(previous!.y, previous!.q ?? null)}
              </p>
              {sinceStart && (
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                  {sinceStart} since {fmtPeriod(earliest!.y, earliest!.q ?? null)}
                </p>
              )}
            </>
          )}
        </Register>

        <Register label="Reach of record">
          <div className="mt-2 text-2xl font-semibold tabular-nums">
            {s.y0}–{s.y1}
          </div>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {s.n.toLocaleString()} observation{s.n === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {CADENCE_NOTE[s.cadence]}
          </p>
        </Register>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">The record</h2>
        <SeriesChart ton={tonSeries} orig={origSeries} origLabel={origLabel} />
      </section>

      {priced.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-1 text-lg font-semibold">Observations</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Every observation in the series, most recent first.
            {anyBand && (
              <>
                {" "}
                Where the source published a range, it is shown as reported —
                what drives the spread is the source&apos;s to say, not ours.
              </>
            )}
          </p>
          {/* Plain table markup for the same reason as Register/Tag above: at
              3,490 pages the shadcn Table's per-cell class strings dominate the
              export. The longest series here is 100 observations. */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="p-2 text-left font-medium">Period</th>
                  <th className="p-2 text-right font-medium">{origLabel}</th>
                  {anyBand && (
                    <th className="p-2 text-right font-medium">Range</th>
                  )}
                  {!isTonNative && (
                    <th className="p-2 text-right font-medium">$/green ton</th>
                  )}
                  {anyEstimated && (
                    <th className="p-2 text-left font-medium">Basis</th>
                  )}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {[...priced].reverse().map((r) => {
                  const p = published(r, s);
                  const lo = r.ol ?? (isTonNative ? r.tl : undefined);
                  const hi = r.oh ?? (isTonNative ? r.th : undefined);
                  return (
                    <tr key={`${r.y}-${r.q ?? 0}`} className="border-b last:border-0">
                      <td className="p-2">{fmtPeriod(r.y, r.q ?? null)}</td>
                      <td className="p-2 text-right">
                        {p ? fmtUsd(p.value) : "—"}
                      </td>
                      {anyBand && (
                        <td className="p-2 text-right text-muted-foreground">
                          {lo != null && hi != null
                            ? `${fmtUsd(lo)} – ${fmtUsd(hi)}`
                            : "—"}
                        </td>
                      )}
                      {!isTonNative && (
                        <td className="p-2 text-right text-muted-foreground">
                          {r.t != null ? fmtUsd(r.t) : "—"}
                        </td>
                      )}
                      {anyEstimated && (
                        <td className="p-2 text-xs text-muted-foreground">
                          {r.e === 1 ? "Estimated" : "Reported"}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Provenance</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Source</dt>
            <dd className="font-semibold">
              <Link
                href={`/sources/${s.source}`}
                className="underline underline-offset-2"
              >
                {sourceName}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Ownership basis</dt>
            <dd className="font-semibold">{ownershipLabel(s.ownership)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Geographic grain</dt>
            <dd className="font-semibold">{regionTypeLabel(s.region_type)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Published unit</dt>
            <dd className="font-semibold">{origLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Species group</dt>
            <dd className="font-semibold">{s.species_group}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Series id</dt>
            <dd className="font-mono text-xs break-all">{seriesId(s)}</dd>
          </div>
        </dl>

        {states.length > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Covers:</span>{" "}
            {states.map((st, i) => (
              <span key={st}>
                {i > 0 && ", "}
                <Link
                  href={`/states/${st.toLowerCase()}`}
                  className="underline underline-offset-2"
                >
                  {STATE_NAMES[st] ?? st}
                </Link>
              </span>
            ))}
            {!s.state && (
              <>
                {" "}
                — this series averages across those states, so it describes the
                region rather than any one of them.
              </>
            )}
          </p>
        )}
        {states.length === 0 && s.region_type === "national_forest" && (
          <p className="mt-4 text-sm text-muted-foreground">
            National-forest series are deliberately not attributed to states:
            the export carries no forest-to-state map, and spreading a forest
            across its whole USFS region would overstate what it covers.
          </p>
        )}

        {conversion && (
          <p className="mt-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              $/green ton conversion:
            </span>{" "}
            {conversion.tonsPerUnit} tons per {publishedUnit.startsWith("mbf") ? "MBF" : publishedUnit}
            , from {conversion.source}. The published figure above is the
            source&apos;s own; the harmonized one is derived.
          </p>
        )}
        {!isTonNative && !conversion && (
          <p className="mt-4 text-sm text-muted-foreground">
            The $/green ton figures are harmonized upstream, but this export
            does not document a single conversion factor for {origLabel} — see{" "}
            <Link href="/data" className="underline underline-offset-2">
              the data page
            </Link>
            . Prefer the published unit for anything citable.
          </p>
        )}

        {s.market === "delivered" && (
          <p className="mt-4 rounded-lg border border-dashed p-3 text-sm">
            These are <strong>delivered</strong> prices, measured at the mill.
            They are not comparable to stumpage prices for standing timber —
            the difference is harvest plus haul cost, not a better or worse
            market.
          </p>
        )}

        {SOURCE_NOTES[s.source] && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold">Method</h3>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              {SOURCE_NOTES[s.source].map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        )}

        {candor && (
          <div className="mt-4">
            <h3 className="mb-1 text-sm font-semibold">
              What this source can and cannot answer
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {candor.suitability_and_limitations.suitability_summary}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {candor.suitability_and_limitations.application_limitations.map(
                (lim) => (
                  <li key={lim.id} className="rounded-lg border p-3">
                    <p>{lim.statement}</p>
                    {lim.guard && (
                      <p className="mt-1">
                        <span className="font-semibold text-foreground">
                          Guard:
                        </span>{" "}
                        {lim.guard}
                      </p>
                    )}
                  </li>
                ),
              )}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Full candor block, known gaps and discouraged uses on the{" "}
              <Link
                href={`/sources/${s.source}`}
                className="underline underline-offset-2"
              >
                {sourceName}
              </Link>{" "}
              page.
            </p>
          </div>
        )}
      </section>

      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link
          href={`/explore?sel=${encodeURIComponent(seriesId(s))}`}
          className="rounded-md border px-3 py-1.5 hover:bg-accent"
        >
          Compare with other series →
        </Link>
        <Link
          href={`/sources/${s.source}`}
          className="rounded-md border px-3 py-1.5 hover:bg-accent"
        >
          About {sourceName}
        </Link>
      </div>
    </div>
  );
}
