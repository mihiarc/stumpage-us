// The state-by-state catalogue of US timber price reporting services: who
// publishes prices, whether the report is still alive, and whose data it
// actually is. Seeded from the web-verified source inventory in the
// timber-prices repo (docs/PUBLIC_SOURCE_CATALOGUE.md, verified 2026-06-25).
//
// `provenance` is the column that makes the catalogue usable: many "free"
// state price reports are licensed TimberMart-South redistributions — free to
// read, but the numbers are copyrighted survey data, not public data.
//
// Two exports, and the distinction between them is the point. DIRECTORY
// records organizations. STATE_RESEARCH records the *sweep* — including
// states searched with nothing found, which a per-organization list
// structurally cannot express. A state absent from STATE_RESEARCH has not
// been searched, which is a different claim from having been searched and
// found empty. Conflating the two is what makes a coverage figure unciteable.

export type EntryStatus = "live" | "stale" | "dead" | "paywalled" | "unverified";
export type Provenance =
  | "independent" // the agency/university collects its own survey or sale data
  | "tms" // licensed TimberMart-South redistribution
  | "commercial" // paid commercial service
  | "tax" // administrative/tax-assessed values, not market transactions
  | "derived"; // derived from another listed source

export interface DirectoryEntry {
  state: string | "US" | "INTL"; // USPS code, or US-wide / international
  org: string;
  report: string;
  url: string;
  status: EntryStatus;
  provenance: Provenance;
  frequency?: string;
  units?: string;
  notes?: string;
  latestKnown?: string; // most recent issue seen when last verified
  inDataset?: string; // source_code if integrated into our dataset
  verified?: string; // ISO date this entry was last individually re-checked
}

/**
 * Floor date for the catalogue: every entry was checked at least this recently.
 * Per-entry `verified` overrides it. Bump this only when *all* entries have
 * been re-swept — otherwise it asserts something false about the ones that
 * weren't. Use `entryVerified()` rather than reading either value directly.
 */
export const DIRECTORY_VERIFIED_DATE = "2026-06-25";

/** The date an entry was last checked: its own, else the catalogue floor. */
export function entryVerified(e: DirectoryEntry): string {
  return e.verified ?? DIRECTORY_VERIFIED_DATE;
}

