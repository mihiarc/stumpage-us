"use client";

// Time-series price chart (visx). Follows the dataviz method: 2px lines,
// crosshair tooltip listing every series at the snapped period, legend for
// >=2 series (none for one), labels in text tokens (never series color),
// hairline solid gridlines, y starts at 0.
import { useMemo } from "react";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { LinePath, AreaClosed } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { scaleLinear } from "@visx/scale";
import { localPoint } from "@visx/event";
import { useTooltip, TooltipWithBounds } from "@visx/tooltip";
import { ParentSize } from "@visx/responsive";
import { bisector, extent, max } from "d3-array";
import { fmtUsd, fmtPeriod } from "@/lib/format";

export interface ChartPoint {
  x: number; // decimal year
  y: number; // plotted value
  yLo?: number;
  yHi?: number;
  year: number;
  quarter: number | null;
  estimated?: boolean;
}

export interface ChartSeries {
  id: string;
  label: string;
  colorVar: string; // e.g. "var(--viz-series-1)"
  points: ChartPoint[]; // sorted by x
}

interface PriceChartProps {
  series: ChartSeries[];
  yLabel: string;
  height?: number;
}

const MARGIN = { top: 12, right: 16, bottom: 32, left: 56 };

interface TooltipData {
  x: number;
  rows: {
    id: string;
    label: string;
    colorVar: string;
    point: ChartPoint | null;
  }[];
}

const bisectX = bisector<ChartPoint, number>((p) => p.x).center;

