// The record, at the grain its publisher reports it.
//
// One page per region — 224 of them — carrying every series that region
// reports, each as an anchored section with the three registers of invariant 4
// and its full observation history. This is the historical register the
// explorer currently holds, and its deletion is waiting on this page.
//
// Why the region and not the series. A first cut gave every series its own
// route: 3,490 pages, a 518 MB export. The observations were only 6 MB of
// that — the rest was per-route scaffolding (Next writes nine files per route)
// and the same numbers serialized again as chart props for hydration. The
// region is both the cheaper grain and the more honest one: a series alone is
// not a place, and a reader who arrives at one wants the other assortments
// beside it. A series stays citable as `#species~product~market` on this page;
// build the URL with seriesHref, never by hand.
//
// A region is NOT a place. Region codes are the areas each source chose to
// report — 134 of the 224 are single national forests — and invariant 6 says
// not to dress a publisher's reporting area up as a market. Place resolution,
// where someone names their own geography and we answer from whatever covers
// it, is a separate layer over a swappable crosswalk (invariant 5, phase 3).
//
// Everything here renders without JavaScript, including the chart.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordChart } from "@/components/record-chart";
import { SOURCE_NOTES } from "@/content/source-notes";
import {
  getCandor,
  getDims,
  getRegionCodes,
  getSeriesByRegion,
  getSeriesRows,
  resolveConversion,
} from "@/lib/data";
import {
  fmtPeriod,
  fmtUsd,
  marketLabel,
  ownershipLabel,
  seriesAnchor,
  seriesId,
  unitLabel,
} from "@/lib/format";
import { regionTypeLabel, seriesStates, STATE_NAMES } from "@/lib/geo";
import type { PriceRow, Series } from "@/lib/types";

interface Params {
  code: string;
}

