# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

Package manager is **bun** (`bun.lock`); there is no test suite.

```bash
bun install
bun run dev                                    # dev server (basePath empty)
bun run build                                  # static export -> out/ (also typechecks)
bun run lint                                   # eslint (flat config, next core-web-vitals + ts)
bunx tsc --noEmit                              # typecheck alone, faster than a build
bun run build:geo                              # refetch map boundary layers (network; not part of build)
NEXT_PUBLIC_BASE_PATH=/stumpage-us bun run build   # reproduce the CI/Pages build exactly
```

Do not run `bun run build` while `bun run dev` is live: both write `.next`, and the dev
server then serves stale CSS — new Tailwind utilities and new custom properties resolve
empty until you kill it, `rm -rf .next`, and restart.

`README.md` holds the quarterly data-refresh runbook and the deployment story — read it
before touching `public/data/` or the Pages workflow.

## Architecture

Next.js App Router with `output: "export"` — **there is no server at runtime**. Everything is
either baked at build time or fetched as a static file by the browser. Two data paths, and
mixing them up is the most common mistake here:

1. **Build-time** (`src/lib/data.ts`): server components and `generateStaticParams` read
   `public/data/*.json` with `node:fs` and memoize in a module-level cache. Cheap to call
   anywhere in a server component; never importable from a `"use client"` file.
2. **Client-time** (`src/components/explorer.tsx`, `coverage-map.tsx`): `fetch()` of the same
   files over HTTP, with module-level promise caches so chunks survive route changes. The
   1.7 MB `series_index.json` and the per-source `prices/{source}.json` chunks reach the
   *browser* only this way. Server pages do read `series_index.json` at build time through
   `getSeriesIndex`/`getSeriesByRegion` (`/sources/[code]`, `/regions`, `/regions/[code]`,
   `coverage.ts`) — that is free, since nothing is sent to the client. The rule is that
   neither file may be pulled into a client bundle, not that server code must avoid them.

Every dynamic route (`states/[code]`, `sources/[code]`) must export `generateStaticParams`;
a static export has no fallback rendering.

### basePath — three places must agree

GitHub Pages serves the site under `/stumpage-us`. `next/link` and `next/image` handle that
automatically; **raw URLs do not**. Any `fetch()`, `<a href>`, or MapLibre source URL must go
through `asset()` from `src/lib/asset.ts`. The prefix is set in three files that must stay in
sync: `next.config.ts` (`basePath`), `src/lib/asset.ts` (`BASE_PATH`), and the
`NEXT_PUBLIC_BASE_PATH` env var in `.github/workflows/deploy.yml`. Attaching the custom domain
means clearing it in the workflow, not in the code.

### Data contract

`src/lib/types.ts` is a hand-written mirror of the artifacts emitted by `export_public.py` in
the private `mihiarc/timber-prices` repo. Price rows use single-letter keys to keep the chunks
small (`r`/`sp`/`p`/`m`/`y`/`q`/`t`/`o`/`u`/`e`); the authoritative decoder is
`chunk_keys` in `public/data/manifest.json`. If a field changes upstream, update `types.ts` and
the manifest together — nothing validates the JSON at runtime.

A **series** is the unit of everything user-facing: one `(source, region, species, product,
market)` tuple, identified by `seriesId()` in `src/lib/format.ts` (tilde-joined) and used as
both the URL selection token and the chart key.

### Geography

Series are not state-grained. `src/lib/geo.ts` owns the mapping from a series to the states it
covers (`seriesStates`): state and sub-state grains map to themselves, USFS regions and
multi-state averages fan out to member states, and **national-forest series map to nothing on
purpose** — there is no forest→state table, and fanning them across a whole USFS region would
badly overstate coverage. `src/lib/coverage.ts` rolls this up into the per-state counts that
drive `/states` and the map. Changing `seriesStates` silently changes the map, the coverage
counts, and the explorer's state filter at once.

### Content vs. data

Three categories, not two. `public/data/**` is generated **upstream** and must never be
hand-edited. `public/coverage/**` and `public/geo/**` are generated **here** — by
`bun run export:coverage` (deterministic, runs inside `bun run build`) and
`bun run build:geo` (fetches two USFS ArcGIS services, so it is deliberately *outside*
`build` to keep builds reproducible; commit its output). `src/content/*.ts` is the opposite of all
three: hand-maintained prose that no pipeline produces — the state-by-state
`directory.ts` (with `status` + `provenance` flags marking which "free" reports are licensed
TimberMart-South redistributions), plus per-source method notes and official links. Editorial
corrections go there; numeric corrections go upstream in the timber-prices repo.

### Map layers

The map (`src/components/boundary-map.tsx`) switches geography rather than re-cutting the
data: each layer draws its own boundaries and fills the units that have prices. This matters
because only 56 of 3,490 series are state-grained — 2,316 are per national forest — so a
state choropleth would assign a forest's price to a boundary nobody published it against.

The layer set is data (`public/geo/layers.json`), per ROADMAP invariant 5, and
`src/lib/geo-layers.ts` does the build-time join. A Cut-and-Sold code carries its USFS org
code (`cs_r1_f02` = region 01, forest 02 = `0102`), which is the boundary layer's own key, so
forests join with no hand-built mapping. Units the join cannot place — 25 pre-merger forests,
plus anything outside the CONUS frame — are counted under the map rather than dropped.

`src/components/coverage-map.tsx` is the older state choropleth, still used by `/states`; it
colours by a fanned-out per-state count and carries the overstatement `seriesStates` warns
about.

### Charts and URL state

Charts use visx against the `--viz-*` tokens in `src/app/globals.css` (both themes defined;
never hardcode a hex in a chart). The explorer assigns each selected series a **color slot** that
persists until that series is removed, so deselecting one never repaints the others. Prices are
harmonized to $/green ton, with the published unit offered as a toggle only when every selected
series shares a unit.

All explorer filter and selection state lives in the URL via `nuqs` (`src/components/explorer.tsx`
keys: `src`, `rt`, `st`, `sg`, `sp`, `p`, `m`, `sel`), which is what makes any view shareable —
keep new filters in the URL rather than in component state.

## Licensing constraint

Licensed TimberMart-South/North data must never enter this repo. The only sanctioned way to
update `public/data/` is running the upstream export script, which hard-fails on any
non-allowlisted source. Code is MIT (`LICENSE`); data is CC BY 4.0 (`LICENSE-DATA.md`).
