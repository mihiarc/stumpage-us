"use client";

// Interactive US coverage map (MapLibre). States are colored by how many
// public price series cover them (directly or via a multi-state/USFS-region
// series); clicking a state opens its page. Self-contained: no external tile
// service — the only layer is the bundled states GeoJSON.
import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
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

// Sequential blue ramp (dataviz reference palette), bucketed by series count.
// The colors live in globals.css like every other chart here: the legend
// swatches below reference the tokens straight from CSS, and useTokenColors
// resolves them for MapLibre, which paints on a WebGL canvas and so is the one
// consumer in the repo that cannot read a CSS custom property itself.
const NONE_TOKEN = "--viz-seq-none";
const LINE_TOKEN = "--viz-baseline";
const BUCKETS: { min: number; token: string; label: string }[] = [
  { min: 1, token: "--viz-seq-100", label: "1–24" },
  { min: 25, token: "--viz-seq-250", label: "25–99" },
  { min: 100, token: "--viz-seq-400", label: "100–499" },
  { min: 500, token: "--viz-seq-550", label: "500+" },
];
const PAINT_TOKENS = [NONE_TOKEN, LINE_TOKEN, ...BUCKETS.map((b) => b.token)];

// The <html> class list is the external store here: whoever flips the theme,
// next-themes or otherwise, the observer fires and the tokens are re-read.
// Joined into one string so getSnapshot returns a stable primitive.
function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style"],
  });
  return () => observer.disconnect();
}

function readPaintTokens() {
  const cs = getComputedStyle(document.documentElement);
  return PAINT_TOKENS.map((t) => cs.getPropertyValue(t).trim()).join("|");
}

// Null while prerendering — the values only exist once there is a document.
function useTokenColors(): Record<string, string> | null {
  const packed = useSyncExternalStore(subscribeToTheme, readPaintTokens, () => null);
  return useMemo(() => {
    if (!packed) return null;
    const values = packed.split("|");
    return Object.fromEntries(PAINT_TOKENS.map((t, i) => [t, values[i]]));
  }, [packed]);
}

function bucketColor(total: number, colors: Record<string, string>): string {
  let color = colors[NONE_TOKEN];
  for (const b of BUCKETS) if (total >= b.min) color = colors[b.token];
  return color;
}

// The lower 48. Fitting bounds rather than naming a zoom is what makes the map
// fill whatever box it is given: at the old fixed zoom 3 the world is 2048px
// wide, so CONUS's 57.8 degrees of longitude drew 329px inside a 1118px card —
// under a third of it. Alaska and Hawaii are in the GeoJSON and both carry
// coverage, but they sit outside this frame.
const CONUS_BOUNDS: [[number, number], [number, number]] = [
  [-125.0, 24.4],
  [-66.9, 49.4],
];
const FIT_PADDING = 16;

const EMPTY_STYLE = {
  version: 8 as const,
  sources: {},
  layers: [],
};

export function CoverageMap({ coverage, height = 420 }: CoverageMapProps) {
  const router = useRouter();
  const paint = useTokenColors();
  const [hovered, setHovered] = useState<{
    usps: string;
    name: string;
    x: number;
    y: number;
  } | null>(null);

  const fillColor = useMemo<ExpressionSpecification | null>(() => {
    if (!paint) return null;
    const expr: unknown[] = ["match", ["get", "fips"]];
    for (const [fips, usps] of Object.entries(FIPS_TO_USPS)) {
      expr.push(fips, bucketColor(coverage[usps]?.total ?? 0, paint));
    }
    expr.push(paint[NONE_TOKEN]);
    return expr as ExpressionSpecification;
  }, [coverage, paint]);

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
          bounds: CONUS_BOUNDS,
          fitBoundsOptions: { padding: FIT_PADDING },
        }}
        // refit when the box changes, so a window resize or a phone rotating
        // does not leave the country mis-framed inside its card
        onResize={(e) =>
          e.target.fitBounds(CONUS_BOUNDS, {
            padding: FIT_PADDING,
            duration: 0,
          })
        }
        // A choropleth this size has nothing to gain from zoom or rotation, and
        // a map that swallows the wheel mid-page traps the reader's scroll.
        scrollZoom={false}
        dragRotate={false}
        touchZoomRotate={false}
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
          {fillColor && (
            <Layer
              id="states-fill"
              type="fill"
              paint={{ "fill-color": fillColor, "fill-opacity": 0.9 }}
            />
          )}
          {paint && (
            <Layer
              id="states-line"
              type="line"
              paint={{ "line-color": paint[LINE_TOKEN], "line-width": 1 }}
            />
          )}
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
          <span
            className="inline-block size-3 rounded-sm border"
            style={{ background: `var(${NONE_TOKEN})` }}
          />
          none
        </span>
        {BUCKETS.map((b) => (
          <span key={b.min} className="flex items-center gap-1">
            <span
              className="inline-block size-3 rounded-sm"
              style={{ background: `var(${b.token})` }}
            />
            {b.label}
          </span>
        ))}
        <span className="ml-1">series covering the state</span>
      </div>
    </div>
  );
}
