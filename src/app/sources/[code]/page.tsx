import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCandor, getDims, getManifest, getSeriesIndex } from "@/lib/data";
import { asset } from "@/lib/asset";
import {
  fmtPeriod,
  fmtUsd,
  marketLabel,
  ownershipLabel,
  seriesHref,
  seriesId,
  unitLabel,
} from "@/lib/format";
import { regionTypeLabel } from "@/lib/geo";
import { SOURCE_LINKS } from "@/content/source-links";
import { SOURCE_NOTES } from "@/content/source-notes";

interface Params {
  code: string;
}

/**
 * How many series to list on a source page. usfs_cutsold has 2,554 and mi_dnr
 * 774, so the biggest two need a bound; the other four sources list in full.
 * Every series has a permalink regardless — this bounds the listing, not the
 * pages.
 */
const SERIES_LISTED = 100;

export function generateStaticParams(): Params[] {
  return getDims().sources.map((s) => ({ code: s.source_code }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { code } = await params;
  const src = getDims().sources.find((s) => s.source_code === code);
  return { title: src?.source_name ?? "Source" };
}

export default async function SourcePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { code } = await params;
  const src = getDims().sources.find((s) => s.source_code === code);
  if (!src) notFound();
  const m = getManifest().sources.find((s) => s.source_code === code);
  const series = getSeriesIndex().series.filter((s) => s.source === code);
  const candor = getCandor().blocks[code];
  const regionTypes = [...new Set(series.map((s) => s.region_type))];
  const speciesCount = new Set(series.map((s) => s.species)).size;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-1 text-sm text-muted-foreground">
        <Link href="/sources" className="underline underline-offset-2">
          Sources
        </Link>{" "}
        /
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{src.source_name}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {src.description}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Records</dt>
          <dd className="font-semibold tabular-nums">{m?.n.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Years</dt>
          <dd className="font-semibold tabular-nums">
            {m?.y0}–{m?.y1}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Species</dt>
          <dd className="font-semibold tabular-nums">{speciesCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Coverage</dt>
          <dd className="font-semibold">{src.geographic_coverage}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Ownership basis</dt>
          <dd className="font-semibold">
            {ownershipLabel(src.ownership_basis)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Geographic grains</dt>
          <dd className="font-semibold">
            {regionTypes.map(regionTypeLabel).join(", ")}
          </dd>
        </div>
      </dl>

      {series.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-1 text-lg font-semibold">Series</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            {series.length > SERIES_LISTED ? (
              <>
                The {SERIES_LISTED} most recently updated of{" "}
                {series.length.toLocaleString()} series from this source. The
                full record lives on the{" "}
                <Link href="/regions" className="underline underline-offset-2">
                  reporting region
                </Link>{" "}
                pages, which carry every series whether or not it is listed
                here.
              </>
            ) : (
              <>All {series.length} series from this source.</>
            )}
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Series</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Years</TableHead>
                  <TableHead className="text-right">Latest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...series]
                  .sort((a, b) => b.latest.y - a.latest.y || b.n - a.n)
                  .slice(0, SERIES_LISTED)
                  .map((s) => (
                    <TableRow key={seriesId(s)}>
                      <TableCell>
                        <Link
                          href={seriesHref(s)}
                          className="font-medium underline underline-offset-2"
                        >
                          {s.species_name} {s.product_name.toLowerCase()}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {s.region_name}
                        </div>
                      </TableCell>
                      <TableCell>{marketLabel(s.market)}</TableCell>
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
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {SOURCE_NOTES[code] && (
        <section className="mt-8">
          <h2 className="mb-2 text-lg font-semibold">Method & caveats</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {SOURCE_NOTES[code].map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}

      {candor && (
        <section className="mt-8">
          <h2 className="mb-1 text-lg font-semibold">Candor block</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Expert caveats in the five{" "}
            <a
              href="https://github.com/edtrochim/candid_core"
              className="underline underline-offset-2"
            >
              CANDID-core
            </a>{" "}
            categories, carried machine-readable in{" "}
            <a
              href={asset("/data/candor.json")}
              className="underline underline-offset-2"
            >
              candor.json
            </a>
            . Each limitation names a guard — the filter or handling that keeps
            the caveat from becoming an error.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {candor.suitability_and_limitations.suitability_summary}
          </p>
          <div className="mt-3 space-y-3">
            {candor.suitability_and_limitations.application_limitations.map(
              (lim) => (
                <div key={lim.id} className="rounded-lg border p-3 text-sm">
                  <div className="mb-1 font-mono text-xs text-muted-foreground">
                    {lim.id}
                  </div>
                  <p className="text-muted-foreground">{lim.statement}</p>
                  {lim.guard && (
                    <p className="mt-1">
                      <span className="font-semibold">Guard:</span>{" "}
                      <span className="text-muted-foreground">{lim.guard}</span>
                    </p>
                  )}
                </div>
              ),
            )}
          </div>
          {candor.suitability_and_limitations.known_gaps.length > 0 && (
            <div className="mt-4 text-sm">
              <h3 className="mb-1 font-semibold">Known gaps</h3>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {candor.suitability_and_limitations.known_gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          )}
          {candor.use_cases_and_target_users?.discouraged_uses && (
            <div className="mt-4 text-sm">
              <h3 className="mb-1 font-semibold">Discouraged uses</h3>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {candor.use_cases_and_target_users.discouraged_uses.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="sm">
          <Link href={`/explore?src=${code}`}>
            Explore this dataset <ArrowRight className="ml-1 size-4" />
          </Link>
        </Button>
        {SOURCE_LINKS[code] && (
          <Button asChild size="sm" variant="outline">
            <a href={SOURCE_LINKS[code].url}>Original source</a>
          </Button>
        )}
      </div>
    </div>
  );
}
