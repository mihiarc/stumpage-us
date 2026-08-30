import Link from "next/link";
import { ArrowRight, Database, Map as MapIcon, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CoverageMap } from "@/components/coverage-map";
import { getManifest, getDims } from "@/lib/data";
import { getStateCoverage } from "@/lib/coverage";
import { SOURCE_LINKS } from "@/content/source-links";

export default function HomePage() {
  const manifest = getManifest();
  const dims = getDims();
  const coverage = getStateCoverage();
  const built = new Date(manifest.built_at);

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
      <section className="py-12 md:py-16">
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
          Every public US timber price series we can find
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Stumpage and delivered log prices from federal cut-and-sold reports,
          state timber-sale auctions, and university surveys — harmonized into
          one free, downloadable dataset, every record carrying its source and
          its published unit. Plus a state-by-state record of who reports
          timber prices, and where we looked and found no one.
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
          <Button asChild variant="ghost">
            <Link href="/directory">Find a price report for your state</Link>
          </Button>
        </div>
        <dl className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dd className="text-2xl font-semibold md:text-3xl">{s.value}</dd>
              <dt className="text-sm text-muted-foreground">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="py-8">
        <h2 className="mb-1 text-xl font-semibold">Where the data is</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Click a state to see every price series covering it — state-level,
          sub-state, and multi-state (USFS region) series all count.
        </p>
        <CoverageMap coverage={coverage} />
      </section>

      <section className="py-8">
        <h2 className="mb-4 text-xl font-semibold">The datasets</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {dims.sources.map((src) => {
            const m = manifest.sources.find((s) => s.source_code === src.source_code);
            return (
              <Card key={src.source_code}>
                <CardHeader>
                  <CardTitle className="text-base">{src.source_name}</CardTitle>
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
