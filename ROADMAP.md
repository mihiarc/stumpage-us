# v1.0 Roadmap

Roughly thirteen weeks from **2026-08-30**, gated by the green-GDP paper needing a
citable public artifact. Phases are ordered so that gate clears first and nothing
downstream can threaten it.

Design rationale and the interview it came from live in the v1.0 plan
(private artifact: <https://claude.ai/code/artifact/10515cf7-1db3-4ea1-aa5c-089f8ed1a5fc>).
This file is the execution half.

## What v1.0 is

A place-first price site for **foresters, landowners and timber asset managers**
— in that order, ahead of journalists, agency staff, and researchers last. Someone
arrives, says where their land is, and gets every market their timber could be
sold into, in the unit their region quotes, with the evidence behind each figure.

The current site inverts this: the explorer is the most-built thing in the repo
and it serves the last-ranked user. Correcting that is the work.

## Design invariants

Settled decisions. Don't relitigate them mid-build without a reason that came
from a user.

1. **The answer is a ladder, not a number.** A stand can be sold as sawtimber,
   chip-n-saw or pulpwood. Only the owner knows what grade they hold, so show
   every rung and pick none. Corollary: don't interpret the ladder either — no
   saw-to-pulp spread, no "now is a good time to sell".
2. **Markets are grouped, never merged.** Private transactions, state sales and
   federal sales are different markets, not three readings of one price. Never
   average across ownership basis, and never across stumpage and delivered.
3. **Units follow the view.** Local views lead with the unit the source
   published — $/ton in the South, $/MBF Scribner in the PNW, $/cord in the Lake
   States. Only national views harmonize to $/ton, and they disclose it: the
   conversion varies by region and several factors are explicit fallbacks.
4. **Three registers, always.** Current, trend, and reach of record on every
   rung. No staleness threshold — a 2008 figure is a fine historical number, it
   just has to say which question it answers.
5. **Geography is swappable data.** The real market-shed definition is
   unpublished research. Ship the crosswalk as a data artifact, version it, and
   record which version produced any rendered place. Swapping survey units for
   market sheds later must be a data release, not a refactor.
6. **Name geographies honestly.** A FIA survey unit is a survey unit — never a
   "market", "wood basket" or "price region". Survey units nest inside states
   because states run the survey, so they cannot bound a market that crosses a
   state line, and markets cross constantly.
7. **Vocabulary comes from data.** No hardcoded label maps. Every one is a place
   the frontend will silently disagree with the export as new sources land.
8. **Attribute spread only where reported.** The range inside a rung may be grade
   variation or something else. Where a source names the driver, say so; where it
   doesn't, show the band and resist the explanation.
9. **Caveats are contextual by risk.** Flag what changes the reading — federal
   sales are not the private market, the post-2019 Good Neighbor volume bias,
   unweighted ODF means. No badge on every row.
10. **Degrade gracefully.** Thin data is the expected case, not a failure state.
    Don't bet the schedule on breadth arriving.
11. **Desk and mobile are co-equal.** Map-click and the ladder each need a real
    phone layout, not a reflow.
12. **Zero running cost.** Unfunded and singly maintained. Anything needing a
    human every quarter will eventually stop working — prefer automation.

## Phase 1 — Clear the paper's dependency (weeks 1–2, Sep)

The article argues about coverage, so build that first while it is still small.
Everything here is editorial content in this repo, so it clears the gate even if
upstream data slips.

- [ ] Fill directory entries for the 16 states with none: AZ, CO, DE, HI, IA, KS,
      LA, MD, NE, NV, NM, ND, OK, SD, UT, WY. **LA and OK are R8 timber states.**
- [ ] Re-verify the 5 stale, 3 unverified and 2 dead entries
- [ ] Export directory status + provenance as a versioned, downloadable dataset
      alongside the prices
- [ ] `/coverage` page — what is published, by whom, how current, under what
      licence — with a citation block
- [ ] Attach the `stumpage.us` domain; drop `NEXT_PUBLIC_BASE_PATH` from
      `.github/workflows/deploy.yml` (see the note in `next.config.ts`)
- [ ] Add analytics and a privacy note — two of four success measures need it
- [ ] Remove the SRS-successor framing from `README.md` and `/about`

> **Gate:** the paper can cite a stable URL and a dataset.

**Needs an owner now.** The directory work is research, not code, and it sits on
the critical path.

## Phase 2 — Build the ladder (weeks 3–6, Sep–Oct)

Designed for desk and phone simultaneously, not reflowed afterward.

- [ ] **Upstream (timber-prices): evidence-kind field in the export.** `PriceRow.e`
      is one boolean and cannot express reported sale / survey mean / public
      auction / modeled. Blocks the rest of this phase.
- [ ] Plumb evidence kind through `src/lib/types.ts`; render from data
- [ ] Make vocabulary data-driven from the export — `UNIT_LABELS`,
      `OWNERSHIP_LABELS`, `MARKET_LABELS` (`src/lib/format.ts`),
      `REGION_TYPE_LABELS`, `USFS_REGION_STATES`, `MULTI_STATE_REGIONS`
      (`src/lib/geo.ts`)
- [ ] Ladder card — rungs are assortments, blocked by market basis, never averaged
- [ ] Per rung: current figure, movement, reach of record, range + sample count,
      end market (uses the dormant `end_market` field in `dims.products`)
- [ ] Regional unit leads; $/ton one click away with the conversion and its source
- [ ] Home: map plus a search field
- [ ] Place pages rebuilt around the ladder
- [ ] Per-series pages, linked from each rung — the historical register's new home
- [ ] **Delete the explorer** — only after series pages ship (see risk below)

> **Gate:** a forester reaches their full ladder in two clicks from home, on
> either device.

## Phase 3 — Intuitive geography (weeks 7–10, Oct–Nov)

The phase most likely to overrun, which is why it sits third.

- [ ] Region layer as versioned, swappable data — not a hardcoded geography
- [ ] Populate with FIA survey units as v1.0's stand-in; ship the county→`UNITCD`
      crosswalk as a data file. Public source: FIADB reference tables; a ready-made
      polygon layer exists as `stunitco` in FIESTAutils (3,233 county features on
      Census `cb_2018_us_county_5m`)
- [ ] Staged map — states nationally, county layer fetched per state on click.
      `public/geo/us-states.json` is already 882 KB for 50 polygons; national
      county geometry will not fit in one payload
- [ ] Place resolution always visible: asked-for grain and answered-from grain
- [ ] Rules for survey units with no series, and series spanning several units
- [ ] Surface the state-clipping caveat where a unit abuts a border
- [ ] National price map — one product, one market basis, harmonized $/ton, with
      the conversion's approximation on the legend
- [ ] Graceful degradation to state grain wherever the crosswalk has no answer

> **Gate:** click anywhere on the map, get an honest answer or an honest blank.

## Phase 4 — Defensibility, export, and a door in (weeks 11–13, Nov)

- [ ] Citation block and permalink on every rung and every chart
- [ ] Per-view CSV export
- [ ] Stable URLs for embeddable charts with provenance captions
- [ ] Caveat pass across all sources against the candor blocks
- [ ] Contribution form that reaches the maintainer — no accounts, no moderation
      queue, no infrastructure
- [ ] Automated link-rot check for directory liveness (not a quarterly promise to
      re-read 44 entries)
- [ ] Accessibility pass; mobile verified rather than retrofitted

> **Gate:** every number can be traced, cited and exported, and anyone can report
> that it's wrong.

## Built, waiting on data

Designed in v1.0, inert until the export carries what they need.

- **The stumpage/delivered gap.** The difference is harvest plus haul cost, which
  makes the residual identity visible. Needs matched stumpage *and* delivered
  series for the same place, product and period. Today all 46 delivered series are
  Montana BBER, against stumpage from other sources at other grains.
- **Chip-n-saw and other assortments.** `dims.products` has only three entries
  (pulpwood, sawtimber, veneer logs) and `timber_class` / `end_market` are
  currently 1:1. Southern data should bring at least chip-n-saw.

## Explicitly out of v1.0

| | |
|---|---|
| The explorer | Deleted outright, not deprecated. Its useful half becomes per-series pages. |
| Demand-side data | Mills, capacity, closures, end-market conditions → **v2.0**. Knock-on: without mill locations, market sheds stay assumed rather than derived. |
| Interpreting the ladder | The saw-to-pulp spread would be us making a call about someone else's timber. |
| Designing for institutional adoption | Administration by a BEA-like body is a ten-year goal. This UI is for the forester; the paper carries that argument. |
| Portfolio / multi-tract views | Ranked below defensible basis and export. Saved state implies accounts a static export can't carry. |
| Price × volume asset value | A whole new data dimension. The paper does this offline against the bulk download. |
| A national statistic headline | Landowners don't care about national; it's a supplement for secondary audiences. |
| A confidence tier or score | Rolling evidence, sample size and recency into one letter hides a judgment we'd have to defend. |
| A finished evidence taxonomy | Ship the field and a data-driven UI, not the final vocabulary. |

## Risks

- **Upstream schedule.** Three of four phases assume data this repo doesn't
  control. Mitigated by sequencing (phase 1 depends only on editorial content) and
  by invariant 10.
- **Deleting the explorer too early.** It is currently the only place the
  historical register exists at series depth. If series pages don't land in the
  same phase, "historical" collapses to a sparkline and a 1.5 MB parquet file.
  Sequence them together.
- **Value-engineering the guardrails.** "A defensible number" plus modeled
  estimates plus asset managers means figures that end up in valuation marks.
  The resolved-place line, evidence chip, range and citation are what make that
  safe to ship. They are not overhead.
- **Maintenance arithmetic.** Unfunded, one maintainer, already carrying a
  quarterly refresh, directory re-verification, per-source candor notes and now an
  inbound form.
- **Hero speaks to the analyst.** Leading with the record is a deliberate trade —
  credibility is the scarce resource — but the first screen addresses the analyst
  and the second the forester. Watch it once analytics exist.

## Open questions

- **What the market-shed research will emit, and roughly when** — the shape, not
  the answer. Polygons are a clean swap; county-to-shed weights or a distance-decay
  surface mean the region layer must carry weights.
- **Whether sheds will cross state lines and overlap.** Both are likely if haul
  economics bound them, and both break the one-place-one-region assumption survey
  units allow. Cheap now, expensive to retrofit.
- **How v2.0's demand side lands** — mill locations and capacity are what would
  make sheds derivable, so the v1.0 region layer should be shaped to receive them.
- **Who fills the directory gaps.** Critical path for phase 1.
- **Whether anything in v1.0 should avoid foreclosing monetization.** CC BY data
  and an unbranded public resource are right for adoption and weakest for capture.
  Authorship prominence is the cheap version that costs the public framing nothing.

## After v1.0

- **Launch as outreach, not publication** — extension offices and agencies already
  in the directory, forestry community channels, timed alongside the paper.
  Doubles as directory verification.
- **v2.0: the demand side.** Mills, capacity, closures and end markets — the other
  half of the equilibrium, and the input that turns assumed market sheds into
  derived ones.
