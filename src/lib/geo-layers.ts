/**
 * Joins the boundary layers in public/geo/ to the price record, at build time.
 *
 * The layer set itself is data (`public/geo/layers.json`, written by
 * `scripts/build-geo-layers.ts`) rather than a list in a component — invariant
 * 5, geography is swappable. This module is the join: for each layer it works
 * out which of its units we actually hold prices for, how many series each one
 * carries, where clicking it should go, and which units with prices fall
 * outside the CONUS frame the map draws.
 *
 * Everything here runs on the server. The geojson files are read with node:fs
 * and never reach the browser from this path; the map fetches the one layer it
 * is showing over HTTP.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getSeriesIndex } from "./data";
import { FIPS_TO_USPS, usfsRegionKey } from "./geo";
import type { BoundaryLayer } from "@/components/boundary-map";

const GEO_DIR = join(process.cwd(), "public", "geo");

interface LayerSpec {
  id: string;
  name: string;
  unit: string;
  file: string;
  key_prop: string;
  name_prop: string;
  region_types: string[];
  features: number;
}

interface LayerManifest {
  version: string;
  source: string;
  min_ring_km2: number;
  layers: LayerSpec[];
}

const cache: {
  manifest?: LayerManifest;
  features: Map<string, { key: string; name: string; bbox: [number, number, number, number] }[]>;
  built?: BoundaryLayer[];
} = { features: new Map() };

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(GEO_DIR, file), "utf8")) as T;
}

export function getLayerManifest(): LayerManifest {
  return (cache.manifest ??= readJson<LayerManifest>("layers.json"));
}

/** Each feature's key, display name and bounding box — geometry is not kept. */
function getFeatures(spec: LayerSpec) {
  const hit = cache.features.get(spec.file);
  if (hit) return hit;
  const fc = readJson<{
    features: { properties: Record<string, unknown>; geometry: { coordinates: unknown } | null }[];
  }>(spec.file);

  const out = fc.features.map((f) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const walk = (c: unknown): void => {
      if (Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number") {
        minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0]);
        minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1]);
        return;
      }
      if (Array.isArray(c)) for (const x of c) walk(x);
    };
    if (f.geometry) walk(f.geometry.coordinates);
    return {
      key: String(f.properties[spec.key_prop]),
      name: String(f.properties[spec.name_prop] ?? f.properties[spec.key_prop]),
      bbox: [minX, minY, maxX, maxY] as [number, number, number, number],
    };
  });
  cache.features.set(spec.file, out);
  return out;
}

/** Mirror of CONUS_BOUNDS in boundary-map.tsx, generous at the edges. */
const CONUS = { minX: -126, minY: 23, maxX: -66, maxY: 50.5 };

function intersectsConus(b: [number, number, number, number]): boolean {
  return b[0] <= CONUS.maxX && b[2] >= CONUS.minX && b[1] <= CONUS.maxY && b[3] >= CONUS.minY;
}

const USPS_TO_FIPS: Record<string, string> = Object.fromEntries(
  Object.entries(FIPS_TO_USPS).map(([fips, usps]) => [usps, fips]),
);

/**
 * The key a series contributes to, in the layer's own key space, or null if the
 * series is not reported at this layer's grain.
 *
 * A national forest's code carries its USFS org code: cs_r1_f02 is region 01,
 * forest 02, which is org code 0102 — the key the USFS boundary layer uses.
 */
function seriesKeyFor(
  layerId: string,
  regionCode: string,
  state: string | null,
): string | null {
  if (layerId === "national_forest") {
    const m = /^cs_r(\d{1,2})_f(\d{2})$/.exec(regionCode);
    return m ? `${m[1].padStart(2, "0")}${m[2]}` : null;
  }
  if (layerId === "usfs_region") return usfsRegionKey(regionCode);
  if (layerId === "state") return state ? (USPS_TO_FIPS[state] ?? null) : null;
  return null;
}

function hrefFor(layerId: string, regionCode: string, state: string | null): string | null {
  if (layerId === "state") return state ? `/states/${state.toLowerCase()}/` : null;
  return `/regions/${regionCode}/`;
}

/**
 * Assemble the props the map needs. Unmatched keys are counted, not hidden:
 * 25 of the 134 forests we hold prices for are pre-merger units (Clearwater,
 * Custer, Okanogan, the old Tongass areas) with no current USFS polygon, so
 * they cannot light up until a historical-to-current crosswalk exists.
 */
export function buildBoundaryLayers(): BoundaryLayer[] {
  if (cache.built) return cache.built;
  const series = getSeriesIndex().series;

  cache.built = getLayerManifest().layers.map((spec) => {
    const features = getFeatures(spec);
    const known = new Map(features.map((f) => [f.key, f]));

    const counts: Record<string, number> = {};
    // one href per key: the region code contributing the most series to it
    const best: Record<string, { code: string; n: number }> = {};
    // grain matches, but the layer has no polygon for it — mostly pre-merger
    // forests. Counted rather than dropped: an honest blank, not a silent one.
    const unmatched = new Map<string, number>();

    for (const s of series) {
      if (!spec.region_types.includes(s.region_type)) continue;
      const key = seriesKeyFor(spec.id, s.region, s.state);
      if (!key) continue;
      if (!known.has(key)) {
        unmatched.set(key, (unmatched.get(key) ?? 0) + 1);
        continue;
      }
      counts[key] = (counts[key] ?? 0) + 1;
      const cur = best[key];
      if (!cur || s.n > cur.n) best[key] = { code: s.region, n: s.n };
    }

    const lit = Object.keys(counts).sort();
    const hrefs: Record<string, string> = {};
    for (const key of lit) {
      const state = spec.id === "state" ? FIPS_TO_USPS[key] : null;
      const href = hrefFor(spec.id, best[key]?.code ?? "", state ?? null);
      if (href) hrefs[key] = href;
    }

    const offFrame = lit
      .filter((k) => {
        const f = known.get(k);
        return f ? !intersectsConus(f.bbox) : false;
      })
      .map((k) => known.get(k)!.name)
      .sort();

    return {
      id: spec.id,
      name: spec.name,
      unit: spec.unit,
      file: spec.file,
      keyProp: spec.key_prop,
      nameProp: spec.name_prop,
      lit,
      total: features.length,
      counts,
      hrefs,
      offFrame,
      unmatchedUnits: unmatched.size,
      unmatchedSeries: [...unmatched.values()].reduce((a, b) => a + b, 0),
    };
  });
  return cache.built;
}