export const DIRECTORY: DirectoryEntry[] = [
  // ---- National ----
  {
    state: "US",
    org: "USDA Forest Service",
    report: "Cut-and-Sold reports (National Forest timber sales, all 9 regions)",
    url: "https://www.fs.usda.gov/forestmanagement/products/cut-sold/",
    status: "live",
    provenance: "independent",
    frequency: "Quarterly",
    units: "$/MBF (derived value ÷ volume)",
    notes:
      "Realized National-Forest sawtimber stumpage. Machine-readable XLSX for the current quarter; full history back to FY1977 as PDFs.",
    inDataset: "usfs_cutsold",
  },
  {
    state: "US",
    org: "USDA Forest Service PNW Research Station",
    report: "Production, Prices, Employment & Trade in NW Forest Industries (1958–2023)",
    url: "https://research.fs.usda.gov/pnw/products/dataandtools/tools/production-prices-employment-and-trade-northwest-forest-industries-all",
    status: "live",
    provenance: "independent",
    frequency: "Annual",
    units: "$/MBF Scribner",
    notes: "Western public-lands stumpage by USFS region and state × agency.",
    inDataset: "pnw",
  },
  {
    state: "US",
    org: "USDA Forest Service Southern Research Station",
    report: "Legacy Timber Price Information & Contacts directory",
    url: "https://www.srs.fs.usda.gov/econ/timberprices/",
    status: "stale",
    provenance: "independent",
    notes:
      "The site this project succeeds. Still online with per-state agency and consultant links, but no longer actively maintained.",
  },
  {
    state: "US",
    org: "ResourceWise (Forest2Market)",
    report: "Stumpage 360 / TimberMart-South commercial services",
    url: "https://www.resourcewise.com/timber-prices/stumpage-prices",
    status: "paywalled",
    provenance: "commercial",
    notes: "Subscription transaction-based price services for the US South.",
  },

  // ---- Southeast ----
  {
    state: "TX",
    org: "Texas A&M Forest Service",
    report: "Timber Price Trends",
    url: "https://tfsweb.tamu.edu/forest-land/forest-industry-economics/timber-price-trends/",
    status: "live",
    provenance: "independent",
    frequency: "Bimonthly",
    units: "$/ton and $/MBF Doyle",
    notes: "Independent ~60-cooperator survey of East Texas sales; history to 1984.",
    latestKnown: "Nov–Dec 2025",
  },
  {
    state: "GA",
    org: "Georgia Department of Revenue",
    report: "Owner Harvest Timber Values",
    url: "https://dor.georgia.gov/local-government-services/digest-compliance/owner-harvest-timber-values",
    status: "live",
    provenance: "independent",
    frequency: "Annual",
    units: "$/ton (weighted average of actual sale filings)",
    notes: "Built from county PT-283T harvest filings — actual transactions.",
    latestKnown: "2026",
  },
  {
    state: "AR",
    org: "University of Arkansas Cooperative Extension",
    report: "Timber Price Report",
    url: "https://www.uaex.uada.edu/environment-nature/forestry/timber-price-report.aspx",
    status: "live",
    provenance: "tms",
    frequency: "Quarterly",
    units: "$/ton",
    notes: "Free to read, but the values are licensed TimberMart-South data.",
  },
  {
    state: "NC",
    org: "NC State Extension Forestry",
    report: "Forestry Price Data",
    url: "https://forestry.ces.ncsu.edu/forestry-price-data/",
    status: "live",
    provenance: "tms",
    frequency: "Quarterly",
    units: "$/ton",
    notes:
      "Forest2Market data 2005–2014, TimberMart-South 2015→ — licensed, not original public data.",
  },
  {
    state: "MS",
    org: "Mississippi State University Extension",
    report: "Timber Prices",
    url: "https://extension.msstate.edu/natural-resources/forestry/forest-economics/timber-prices",
    status: "live",
    provenance: "tms",
    frequency: "Quarterly",
    units: "$/ton",
    notes: "Explicit TimberMart-South agreement since 2013.",
  },
  {
    state: "SC",
    org: "South Carolina Forestry Commission",
    report: "Current Timber Price Report",
    url: "https://www.scfc.gov/",
    status: "live",
    provenance: "tms",
    frequency: "Quarterly",
    units: "$/ton",
    notes: "TimberMart-South partnership.",
  },
  {
    state: "VA",
    org: "Virginia Tech — Forest Landowner Education",
    report: "Historic Virginia Timber Stumpage Prices",
    url: "https://forestupdate.frec.vt.edu/resources/HistoricVirginiaTimberStumpagePrices.html",
    status: "unverified",
    provenance: "tms",
    frequency: "Quarterly",
    units: "$/ton",
    notes: "Likely live (direct fetch failed at last verification). TMS redistribution.",
  },
  {
    state: "AL",
    org: "Alabama Forestry Commission / Auburn ACES",
    report: "(no native price series — TMS-based commentary only)",
    url: "https://forestry.alabama.gov/",
    status: "live",
    provenance: "tms",
    notes: "No independent Alabama series exists; references TimberMart-South.",
  },
  {
    state: "FL",
    org: "UF/IFAS Florida Land Steward",
    report: "Timber Price Update (narrative)",
    url: "https://programs.ifas.ufl.edu/florida-land-steward/",
    status: "live",
    provenance: "tms",
    frequency: "Irregular",
    notes: "Commentary citing TimberMart-South; no data table.",
  },
  {
    state: "TN",
    org: "Tennessee Division of Forestry",
    report: "Forest Products Bulletin",
    url: "https://www.tn.gov/agriculture/businesses/business-development/forest-products/tfpb.html",
    status: "dead",
    provenance: "independent",
    notes: "No longer in production — last issue 2017. Archive still posted.",
  },

  // ---- Lake States & Central ----
  {
    state: "MI",
    org: "Michigan DNR (Forest Management)",
    report: "State Forest Stumpage Price Reports",
    url: "https://www2.dnr.state.mi.us/ftp/forestry/tsreports/StumpagePriceReports/",
    status: "live",
    provenance: "independent",
    frequency: "Quarterly",
    units: "$/MBF (Scribner & International ¼″, varies by unit) + $/cord",
    notes:
      "Volume-weighted bids from state-forest timber sales, by Forest Management Unit. The cleanest machine-readable state source (XLSX).",
    latestKnown: "Q1 2026",
    inDataset: "mi_dnr",
  },
  {
    state: "MO",
    org: "Missouri Department of Conservation",
    report: "Timber Price Trends",
    url: "https://research.mdc.mo.gov/",
    status: "live",
    provenance: "independent",
    frequency: "Quarterly (rolling 12-month)",
    units: "$/MBF Doyle and International ¼″",
    notes: "Two regions (N/S).",
    latestKnown: "Oct–Dec 2025",
  },
  {
    state: "KY",
    org: "Kentucky Division of Forestry",
    report: "Delivered Log Price Report",
    url: "https://eec.ky.gov/Natural-Resources/Forestry/resource-utilization-and-marketing/",
    status: "live",
    provenance: "independent",
    frequency: "Semi-annual",
    units: "$/MBF (DELIVERED, not stumpage)",
    latestKnown: "Jan 2026 (H2 2025)",
  },
  {
    state: "OH",
    org: "OSU Extension + Ohio Division of Forestry",
    report: "Ohio Timber Price Report",
    url: "https://woodlandstewards.osu.edu/ohio-timber-price-report",
    status: "live",
    provenance: "independent",
    frequency: "Semi-annual",
    units: "$/MBF Doyle (stumpage + delivered)",
    notes: "Survey running since 1960; 3 regions.",
    latestKnown: "Jan 2026",
  },
  {
    state: "IL",
    org: "Illinois DNR / Illinois Dept. of Agriculture",
    report: "Illinois Timber Prices",
    url: "https://dnr.illinois.gov/conservation/forestry/illinois-timber-prices.html",
    status: "live",
    provenance: "independent",
    frequency: "Semi-annual",
    units: "$/MBF Doyle (stumpage + FOB-mill)",
    notes: "~17 species.",
    latestKnown: "Spring–Summer 2025",
  },
  {
    state: "MN",
    org: "Minnesota DNR",
    report: "Public Stumpage Price Review & Price Index",
    url: "https://www.dnr.state.mn.us/forestry/timbersales/stumpage.html",
    status: "stale",
    provenance: "independent",
    frequency: "Annual",
    units: "$/cord and $/MBF",
    notes: "Series appears stalled — nothing found after the 2021 review.",
  },
  {
    state: "IN",
    org: "Indiana DNR / Purdue FNR Extension",
    report: "Indiana Forest Products Price Report",
    url: "https://www.purdue.edu/fnr/extension/timber-price-report/",
    status: "stale",
    provenance: "independent",
    frequency: "Semi-annual (nominal)",
    units: "$/MBF Doyle",
    notes:
      "Official report frozen at 2020; the Indiana consulting-foresters association posts a 2024 surrogate.",
  },
  {
    state: "WI",
    org: "Wisconsin DNR",
    report: "FCL/MFL Stumpage Rates",
    url: "https://dnr.wisconsin.gov/",
    status: "live",
    provenance: "tax",
    frequency: "Annual",
    units: "$/cord and $/MBF",
    notes:
      "Administrative tax rates for Forest Crop Law / Managed Forest Law land — explicitly 'not market prices'.",
    latestKnown: "RY2026",
  },
  {
    state: "MI",
    org: "Forest Data Network",
    report: "FDN Prime (WI/MI/MN stumpage database)",
    url: "https://forestdatanetwork.com/",
    status: "paywalled",
    provenance: "commercial",
    notes: "Commercial aggregation; legacy subscriptions discontinued.",
  },

  // ---- Northeast & Mid-Atlantic ----
  {
    state: "PA",
    org: "Penn State Extension",
    report: "PA Woodlands Timber Market Report",
    url: "https://extension.psu.edu/timber-market-report-archives",
    status: "live",
    provenance: "independent",
    frequency: "Quarterly",
    units: "$/MBF Doyle (stumpage + delivered)",
    notes: "Survey since 1992; 4 regions. The most current Northeast report.",
    latestKnown: "Q1 2026",
  },
  {
    state: "ME",
    org: "Maine Forest Service (DACF)",
    report: "Stumpage Price Reports (annual, county-level)",
    url: "https://www.maine.gov/dacf/mfs/publications/annual_reports.html",
    status: "live",
    provenance: "independent",
    frequency: "Annual",
    units: "$/MBF, $/cord, $/ton by product",
    notes: "County/unit grain — the finest-grain Northeast series.",
    latestKnown: "2024 data (published Dec 2025)",
  },
  {
    state: "NY",
    org: "NYS Department of Environmental Conservation",
    report: "Stumpage Price Report",
    url: "https://dec.ny.gov/nature/forests-trees/private-forest-management/stumpage-price-reports",
    status: "live",
    provenance: "independent",
    frequency: "Semi-annual",
    units: "$/MBF (Doyle & International) sawtimber; $/cord pulp",
    notes: "Voluntary reporting; 4 regions.",
    latestKnown: "Winter 2025 (#106)",
  },
  {
    state: "VT",
    org: "VT Department of Forests, Parks & Recreation",
    report: "Stumpage Price Reports",
    url: "https://fpr.vermont.gov/stumpage-price-reports",
    status: "stale",
    provenance: "independent",
    frequency: "Quarterly (nominal)",
    units: "$/MBF International sawtimber; $/cord pulp/firewood",
    notes: "Data stale at last check — nothing newer than 2023 Q3 found.",
  },
  {
    state: "NH",
    org: "NH Department of Revenue Administration",
    report: "Average Stumpage Value Information",
    url: "https://www.revenue.nh.gov/taxes-glance/timber-tax/average-stumpage-value-information",
    status: "live",
    provenance: "tax",
    frequency: "Semi-annual",
    units: "$/MBF, $/cord, $/ton (suggested low–high)",
    notes: "Timber-tax guidance values, not market transactions.",
    latestKnown: "Oct 2025–Mar 2026",
  },
  {
    state: "WV",
    org: "WVU Appalachian Hardwood Center + WV Division of Forestry",
    report: "West Virginia Timber Prices (interactive tool)",
    url: "https://timberprices.wvu.edu/",
    status: "live",
    provenance: "independent",
    frequency: "Semi-annual",
    units: "$/MBF Doyle",
    notes: "Moved from Excel downloads to an interactive web tool; 5 regions + state average.",
    latestKnown: "Jan 2026",
  },
  {
    state: "MA",
    org: "UMass MassWoods",
    report: "Southern New England Stumpage Survey (MA/CT/RI)",
    url: "https://masswoods.org/southern-new-england-stumpage-survey",
    status: "live",
    provenance: "independent",
    frequency: "Quarterly",
    units: "$/MBF, $/cord, $/ton (median + range)",
    notes: "Two regions (east/west of the Connecticut River). Also covers CT and RI.",
    latestKnown: "Q1 2026",
  },
  {
    state: "CT",
    org: "UMass MassWoods",
    report: "Southern New England Stumpage Survey (MA/CT/RI)",
    url: "https://masswoods.org/southern-new-england-stumpage-survey",
    status: "live",
    provenance: "independent",
    frequency: "Quarterly",
    units: "$/MBF, $/cord, $/ton (median + range)",
  },
  {
    state: "RI",
    org: "UMass MassWoods",
    report: "Southern New England Stumpage Survey (MA/CT/RI)",
    url: "https://masswoods.org/southern-new-england-stumpage-survey",
    status: "live",
    provenance: "independent",
    frequency: "Quarterly",
    units: "$/MBF, $/cord, $/ton (median + range)",
  },
  {
    state: "NJ",
    org: "—",
    report: "No free state stumpage report found",
    url: "https://www.srs.fs.usda.gov/econ/timberprices/data.php?location=NJ",
    status: "dead",
    provenance: "independent",
    notes: "No known public series; the legacy SRS page lists general contacts.",
  },

  // ---- West ----
  {
    state: "OR",
    org: "Oregon Department of Forestry",
    report: "State-Forest Timber Sale Results",
    url: "https://apps.odf.oregon.gov/Divisions/management/asset_management/saleresults.asp",
    status: "live",
    provenance: "independent",
    frequency: "Rolling (~3-year window)",
    units: "$/MBF Scribner (winning auction bids)",
    inDataset: "or_odf",
  },
  {
    state: "OR",
    org: "Oregon Department of Forestry",
    report: "Third-Party Log Prices (open data)",
    url: "https://data.oregon.gov/Natural-Resources/Third-Party-Log-Prices/fttw-7ukt",
    status: "stale",
    provenance: "independent",
    units: "$/MBF pond (delivered)",
    notes: "Open API but frozen at 2000–2015. The newer 'Log Prices' set is now login-gated.",
  },
  {
    state: "WA",
    org: "Washington Department of Revenue",
    report: "Stumpage Value Determination Tables",
    url: "https://dor.wa.gov/taxes-rates/other-taxes/forest-tax/stumpage-value-determination-tables",
    status: "live",
    provenance: "tax",
    frequency: "Semi-annual",
    units: "$/MBF",
    notes: "Tax-assessed stumpage values by Stumpage Value Area; archive back to 1975.",
    latestKnown: "2026 H1",
  },
  {
    state: "WA",
    org: "Washington DNR",
    report: "Timber Auction Results / Bid Records",
    url: "https://www.dnr.wa.gov/programs-and-services/product-sales-and-leasing/timber-sales/timber-auction-results",
    status: "live",
    provenance: "independent",
    frequency: "Monthly auctions",
    units: "$/MBF Scribner (realized bids)",
    notes: "Also a monthly delivered log price survey and quarterly economic forecasts.",
  },
  {
    state: "MT",
    org: "University of Montana BBER",
    report: "Quarterly Log Prices (delivered)",
    url: "https://www.bber.umt.edu/fir/F_LogPrice.asp",
    status: "live",
    provenance: "independent",
    frequency: "Quarterly",
    units: "$/MBF Scribner (mill-DELIVERED)",
    inDataset: "mt_bber",
  },
  {
    state: "MT",
    org: "Montana DNRC",
    report: "Trust-Land Timber Sale Bid Results",
    url: "https://dnrc.mt.gov/Forestry/Forest-Products/timber-sales",
    status: "live",
    provenance: "independent",
    frequency: "Per sale (FY2023→)",
    units: "$/ton (winning bids, volume-weighted)",
    inDataset: "mt_dnrc",
  },
  {
    state: "CA",
    org: "California CDTFA",
    report: "Timber Yield Tax — Harvest Value Schedules",
    url: "https://www.cdtfa.ca.gov/taxes-and-fees/timber-yield-tax/harvest-value-and-statistics.htm",
    status: "live",
    provenance: "tax",
    frequency: "Semi-annual",
    units: "$/MBF net Scribner",
    notes:
      "Survey-derived, tax-assessed harvest values by Timber Value Area — the only recurring California series.",
    latestKnown: "2026 H1",
  },
  {
    state: "ID",
    org: "Idaho Department of Lands",
    report: "Endowment Timber Sales (+ monthly Land Board sale reports)",
    url: "https://www.idl.idaho.gov/about-forestry/endowment-timber-sales/",
    status: "live",
    provenance: "independent",
    frequency: "Annual (FY) + monthly sale reports",
    units: "$/MBF Scribner (auction)",
    notes: "The Idaho Tax Commission's yield-tax schedule is derived from these sales.",
  },
  {
    state: "AK",
    org: "Alaska DNR Division of Forestry",
    report: "Timber Sales",
    url: "https://forestry.alaska.gov/timber/",
    status: "live",
    provenance: "independent",
    units: "$/MBF Scribner long-log",
    notes: "Appraised/negotiated values (not open-auction bids) — treat as minimums.",
  },

  // ---- International ----
  {
    state: "INTL",
    org: "BC Ministry of Forests (Canada)",
    report: "Interior & Coast log market reports",
    url: "https://www2.gov.bc.ca/gov/content/industry/forestry/competitive-forest-industry/timber-pricing",
    status: "unverified",
    provenance: "independent",
    notes: "Listed on the legacy SRS site; verify before relying on it.",
  },
  {
    state: "INTL",
    org: "UN Economic Commission for Europe / FAO",
    report: "Forest Products Annual Market Review",
    url: "https://unece.org/forests/forest-products-annual-market-review",
    status: "unverified",
    provenance: "independent",
    notes: "Listed on the legacy SRS site; verify before relying on it.",
  },
];

export function directoryForState(code: string): DirectoryEntry[] {
  return DIRECTORY.filter((e) => e.state === code);
}

/**
 * The research log: one record per place we have actually searched.
 *
 * `outcome: "none-known"` is a positive finding — we looked and found no
 * public price source — and is only defensible because `checked` lists what
 * was looked at. A place with no record here has not been searched at all;
 * do not infer absence from a missing record.
 */
export interface StateResearch {
  state: string | "US" | "INTL";
  searched: string; // ISO date of the sweep
  outcome: "found" | "none-known";
  checked?: string[]; // organizations/sites swept — the evidence for "none-known"
  note?: string;
}

export const STATE_RESEARCH: StateResearch[] = [];

export function researchForState(code: string): StateResearch | undefined {
  return STATE_RESEARCH.find((r) => r.state === code);
}
