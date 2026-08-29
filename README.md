# US Timber Prices — stumpage.us frontend

A public catalog and explorer of US stumpage and delivered timber prices from
public sources — the community successor to the retired USDA Forest Service SRS
[Timber Price Information and Contacts](https://www.srs.fs.usda.gov/econ/timberprices/)
site.

Three pillars:

1. **Price explorer** (`/explore`) — filter and chart ~49.5k harmonized price
   records (3.5k series, 1959→present) from six public datasets.
2. **Directory** (`/directory`) — every US price reporting service we know of,
   with liveness + data-provenance flags (including which "free" reports are
   licensed TimberMart-South redistributions).
3. **Bulk downloads** (`/data`) — the full dataset as Parquet / CSV with a data
   dictionary and per-record source attribution.

## Stack

Next.js (App Router, **static export** — no server), TypeScript, Tailwind +
shadcn/radix, visx charts, MapLibre map, nuqs URL state. Package manager: bun.

```bash
bun install
bun run dev     # dev server
bun run build   # static export -> out/
bun run lint
```

Serve `out/` from any static host (Netlify, GitHub Pages, …).

## Deployment

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`
(live at <https://mihiarc.github.io/stumpage-us/>). The workflow builds with
`NEXT_PUBLIC_BASE_PATH=/stumpage-us`, which sets Next's `basePath` and the
`asset()` helper prefix — when the `stumpage.us` custom domain is attached,
remove that env var from the workflow and redeploy.

## Licenses

- **Code:** MIT (`LICENSE`).
- **Data** (`public/data/`): CC BY 4.0 (`LICENSE-DATA.md`); cite per
  `CITATION.cff` and credit the original publishing agency for specific
  prices.

## Data pipeline

All data under `public/data/` is **generated** — never edit it by hand. It is
exported from the private [`mihiarc/timber-prices`](https://github.com/mihiarc/timber-prices)
dbt-duckdb project, whose `v_public_prices` view is the license-clean surface
(licensed TimberMart-South/North rows are excluded by construction and proven
by a dbt test + an allowlist gate in the export script).

### Quarterly refresh runbook

```bash
cd ~/Github/mihiarc/data/timber-prices
uv run python scripts/etl_usfs_cutsold.py     # + any other source refreshes
uv run python scripts/export_public.py        # runs dbt build (tests) first
cp -r export/* ~/Github/mihiarc/frontend/stumpage-us/public/data/
cd ~/Github/mihiarc/frontend/stumpage-us
bun run build                                  # sanity-check the export
git add public/data && git commit -m "data: refresh public export"
```

`public/data/manifest.json` records the build timestamp and row counts.

### Artifact layout

| File | Purpose |
|---|---|
| `public_prices.parquet`, `public_prices.csv.gz` | full bulk downloads |
| `series_index.json` | one entry per series (the explorer's index) |
| `prices/{source}.json` | per-source record chunks, lazy-loaded for charts |
| `latest_by_state.json`, `annual_by_state.json` | state-level pre-aggregates |
| `dims.json`, `manifest.json`, `data_dictionary.md` | metadata & docs |
| `candor.json` | machine-readable expert caveats per source (CANDID-core five-categories blocks), rendered on `/sources/*` |

`public/geo/us-states.json` is a slimmed Census 20m states GeoJSON (lon/lat,
3-decimal coords) for the MapLibre map.

## Content

- `src/content/directory.ts` — the state-by-state directory (seeded from the
  timber-prices repo's `docs/PUBLIC_SOURCE_CATALOGUE.md`, web-verified
  2026-06-25). Update entries there; each carries status + provenance.
- `src/content/source-notes.ts` / `source-links.ts` — per-dataset method notes
  and official links shown on `/sources/*`.

## Deliberate design points

- **Geography is not state-only.** Series exist at state, sub-state (MI FMU,
  OR district, MT land office), USFS-region, national-forest, and multi-state
  grains. `src/lib/geo.ts` maps USFS regions / multi-state regions to member
  states; **national-forest series are not attributed to states** (no
  forest→state map yet — they're browsable via their USFS region instead).
- **Licensed data never enters this repo.** Only run the export script to
  update data; it hard-fails on any non-allowlisted source.
- Charts follow the dataviz-method specs (validated palette in `globals.css`
  `--viz-*` tokens, both themes; crosshair tooltip; harmonized $/ton with a
  published-unit toggle).
