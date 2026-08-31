/**
 * Builds the map's boundary layers from the geographies the price data was
 * actually reported at.
 *
 * Run with `bun run build:geo`. Writes to public/geo/, which — like
 * public/coverage/ and unlike public/data/ — is generated *here*. It is
 * deliberately NOT part of `bun run build`: the input is a live USFS service,
 * so a build that fetched it would stop being reproducible. Run it when the
 * upstream boundaries change, and commit the result.
 *
 * Why these layers exist at all: two thirds of the record (2,316 of 3,490
 * series) is reported per national forest, and a further 280 per USFS region.
 * Neither can be drawn on a state map without assigning a forest's price to a
 * boundary nobody published it against, so the map needs the publishers' own
 * geographies instead.
 *
 * Two things make this cheap enough to ship:
 *
 * 1. Slivers. A proclaimed forest boundary is mostly inholdings: the national
 *    layer arrives as 46,839 rings, of which 97% are under 5 km² and together
 *    hold 0.1% of the area. Dropping those keeps 99.8% of the area and takes
 *    the layer from 556 KB gzipped to ~43 KB — smaller than us-states.json.
 *    Vertex simplification alone does almost nothing here; the cost is ring
 *    count, not vertex density.
 * 2. Regions come from their own USFS service as nine contiguous polygons, and
 *    are cheap for the same reason. An earlier pass built them as the union of
 *    each region's forests, which is arguably the truer footprint — a
 *    region-level Cut-and-Sold figure covers National Forest System land, not
 *    every acre of the states it spans — but it drew the identical scatter of
 *    rings as the forest layer, making the two indistinguishable on a map whose
 *    whole point is switching between them. The administrative boundary is a
 *    locator; the caption carries the "NFS land only" caveat instead.
 *    (Dissolving *states* into regions cannot work at all — USFS regions
 *    overlap states: SD is in R1 and R2, ID in R1 and R4, WY in R2 and R4.)
 *
 * Output is deterministic: no wall-clock timestamp, and `version` is a hash of
 * the response plus the fetch parameters, so re-running against unchanged
 * upstream data reproduces the files byte for byte.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const OUT_DIR = join(process.cwd(), "public", "geo");

const USFS_FORESTS =
  "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_ForestSystemBoundaries_01/MapServer/0/query";
const USFS_REGIONS =
  "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_RegionBoundaries_01/MapServer/0/query";

/**
 * Server-side generalization settings. maxAllowableOffset is in degrees;
 * 0.05 (~5 km) is well inside what a CONUS-wide view can resolve, and pushing
 * it further buys nothing because the size is in ring count.
 */
const BASE_PARAMS: Record<string, string> = {
  where: "1=1",
  returnGeometry: "true",
  outSR: "4326",
  geometryPrecision: "3",
  f: "geojson",
};
const FOREST_PARAMS = {
  ...BASE_PARAMS,
  outFields: "region,forestnumber,forestname",
  maxAllowableOffset: "0.05",
};
const REGION_PARAMS = {
  ...BASE_PARAMS,
  outFields: "region,regionname",
  maxAllowableOffset: "0.02",
};

/** Rings smaller than this are inholdings and slivers, not the forest. */
const MIN_RING_KM2 = 5;

type Ring = [number, number][];
type Poly = Ring[];

interface Feature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown } | null;
}

/** Shoelace area, cosine-corrected at the ring's own latitude. */
function ringAreaKm2(ring: Ring): number {
  if (ring.length < 4) return 0;
  const lat = ring.reduce((t, p) => t + p[1], 0) / ring.length;
  const kx = 111.32 * Math.cos((lat * Math.PI) / 180);
  const ky = 111.32;
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    a += ring[i][0] * kx * (ring[i + 1][1] * ky) -
      ring[i + 1][0] * kx * (ring[i][1] * ky);
  }
  return Math.abs(a) / 2;
}

function toPolys(geometry: Feature["geometry"]): Poly[] {
  if (!geometry) return [];
  return geometry.type === "Polygon"
    ? [geometry.coordinates as Poly]
    : (geometry.coordinates as Poly[]);
}

/** Drop sliver rings; return the polygons that survive. */
function dropSlivers(geometry: Feature["geometry"]): Poly[] {
  const kept: Poly[] = [];
  for (const poly of toPolys(geometry)) {
    const rings = poly.filter((r) => ringAreaKm2(r) >= MIN_RING_KM2);
    if (rings.length > 0) kept.push(rings);
  }
  return kept;
}

/** USFS org code: two-digit region + two-digit forest, e.g. R1 forest 2 -> 0102. */
function orgCode(region: string, forestNumber: string): string {
  return `${region.padStart(2, "0")}${forestNumber.padStart(2, "0")}`;
}

