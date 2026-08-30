"use client";

// The chart half of a series page. Both unit renderings are computed at build
// time and handed over as props — this component only chooses between them, so
// the page stays on the build-time data path and never fetches a price chunk.
//
// ROADMAP invariant 3: a series page is the most local view there is, so it
// leads with the unit the source published and keeps $/ton one click away,
// with the conversion disclosed underneath by the page.
import { useState } from "react";
import { PriceChart, type ChartSeries } from "@/components/price-chart";

// Plain buttons rather than the shadcn Button: this renders on all 3,490
// series pages, and that component's variant class strings are a measurable
// share of the static export at that page count. See the note in
// src/app/series/[id]/page.tsx.
const TOGGLE = "rounded-md px-2.5 py-1 text-xs font-medium transition-colors";
const ON = `${TOGGLE} bg-secondary text-secondary-foreground`;
const OFF = `${TOGGLE} text-muted-foreground hover:bg-accent`;

interface SeriesChartProps {
  ton: ChartSeries;
  /** Null when the published unit already is $/green ton — nothing to toggle. */
  orig: ChartSeries | null;
  origLabel: string;
  height?: number;
}

export function SeriesChart({ ton, orig, origLabel, height }: SeriesChartProps) {
  const [mode, setMode] = useState<"orig" | "ton">(orig ? "orig" : "ton");
  const showing = mode === "orig" && orig ? orig : ton;
  const yLabel = mode === "orig" && orig ? origLabel : "$/green ton";

  return (
    <div>
      {orig && (
        <div className="mb-2 flex items-center gap-1">
          <button
            type="button"
            className={mode === "orig" ? ON : OFF}
            onClick={() => setMode("orig")}
            title={`Chart in the unit this source publishes (${origLabel})`}
          >
            {origLabel}
          </button>
          <button
            type="button"
            className={mode === "ton" ? ON : OFF}
            onClick={() => setMode("ton")}
            title="Chart harmonized to $/green ton"
          >
            $/green ton
          </button>
        </div>
      )}
      <PriceChart series={[showing]} yLabel={yLabel} height={height} />
    </div>
  );
}
