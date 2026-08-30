// Index of the reporting regions the record is organized by.
//
// Named "regions" and not "places" deliberately (invariant 6): these are the
// areas each source chose to publish at — 134 of the 224 are a single national
// forest — not markets, wood baskets or price regions. Place resolution, where
// someone names their own geography, is a different layer.
import type { Metadata } from "next";
import Link from "next/link";
import { getDims, getRegionCodes, getSeriesByRegion } from "@/lib/data";
import { regionTypeLabel, STATE_NAMES, seriesStates } from "@/lib/geo";

export const metadata: Metadata = {
  title: "Reporting regions",
  description:
    "Every geographic area the public timber price sources report at, with the series and observation counts each carries.",
};

export default function RegionsPage() {
  const dims = getDims();
  const sourceName = (c: string) =>
    dims.sources.find((s) => s.source_code === c)?.source_name ?? c;

  const regions = getRegionCodes()
    .map((code) => {
      const series = getSeriesByRegion(code);
      return {
        code,
        series,
        name: series[0].region_name,
        source: series[0].source,
        type: series[0].region_type,
        states: seriesStates(series[0]),
        observations: series.reduce((n, s) => n + s.n, 0),
        y0: Math.min(...series.map((s) => s.y0)),
        y1: Math.max(...series.map((s) => s.y1)),
      };
    })
    .sort(
      (a, b) =>
        a.source.localeCompare(b.source) || a.name.localeCompare(b.name),
    );

  const bySource = new Map<string, typeof regions>();
  for (const r of regions) {
    const list = bySource.get(r.source) ?? [];
    list.push(r);
    bySource.set(r.source, list);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Reporting regions</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        The record is organized by the area each source publishes at. These are
        reporting regions, not markets — a national forest is a national forest,
        and a state average is a state average. Which of them describes the land
        you care about is a separate question, and one the{" "}
        <Link href="/states" className="underline underline-offset-2">
          state pages
        </Link>{" "}
        answer better.
      </p>
      <p className="mt-2 text-sm text-muted-foreground tabular-nums">
        {regions.length} regions ·{" "}
        {regions.reduce((n, r) => n + r.series.length, 0).toLocaleString()} series ·{" "}
        {regions.reduce((n, r) => n + r.observations, 0).toLocaleString()} observations
      </p>

      {[...bySource.entries()].map(([src, list]) => (
        <section key={src} className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">
            <Link
              href={`/sources/${src}`}
              className="underline underline-offset-2"
            >
              {sourceName(src)}
            </Link>{" "}
            <span className="text-sm font-normal text-muted-foreground tabular-nums">
              {list.length} region{list.length === 1 ? "" : "s"}
            </span>
          </h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="p-2 text-left font-medium">Region</th>
                  <th className="p-2 text-left font-medium">Grain</th>
                  <th className="p-2 text-right font-medium">Series</th>
                  <th className="p-2 text-right font-medium">Observations</th>
                  <th className="p-2 text-right font-medium">Years</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.code} className="border-b last:border-0">
                    <td className="p-2">
                      <Link
                        href={`/regions/${r.code}`}
                        className="underline underline-offset-2"
                      >
                        {r.name}
                      </Link>
                      {r.states.length > 0 && r.states.length <= 3 && (
                        <div className="text-xs text-muted-foreground">
                          {r.states.map((st) => STATE_NAMES[st] ?? st).join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {regionTypeLabel(r.type)}
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {r.series.length}
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {r.observations.toLocaleString()}
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {r.y0}–{r.y1}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