export function generateStaticParams(): Params[] {
  return getRegionCodes().map((code) => ({ code }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { code } = await params;
  const series = getSeriesByRegion(decodeURIComponent(code));
  if (series.length === 0) return { title: "Region" };
  const s = series[0];
  return {
    title: `${s.region_name} timber prices`,
    description:
      `${series.length} public timber price series for ${s.region_name} ` +
      `(${regionTypeLabel(s.region_type)}), ` +
      `${Math.min(...series.map((x) => x.y0))}–${Math.max(...series.map((x) => x.y1))}.`,
  };
}

/** The figure a source actually published, with the unit it published it in. */
function published(r: PriceRow, s: Series): { value: number; unit: string } | null {
  if (r.o != null) return { value: r.o, unit: r.u ?? s.unit };
  if (r.t != null) return { value: r.t, unit: "ton" };
  return null;
}

function pctChange(from: number, to: number): string | null {
  if (!from) return null;
  const p = ((to - from) / from) * 100;
  return `${p >= 0 ? "+" : ""}${Math.abs(p) >= 10 ? p.toFixed(0) : p.toFixed(1)}%`;
}

const CADENCE_NOTE: Record<Series["cadence"], string> = {
  annual: "annual",
  quarterly: "quarterly",
  mixed: "mixed annual and quarterly",
};

/**
 * Plain markup instead of the shadcn Card/Badge/Table primitives used
 * elsewhere. Those carry long variant class strings that a static export
 * serializes several times per page; on a page repeated 224 times and holding
 * up to 43 series each, that is real weight for styling this page never uses.
 * These render the same. Not a pattern to copy elsewhere in the repo.
 */
function Register({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function SeriesSection({ s }: { s: Series }) {
  const rows = getSeriesRows(s);
  const priced = rows.filter((r) => r.o != null || r.t != null);
  const latest = priced.at(-1) ?? null;
  const earliest = priced[0] ?? null;
  const previous = priced.length >= 2 ? priced.at(-2)! : null;

  const publishedUnit = latest ? (published(latest, s)?.unit ?? s.unit) : s.unit;
  const origLabel = unitLabel(publishedUnit);
  const isTonNative = publishedUnit === "ton";
  const latestPublished = latest ? published(latest, s) : null;

  const basis = (r: PriceRow) => (r.o != null ? r.o : r.t) ?? null;
  const sincePrevious =
    previous && latest && basis(previous) != null && basis(latest) != null
      ? pctChange(basis(previous)!, basis(latest)!)
      : null;
  const sinceStart =
    earliest && latest && earliest !== latest && basis(earliest) != null && basis(latest) != null
      ? pctChange(basis(earliest)!, basis(latest)!)
      : null;

  const anyBand = rows.some((r) => r.ol != null || r.tl != null);
  const anyEstimated = rows.some((r) => r.e === 1);

  return (
    <section id={seriesAnchor(s)} className="scroll-mt-4 border-t py-6">
      <h2 className="text-lg font-semibold">
        {s.species_name} {s.product_name.toLowerCase()}
      </h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {marketLabel(s.market)} · {origLabel} · {s.species_group}
      </p>

      {/* Invariant 4: current, movement, reach of record — all three always
          present. At n=1 movement says so rather than disappearing. There is
          no staleness threshold; every figure names its period instead. */}
      <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Register label="Most recent figure">
          {latestPublished ? (
            <>
              <span className="text-xl font-semibold tabular-nums">
                {fmtUsd(latestPublished.value)}
              </span>{" "}
              <span className="text-xs text-muted-foreground">
                {unitLabel(latestPublished.unit).replace("$/", "/")} ·{" "}
                {fmtPeriod(latest!.y, latest!.q ?? null)}
              </span>
              {!isTonNative && latest?.t != null && (
                <div className="text-xs text-muted-foreground tabular-nums">
                  {fmtUsd(latest.t)}/green ton harmonized
                </div>
              )}
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              No priced observation.
            </span>
          )}
        </Register>
        <Register label="Movement">
          {priced.length < 2 ? (
            <span className="text-sm text-muted-foreground">
              A single observation — nothing to compare it against.
            </span>
          ) : (
            <>
              <span className="text-xl font-semibold tabular-nums">
                {sincePrevious ?? "—"}
              </span>{" "}
              <span className="text-xs text-muted-foreground tabular-nums">
                since {fmtPeriod(previous!.y, previous!.q ?? null)}
              </span>
              {sinceStart && (
                <div className="text-xs text-muted-foreground tabular-nums">
                  {sinceStart} since {fmtPeriod(earliest!.y, earliest!.q ?? null)}
                </div>
              )}
            </>
          )}
        </Register>
        <Register label="Reach of record">
          <span className="text-xl font-semibold tabular-nums">
            {s.y0}–{s.y1}
          </span>{" "}
          <span className="text-xs text-muted-foreground tabular-nums">
            {s.n.toLocaleString()} obs · {CADENCE_NOTE[s.cadence]}
          </span>
        </Register>
      </dl>

      <RecordChart
        rows={priced}
        mode={isTonNative ? "ton" : "orig"}
        caption={`${s.species_name} ${s.product_name.toLowerCase()} in ${s.region_name}, ${origLabel}, ${s.y0} to ${s.y1}`}
      />

      {priced.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            All {priced.length.toLocaleString()} observation
            {priced.length === 1 ? "" : "s"}
          </summary>
          <div className="mt-2 overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="p-2 text-left font-medium">Period</th>
                  <th className="p-2 text-right font-medium">{origLabel}</th>
                  {anyBand && <th className="p-2 text-right font-medium">Range</th>}
                  {!isTonNative && (
                    <th className="p-2 text-right font-medium">$/green ton</th>
                  )}
                  {anyEstimated && <th className="p-2 text-left font-medium">Basis</th>}
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
                      <td className="p-2 text-right">{p ? fmtUsd(p.value) : "—"}</td>
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
        </details>
      )}
      <p className="mt-2 font-mono text-xs break-all text-muted-foreground">
        {seriesId(s)}
      </p>
    </section>
  );
}

export default async function RegionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { code } = await params;
  const region = decodeURIComponent(code);
  const series = getSeriesByRegion(region);
  if (series.length === 0) notFound();

  // Region codes are globally unique, so one region means one source and the
  // provenance below covers every series on the page.
  const s0 = series[0];
  const source = getDims().sources.find((d) => d.source_code === s0.source);
  const sourceName = source?.source_name ?? s0.source;
  const candor = getCandor().blocks[s0.source];
  const states = seriesStates(s0);

  const ordered = [...series].sort(
    (a, b) =>
      a.product_name.localeCompare(b.product_name) ||
      a.species_name.localeCompare(b.species_name) ||
      a.market.localeCompare(b.market),
  );

  const observations = series.reduce((n, x) => n + x.n, 0);
  const y0 = Math.min(...series.map((x) => x.y0));
  const y1 = Math.max(...series.map((x) => x.y1));

  // One conversion note per distinct published unit on the page.
  const units = [...new Set(series.map((x) => x.unit))].filter((u) => u !== "ton");
  const conversions = units
    .map((u) => {
      const rows = series
        .filter((x) => x.unit === u)
        .flatMap((x) => getSeriesRows(x))
        .filter((r) => r.o != null && r.t);
      const ratios = rows.map((r) => r.o! / r.t!).sort((a, b) => a - b);
      const median = ratios.length ? ratios[Math.floor(ratios.length / 2)] : null;
      return { unit: u, conversion: resolveConversion(u, median) };
    })
    .filter((c) => c.conversion);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-1 text-sm text-muted-foreground">
        <Link href="/regions" className="underline underline-offset-2">
          Regions
        </Link>{" "}
        /{" "}
        <Link href={`/sources/${s0.source}`} className="underline underline-offset-2">
          {sourceName}
        </Link>{" "}
        /
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{s0.region_name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {regionTypeLabel(s0.region_type)} · {ownershipLabel(s0.ownership)}
      </p>
      <p className="mt-3 text-sm text-muted-foreground tabular-nums">
        {series.length.toLocaleString()} series ·{" "}
        {observations.toLocaleString()} observations · {y0}–{y1}
      </p>

      {states.length > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          {s0.state ? "In" : "Averages across"}{" "}
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
          {!s0.state && " — it describes the region, not any one of them."}
        </p>
      )}
      {states.length === 0 && s0.region_type === "national_forest" && (
        <p className="mt-2 text-sm text-muted-foreground">
          National-forest series are deliberately not attributed to states: the
          export carries no forest-to-state map, and spreading a forest across
          its whole USFS region would overstate what it covers.
        </p>
      )}

      <div className="mt-6">
        {ordered.map((s) => (
          <SeriesSection key={seriesId(s)} s={s} />
        ))}
      </div>

      <section className="mt-8 border-t pt-6">
        <h2 className="mb-3 text-lg font-semibold">Provenance</h2>
        <p className="text-sm text-muted-foreground">
          Every series above comes from{" "}
          <Link
            href={`/sources/${s0.source}`}
            className="underline underline-offset-2"
          >
            {sourceName}
          </Link>
          , on a {ownershipLabel(s0.ownership).toLowerCase()} basis.
        </p>

        {conversions.map(({ unit, conversion }) => (
          <p key={unit} className="mt-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {unitLabel(unit)} → $/green ton:
            </span>{" "}
            {conversion!.tonsPerUnit} tons per {unit.startsWith("mbf") ? "MBF" : unit},
            from {conversion!.source}. Published figures are the source&apos;s own;
            harmonized ones are derived.
          </p>
        ))}

        {series.some((x) => x.market === "delivered") && (
          <p className="mt-3 rounded-lg border border-dashed p-3 text-sm">
            Series marked <strong>delivered</strong> are measured at the mill and
            are not comparable to stumpage prices for standing timber — the
            difference is harvest plus haul cost, not a better or worse market.
          </p>
        )}

        {SOURCE_NOTES[s0.source] && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold">Method</h3>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              {SOURCE_NOTES[s0.source].map((n) => (
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
                        <span className="font-semibold text-foreground">Guard:</span>{" "}
                        {lim.guard}
                      </p>
                    )}
                  </li>
                ),
              )}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Known gaps and discouraged uses on the{" "}
              <Link
                href={`/sources/${s0.source}`}
                className="underline underline-offset-2"
              >
                {sourceName}
              </Link>{" "}
              page.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
