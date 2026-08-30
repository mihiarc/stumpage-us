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
    report: "Timber Price Information and Contacts (Forest Economics & Policy)",
    url: "https://research.fs.usda.gov/srs/centers/fep",
    status: "stale",
    provenance: "independent",
    notes:
      "Relocated but not maintained. The directory moved from srs.fs.usda.gov/econ/timberprices to research.fs.usda.gov, where it still carries a per-state page for all 50 states (/srs/centers/fep/timber{xx}) with an index date of 2025-06-02 and several state pages dated 2024-08-13. The dates overstate it: of the 13 states we swept through it, 11 listed only agency phone contacts and no price report at all, and its Maryland page still presents UMD Extension as a Maryland price source when that page publishes no Maryland prices and links out of state. Useful for finding a state forester; not reliable for finding out who reports prices. A federal website-review notice effective 2025-05-30 means these URLs may move again.",
    verified: "2026-08-30",
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
    url: "https://forestupdate.frec.vt.edu/resources/historic-virginia-timber-stumpage-prices.html",
    status: "live",
    provenance: "tms",
    frequency: "Quarterly",
    units: "$/ton",
    notes:
      "The old mixed-case URL now 404s; this is the current one. Statewide quarterly averages for six products (pine sawtimber, chip-n-saw and pulpwood; oak sawtimber, mixed hardwood sawtimber and pulpwood). The values are licensed TimberMart-South data.",
    verified: "2026-08-30",
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
    notes:
      "Confirmed discontinued: the page states \u201cThis product is no longer in production.\u201d A 1977—2017 archive is still posted as a single download.",
    latestKnown: "2017 (archive)",
    verified: "2026-08-30",
  },

  {
    state: "LA",
    org: "Louisiana Dept. of Agriculture & Forestry, Office of Forestry",
    report: "Quarterly Report of Forest Products",
    url: "https://www.ldaf.la.gov/land/forestry/forestry-reports",
    status: "live",
    provenance: "independent",
    frequency: "Quarterly",
    units: "$/ton and $/MBF, by five reporting areas",
    notes:
      "Genuinely independent and transaction-based, which is rare in the South: prices are \u201ctotal volume and total value ratios paid from bid and negotiated sales,\u201d gathered jointly by LDAF, the Louisiana Forestry Commission, the Dept. of Revenue and Taxation and the Tax Commission. Makes no reference to TimberMart-South. Also the basis for the state severance-tax values and for forest-land use-value assessment.",
    latestKnown: "Q1 2026",
    verified: "2026-08-30",
  },
  {
    state: "LA",
    org: "LSU AgCenter",
    report: "Louisiana Stumpage Report / Timber Tales newsletter",
    url: "https://www.lsuagcenter.com/articles/page1685631054382",
    status: "live",
    provenance: "tms",
    frequency: "Quarterly",
    units: "$/ton",
    notes:
      "Statewide averages for six products, with the quarter compared against the South-wide average. Free to read, but licensed data: \u201cThe sawtimber and pulpwood price data included in this newsletter are published with permission from TimberMart-South Athens, Georgia.\u201d For license-clean Louisiana prices use the LDAF quarterly instead. Verified from the publisher\u2019s index rather than a direct fetch, which failed on a TLS chain error.",
    latestKnown: "Timber Tales Vol. 26 No. 1 (2026)",
    verified: "2026-08-30",
  },
  {
    state: "OK",
    org: "Oklahoma State University Extension",
    report: "Oklahoma Timber Price Report",
    url: "https://extension.okstate.edu/topics/environment-and-natural-resources/forestry",
    status: "live",
    provenance: "independent",
    frequency: "Annual",
    units: "$/ton",
    notes:
      "Statewide averages for pine, hardwood, cedar, pulpwood and chip-n-saw, published as a numbered fact sheet each year with a market outlook. Thin evidence base, and it says so: statistics are \u201cderived from at least four and as many as nine quotes,\u201d and some stumpage figures are extrapolated from mill-delivered/stumpage differences rather than observed.",
    latestKnown: "2025 report (2026 outlook)",
    verified: "2026-08-30",
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
    notes:
      "Stalled, not retired: the page still describes collection in February—April and publication in late May or June, but 2021 remains the most recent review posted — five annual editions unaccounted for.",
    latestKnown: "2021",
    verified: "2026-08-30",
  },
  {
    state: "IN",
    org: "Indiana DNR Division of Forestry",
    report: "Indiana Forest Products Price Report and Trend Analysis",
    url: "https://secure.in.gov/dnr/forestry/forestry-publications-and-presentations/",
    status: "stale",
    provenance: "independent",
    frequency: "Semi-annual (nominal)",
    units: "$/MBF Doyle",
    notes:
      "Purdue FNR Extension no longer hosts this — its page now points to Indiana DNR, where the series runs spring/fall 2014—2020 and stops. DNR cautions the figures are log prices and should not be used to appraise standing timber; for Indiana stumpage see the Woodland Steward survey.",
    latestKnown: "Spring 2020",
    verified: "2026-08-30",
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

  {
    state: "IN",
    org: "Indiana Woodland Steward",
    report: "Indiana Consulting Foresters Stumpage Timber Price Report",
    url: "https://www.inwoodlands.org/forest-inventory-programs/",
    status: "live",
    provenance: "independent",
    frequency: "Annual",
    notes:
      "An annual survey of the consulting foresters practising in Indiana, published in the Woodland Steward newsletter and running back to at least 2010. This is the live Indiana stumpage series now that the DNR report is frozen at 2020 \u2014 and unlike the DNR figures it is stumpage rather than delivered log prices.",
    latestKnown: "2025",
    verified: "2026-08-30",
  },
  {
    state: "NE",
    org: "Nebraska Forest Service",
    report: "Timber Talk",
    url: "https://nfs.unl.edu/timber-talk",
    status: "stale",
    provenance: "independent",
    frequency: "Quarterly (March, June, September, December)",
    units: "$/MBF mill prices by species and grade",
    notes:
      "Mill/delivered prices, not stumpage. The newsletter states a quarterly schedule, but nothing after the December 2025 issue is posted — two issues unaccounted for. Full archive at digitalcommons.unl.edu/timbertalk.",
    latestKnown: "December 2025",
    verified: "2026-08-30",
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
    notes:
      "Quarterly by design, but nothing newer than 2023 Q3 is posted. Prices cover three state regions and are reported with the response count per species and product — unusually candid about sample size.",
    latestKnown: "2023 Q3",
    verified: "2026-08-30",
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
    state: "MD",
    org: "University of Maryland Extension",
    report: "Maryland/Delaware Stumpage Price Report",
    url: "https://extension.umd.edu/resource/timber-market-resources",
    status: "dead",
    provenance: "independent",
    frequency: "Biannual (while published)",
    notes:
      "Discontinued: \u201cThey no longer track stumpage prices but this archive of biannual reports spans late 1999 to mid-2006.\u201d Maryland has had no price series of its own since. The successor page publishes no Maryland numbers at all \u2014 it links out to Penn State, WVU and TimberMart-South.",
    latestKnown: "Mid-2006 (archive)",
    verified: "2026-08-30",
  },
  {
    state: "DE",
    org: "University of Maryland Extension",
    report: "Maryland/Delaware Stumpage Price Report",
    url: "https://extension.umd.edu/resource/timber-market-resources",
    status: "dead",
    provenance: "independent",
    frequency: "Biannual (while published)",
    notes:
      "The same joint Maryland/Delaware series, covering late 1999 to mid-2006 and discontinued since. It is the only Delaware price report we found; neither the Delaware Forest Service nor UD Cooperative Extension publishes a current one.",
    latestKnown: "Mid-2006 (archive)",
    verified: "2026-08-30",
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
    report: "Interior & Coast Log Market Reports",
    url: "https://www2.gov.bc.ca/gov/content/industry/forestry/competitive-forest-industry/timber-pricing/interior-timber-pricing/interior-log-market-reports",
    status: "live",
    provenance: "independent",
    frequency: "Rolling 3-month",
    units: "C$/m\u00b3",
    notes:
      "Delivered log prices, not stumpage — not comparable to US stumpage series without adjustment. Interior reports summarize arms-length log purchase transactions within the BC Interior; the Coast series reports Vancouver Log Market sales by species and grade. Timber-pricing index last updated 2026-01-27.",
    latestKnown: "3 months ending 2026-01-31 (Interior)",
    verified: "2026-08-30",
  },
  {
    state: "INTL",
    org: "UN Economic Commission for Europe / FAO",
    report: "Forest Products Annual Market Review",
    url: "https://unece.org/forests/forest-products-annual-market-review",
    status: "stale",
    provenance: "independent",
    frequency: "Annual (November)",
    notes:
      "Latest edition found is 2023—2024, published November 2024; no 2024—2025 edition surfaced, so one annual cycle is unaccounted for. Marginal for this directory in any case — chiefly production, trade and housing analysis for the UNECE region, with limited roundwood price content and none specific to US states.",
    latestKnown: "2023—2024 (Nov 2024)",
    verified: "2026-08-30",
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

export const STATE_RESEARCH: StateResearch[] = [
  {
    state: "US",
    searched: "2026-08-30",
    outcome: "found",
  },
  {
    state: "AK",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "AL",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "AR",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "AZ",
    searched: "2026-08-30",
    outcome: "none-known",
    checked: [
      "USFS SRS Forest Economics & Policy state page (2025-06-02)",
      "Arizona Dept. of Forestry and Fire Management",
      "University of Arizona Cooperative Extension",
    ],
    note:
      "The federal directory names a forest products specialist but no report. Arizona's commercial harvest is small and largely federal, so what volume exists shows up here through USFS Cut-and-Sold (R3).",
  },
  {
    state: "CA",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "CO",
    searched: "2026-08-30",
    outcome: "none-known",
    checked: [
      "USFS SRS Forest Economics & Policy state page (2025-06-02)",
      "Colorado State Forest Service (incl. its Timber Sales pages)",
      "Colorado State Land Board",
      "CSU Extension",
    ],
    note:
      "CSFS posts individual timber sales as they are offered, but publishes no recurring price series. Federal and BLM sales in Colorado reach this dataset through USFS Cut-and-Sold (R2).",
  },
  {
    state: "CT",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "DE",
    searched: "2026-08-30",
    outcome: "found",
    note:
      "Searched and found only the discontinued joint Maryland/Delaware series. No current Delaware source.",
  },
  {
    state: "FL",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "GA",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "HI",
    searched: "2026-08-30",
    outcome: "none-known",
    checked: [
      "USFS SRS Forest Economics & Policy state page (2025-06-02)",
      "Hawaii DLNR Division of Forestry and Wildlife",
      "University of Hawaiʻi Forestry Extension",
    ],
    note:
      "No price series found. Hawaii's commercial forestry is small and specialised (koa, eucalyptus plantations) with no public reporting.",
  },
  {
    state: "IA",
    searched: "2026-08-30",
    outcome: "none-known",
    checked: [
      "USFS SRS Forest Economics & Policy state page (2025-06-02)",
      "Iowa DNR Forestry",
      "Iowa State University Extension and Outreach Forestry",
    ],
    note:
      "Iowa has roughly 3 million acres of forest and an active hardwood industry, but neither the DNR nor ISU Extension publishes a stumpage price series. A substantive gap rather than an empty one.",
  },
  {
    state: "ID",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "IL",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "IN",
    searched: "2026-08-30",
    outcome: "found",
  },
  {
    state: "KS",
    searched: "2026-08-30",
    outcome: "none-known",
    checked: [
      "USFS SRS Forest Economics & Policy state page (2025-06-02)",
      "Kansas Forest Service",
      "Kansas State University Extension Forestry",
    ],
    note:
      "The Kansas Forest Service employs a marketing and utilization forester but publishes no price report.",
  },
  {
    state: "KY",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "LA",
    searched: "2026-08-30",
    outcome: "found",
  },
  {
    state: "MA",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "MD",
    searched: "2026-08-30",
    outcome: "found",
    note:
      "Searched and found only a discontinued series (1999–2006). Maryland has no current price report; the successor page links out of state.",
  },
  {
    state: "ME",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "MI",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "MN",
    searched: "2026-08-30",
    outcome: "found",
  },
  {
    state: "MO",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "MS",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "MT",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "NC",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "ND",
    searched: "2026-08-30",
    outcome: "none-known",
    checked: [
      "USFS SRS Forest Economics & Policy state page (2025-06-02)",
      "North Dakota Forest Service (NDSU)",
      "NDSU Extension",
    ],
    note:
      "No price series; North Dakota has little commercial timberland.",
  },
  {
    state: "NE",
    searched: "2026-08-30",
    outcome: "found",
    note:
      "Found one report, and it covers mill prices rather than stumpage — Nebraska has no stumpage series.",
  },
  {
    state: "NH",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "NJ",
    searched: "2026-08-30",
    outcome: "none-known",
    checked: [
      "USFS SRS Forest Economics & Policy state page (2025-06-02)",
      "New Jersey Forest Service",
      "NJ State Approved Foresters",
    ],
    note:
      "Confirms the finding this catalogue previously carried as a placeholder entry with no organisation attached: New Jersey has no public timber price series, only forestry contacts.",
  },
  {
    state: "NM",
    searched: "2026-08-30",
    outcome: "none-known",
    checked: [
      "USFS SRS Forest Economics & Policy state page (2025-06-02)",
      "New Mexico Forestry Division",
    ],
    note:
      "No price series. New Mexico harvest is predominantly federal and appears here through USFS Cut-and-Sold (R3).",
  },
  {
    state: "NV",
    searched: "2026-08-30",
    outcome: "none-known",
    checked: [
      "USFS SRS Forest Economics & Policy state page (2025-06-02)",
      "Nevada Division of Forestry",
      "University of Nevada Cooperative Extension",
    ],
    note:
      "No price series and effectively no commercial timber industry.",
  },
  {
    state: "NY",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "OH",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "OK",
    searched: "2026-08-30",
    outcome: "found",
  },
  {
    state: "OR",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "PA",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "RI",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "SC",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "SD",
    searched: "2026-08-30",
    outcome: "none-known",
    checked: [
      "USFS SRS Forest Economics & Policy state page (2025-06-02)",
      "South Dakota Dept. of Agriculture — Conservation & Forestry",
      "SDSU Extension",
    ],
    note:
      "No state price series, which understates the gap: the Black Hills is a genuine sawtimber economy, but the sales are federal and reach this dataset only through USFS Cut-and-Sold (R2).",
  },
  {
    state: "TN",
    searched: "2026-08-30",
    outcome: "found",
  },
  {
    state: "TX",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "UT",
    searched: "2026-08-30",
    outcome: "none-known",
    checked: [
      "USFS SRS Forest Economics & Policy state page (2025-06-02)",
      "Utah Division of Forestry, Fire & State Lands",
      "Utah State University Extension Forestry",
      "BLM Utah Timber Sales",
    ],
    note:
      "No price series. The federal directory points at BLM sale listings, which advertise sales rather than report realised prices.",
  },
  {
    state: "VA",
    searched: "2026-08-30",
    outcome: "found",
  },
  {
    state: "VT",
    searched: "2026-08-30",
    outcome: "found",
  },
  {
    state: "WA",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "WI",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "WV",
    searched: "2026-06-25",
    outcome: "found",
  },
  {
    state: "WY",
    searched: "2026-08-30",
    outcome: "none-known",
    checked: [
      "USFS SRS Forest Economics & Policy state page (2025-06-02)",
      "Wyoming State Forestry Division",
      "University of Wyoming Extension",
    ],
    note:
      "No state price series. Wyoming harvest is largely federal and reaches this dataset through USFS Cut-and-Sold (R2/R4).",
  },
];

export function researchForState(code: string): StateResearch | undefined {
  return STATE_RESEARCH.find((r) => r.state === code);
}
