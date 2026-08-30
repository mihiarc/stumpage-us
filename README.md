# US Timber Prices — stumpage.us frontend

Every public US stumpage and delivered timber price series we can find —
harmonized, sourced, and free to reuse — plus a state-by-state record of who
reports timber prices and where no one does.

The United States has no national timber price statistic. Prices are published,
where they are published at all, by individual state agencies, university
extension programs, revenue departments and federal sale records, in
incompatible units and on unrelated schedules. This site is the record of what
exists.

Three pillars:

1. **Price explorer** (`/explore`) — filter and chart ~49.5k harmonized price
   records (3.5k series, 1959→present) from six public datasets.
2. **Directory** (`/directory`) — every US price reporting service we know of,
   with liveness + data-provenance flags (including which "free" reports are
   licensed TimberMart-South redistributions).
3. **Bulk downloads** (`/data`) — the full dataset as Parquet / CSV with a data
   dictionary and per-record source attribution.

> **This structure is the v0 standin.** See [`ROADMAP.md`](ROADMAP.md) for the
> v1.0 plan — a place-first ladder of every market a stand can be sold into,
> built for foresters and landowners rather than for the explorer. It also
> records the design invariants that constrain the work.

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
`asset()` helper prefix.

`bun run build` runs `export:coverage` first, so `public/coverage/` is always
regenerated from `src/content/directory.ts` before the site is built. Never
commit a hand-edited file there.

### Attaching the stumpage.us domain (deferred)

**The site stays on <https://mihiarc.github.io/stumpage-us/> for now.** The
custom domain is not being pursued this phase; `stumpage.us` had no DNS records
at all when checked on 2026-08-30. Anything citing the site should cite the
github.io URL.

Kept here because the flip is easy to get wrong: the basePath and the domain
have to move in the same commit, or every raw asset URL 404s. When you do want
it, do these in order, in one commit, once `dig +short stumpage.us` returns the
four GitHub Pages A records:

1. At the registrar, point the apex at GitHub Pages
   (`185.199.108.153`, `.109.153`, `.110.153`, `.111.153`) and `www` at
   `mihiarc.github.io`.
2. Add `public/CNAME` containing exactly `stumpage.us`. It is copied verbatim
   into `out/` and is what tells Pages to serve the custom domain.
3. Set `NEXT_PUBLIC_BASE_PATH: ""` in `.github/workflows/deploy.yml`.
   The value must stay in sync across three places — `next.config.ts`
   (`basePath`), `src/lib/asset.ts` (`BASE_PATH`) and this workflow env — but
   only the workflow needs editing, because the other two read the env var.
4. Enable *Enforce HTTPS* in the repository's Pages settings once GitHub has
   provisioned the certificate.

Verify after deploying: every raw `fetch()`, `<a href>` and MapLibre source URL
goes through `asset()`, so a missed prefix shows up as a 404 on
`/coverage/coverage.json` or a blank map rather than a build failure. `next/link`
and `next/image` handle basePath on their own and are not affected.

## Licenses

- **Code:** MIT (`LICENSE`).
- **Data** (`public/data/`, `public/coverage/`): CC BY 4.0
  (`LICENSE-DATA.md`); cite per `CITATION.cff` and credit the original
  publishing agency for specific prices.

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

### The coverage record (`public/coverage/`)

Generated **in this repo** by `scripts/export-coverage.ts` (`bun run
export:coverage`, and automatically as part of `bun run build`), not upstream.
It joins the catalogue in `src/content/directory.ts` against the price series
in `public/data/`, and is what `/coverage` renders and what the green-GDP paper
cites.

| File | Purpose |
|---|---|
| `coverage.json` | the full record: per-state research outcome, directory entries, price rollup, plus totals, definitions and citation metadata |
| `coverage_by_state.csv` | one flat row per state, for analysis |
| `directory.csv` | one row per catalogued report |

Shapes live in `src/lib/coverage-record.ts` and are shared by the writer (the
script) and the reader (the page), so the page can never display numbers the
downloadable record does not contain. `version` is derived from the inputs —
latest sweep date plus upstream build date — so re-running without new research
reproduces the same artifact instead of churning on a timestamp.

State→series attribution goes through `seriesStates()` in `src/lib/geo.ts`, the
same function behind the map and the state pages. Changing it changes all three
at once.

## Content

- `src/content/directory.ts` — the hand-maintained catalogue, and the only
  place editorial corrections belong. Two exports, and the distinction between
  them carries real weight:
  - `DIRECTORY` — one record per organization, each with status + provenance
    and an optional per-entry `verified` date. `DIRECTORY_VERIFIED_DATE` is the
    floor that applies to entries without one; read both through
    `entryVerified()` and only bump the floor when *every* entry has been
    re-swept.
  - `STATE_RESEARCH` — one record per place actually searched, carrying the
    sweep date, the outcome, and for a `none-known` finding the list of what
    was checked. A state missing from this list has not been searched, which is
    a different claim from having been searched and found empty. Nothing else
    in the codebase can express that difference, so do not collapse it.
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
