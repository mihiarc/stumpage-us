// A price line rendered entirely on the server. No "use client", no props
// crossing the boundary, no hydration.
//
// This is the cheap half of a lesson the per-series build taught: an
// observation cost ~2.4 KB in the static export, and almost none of that was
// the number itself. It was the same observation serialized again as a
// ChartPoint prop for a client chart, and again in the RSC segment files. A
// server-rendered SVG carries the path and nothing else — so the no-JS chart
// is *cheaper* than the interactive one, not a sacrifice made to afford it.
//
// The interactive chart (crosshair, tooltip, unit toggle) still exists in
// src/components/price-chart.tsx and is what the explorer uses. If it returns
// here it should fetch its points rather than have them baked in.
//
// Colors come from the --viz-* tokens like every other chart in the repo;
// never hardcode a hex.
import { fmtPeriod, fmtUsd, periodX } from "@/lib/format";
import type { PriceRow } from "@/lib/types";

const W = 640;
const H = 140;
const PAD = { top: 8, right: 8, bottom: 18, left: 46 };

interface RecordChartProps {
  rows: PriceRow[];
  /** "orig" plots the published unit, "ton" the harmonized figure. */
  mode: "orig" | "ton";
  /** Describes the line for screen readers and for JS-off users. */
  caption: string;
}

export function RecordChart({ rows, mode, caption }: RecordChartProps) {
  const pts: { x: number; y: number; lo?: number; hi?: number }[] = [];
  for (const r of rows) {
    const y = mode === "orig" ? r.o : r.t;
    if (y == null) continue;
    pts.push({
      x: periodX(r.y, r.q ?? null),
      y,
      lo: mode === "orig" ? r.ol : r.tl,
      hi: mode === "orig" ? r.oh : r.th,
    });
  }
  pts.sort((a, b) => a.x - b.x);
  if (pts.length === 0) return null;

  const xs = pts.map((p) => p.x);
  const ys = pts.flatMap((p) => [p.y, p.lo ?? p.y, p.hi ?? p.y]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  // y starts at 0, like every other chart here.
  const yMax = Math.max(...ys) * 1.06 || 1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const sx = (x: number) =>
    PAD.left + (x1 === x0 ? innerW / 2 : ((x - x0) / (x1 - x0)) * innerW);
  const sy = (y: number) => PAD.top + innerH - (y / yMax) * innerH;
  // Two decimals is plenty at this size and keeps the path string short —
  // path data is the only part of this SVG that grows with the record.
  const n = (v: number) => Math.round(v * 100) / 100;

  const line = pts.map((p, i) => `${i ? "L" : "M"}${n(sx(p.x))} ${n(sy(p.y))}`).join("");
  const banded = pts.filter((p) => p.lo != null && p.hi != null);
  const band =
    banded.length > 1
      ? banded.map((p, i) => `${i ? "L" : "M"}${n(sx(p.x))} ${n(sy(p.hi!))}`).join("") +
        banded
          .slice()
          .reverse()
          .map((p) => `L${n(sx(p.x))} ${n(sy(p.lo!))}`)
          .join("") +
        "Z"
      : null;

  const ticks = [0, yMax / 2, yMax];

  return (
    <figure className="my-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={caption}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={sy(t)}
              y2={sy(t)}
              stroke="var(--viz-grid)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={sy(t) + 3}
              textAnchor="end"
              fontSize={9}
              fill="var(--viz-ink-muted)"
            >
              {fmtUsd(t, 0)}
            </text>
          </g>
        ))}
        {/* The band is shown where the source reported one and left
            unexplained — invariant 8. */}
        {band && <path d={band} fill="var(--viz-series-1)" fillOpacity={0.12} />}
        <path
          d={line}
          fill="none"
          stroke="var(--viz-series-1)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* A one-observation series still needs a visible mark. */}
        {pts.length === 1 && (
          <circle cx={sx(pts[0].x)} cy={sy(pts[0].y)} r={3.5} fill="var(--viz-series-1)" />
        )}
        <text x={PAD.left} y={H - 5} fontSize={9} fill="var(--viz-ink-muted)">
          {fmtPeriod(rows[0].y, rows[0].q ?? null)}
        </text>
        <text
          x={W - PAD.right}
          y={H - 5}
          textAnchor="end"
          fontSize={9}
          fill="var(--viz-ink-muted)"
        >
          {fmtPeriod(rows[rows.length - 1].y, rows[rows.length - 1].q ?? null)}
        </text>
      </svg>
    </figure>
  );
}
