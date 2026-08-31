"use client";

// Interactive US coverage map (MapLibre). States are colored by how many
// public price series cover them (directly or via a multi-state/USFS-region
// series); clicking a state opens its page. Self-contained: no external tile
// service — the only layer is the bundled states GeoJSON.
import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Map, { Layer, Source, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { ExpressionSpecification } from "maplibre-gl";
import Link from "next/link";
import { FIPS_TO_USPS, STATE_NAMES } from "@/lib/geo";
import { asset } from "@/lib/asset";
import { cn } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

export interface StateCoverage {
  direct: number;
  regional: number;
  total: number;
}

interface CoverageMapProps {
  coverage: Record<string, StateCoverage>;
  /** Extra classes for the map frame, appended to the default aspect ratio. */
  className?: string;
}

/**
 * The frame is given an aspect ratio rather than a pixel height so it scales
 * with its column. 1.7 sits just under CONUS's true 1.82:1 in Web Mercator,
 * which leaves the fit width-bound: the country spans the full width and the
 * slack falls top and bottom, where the legend needs room anyway.
 *
 * Narrow screens get a taller box. At 1.7 a phone-width card is barely 210px
 * tall and the legend and tiles eat most of it, leaving the country about 60px
 * high — the chrome crowding out the thing it annotates.
 */
const DEFAULT_FRAME = "aspect-[1.15] sm:aspect-[1.4] md:aspect-[1.7]";

/** In the GeoJSON and carrying coverage, but outside CONUS_BOUNDS. */
const OFF_FRAME = ["AK", "HI"] as const;

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

/** Which ramp token a state's series count falls in. */
function bucketToken(total: number): string {
  let token = NONE_TOKEN;
  for (const b of BUCKETS) if (total >= b.min) token = b.token;
  return token;
}

function bucketColor(total: number, colors: Record<string, string>): string {
  return colors[bucketToken(total)];
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

export function CoverageMap({ coverage, className }: CoverageMapProps) {
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
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border",
        DEFAULT_FRAME,
        className,
      )}
    >
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
      {/* Bottom chrome: ramp legend, and tiles for the two states the CONUS
          frame cannot show. One wrapping row so the two never collide on a
          narrow card. */}
      <div className="absolute inset-x-2 bottom-2 flex flex-wrap items-end justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-background/90 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
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
          <span className="ml-1 hidden sm:inline">
            series covering the state
          </span>
        </div>
        <div className="flex gap-1.5">
          {OFF_FRAME.map((usps) => {
            const total = coverage[usps]?.total ?? 0;
            return (
              <Link
                key={usps}
                href={`/states/${usps.toLowerCase()}/`}
                title={`${STATE_NAMES[usps]} — ${total.toLocaleString()} price series (outside the map frame)`}
                className="flex items-center gap-1 rounded-md border bg-background/90 px-1.5 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
              >
                <span
                  className="inline-block size-3 rounded-sm border"
                  style={{ background: `var(${bucketToken(total)})` }}
                />
                {usps}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
