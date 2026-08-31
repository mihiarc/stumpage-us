import Link from "next/link";
import { ArrowRight, Database, Map as MapIcon, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getManifest, getDims, getCoverage, getSeriesIndex } from "@/lib/data";
import { regionTypeLabel } from "@/lib/geo";
import { SOURCE_LINKS } from "@/content/source-links";
import { SourceMark } from "@/components/source-mark";

export default function HomePage() {
  const manifest = getManifest();
  const dims = getDims();
  const t = getCoverage().totals;
  const built = new Date(manifest.built_at);

  // The record described at the grain each source actually reports at, rather
  // than re-cut to a boundary nobody published against. This is the honest
  // answer to "where is the data": at forests and management units, hardly ever
  // at a state.
  const byGrain = new Map<string, { regions: Set<string>; n: number }>();
  for (const series of getSeriesIndex().series) {
    const g = byGrain.get(series.region_type) ?? { regions: new Set(), n: 0 };
    g.regions.add(series.region);
    g.n += 1;
    byGrain.set(series.region_type, g);
  }
  const grains = [...byGrain.entries()]
    .map(([type, g]) => ({
      type,
      label: regionTypeLabel(type),
      regions: g.regions.size,
      n: g.n,
    }))
    .sort((a, b) => b.n - a.n);
  const widest = grains[0].n;
  const stateGrained =
    (byGrain.get("state_avg")?.n ?? 0) + (byGrain.get("statewide")?.n ?? 0);

  // The finding, counted in states. Each is a share of the same 50, so the bars
  // are comparable to each other — which is the point: the reader should see
  // that "has its own series" is a much shorter bar than a whole blue map
  // suggests.
  const coverageBars = [
    {
      eyebrow: "Live, independent report",
      value: t.with_live_independent_source,
      note: "Publisher collects its own data and the report is still alive",
    },
    {
      eyebrow: "Own state-level series",
      value: t.evidence["state-series"],
      note: "The rest are covered only as part of a multi-state region",
    },
    {
      eyebrow: "No public source found",
      value: t.searched_none_known,
      note: "Searched, with no known price report of any kind",
    },
  ];

  const stats = [
    { label: "Price records", value: manifest.row_count.toLocaleString() },
    { label: "Price series", value: manifest.series_count.toLocaleString() },
    { label: "Public datasets", value: String(manifest.sources.length) },
    {
      label: "Years covered",
      value: `${Math.min(...manifest.sources.map((s) => s.y0))}–${Math.max(...manifest.sources.map((s) => s.y1))}`,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="grid items-start gap-8 py-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10 md:py-16">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Every public US timber price series we can find
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Stumpage and delivered log prices from federal cut-and-sold
            reports, state timber-sale auctions, and university surveys —
            harmonized into one free dataset, every record carrying its source
            and published unit. Plus a state-by-state record of who reports
            prices, and where no one does.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/explore">
                Explore prices <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/data">Download the data</Link>
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Or{" "}
            <Link
              href="/directory"
              className="text-foreground underline underline-offset-2"
            >
              find a price report for your state
            </Link>
            .
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 md:p-5">
          <h2 className="text-sm font-semibold">
            Where the record lives
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Every series, counted at the geography its publisher chose. Each row
            is a reporting grain, not a place.
          </p>
          <ul className="mt-4 space-y-2.5">
            {grains.map((g) => (
              <li key={g.type}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="truncate font-medium">{g.label}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {g.regions} {g.regions === 1 ? "region" : "regions"} ·{" "}
                    <span className="font-medium text-foreground">
                      {g.n.toLocaleString()}
                    </span>
                  </span>
                </div>
                <div
                  aria-hidden
                  className="mt-1 h-1 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(0.8, (g.n / widest) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
            Only {stateGrained} of the{" "}
            {manifest.series_count.toLocaleString()}{" "}series are reported at state
            grain, which is why there is no national price map here yet: drawing
            one means assigning a forest&rsquo;s price to a boundary nobody
            published it against. Browse by{" "}
            <Link
              href="/regions"
              className="text-foreground underline underline-offset-2"
            >
              reporting region
            </Link>{" "}
            or by{" "}
            <Link
              href="/states"
              className="text-foreground underline underline-offset-2"
            >
              state
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="border-t py-8">
        <div className="rounded-lg border bg-card p-5 md:p-6">
          <h2 className="text-base font-semibold">What the search found</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            All {t.states} states searched. Every bar below is a share of the
            same {t.states}, so they can be read against each other.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {coverageBars.map((b) => {
              const pct = Math.round((b.value / t.states) * 100);
              return (
                <div
                  key={b.eyebrow}
                  className="rounded-md border bg-background/60 p-4"
                >
                  <div className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                    {b.eyebrow}
                  </div>
                  <div className="mt-1.5 text-3xl font-semibold tabular-nums md:text-4xl">
                    {b.value}
                  </div>
                  <div
                    aria-hidden
                    className="mt-3 h-1 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                    <span>{pct}% of states</span>
                    <span className="tabular-nums">
                      {b.value} / {t.states}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {b.note}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-4 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
            {t.directory_entries_by_provenance.tms} of the{" "}
            {t.directory_entries} catalogued reports are free to read but{" "}
            redistribute licensed TimberMart-South data, which is why &ldquo;a
            report exists&rdquo; and &ldquo;the numbers are public&rdquo; are
            counted separately here. The{" "}
            <Link
              href="/coverage"
              className="text-foreground underline underline-offset-2"
            >
              coverage record
            </Link>{" "}
            has the state-by-state detail.
          </p>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dd className="text-2xl font-semibold tabular-nums md:text-3xl">
                {s.value}
              </dd>
              <dt className="text-sm text-muted-foreground">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="py-8">
        <h2 className="mb-4 text-xl font-semibold">The datasets</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {dims.sources.map((src) => {
            const m = manifest.sources.find((s) => s.source_code === src.source_code);
            return (
              <Card key={src.source_code}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <SourceMark code={src.source_code} />
                    {src.source_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p className="line-clamp-3">{src.description}</p>
                  <p className="tabular-nums">
                    {m?.n.toLocaleString()} records · {m?.y0}–{m?.y1} ·{" "}
                    {src.geographic_coverage}
                  </p>
                  <div className="flex gap-3 pt-1">
                    <Link
                      href={`/sources/${src.source_code}`}
                      className="inline-flex items-center gap-1 text-foreground underline underline-offset-2"
                    >
                      <ScrollText className="size-3.5" /> Details
                    </Link>
                    {SOURCE_LINKS[src.source_code] && (
                      <a
                        href={SOURCE_LINKS[src.source_code].url}
                        className="inline-flex items-center gap-1 text-foreground underline underline-offset-2"
                      >
                        <Database className="size-3.5" /> Original source
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="py-8">
        <Card>
          <CardContent className="flex flex-col gap-3 pt-4 text-sm text-muted-foreground md:flex-row md:items-center">
            <MapIcon className="size-5 shrink-0 text-muted-foreground" />
            <p>
              Looking for prices in a state we don&apos;t have data for yet? The{" "}
              <Link href="/directory" className="underline underline-offset-2 text-foreground">
                directory
              </Link>{" "}
              catalogs every state&apos;s price reporting service — including which
              &ldquo;free&rdquo; reports are actually licensed TimberMart-South
              redistributions — so you can go straight to the original publisher.
            </p>
          </CardContent>
        </Card>
        <p className="mt-6 text-xs text-muted-foreground">
          Data build: {built.toISOString().slice(0, 10)} · every record carries
          its original source, unit, and conversion citation.
        </p>
      </section>
    </div>
  );
}
