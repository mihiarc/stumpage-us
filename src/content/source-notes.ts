// Method notes and caveats per dataset, shown on /sources/[code]. Sourced
// from the timber-prices repo's PUBLIC_SOURCE_CATALOGUE.md and dbt docs.
export const SOURCE_NOTES: Record<string, string[]> = {
  usfs_cutsold: [
    "Prices are realized National-Forest sawtimber stumpage, derived as sale value ÷ sold volume from the USFS Cut-and-Sold reports.",
    "$/MBF uses each region's standard log rule: Scribner in the West, International ¼″ in the South (R8) and North (R9), per USFS GTR-SRS-251 Table 1.",
    "Since FY2019 Q3, Good Neighbor Authority sale volumes are included in the source workbooks without their values; value=0 rows are dropped, but mixed aggregates retain a low bias where GNA is heavily used (R1/R6 especially).",
    "Annual history (FY1977–2021) is parsed from the archived PDF reports at national-forest grain; recent quarters come from the current-quarter XLSX snapshot at region grain. Fiscal quarters are mapped to calendar quarters (FY Q1 = Oct–Dec = prior calendar year Q4).",
    "Federal timber sale prices run systematically below private-market prices (Munn & Rucker 1995) — differences in sale size, road-building requirements, and species mix, not measurement error.",
  ],
  pnw: [
    "Annual average stumpage prices ($/MBF Scribner) for public timber in the Northwest, from the PNW Research Station's Production, Prices, Employment, and Trade series (1958–2023 edition; data through 2022).",
    "Two families: National-Forest sawtimber by species × USFS region, and public-lands stumpage by state × agency (USFS/BLM/BIA/State).",
    "A historical/backfill series — it is no longer updated, but overlaps the Cut-and-Sold history (R6 Douglas-fir tracks within a few percent every overlap year), validating both.",
  ],
  mi_dnr: [
    "Volume-weighted winning-bid stumpage from advertised Michigan State-Forest timber sales, by Forest Management Unit.",
    "The $/MBF log rule varies by unit (Scribner Decimal C in most of the UP, International ¼″ in the Lower Peninsula) — conversions are unit-aware.",
    "Region grain is nested (statewide / peninsula / state forest / management unit): filter to one level before aggregating.",
  ],
  or_odf: [
    "Realized winning bids (Bidder Rank 1) from competitive Oregon state-forest timber auctions, by ODF district; $/MBF Scribner.",
    "ODF publishes no per-species volumes, so aggregated prices are simple sale-count means (not volume-weighted); lo/hi carry the realized range.",
    "The source page is a rolling ~3-year window; deeper history exists only in sale prospectuses.",
  ],
  mt_bber: [
    "Mill-DELIVERED sawlog prices (not stumpage) from the University of Montana BBER quarterly survey of primary wood processors; $/MBF Scribner Decimal.",
    "Simple survey means — no per-species volumes are published.",
    "Montana appears in the statewide feed and in both USFS R2 and R4 multi-state feeds; filter to one region type to avoid double counting.",
  ],
  mt_dnrc: [
    "Winning-bid (Rank 1) sawlog stumpage in $/ton from Montana DNRC trust-land auctions, volume-weighted by estimated tons, at land-office grain plus a statewide rollup.",
    "Ponderosa pine is kept as its own species: it is routinely bid at a nominal ~$2/ton floor and would bias the combined softwood price down if folded in.",
    "Non-sawtimber columns (firewood, biomass, pulp) are excluded. History before FY2023 is available from DNRC only by request.",
  ],
};
