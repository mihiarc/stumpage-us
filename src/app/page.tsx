import Link from "next/link";
import { ArrowRight, Database, Map as MapIcon, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CoverageMap } from "@/components/coverage-map";
import { getManifest, getDims, getCoverage } from "@/lib/data";
import { getStateCoverage } from "@/lib/coverage";
import { SOURCE_LINKS } from "@/content/source-links";
import { SourceMark } from "@/components/source-mark";

export default function HomePage() {
  const manifest = getManifest();
  const dims = getDims();
  const coverage = getStateCoverage();
  const t = getCoverage().totals;
  const built = new Date(manifest.built_at);

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
        <div>
          <CoverageMap coverage={coverage} />
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Every price series covering each state — state-level, sub-state and
            multi-state (USFS region) series all count, so most states inherit
            their count from a USFS region. Click a state for its series.
          </p>
        </div>
      </section>

      <section className="border-t py-8">
        <div className="rounded-lg border bg-card p-5 md:p-6">
          <h2 className="text-base font-semibold">
            Where the record stands
          </h2>
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