function Chart({
  series,
  yLabel,
  width,
  height,
}: PriceChartProps & { width: number; height: number }) {
  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  } = useTooltip<TooltipData>();

  const innerW = Math.max(10, width - MARGIN.left - MARGIN.right);
  const innerH = Math.max(10, height - MARGIN.top - MARGIN.bottom);

  const allPoints = useMemo(() => series.flatMap((s) => s.points), [series]);

  const xScale = useMemo(() => {
    const [x0, x1] = extent(allPoints, (p) => p.x) as [number, number];
    const pad = x0 === x1 ? 0.5 : 0;
    return scaleLinear<number>({
      domain: [x0 - pad, x1 + pad],
      range: [0, innerW],
    });
  }, [allPoints, innerW]);

  const yScale = useMemo(() => {
    const yMax = max(allPoints, (p) => p.yHi ?? p.y) ?? 1;
    return scaleLinear<number>({
      domain: [0, yMax * 1.06],
      range: [innerH, 0],
      nice: true,
    });
  }, [allPoints, innerH]);

  function handleMove(event: React.PointerEvent<SVGRectElement>) {
    const pt = localPoint(event);
    if (!pt) return;
    const x = xScale.invert(pt.x - MARGIN.left);
    // snap to the nearest data x across all series
    let snapX: number | null = null;
    let best = Infinity;
    for (const s of series) {
      const i = bisectX(s.points, x);
      const p = s.points[i];
      if (p && Math.abs(p.x - x) < best) {
        best = Math.abs(p.x - x);
        snapX = p.x;
      }
    }
    if (snapX == null) return;
    const rows = series.map((s) => {
      const p = s.points.find((q) => Math.abs(q.x - snapX!) < 1e-6) ?? null;
      return { id: s.id, label: s.label, colorVar: s.colorVar, point: p };
    });
    const firstWithPoint = rows.find((r) => r.point);
    showTooltip({
      tooltipData: { x: snapX, rows },
      tooltipLeft: MARGIN.left + xScale(snapX),
      tooltipTop:
        MARGIN.top +
        (firstWithPoint?.point ? yScale(firstWithPoint.point.y) : innerH / 3),
    });
  }

  if (allPoints.length === 0) return null;
  const yTicks = yScale.ticks(5);

  return (
    <div className="relative">
      <svg width={width} height={height} role="img" aria-label={yLabel}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          <GridRows
            scale={yScale}
            width={innerW}
            tickValues={yTicks}
            stroke="var(--viz-grid)"
            strokeWidth={1}
          />
          {/* lo/hi range wash for single-series view */}
          {series.length === 1 &&
            series[0].points.some((p) => p.yLo != null && p.yHi != null) && (
              <AreaClosed<ChartPoint>
                data={series[0].points.filter(
                  (p) => p.yLo != null && p.yHi != null,
                )}
                x={(p) => xScale(p.x)}
                y0={(p) => yScale(p.yLo!)}
                y={(p) => yScale(p.yHi!)}
                yScale={yScale}
                curve={curveMonotoneX}
                fill={series[0].colorVar}
                fillOpacity={0.1}
              />
            )}
          {series.map((s) => (
            <LinePath<ChartPoint>
              key={s.id}
              data={s.points}
              x={(p) => xScale(p.x)}
              y={(p) => yScale(p.y)}
              curve={curveMonotoneX}
              stroke={s.colorVar}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {/* single-point series still need a visible mark */}
          {series.map(
            (s) =>
              s.points.length === 1 && (
                <circle
                  key={`${s.id}-dot`}
                  cx={xScale(s.points[0].x)}
                  cy={yScale(s.points[0].y)}
                  r={4}
                  fill={s.colorVar}
                  stroke="var(--viz-surface)"
                  strokeWidth={2}
                />
              ),
          )}
          {/* crosshair + hovered markers */}
          {tooltipData && (
            <g>
              <line
                x1={xScale(tooltipData.x)}
                x2={xScale(tooltipData.x)}
                y1={0}
                y2={innerH}
                stroke="var(--viz-baseline)"
                strokeWidth={1}
              />
              {tooltipData.rows.map(
                (r) =>
                  r.point && (
                    <circle
                      key={r.id}
                      cx={xScale(r.point.x)}
                      cy={yScale(r.point.y)}
                      r={4}
                      fill={r.colorVar}
                      stroke="var(--viz-surface)"
                      strokeWidth={2}
                    />
                  ),
              )}
            </g>
          )}
          <AxisLeft
            scale={yScale}
            tickValues={yTicks}
            stroke="var(--viz-baseline)"
            tickStroke="var(--viz-baseline)"
            tickFormat={(v) => fmtUsd(Number(v), 0)}
            tickLabelProps={{
              fill: "var(--viz-ink-muted)",
              fontSize: 11,
              textAnchor: "end",
              dx: -4,
              dy: 3,
            }}
          />
          <AxisBottom
            top={innerH}
            scale={xScale}
            numTicks={Math.min(8, Math.ceil(innerW / 90))}
            stroke="var(--viz-baseline)"
            tickStroke="var(--viz-baseline)"
            tickFormat={(v) => String(Math.round(Number(v)))}
            tickLabelProps={{
              fill: "var(--viz-ink-muted)",
              fontSize: 11,
              textAnchor: "middle",
            }}
          />
          <rect
            x={0}
            y={0}
            width={innerW}
            height={innerH}
            fill="transparent"
            onPointerMove={handleMove}
            onPointerLeave={hideTooltip}
          />
        </Group>
      </svg>
      {tooltipData && (
        <TooltipWithBounds
          left={tooltipLeft}
          top={tooltipTop}
          className="pointer-events-none"
          style={{
            position: "absolute",
            background: "var(--popover)",
            color: "var(--popover-foreground)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            boxShadow: "0 4px 12px rgb(0 0 0 / 0.12)",
            maxWidth: 320,
          }}
        >
          {(() => {
            const first = tooltipData.rows.find((r) => r.point)?.point;
            return (
              <div className="mb-1 font-medium">
                {first ? fmtPeriod(first.year, first.quarter) : ""}
              </div>
            );
          })()}
          <div className="space-y-1">
            {tooltipData.rows.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <span
                  aria-hidden
                  style={{
                    width: 12,
                    height: 0,
                    borderTop: `2px solid ${r.colorVar}`,
                    flexShrink: 0,
                  }}
                />
                <span className="font-semibold tabular-nums">
                  {r.point ? fmtUsd(r.point.y) : "—"}
                </span>
                <span className="truncate text-muted-foreground">
                  {r.label}
                  {r.point?.estimated ? " (estimated)" : ""}
                </span>
              </div>
            ))}
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

export function PriceChart({ series, yLabel, height = 360 }: PriceChartProps) {
  if (series.length === 0 || series.every((s) => s.points.length === 0)) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No data for this selection.
      </div>
    );
  }
  return (
    <figure>
      {series.length >= 2 && (
        <figcaption className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {series.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5">
              <span
                aria-hidden
                style={{
                  width: 14,
                  height: 0,
                  borderTop: `2px solid ${s.colorVar}`,
                }}
              />
              {s.label}
            </span>
          ))}
        </figcaption>
      )}
      <div style={{ height }}>
        <ParentSize initialSize={{ width: 800, height }} debounceTime={20}>
          {({ width }) => (
            <Chart
              series={series}
              yLabel={yLabel}
              width={width > 0 ? width : 800}
              height={height}
            />
          )}
        </ParentSize>
      </div>
      <div className="mt-1 text-right text-xs text-muted-foreground">
        {yLabel}
      </div>
    </figure>
  );
}
