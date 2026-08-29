import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getManifest } from "@/lib/data";
import { asset } from "@/lib/asset";

export const metadata: Metadata = {
  title: "Download the data",
  description:
    "Bulk download of the full public timber price dataset (Parquet and CSV), with data dictionary.",
};

const COLUMNS: [string, string][] = [
  ["price_id", "Stable hash of the natural key (source, period, region, species, product, market, unit)."],
  ["year, quarter", "Calendar period; quarter is empty for annual-cadence rows."],
  ["state_code / state_name", "Set only when the region maps to a single state; empty for USFS-region, national-forest, and multi-state grains."],
  ["region_code / region_name / region_type", "The price region and its grain (state_avg, management_unit, district, usfs_region, national_forest, …). Nested grains overlap — filter to ONE region_type before aggregating."],
  ["species_code / species_name / species_group", "Species or species aggregate; group is softwood/hardwood/mixed."],
  ["product_code / timber_class / end_market", "Product (sawtimber, pulpwood, veneer logs) and its predominant end market."],
  ["market_type", "stumpage (standing timber) or delivered (at the mill) — never average the two."],
  ["price_basis", "observed_stumpage or observed_delivered; no modeled values in this export."],
  ["original_price / original_unit", "The price exactly as published, in its native unit ($/ton, $/MBF by log rule, $/cord). MBF units are log-rule and region explicit."],
  ["lo_price / hi_price", "Published or realized low/high range, where available."],
  ["price_per_ton (+ lo/hi)", "Harmonized $ per green ton using USFS GTR-SRS-251 conversion factors."],
  ["tons_per_unit / conversion_source", "The conversion factor applied and its exact citation."],
  ["is_estimated", "True for interpolated/estimated values."],
  ["source_code / source_name / ownership_basis", "The publishing dataset and whose timber the price describes (federal sale, state sale, private survey)."],
];

export default function DataPage() {
  const manifest = getManifest();
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Download the data</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        The complete public dataset — {manifest.row_count.toLocaleString()}{" "}
        price records, {manifest.series_count.toLocaleString()} series — free to
        use with attribution to the original sources. Built{" "}
        {manifest.built_at.slice(0, 10)}; refreshed as the source agencies
        publish.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parquet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Columnar, typed, compact (~1.5&nbsp;MB). Opens directly in DuckDB,
              pandas, polars, R (arrow).
            </p>
            <Button asChild size="sm">
              <a href={asset("/data/public_prices.parquet")} download>
                <Download className="mr-1 size-4" /> public_prices.parquet
              </a>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CSV (gzip)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Plain text for spreadsheets and everything else (~2&nbsp;MB
              compressed).
            </p>
            <Button asChild size="sm">
              <a href={asset("/data/public_prices.csv.gz")} download>
                <Download className="mr-1 size-4" /> public_prices.csv.gz
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <a
          href={asset("/data/data_dictionary.md")}
          className="inline-flex items-center gap-1 underline underline-offset-2"
        >
          <FileText className="size-4" /> Full data dictionary (markdown)
        </a>
        <a
          href={asset("/data/manifest.json")}
          className="inline-flex items-center gap-1 underline underline-offset-2"
        >
          <FileText className="size-4" /> Build manifest (JSON)
        </a>
        <a
          href={asset("/data/candor.json")}
          className="inline-flex items-center gap-1 underline underline-offset-2"
        >
          <FileText className="size-4" /> Candor blocks — machine-readable
          caveats (JSON)
        </a>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Columns</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <tbody>
              {COLUMNS.map(([col, desc]) => (
                <tr key={col} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 align-top font-mono text-xs">
                    {col}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">
          Terms & attribution
        </h2>
        <p>
          The compiled dataset is licensed under{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            className="underline underline-offset-2 text-foreground"
          >
            CC&nbsp;BY&nbsp;4.0
          </a>
          {" "}— free to share and adapt with attribution. See{" "}
          <a
            href="https://github.com/mihiarc/stumpage-us/blob/main/LICENSE-DATA.md"
            className="underline underline-offset-2 text-foreground"
          >
            LICENSE-DATA
          </a>{" "}
          and{" "}
          <a
            href="https://github.com/mihiarc/stumpage-us/blob/main/CITATION.cff"
            className="underline underline-offset-2 text-foreground"
          >
            CITATION.cff
          </a>
          .
        </p>
        <p>{manifest.license_note}</p>
        <p>
          Suggested citation: cite the <em>original publishing agency</em> for
          any specific price (each row carries <code>source_name</code>), and
          this site for the harmonized compilation. Prices from federal sources
          are US-government public domain; state agency and university survey
          values are published facts, redistributed here with attribution.
        </p>
        <p>
          Read the per-source method notes under{" "}
          <Link href="/sources" className="underline underline-offset-2 text-foreground">
            Sources
          </Link>{" "}
          before combining datasets — grains overlap, some series are simple
          means, and delivered prices are not stumpage.
        </p>
      </section>
    </div>
  );
}
