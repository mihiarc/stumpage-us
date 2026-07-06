import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why this site exists, how the data is harmonized, and the caveats that matter.",
};

export default function AboutPage() {
  return (
    <div className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl px-4 py-8 prose-a:underline-offset-2">
      <h1>About this site</h1>
      <p>
        For years, the USDA Forest Service Southern Research Station maintained{" "}
        <a href="https://www.srs.fs.usda.gov/econ/timberprices/">
          Timber Price Information and Contacts
        </a>{" "}
        — the place landowners and researchers went to find out who reports
        timber prices in each state. That site is still online but no longer
        actively maintained: links rot, reports die, and new sources appear
        unnoticed.
      </p>
      <p>This site is a community-maintained successor with two goals:</p>
      <ul>
        <li>
          <strong>Keep the directory alive.</strong> The{" "}
          <Link href="/directory">directory</Link> re-verifies every known price
          reporting service and adds two flags the original never had: whether
          the report is still being published, and whose data it actually is
          (several &ldquo;free&rdquo; state reports are licensed
          TimberMart-South redistributions).
        </li>
        <li>
          <strong>Make the genuinely public data usable.</strong> Prices that
          are truly public — federal cut-and-sold reports, state timber-sale
          auctions, university surveys — are scattered across PDFs, web tables,
          and spreadsheets in incompatible units. We harmonize them into one{" "}
          <Link href="/data">downloadable dataset</Link> and an{" "}
          <Link href="/explore">interactive explorer</Link>.
        </li>
      </ul>

      <h2>How prices are harmonized</h2>
      <p>
        Every record keeps the price <em>exactly as published</em> (
        <code>original_price</code>, <code>original_unit</code>) and adds a
        harmonized <code>price_per_ton</code> using the green-weight conversion
        factors in{" "}
        <a href="https://research.fs.usda.gov/treesearch/59410">
          USFS GTR-SRS-251
        </a>{" "}
        (Winn et al. 2020). Board-foot prices are converted with{" "}
        <em>log-rule- and region-specific</em> factors — Scribner in the West,
        International ¼″ in the South and North — because the log rules measure
        volume differently and a single flat factor would introduce errors of
        40% or more. Each row cites the exact factor used (
        <code>conversion_source</code>).
      </p>

      <h2>Caveats that matter</h2>
      <ul>
        <li>
          <strong>Stumpage ≠ delivered.</strong> Stumpage is the price of
          standing timber; delivered prices are measured at the mill and include
          harvest and haul. <code>market_type</code> separates them — never
          average across it. (In Montana, where both are observed, the gap is
          roughly $40/ton.)
        </li>
        <li>
          <strong>Ownership matters.</strong> Federal timber-sale prices run
          systematically below private-market prices (Munn &amp; Rucker 1995,{" "}
          <em>Forest Science</em> 41(4): 823–840) — differences in sale size,
          road-building requirements, and timber quality. Every row carries{" "}
          <code>ownership_basis</code> so the difference is visible and can be
          controlled for.
        </li>
        <li>
          <strong>Geographic grains overlap.</strong> A Michigan management-unit
          series, the Michigan statewide series, and the USFS Eastern Region
          series all &ldquo;cover&rdquo; Michigan. Filter to one{" "}
          <code>region_type</code> before aggregating.
        </li>
        <li>
          <strong>Not everything is volume-weighted.</strong> Where a source
          publishes no volumes (Oregon ODF, Montana BBER), aggregated prices are
          simple means of sales. Per-source notes are on the{" "}
          <Link href="/sources">sources</Link> pages.
        </li>
        <li>
          <strong>These are market summaries, not appraisals.</strong> The value
          of any particular stand depends on species, quality, access, market
          conditions, and sale terms. For a real valuation, consult a
          professional forester — the directory lists where to start in each
          state.
        </li>
      </ul>

      <h2>What this site deliberately excludes</h2>
      <p>
        TimberMart-South and TimberMart-North are excellent commercial surveys
        — and their data is licensed, so it is excluded here by construction
        (and by automated test). Where a free state report merely redistributes
        TimberMart data, the directory links to it and labels it, but its
        numbers never enter this dataset.
      </p>

      <h2>Disclaimers</h2>
      <p>
        This site makes no representation as to the quality of work or business
        practices of any firm or service listed, and listing implies no
        endorsement. Price data is provided as-is, with provenance, for research
        and information; verify against the original source before relying on
        any specific value.
      </p>

      <h2>Corrections & contributions</h2>
      <p>
        Found a dead link, a new price report, or an error? Open an issue on
        the project repository or contact the maintainer. The directory only
        stays useful if it stays verified — exactly the maintenance the original
        site stopped getting.
      </p>
    </div>
  );
}
