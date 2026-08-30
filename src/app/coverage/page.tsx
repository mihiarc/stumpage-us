import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { asset } from "@/lib/asset";
import { getCoverage } from "@/lib/data";
import type { Evidence } from "@/lib/coverage-record";

export const metadata: Metadata = {
  title: "Coverage record",
  description:
    "Which US states have a public timber price report, how current it is, whose data it is — and which states we searched and found nothing in. Downloadable as JSON and CSV under CC BY 4.0.",
};

const EVIDENCE: Record<Evidence, { label: string; className: string }> = {
  "state-series": {
    label: "State series",
    className: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400",
  },
  "regional-only": {
    label: "Regional only",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  none: {
    label: "None",
    className: "bg-red-600/15 text-red-700 dark:text-red-400",
  },
};

function Stat({
  value,
  of,
  label,
  hint,
}: {
  value: number | string;
  of?: number;
  label: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-2xl font-bold tabular-nums">
        {value}
        {of !== undefined && (
          <span className="text-base font-normal text-muted-foreground">
            {" "}
            / {of}
          </span>
        )}
      </div>
      <div className="mt-0.5 text-sm font-medium">{label}</div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function CoveragePage() {
  const cov = getCoverage();
  const t = cov.totals;
  const noneKnown = cov.states.filter((s) => s.research.outcome === "none-known");
  const notSearched = cov.states.filter((s) => s.research.outcome === "not-searched");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Coverage record</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        The United States has no national timber price statistic. This page is
        the record of what exists instead: who publishes prices in each state,
        whether the report is still alive, whose data it actually is, and
        &mdash; where we looked and found nothing &mdash; what we checked before
        saying so. It is generated, versioned and downloadable, so it can be
        cited rather than re-derived.
      </p>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        <strong className="text-foreground">
          &ldquo;No source found&rdquo; and &ldquo;not yet searched&rdquo; are
          different claims
        </strong>{" "}
        and this record keeps them apart. A state with no entry in the{" "}
        <Link href="/directory" className="underline underline-offset-2">
          directory
        </Link>{" "}
        is not evidence that nothing is published there.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          value={t.with_live_independent_source}
          of={t.states}
          label="States with a usable price report"
          hint="Currently published, and the publisher's own data — not a licensed TimberMart-South reprint that cannot be redistributed."
        />
        <Stat
          value={t.with_live_source}
          of={t.states}
          label="States with any live report"
          hint="Includes TimberMart-South redistributions, commercial services and tax-assessed value schedules."
        />
        <Stat
          value={t.searched_none_known}
          of={t.states}
          label="Searched, nothing found"
          hint="A finding, not a blank: each names the agencies and extension programs checked."
        />
        <Stat
          value={t.evidence["state-series"]}
          of={t.states}
          label="States with a state-grain series"
          hint={`In the price dataset itself. ${t.evidence["regional-only"]} more are covered only by multi-state or USFS-region aggregates; ${t.evidence.none} by nothing at all.`}
        />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {t.directory_entries} catalogued reports across {t.with_any_entry}{" "}
        states, {t.price_series.toLocaleString()} price series and{" "}
        {t.price_observations.toLocaleString()} observations from{" "}
        {t.price_sources} ingested sources. Catalogue as of{" "}
        {cov.directory_as_of}; price data built {cov.prices_built_at.slice(0, 10)}.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">State by state</h2>
        <p className="mt-1 mb-3 max-w-3xl text-xs text-muted-foreground">
          <strong>Reports</strong> counts catalogued price reporting services and
          how many are currently published. <strong>Own data</strong> marks a
          state whose live report is the publisher&rsquo;s own survey or sale
          record rather than licensed data. <strong>Price evidence</strong> is a
          separate question &mdash; whether our dataset carries a series
          attributed to that state, only broader regional aggregates, or nothing.
        </p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Reports</TableHead>
                <TableHead>Own data</TableHead>
                <TableHead>Latest seen</TableHead>
                <TableHead>Price evidence</TableHead>
                <TableHead className="text-right">Series</TableHead>
                <TableHead className="text-right">Years</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cov.states.map((s) => {
                const live = s.directory.by_status.live;
                const latest = s.directory.sources
                  .map((x) => x.latest_known)
                  .filter(Boolean)
                  .sort()
                  .at(-1);
                const ev = EVIDENCE[s.prices.evidence];
                return (
                  <TableRow key={s.state}>
                    <TableCell className="font-medium whitespace-nowrap">
                      <Link
                        href={`/states/${s.state.toLowerCase()}`}
                        className="underline underline-offset-2"
                      >
                        {s.state_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.directory.entries === 0 ? (
                        <span
                          className="text-muted-foreground"
                          title={
                            s.research.outcome === "none-known"
                              ? "Searched; no public price report found"
                              : "Not yet searched"
                          }
                        >
                          {s.research.outcome === "none-known" ? "none" : "—"}
                        </span>
                      ) : (
                        <>
                          {live}
                          <span className="text-muted-foreground">
                            /{s.directory.entries}
                          </span>
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      {s.directory.has_live_independent ? (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          Yes
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                      {latest ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={ev.className}>
                        {ev.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.prices.series || "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                      {s.prices.year_min
                        ? `${s.prices.year_min}–${s.prices.year_max}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">
          Searched, and nothing published ({noneKnown.length})
        </h2>
        <p className="mt-1 mb-4 max-w-3xl text-sm text-muted-foreground">
          These are findings. Each one names what was checked, so the claim can
          be disputed on the evidence rather than taken on trust. Corrections are
          the most useful thing anyone can send us.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {noneKnown.map((s) => (
            <div key={s.state} className="rounded-lg border border-dashed p-4">
              <div className="flex items-baseline justify-between gap-2">
                <Link
                  href={`/states/${s.state.toLowerCase()}`}
                  className="font-medium underline underline-offset-2"
                >
                  {s.state_name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  searched {s.research.searched}
                </span>
              </div>
              {s.research.note && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {s.research.note}
                </p>
              )}
              {s.research.checked.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium">Checked:</span>{" "}
                  {s.research.checked.join(" · ")}
                </p>
              )}
            </div>
          ))}
        </div>
        {notSearched.length > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            <strong className="text-foreground">
              Not yet searched ({notSearched.length}):
            </strong>{" "}
            {notSearched.map((s) => s.state_name).join(", ")}. No claim is made
            about these.
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">National and international</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">
          Sources that are not state-specific, and so do not appear in the table
          above.
        </p>
        <div className="grid gap-3">
          {cov.national_and_international.map((e) => (
            <div key={`${e.org}${e.report}`} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <a
                    href={e.url}
                    className="font-medium underline underline-offset-2"
                  >
                    {e.report}
                    <ExternalLink className="ml-1 inline size-3.5 align-[-1px]" />
                  </a>
                  <div className="text-sm text-muted-foreground">{e.org}</div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <Badge variant="secondary">{e.scope}</Badge>
                  <Badge variant="secondary" title={cov.definitions.status[e.status]}>
                    {e.status}
                  </Badge>
                  {e.latest_known && (
                    <span className="text-muted-foreground">
                      latest {e.latest_known}
                    </span>
                  )}
                </div>
              </div>
              {e.notes && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {e.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Download and cite</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Version{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            {cov.version}
          </code>{" "}
          &mdash; derived from the catalogue sweep date and the upstream data
          build, so the same inputs always produce the same version.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <a
            href={asset("/coverage/coverage.json")}
            className="rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            coverage.json
          </a>
          <a
            href={asset("/coverage/coverage_by_state.csv")}
            className="rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            coverage_by_state.csv
          </a>
          <a
            href={asset("/coverage/directory.csv")}
            className="rounded-md border px-3 py-1.5 hover:bg-muted"
          >
            directory.csv
          </a>
        </div>
        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <p>
            Licensed under{" "}
            <a
              href={cov.license_url}
              className="text-foreground underline underline-offset-2"
            >
              CC&nbsp;BY&nbsp;4.0
            </a>
            . The record carries no price values &mdash; only metadata about who
            publishes them &mdash; so nothing in it is encumbered by the
            licensed services it catalogues. See{" "}
            <a
              href="https://github.com/mihiarc/stumpage-us/blob/main/LICENSE-DATA.md"
              className="text-foreground underline underline-offset-2"
            >
              LICENSE-DATA
            </a>{" "}
            and{" "}
            <a
              href="https://github.com/mihiarc/stumpage-us/blob/main/CITATION.cff"
              className="text-foreground underline underline-offset-2"
            >
              CITATION.cff
            </a>
            .
          </p>
          <p className="rounded-md border-l-2 border-muted-foreground/40 bg-muted/40 px-3 py-2 font-mono text-xs leading-relaxed">
            {cov.cite_as} Coverage record version {cov.version}.
          </p>
          <p>
            Cite the original publishing agency for any specific price. This
            record is a catalogue of who publishes, not a republication of what
            they publish.
          </p>
        </div>
      </section>
    </div>
  );
}
