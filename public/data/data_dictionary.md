# Data dictionary — public timber price export

One row in `public_prices.parquet` / `public_prices.csv.gz` = one published price
observation for a series (source x region x species x product x market) in one
period (year, or year+quarter). Built from the `v_public_prices` view of the
timber-prices dbt-duckdb project.

| Column | Description |
|---|---|
| `price_id` | Stable md5 hash of the natural key (source, period, region, species, product, market, unit). |
| `year`, `quarter` | Calendar period. `quarter` is NULL for annual-cadence rows. |
| `period_label` | Display label (`2024` or `2024 Q3`). |
| `macro_region_code/_name` | Coarse region (`west`, `south`, `lake_states`, ...). |
| `state_code/state_name` | USPS state, ONLY when the region maps to a single state; NULL for multi-state / USFS-region / national-forest grains. |
| `region_code/_name/_type` | The price region and its grain: `state_avg`, `statewide`, `sub_state`, `peninsula`, `state_forest`, `management_unit` (MI FMU), `district` (OR ODF), `land_office` (MT DNRC), `usfs_region`, `national_forest`, `multi_state_avg`. Nested grains overlap — filter to ONE region_type before aggregating. |
| `species_code/_name/species_group` | Species (or species aggregate); group is `softwood`/`hardwood`/`all`. |
| `product_code/_name/timber_class/grade/end_market` | Product (sawtimber, pulpwood, ...) and its predominant end market. |
| `market_type` | `stumpage` (standing timber) or `delivered` (at the mill). |
| `price_basis` | `observed_stumpage` \| `observed_delivered` (no modeled values in this export). |
| `original_price`, `original_unit` | The price as published, losslessly, in its native unit (`ton`, `mbf_scribner_*`, `mbf_international*`, ...). MBF units are log-rule- and region-explicit — never mix log rules. |
| `lo_price`, `hi_price` | Published or realized low/high range in the original unit, where available. |
| `price_per_ton` (+ `lo_/hi_price_per_ton`) | Harmonized $/green ton via `tons_per_unit`. |
| `price_per_mbf`, `price_per_cord` | The original price when the native unit was MBF / cord, else NULL. |
| `tons_per_unit`, `conversion_source` | The conversion factor applied and its citation (USFS GTR-SRS-251). |
| `is_estimated` | TRUE for interpolated/estimated values. |
| `source_code/_name/source_type` | Publishing dataset; `source_type='public'` for every row in this export. |
| `ownership_basis` | Whose timber / how the price formed: `public_federal_sale`, `public_state_sale`, `public_tribal_sale`, `private_survey`. Public-land sale prices differ systematically from private-market prices (Munn & Rucker 1995, Forest Science 41(4)) — combine deliberately. |

## Caveats worth repeating

- **Not volume-weighted everywhere:** OR ODF and MT BBER publish no per-species
  volumes, so their aggregates are simple (sale-count) means; MI DNR, MT DNRC and
  USFS Cut-and-Sold are volume-weighted.
- **USFS Cut-and-Sold Good Neighbor bias:** since FY2019 Q3, Good Neighbor sale
  volumes are included in the source workbooks without their values; value=0 rows
  are dropped but mixed aggregates retain a low bias (R1/R6 especially).
- **Delivered != stumpage:** MT BBER is mill-delivered; never average it with
  stumpage rows.
- **Log rules matter:** $/MBF values use the region's standard rule (Scribner in
  the West; International 1/4" in the South/North). Use `price_per_ton` for
  cross-region comparison.
