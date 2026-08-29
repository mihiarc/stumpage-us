"use client";

// Interactive US coverage map (MapLibre). States are colored by how many
// public price series cover them (directly or via a multi-state/USFS-region
// series); clicking a state opens its page. Self-contained: no external tile
// service — the only layer is the bundled states GeoJSON.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Map, { Layer, Source, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { ExpressionSpecification } from "maplibre-gl";
import { FIPS_TO_USPS } from "@/lib/geo";
import { asset } from "@/lib/asset";
import "maplibre-gl/dist/maplibre-gl.css";

export interface StateCoverage {
  direct: number;
  regional: number;
  total: number;
}

interface CoverageMapProps {
  coverage: Record<string, StateCoverage>;
  height?: number;
}

// sequential blue ramp (dataviz reference palette), bucketed by series count
const BUCKETS: { min: number; color: string; label: string }[] = [
  { min: 1, color: "#cde2fb", label: "1–24" },
  { min: 25, color: "#86b6ef", label: "25–99" },
  { min: 100, color: "#3987e5", label: "100–499" },
  { min: 500, color: "#1c5cab", label: "500+" },
];

function bucketColor(total: number, zeroColor: string): string {
  let color = zeroColor;
  for (const b of BUCKETS) if (total >= b.min) color = b.color;
  return color;
}

const EMPTY_STYLE = {
  version: 8 as const,
  sources: {},
  layers: [],
};

export function CoverageMap({ coverage, height = 420 }: CoverageMapProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const [hovered, setHovered] = useState<{
    usps: string;
    name: string;
    x: number;
    y: number;
  } | null>(null);

  const zeroColor = dark ? "#262624" : "#eeede8";
  const lineColor = dark ? "#383835" : "#c3c2b7";

  const fillColor = useMemo<ExpressionSpecification>(() => {
    const expr: unknown[] = ["match", ["get", "fips"]];
    for (const [fips, usps] of Object.entries(FIPS_TO_USPS)) {
      expr.push(fips, bucketColor(coverage[usps]?.total ?? 0, zeroColor));
    }
    expr.push(zeroColor);
    return expr as ExpressionSpecification;
  }, [coverage, zeroColor]);

  function onMove(e: MapLayerMouseEvent) {
    const f = e.features?.[0];
    if (f?.properties) {
      const usps = FIPS_TO_USPS[f.properties.fips as string];
      setHovered({
        usps,
        name: f.properties.name as string,
        x: e.point.x,
        y: e.point.y,
      });
      e.target.getCanvas().style.cursor = "pointer";
    } else {
      setHovered(null);
      e.target.getCanvas().style.cursor = "";
    }
  }

  const hoveredCov = hovered ? coverage[hovered.usps] : null;

  return (
    <div className="relative overflow-hidden rounded-lg border" style={{ height }}>
      <Map
        mapStyle={EMPTY_STYLE}
        initialViewState={{
          longitude: -98.5,
          latitude: 38.8,
          zoom: 3,
        }}
        attributionControl={false}
        interactiveLayerIds={["states-fill"]}
        onMouseMove={onMove}
        onMouseLeave={() => setHovered(null)}
        onClick={(e) => {
          const f = e.features?.[0];
          if (f?.properties) {
            const usps = FIPS_TO_USPS[f.properties.fips as string];
            if (usps && coverage[usps]?.total) router.push(`/states/${usps.toLowerCase()}/`);
          }
        }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <Source id="states" type="geojson" data={asset("/geo/us-states.json")}>
          <Layer
            id="states-fill"
            type="fill"
            paint={{ "fill-color": fillColor, "fill-opacity": 0.9 }}
          />
          <Layer
            id="states-line"
            type="line"
            paint={{ "line-color": lineColor, "line-width": 1 }}
          />
        </Source>
      </Map>
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
          style={{ left: hovered.x + 12, top: hovered.y + 12 }}
        >
          <div className="font-medium">{hovered.name}</div>
          {hoveredCov?.total ? (
            <div className="text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">
                {hoveredCov.total.toLocaleString()}
              </span>{" "}
              price series ({hoveredCov.direct.toLocaleString()} state-level,{" "}
              {hoveredCov.regional.toLocaleString()} via multi-state regions)
            </div>
          ) : (
            <div className="text-muted-foreground">No public series yet</div>
          )}
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-3 rounded-md border bg-background/90 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded-sm border" style={{ background: zeroColor }} />
          none
        </span>
        {BUCKETS.map((b) => (
          <span key={b.min} className="flex items-center gap-1">
            <span className="inline-block size-3 rounded-sm" style={{ background: b.color }} />
            {b.label}
          </span>
        ))}
        <span className="ml-1">series covering the state</span>
      </div>
    </div>
  );
}
