// Official home pages for each integrated public dataset (verified against
// docs/PUBLIC_SOURCE_CATALOGUE.md in the timber-prices repo, 2026-06).
export const SOURCE_LINKS: Record<string, { url: string; label: string }> = {
  mi_dnr: {
    url: "https://www2.dnr.state.mi.us/ftp/forestry/tsreports/StumpagePriceReports/",
    label: "Michigan DNR stumpage price reports",
  },
  pnw: {
    url: "https://research.fs.usda.gov/pnw/products/dataandtools/tools/production-prices-employment-and-trade-northwest-forest-industries-all",
    label: "USFS PNW Research Station — PPET data",
  },
  usfs_cutsold: {
    url: "https://www.fs.usda.gov/forestmanagement/products/cut-sold/",
    label: "USFS cut-and-sold reports",
  },
  or_odf: {
    url: "https://apps.odf.oregon.gov/Divisions/management/asset_management/saleresults.asp",
    label: "Oregon ODF timber sale results",
  },
  mt_bber: {
    url: "https://www.bber.umt.edu/fir/F_LogPrice.asp",
    label: "Montana BBER quarterly log prices",
  },
  mt_dnrc: {
    url: "https://dnrc.mt.gov/Forestry/Forest-Products/timber-sales",
    label: "Montana DNRC timber sales",
  },
};
