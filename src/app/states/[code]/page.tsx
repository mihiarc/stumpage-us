import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DirectoryEntryCard } from "@/components/directory-entry";
import {
  directoryForState,
  entryVerified,
  researchForState,
} from "@/content/directory";
import { getCoveredStates, seriesForState } from "@/lib/coverage";
import { getDims } from "@/lib/data";
import { fmtPeriod, fmtUsd, unitLabel, MARKET_LABELS } from "@/lib/format";
import { REGION_TYPE_LABELS, STATE_NAMES } from "@/lib/geo";
import type { Series } from "@/lib/types";

interface Params {
  code: string;
}

export function generateStaticParams(): Params[] {
  // A page for every state with price coverage, a directory entry, or a
  // research record. The last case is the point: a state we searched and found
  // nothing in still gets a page, because "we looked, there is nothing" is an
  // answer and a 404 is not. /coverage links every state here.
  const covered = new Set(getCoveredStates());
  for (const st of Object.keys(STATE_NAMES)) {
    if (directoryForState(st).length > 0 || researchForState(st)) covered.add(st);
  }
  return [...covered].sort().map((code) => ({ code: code.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { code } = await params;
  const name = STATE_NAMES[code.toUpperCase()];
  return {
    title: name ? `${name} timber prices` : "State",
    description: `Public timber price series and price reporting services for ${name}.`,
  };
}

interface GroupSummary {
  source: string;
  region_type: string;
  count: number;
  regions: Set<string>;
  y0: number;
  y1: number;
}

function summarize(series: Series[]): GroupSummary[] {
  const groups = new Map<string, GroupSummary>();
  for (const s of series) {
    const key = `${s.source}|${s.region_type}`;
    const g =
      groups.get(key) ??
      ({
        source: s.source,
        region_type: s.region_type,
        count: 0,
        regions: new Set<string>(),
        y0: s.y0,
        y1: s.y1,
      } satisfies GroupSummary);
    g.count++;
    g.regions.add(s.region);
    g.y0 = Math.min(g.y0, s.y0);
    g.y1 = Math.max(g.y1, s.y1);
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

export default async function StatePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { code } = await params;
  const usps = code.toUpperCase();
  const name = STATE_NAMES[usps];
  if (!name) notFound();

  const dims = getDims();
  const sourceName = (c: string) =>
    dims.sources.find((s) => s.source_code === c)?.source_name ?? c;

  const all = seriesForState(usps);
  const direct = all.filter((s) => s.state === usps);
  const regional = all.filter((s) => s.state !== usps);
  const stateLevel = direct.filter(
    (s) => s.region_type === "state_avg" || s.region_type === "statewide",
  );
  const finer = direct.filter(
    (s) => s.region_type !== "state_avg" && s.region_type !== "statewide",
  );
  const entries = directoryForState(usps);
  const research = researchForState(usps);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-1 text-sm text-muted-foreground">
        <Link href="/states" className="underline underline-offset-2">
          States
        </Link>{" "}
        /
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
      <p className="mt-1 mb-6 max-w-3xl text-sm text-muted-foreground">
        {all.length > 0 ? (
          <>
            {all.length.toLocaleString()} public price series cover {name} —{" "}
            {direct.length.toLocaleString()} at state or sub-state level and{" "}
            {regional.length.toLocaleString()} via USFS-region or multi-state
            averages.
          </>
        ) : (
          <>
            No harmonized public price data covers {name} yet — see the price
            reporting services below.
          </>
        )}
      </p>
      {all.length > 0 && (
        <Button asChild size="sm" className="mb-8">
          <Link href={`/explore?st=${usps}`}>
            Explore all {name} series <ArrowRight className="ml-1 size-4" />
          </Link>
        </Button>
      )}

      {stateLevel.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">State-level series</h2>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Series</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Years</TableHead>
                  <TableHead className="text-right">Latest</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stateLevel
                  .sort((a, b) => b.latest.y - a.latest.y || b.n - a.n)
                  .slice(0, 30)
                  .map((s) => (
                    <TableRow key={`${s.source}${s.region}${s.species}${s.product}${s.market}`}>
                      <TableCell>
                        <div className="font-medium">
                          {s.species_name} {s.product_name.toLowerCase()}
                        </div>
                        <div className="text-xs text-muted-foreground">{s.region_name}</div>
                      </TableCell>
                      <TableCell>{MARKET_LABELS[s.market] ?? s.market}</TableCell>
                      <TableCell className="tabular-nums">
                        {s.y0}–{s.y1}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.latest.o != null && s.latest.u ? (
                          <>
                            {fmtUsd(s.latest.o)}{" "}
                            <span className="text-xs text-muted-foreground">
                              {unitLabel(s.latest.u).replace("$/", "/")} ·{" "}
                              {fmtPeriod(s.latest.y, s.latest.q)}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{sourceName(s.source)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {finer.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Finer-grain series</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {summarize(finer).map((g) => (
              <Card key={`${g.source}${g.region_type}`}>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {sourceName(g.source)} —{" "}
                    {REGION_TYPE_LABELS[g.region_type] ?? g.region_type}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p className="tabular-nums">
                    {g.count.toLocaleString()} series · {g.regions.size} areas ·{" "}
                    {g.y0}–{g.y1}
                  </p>
                  <Link
                    href={`/explore?st=${usps}&src=${g.source}&rt=${g.region_type}`}
                    className="mt-1 inline-block underline underline-offset-2 text-foreground"
                  >
                    Browse these series
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {regional.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-1 text-lg font-semibold">
            Regional series covering {name}
          </h2>
          <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
            These series average across several states (a USFS region or
            multi-state area), so they describe the broader region {name} sits
            in — not {name} alone.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {summarize(regional).map((g) => (
              <Card key={`${g.source}${g.region_type}`}>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {sourceName(g.source)} —{" "}
                    {REGION_TYPE_LABELS[g.region_type] ?? g.region_type}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p className="tabular-nums">
                    {g.count.toLocaleString()} series · {g.regions.size} regions ·{" "}
                    {g.y0}–{g.y1}
                  </p>
                  <Link
                    href={`/explore?st=${usps}&src=${g.source}&rt=${g.region_type}`}
                    className="mt-1 inline-block underline underline-offset-2 text-foreground"
                  >
                    Browse these series
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">
          Price reporting services for {name}
        </h2>
        {entries.length > 0 ? (
          <div className="grid gap-3">
            {entries.map((e) => (
              <DirectoryEntryCard key={`${e.org}${e.report}`} entry={e} />
            ))}
          </div>
        ) : research?.outcome === "none-known" ? (
          <div className="rounded-lg border border-dashed p-4">
            <p className="text-sm">
              We searched {name} on {research.searched} and found no public
              timber price reporting service.
            </p>
            {research.note && (
              <p className="mt-2 text-xs text-muted-foreground">
                {research.note}
              </p>
            )}
            {research.checked && research.checked.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium">Checked:</span>{" "}
                {research.checked.join(" · ")}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4">
            <p className="text-sm">
              We have not yet searched {name} for a price reporting service.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              This is a gap in our research, not a finding that none exists.
              Know of one? Corrections are welcome.
            </p>
          </div>
        )}
        {entries.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            Last checked{" "}
            {[...new Set(entries.map(entryVerified))].sort().reverse()[0]}.
          </p>
        )}
      </section>
    </div>
  );
}
