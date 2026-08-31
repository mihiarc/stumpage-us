"use client";

// A map of the geographies the price data was actually reported at. Pick a
// layer and it draws that layer's boundaries across the lower 48, filling the
// units we hold prices for and leaving the rest pale.
//
// This is deliberately not a choropleth. Two thirds of the record is reported
// per national forest and cannot be assigned to a state without inventing a
// boundary its publisher never used, so the map changes geography instead of
// re-cutting the data. Nothing here encodes a magnitude: a unit either has
// prices or it does not.
import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Map, { Layer, Source, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { ExpressionSpecification } from "maplibre-gl";
import { asset } from "@/lib/asset";
import { cn } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

export interface BoundaryLayer {
  id: string;
  /** Layer name, from public/geo/layers.json — not a label map in here. */
  name: string;
  /** Singular noun for the unit, for the "12 of 112 forests" line. */
  unit: string;
  /** File under public/geo/. */
  file: string;
  keyProp: string;
  nameProp: string;
  /** Feature keys we hold prices for. */
  lit: string[];
  /** Features in the layer, including ones with no prices. */
  total: number;
  /** Series count per lit key, shown on hover. */
  counts: Record<string, number>;
  /** Where clicking a lit unit goes. */
  hrefs: Record<string, string>;
  /** Units with prices that fall outside the CONUS frame. */
  offFrame: string[];
  /** Units at this grain that the layer has no polygon for. */
  unmatchedUnits: number;
  unmatchedSeries: number;
}

// The lower 48. Alaska's units are reported on and carry prices, but framing
// the country to include them turns the map mostly into ocean, so they are
// counted under the map rather than drawn.
const CONUS_BOUNDS: [[number, number], [number, number]] = [
  [-125.0, 24.4],
  [-66.9, 49.4],
];
const FIT_PADDING = 12;

const EMPTY_STYLE = { version: 8 as const, sources: {}, layers: [] };

const LIT_TOKEN = "--viz-seq-400";
const DIM_TOKEN = "--viz-seq-none";
const LINE_TOKEN = "--viz-baseline";
const PAINT_TOKENS = [LIT_TOKEN, DIM_TOKEN, LINE_TOKEN];

// MapLibre paints on WebGL and cannot read a CSS custom property, so the token
// values are read back out of the document. Same approach as the rest of the
// repo's charts, which use var() directly because SVG can.
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

function usePaint(): Record<string, string> | null {
  const packed = useSyncExternalStore(subscribeToTheme, readPaintTokens, () => null);
  return useMemo(() => {
    if (!packed) return null;
    const v = packed.split("|");
    return Object.fromEntries(PAINT_TOKENS.map((t, i) => [t, v[i]]));
  }, [packed]);
}

export function BoundaryMap({
  layers,
  className,
}: {
  layers: BoundaryLayer[];
  className?: string;
}) {
  const router = useRouter();
  const paint = usePaint();
  const [active, setActive] = useState(layers[0]?.id ?? "");
  const [hovered, setHovered] = useState<{
    name: string;
    n: number;
    x: number;
    y: number;
  } | null>(null);

  const layer = layers.find((l) => l.id === active) ?? layers[0];

  const fillColor = useMemo<ExpressionSpecification | null>(() => {
    if (!paint || !layer) return null;
    return [
      "case",
      ["in", ["get", layer.keyProp], ["literal", layer.lit]],
      paint[LIT_TOKEN],
      paint[DIM_TOKEN],
    ] as ExpressionSpecification;
  }, [paint, layer]);

  function onMove(e: MapLayerMouseEvent) {
    const f = e.features?.[0];
    if (!f?.properties || !layer) {
      setHovered(null);
      e.target.getCanvas().style.cursor = "";
      return;
    }
    const key = String(f.properties[layer.keyProp]);
    const n = layer.counts[key] ?? 0;
    setHovered({
      name: String(f.properties[layer.nameProp] ?? key),
      n,
      x: e.point.x,
      y: e.point.y,
    });
    e.target.getCanvas().style.cursor = layer.hrefs[key] ? "pointer" : "";
  }

  if (!layer) return null;

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div
          role="tablist"
          aria-label="Map layer"
          className="flex flex-wrap gap-1 rounded-md border bg-muted/50 p-0.5"
        >
          {layers.map((l) => (
            <button
              key={l.id}
              role="tab"
              type="button"
              aria-selected={l.id === active}
              onClick={() => {
                setActive(l.id);
                setHovered(null);
              }}
              className={cn(
                "rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors",
                l.id === active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l.name}
            </button>
          ))}
        </div>
        <p className="text-xs tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">{layer.lit.length}</span>{" "}
          of {layer.total} {layer.unit}
          {layer.total === 1 ? "" : "s"} have prices
        </p>
      </div>

      <div className="relative aspect-[1.15] overflow-hidden rounded-lg border sm:aspect-[1.4] md:aspect-[1.7]">
        <Map
          // remount per layer: a new Source id with new data is cleaner than
          // mutating one in place, and the layer count is three
          key={layer.id}
          mapStyle={EMPTY_STYLE}
          initialViewState={{
            bounds: CONUS_BOUNDS,
            fitBoundsOptions: { padding: FIT_PADDING },
          }}
          onResize={(e) =>
            e.target.fitBounds(CONUS_BOUNDS, { padding: FIT_PADDING, duration: 0 })
          }
          attributionControl={false}
          interactiveLayerIds={["units-fill"]}
          onMouseMove={onMove}
          onMouseLeave={() => setHovered(null)}
          onClick={(e) => {
            const f = e.features?.[0];
            if (!f?.properties) return;
            const href = layer.hrefs[String(f.properties[layer.keyProp])];
            if (href) router.push(href);
          }}
          scrollZoom={false}
          dragRotate={false}
          touchZoomRotate={false}
          style={{ width: "100%", height: "100%", background: "transparent" }}
        >
          <Source id="units" type="geojson" data={asset(`/geo/${layer.file}`)}>
            {fillColor && (
              <Layer
                id="units-fill"
                type="fill"
                paint={{ "fill-color": fillColor, "fill-opacity": 0.9 }}
              />
            )}
            {paint && (
              <Layer
                id="units-line"
                type="line"
                paint={{ "line-color": paint[LINE_TOKEN], "line-width": 0.6 }}
              />
            )}
          </Source>
        </Map>

        {hovered && (
          <div
            className="pointer-events-none absolute z-10 max-w-64 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
            style={{ left: hovered.x + 12, top: hovered.y + 12 }}
          >
            <div className="font-medium">{hovered.name}</div>
            <div className="text-muted-foreground">
              {hovered.n > 0 ? (
                <>
                  <span className="font-semibold tabular-nums text-foreground">
                    {hovered.n.toLocaleString()}
                  </span>{" "}
                  price series
                </>
              ) : (
                "No prices reported here"
              )}
            </div>
          </div>
        )}

        <div className="absolute inset-x-2 bottom-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-background/90 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
          <span className="flex items-center gap-1">
            <span
              className="inline-block size-3 rounded-sm"
              style={{ background: `var(${LIT_TOKEN})` }}
            />
            has prices
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block size-3 rounded-sm border"
              style={{ background: `var(${DIM_TOKEN})` }}
            />
            none
          </span>
        </div>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {layer.name} are the boundaries this data was published against, not a
        re-cut of it.{" "}
        {layer.offFrame.length > 0 && (
          <>
            {layer.offFrame.length} outside the lower 48 (
            {layer.offFrame.join(", ")}){" "}
            {layer.offFrame.length === 1 ? "carries" : "carry"} prices but{" "}
            {layer.offFrame.length === 1 ? "is" : "are"} not drawn.{" "}
          </>
        )}
        {layer.unmatchedUnits > 0 && (
          <>
            A further {layer.unmatchedUnits} — mostly units merged away since
            the prices were published — carry{" "}
            {layer.unmatchedSeries.toLocaleString()} series with no current
            boundary to draw them on.{" "}
          </>
        )}
        Click a filled unit for its record.
      </p>
    </div>
  );
}