async function fetchLayer(
  label: string,
  endpoint: string,
  params: Record<string, string>,
): Promise<{ body: string; features: Feature[] }> {
  process.stdout.write(`fetching ${label}… `);
  const res = await fetch(`${endpoint}?${new URLSearchParams(params)}`);
  if (!res.ok) throw new Error(`${label} request failed: ${res.status} ${res.statusText}`);
  const body = await res.text();
  console.log(`${(body.length / 1024 / 1024).toFixed(1)} MB`);
  const parsed = JSON.parse(body) as { features?: Feature[] };
  if (!parsed.features?.length) throw new Error(`${label} carried no features`);
  return { body, features: parsed.features };
}

async function main() {
  const forestRes = await fetchLayer("USFS forest boundaries", USFS_FORESTS, FOREST_PARAMS);
  const regionRes = await fetchLayer("USFS region boundaries", USFS_REGIONS, REGION_PARAMS);

  const version = createHash("sha256")
    .update(JSON.stringify({ FOREST_PARAMS, REGION_PARAMS }))
    .update(forestRes.body)
    .update(regionRes.body)
    .digest("hex")
    .slice(0, 12);

  const raw = { features: forestRes.features };

  // ---- forests -----------------------------------------------------------
  let ringsBefore = 0;
  let ringsAfter = 0;
  const forests: Feature[] = [];

  for (const f of raw.features.slice().sort((a, b) =>
    orgCode(String(a.properties.region), String(a.properties.forestnumber)).localeCompare(
      orgCode(String(b.properties.region), String(b.properties.forestnumber)),
    ),
  )) {
    for (const p of toPolys(f.geometry)) ringsBefore += p.length;
    const polys = dropSlivers(f.geometry);
    if (polys.length === 0) continue;
    for (const p of polys) ringsAfter += p.length;

    const region = String(f.properties.region);
    const key = orgCode(region, String(f.properties.forestnumber));
    forests.push({
      type: "Feature",
      properties: { key, name: String(f.properties.forestname), region },
      geometry: { type: "MultiPolygon", coordinates: polys },
    });
  }

  // ---- regions: the administrative boundaries, names from the service ----
  const regions: Feature[] = regionRes.features
    .map((f) => {
      const region = String(f.properties.region);
      const polys = dropSlivers(f.geometry);
      return {
        type: "Feature" as const,
        properties: {
          key: `r${Number(region)}`,
          name: `${String(f.properties.regionname)} (R${Number(region)})`,
          region,
        },
        geometry: { type: "MultiPolygon" as const, coordinates: polys },
      };
    })
    .filter((f) => f.geometry.coordinates.length > 0)
    .sort((a, b) =>
      String(a.properties.region).localeCompare(String(b.properties.region)),
    );

  mkdirSync(OUT_DIR, { recursive: true });
  const write = (name: string, features: Feature[]) => {
    const fc = { type: "FeatureCollection", features };
    const json = JSON.stringify(fc);
    writeFileSync(join(OUT_DIR, name), json + "\n");
    const gz = gzipSync(json).byteLength;
    console.log(
      `  ${name.padEnd(22)} ${String(features.length).padStart(4)} features  ` +
        `${(json.length / 1024).toFixed(0).padStart(4)} KB raw  ` +
        `${(gz / 1024).toFixed(0).padStart(3)} KB gzip`,
    );
  };

  write("usfs-forests.json", forests);
  write("usfs-regions.json", regions);

  // The layer registry. Invariant 5: the set of geographies is versioned data,
  // so adding a layer is a data release rather than a component change, and
  // invariant 7: the names live here rather than in a label map in the UI.
  // us-states.json is listed but not produced here — it predates this script.
  const manifest = {
    version,
    source:
      "USFS EDW ForestSystemBoundaries, Administrative Forest Boundaries (national extent)",
    fetch_params: { forests: FOREST_PARAMS, regions: REGION_PARAMS },
    min_ring_km2: MIN_RING_KM2,
    layers: [
      {
        id: "usfs_region",
        name: "USFS regions",
        unit: "region",
        file: "usfs-regions.json",
        key_prop: "key",
        name_prop: "name",
        region_types: ["usfs_region"],
        features: regions.length,
      },
      {
        id: "national_forest",
        name: "National forests",
        unit: "forest",
        file: "usfs-forests.json",
        key_prop: "key",
        name_prop: "name",
        region_types: ["national_forest"],
        features: forests.length,
      },
      {
        id: "state",
        name: "States",
        unit: "state",
        file: "us-states.json",
        key_prop: "fips",
        name_prop: "name",
        region_types: ["state_avg", "statewide"],
        features: 51,
      },
    ],
  };
  writeFileSync(
    join(OUT_DIR, "layers.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(`  ${"layers.json".padEnd(22)} ${manifest.layers.length} layers`);

  console.log(
    `\nrings ${ringsBefore.toLocaleString()} -> ${ringsAfter.toLocaleString()} ` +
      `(dropped ${(((ringsBefore - ringsAfter) / ringsBefore) * 100).toFixed(1)}% under ${MIN_RING_KM2} km²)`,
  );
  console.log(`version ${version}`);
  return { version, forests: forests.length, regions: regions.length };
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
