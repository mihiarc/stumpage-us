import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DirectoryEntry } from "@/content/directory";

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400" },
  stale: { label: "Stale", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  dead: { label: "Discontinued", className: "bg-red-600/15 text-red-700 dark:text-red-400" },
  paywalled: { label: "Paywalled", className: "bg-muted text-muted-foreground" },
  unverified: { label: "Unverified", className: "bg-muted text-muted-foreground" },
};

const PROVENANCE_STYLE: Record<string, { label: string; title: string; className: string }> = {
  independent: {
    label: "Independent data",
    title: "The publisher collects its own survey or sale data — genuinely public.",
    className: "bg-sky-600/15 text-sky-700 dark:text-sky-400",
  },
  tms: {
    label: "TimberMart-South redistribution",
    title:
      "Free to read, but the values are licensed TimberMart-South survey data — copyrighted, not public data.",
    className: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  },
  commercial: {
    label: "Commercial",
    title: "Paid subscription service.",
    className: "bg-muted text-muted-foreground",
  },
  tax: {
    label: "Tax-assessed values",
    title: "Administrative or tax-guidance values — not market transactions.",
    className: "bg-violet-600/15 text-violet-700 dark:text-violet-400",
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
          {entry.inDataset && (
            <Badge variant="secondary" className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400">
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
