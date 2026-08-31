import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DirectoryEntry } from "@/content/directory";

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-status-live/15 text-status-live" },
  stale: { label: "Stale", className: "bg-status-stale/15 text-status-stale" },
  dead: { label: "Discontinued", className: "bg-status-dead/15 text-status-dead" },
  paywalled: { label: "Paywalled", className: "bg-muted text-muted-foreground" },
  unverified: { label: "Unverified", className: "bg-muted text-muted-foreground" },
};

const PROVENANCE_STYLE: Record<string, { label: string; title: string; className: string }> = {
  independent: {
    label: "Independent data",
    title: "The publisher collects its own survey or sale data — genuinely public.",
    className: "bg-status-independent/15 text-status-independent",
  },
  tms: {
    label: "TimberMart-South redistribution",
    title:
      "Free to read, but the values are licensed TimberMart-South survey data — copyrighted, not public data.",
    className: "bg-status-licensed/15 text-status-licensed",
  },
  commercial: {
    label: "Commercial",
    title: "Paid subscription service.",
    className: "bg-muted text-muted-foreground",
  },
  tax: {
    label: "Tax-assessed values",
    title: "Administrative or tax-guidance values — not market transactions.",
    className: "bg-status-tax/15 text-status-tax",
  },
  derived: {
    label: "Derived",
    title: "Derived from another listed source.",
    className: "bg-muted text-muted-foreground",
  },
};

export function DirectoryEntryCard({ entry }: { entry: DirectoryEntry }) {
  const status = STATUS_STYLE[entry.status];
  const prov = PROVENANCE_STYLE[entry.provenance];
  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <a
            href={entry.url}
            className="font-medium underline underline-offset-2 hover:text-foreground"
          >
            {entry.report}
            <ExternalLink className="ml-1 inline size-3.5 align-[-1px]" />
          </a>
          <div className="text-sm text-muted-foreground">{entry.org}</div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className={status.className}>
            {status.label}
          </Badge>
          <Badge variant="secondary" className={prov.className} title={prov.title}>
            {prov.label}
          </Badge>
          {/* identity green, not status-live: this is a fact about our own
              coverage, not about whether the publisher is still alive */}
          {entry.inDataset && (
            <Badge variant="secondary" className="bg-primary/12 text-primary">
              In our dataset
            </Badge>
          )}
        </div>
      </div>
      <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        {entry.frequency && (
          <div>
            <dt className="inline font-medium">Frequency: </dt>
            <dd className="inline">{entry.frequency}</dd>
          </div>
        )}
        {entry.units && (
          <div>
            <dt className="inline font-medium">Units: </dt>
            <dd className="inline">{entry.units}</dd>
          </div>
        )}
        {entry.latestKnown && (
          <div>
            <dt className="inline font-medium">Latest seen: </dt>
            <dd className="inline">{entry.latestKnown}</dd>
          </div>
        )}
      </dl>
      {entry.notes && (
        <p className="mt-2 text-xs text-muted-foreground">{entry.notes}</p>
      )}
    </div>
  );
}
