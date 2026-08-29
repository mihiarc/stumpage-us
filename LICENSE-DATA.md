# Data license — CC BY 4.0

The compiled dataset in `public/data/` (the harmonized price records, series
index, aggregates, dimension metadata, and candor blocks) is licensed under
the [Creative Commons Attribution 4.0 International license (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

You are free to share and adapt the dataset for any purpose, including
commercially, provided you give appropriate credit (see `CITATION.cff`),
link to the license, and indicate if changes were made.

Notes on the underlying facts:

- Every record derives exclusively from public sources: US federal
  public-domain works (USFS Cut-and-Sold reports, USFS PNW Research Station
  PPET series), state agency publications (Michigan DNR, Oregon ODF, Montana
  DNRC), and the University of Montana BBER survey. Each row carries its
  source attribution (`source_code`, `source_name`); please also credit the
  original publishing agency when quoting specific prices.
- The CC BY 4.0 license applies to the compilation — the selection,
  harmonization, unit conversions, and documentation. The underlying federal
  works remain public domain.
- Licensed TimberMart-South / TimberMart-North data is **excluded by
  construction** and verified by automated test on every build; nothing in
  this repository derives from those services.

The site source code is separately licensed under the MIT license (see
`LICENSE`).
