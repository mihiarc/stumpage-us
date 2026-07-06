import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDims, getManifest } from "@/lib/data";
import { OWNERSHIP_LABELS } from "@/lib/format";
import { SOURCE_LINKS } from "@/content/source-links";

export const metadata: Metadata = {
  title: "Data sources",
  description:
    "Provenance of every dataset behind the public timber price data.",
};

export default function SourcesPage() {
  const dims = getDims();
  const manifest = getManifest();
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Data sources</h1>
      <p className="mt-1 mb-6 max-w-3xl text-sm text-muted-foreground">
        Every record in the dataset comes from one of these public sources.
        &ldquo;Public&rdquo; here means data provenance, not just free access:
        each series is originally collected and published by the listed agency
        or institution, with no licensing restriction on reuse. Licensed
        commercial data (TimberMart-South/North) is excluded by construction.
      </p>
      <div className="grid gap-4">
        {dims.sources.map((src) => {
          const m = manifest.sources.find((s) => s.source_code === src.source_code);
          return (
            <Card key={src.source_code}>
              <CardHeader>
                <CardTitle className="text-base">
                  <Link
                    href={`/sources/${src.source_code}`}
                    className="underline underline-offset-2"
                  >
                    {src.source_name}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p className="tabular-nums">
                  {m?.n.toLocaleString()} records · {m?.y0}–{m?.y1} ·{" "}
                  {src.geographic_coverage} ·{" "}
                  {OWNERSHIP_LABELS[src.ownership_basis] ?? src.ownership_basis}
                </p>
                {SOURCE_LINKS[src.source_code] && (
                  <a
                    href={SOURCE_LINKS[src.source_code].url}
                    className="text-foreground underline underline-offset-2"
                  >
                    {SOURCE_LINKS[src.source_code].label}
                  </a>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
