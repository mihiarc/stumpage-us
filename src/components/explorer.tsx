"use client";

import { useEffect, useMemo, useState } from "react";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PriceChart, type ChartSeries, type ChartPoint } from "@/components/price-chart";
import type { Dims, PriceChunk, Series, SeriesIndex } from "@/lib/types";
import {
  fmtPeriod,
  fmtUsd,
  periodX,
  rowMatchesSeries,
  seriesId,
  unitLabel,
  MARKET_LABELS,
} from "@/lib/format";
import { REGION_TYPE_LABELS, STATE_NAMES, seriesStates } from "@/lib/geo";

const MAX_PLOTTED = 5;
const ALL = "all";

// module-level caches survive route changes within the session
const chunkCache = new Map<string, Promise<PriceChunk>>();
let indexCache: Promise<{ index: SeriesIndex; dims: Dims }> | null = null;

function loadChunk(source: string): Promise<PriceChunk> {
  if (!chunkCache.has(source)) {
    chunkCache.set(
      source,
      fetch(`/data/prices/${source}.json`).then((r) => {
        if (!r.ok) throw new Error(`failed to load ${source}`);
        return r.json();
      }),
    );
  }
  return chunkCache.get(source)!;
}

function loadIndex() {
  if (!indexCache) {
    indexCache = Promise.all([
      fetch("/data/series_index.json").then((r) => r.json()),
      fetch("/data/dims.json").then((r) => r.json()),
    ]).then(([index, dims]) => ({ index, dims }));
  }
  return indexCache;
}

const SOURCE_CAVEATS: Record<string, string> = {
  or_odf:
    "Oregon ODF publishes no per-species volumes, so these are simple (sale-count) means of winning bids, not volume-weighted.",
  mt_bber:
    "Montana BBER prices are mill-DELIVERED (not stumpage) and are simple survey means, not volume-weighted.",
  usfs_cutsold:
    "USFS Cut-and-Sold: since FY2019 Q3, Good Neighbor sale volumes are included without their values, biasing derived $/unit low in affected regions (R1/R6 especially).",
};

function seriesLabel(s: Series): string {
  return `${s.region_name} · ${s.species_name} ${s.product_name.toLowerCase()} (${MARKET_LABELS[s.market] ?? s.market})`;
}

export function Explorer() {
  const [data, setData] = useState<{ index: SeriesIndex; dims: Dims } | null>(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    loadIndex().then(setData, () => setLoadError(true));
  }, []);

  const [source, setSource] = useQueryState("src", parseAsString.withDefault(ALL));
  const [regionType, setRegionType] = useQueryState("rt", parseAsString.withDefault(ALL));
  const [state, setState] = useQueryState("st", parseAsString.withDefault(ALL));
  const [speciesGroup, setSpeciesGroup] = useQueryState("sg", parseAsString.withDefault(ALL));
  const [species, setSpecies] = useQueryState("sp", parseAsString.withDefault(ALL));
  const [product, setProduct] = useQueryState("p", parseAsString.withDefault(ALL));
  const [market, setMarket] = useQueryState("m", parseAsString.withDefault(ALL));
  const [selected, setSelected] = useQueryState(
    "sel",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  // color slots: assigned when a series is selected and kept until it is
  // removed, so removing one series never repaints the others (color follows
  // the entity, not its rank). Seeded from the URL's selection order.
  const [slotMap, setSlotMap] = useState<Map<string, number>>(
    () => new Map(selected.map((id, i) => [id, i])),
  );
  function withSlot(prev: Map<string, number>, id: string): Map<string, number> {
    if (prev.has(id)) return prev;
    const used = new Set(prev.values());
    let slot = 0;
    while (used.has(slot)) slot++;
    return new Map(prev).set(id, slot);
  }

  const allSeries = useMemo(() => data?.index.series ?? [], [data]);
  const byId = useMemo(() => {
    const m = new Map<string, Series>();
    for (const s of allSeries) m.set(seriesId(s), m.get(seriesId(s)) ?? s);
    return m;
  }, [allSeries]);

  const filtered = useMemo(() => {
    return allSeries.filter((s) => {
      if (source !== ALL && s.source !== source) return false;
      if (regionType !== ALL && s.region_type !== regionType) return false;
      if (state !== ALL && !seriesStates(s).includes(state)) return false;
      if (speciesGroup !== ALL && s.species_group !== speciesGroup) return false;
      if (species !== ALL && s.species !== species) return false;
      if (product !== ALL && s.product !== product) return false;
      if (market !== ALL && s.market !== market) return false;
      return true;
    });
  }, [allSeries, source, regionType, state, speciesGroup, species, product, market]);

  // dependent option lists come from the filtered set so menus never dead-end
  const opts = useMemo(() => {
    const uniq = <K extends string>(vals: (K | null)[]) =>
      [...new Set(vals.filter((v): v is K => v != null))].sort();
    return {
      sources: uniq(allSeries.map((s) => s.source)),
      regionTypes: uniq(filtered.map((s) => s.region_type)),
      states: uniq(filtered.flatMap((s) => seriesStates(s))),
      speciesGroups: uniq(filtered.map((s) => s.species_group)),
      species: [...new Map(filtered.map((s) => [s.species, s.species_name])).entries()].sort(
        (a, b) => a[1].localeCompare(b[1]),
      ),
      products: [...new Map(filtered.map((s) => [s.product, s.product_name])).entries()].sort(),
      markets: uniq(filtered.map((s) => s.market)),
    };
  }, [allSeries, filtered]);

  // load price rows for the selected series
  const selectedSeries = useMemo(
    () => selected.map((id) => byId.get(id)).filter((s): s is Series => !!s),
    [selected, byId],
  );
  const [chunks, setChunks] = useState<Record<string, PriceChunk>>({});
  useEffect(() => {
    const needed = [...new Set(selectedSeries.map((s) => s.source))];
    needed.forEach((src) => {
      loadChunk(src).then((chunk) =>
        setChunks((prev) => (prev[src] ? prev : { ...prev, [src]: chunk })),
      );
    });
  }, [selectedSeries]);

  // value mode: $/ton always works; original unit only when all series share it
  const sharedUnit = useMemo(() => {
    const units = new Set(selectedSeries.map((s) => unitLabel(s.unit)));
    return units.size === 1 ? [...units][0] : null;
  }, [selectedSeries]);
  const [mode, setMode] = useState<"ton" | "orig">("ton");
  const effectiveMode = sharedUnit && sharedUnit !== "mixed" ? mode : "ton";

  const chartSeries: ChartSeries[] = useMemo(() => {
    return selectedSeries.map((s, i) => {
      const chunk = chunks[s.source];
      const rows = chunk
        ? chunk.rows.filter((r) => rowMatchesSeries(r, s))
        : [];
      const points: ChartPoint[] = [];
      for (const r of rows) {
        const y = effectiveMode === "orig" ? r.o : r.t;
        if (y == null) continue;
        points.push({
          x: periodX(r.y, r.q ?? null),
          y,
          yLo: effectiveMode === "orig" ? r.ol : r.tl,
          yHi: effectiveMode === "orig" ? r.oh : r.th,
          year: r.y,
          quarter: r.q ?? null,
          estimated: r.e === 1,
        });
      }
      points.sort((a, b) => a.x - b.x);
      return {
        id: seriesId(s),
        label: seriesLabel(s),
        colorVar: `var(--viz-series-${((slotMap.get(seriesId(s)) ?? i) % 8) + 1})`,
        points,
      };
    });
  }, [selectedSeries, chunks, effectiveMode, slotMap]);

  const caveats = useMemo(() => {
    const notes = new Set<string>();
    for (const s of selectedSeries) {
      if (SOURCE_CAVEATS[s.source]) notes.add(SOURCE_CAVEATS[s.source]);
      if (s.market === "delivered")
        notes.add(
          "Delivered prices are measured at the mill and are NOT comparable to stumpage (standing-timber) prices.",
        );
    }
    if (chartSeries.some((cs) => cs.points.some((p) => p.estimated)))
      notes.add("Some plotted values are estimated/interpolated.");
    return [...notes];
  }, [selectedSeries, chartSeries]);

  function toggleSeries(id: string) {
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id));
      setSlotMap((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    } else if (selected.length < MAX_PLOTTED) {
      setSelected([...selected, id]);
      setSlotMap((prev) => withSlot(prev, id));
    }
  }

  if (loadError)
    return (
      <p className="text-sm text-destructive">
        Failed to load the data index. Please reload the page.
      </p>
    );
  if (!data)
    return <p className="text-sm text-muted-foreground">Loading series index…</p>;

  const shown = filtered.slice(0, 250);

  const filterDefs: {
    label: string;
    value: string;
    set: (v: string) => void;
    options: { value: string; label: string }[];
  }[] = [
    {
      label: "Source",
      value: source,
      set: (v) => void setSource(v),
      options: opts.sources.map((v) => ({
        value: v,
        label: data.dims.sources.find((d) => d.source_code === v)?.source_name ?? v,
      })),
    },
    {
      label: "Geography",
      value: regionType,
      set: (v) => void setRegionType(v),
      options: opts.regionTypes.map((v) => ({
        value: v,
        label: REGION_TYPE_LABELS[v] ?? v,
      })),
    },
    {
      label: "State",
      value: state,
      set: (v) => void setState(v),
      options: opts.states.map((v) => ({ value: v, label: STATE_NAMES[v] ?? v })),
    },
    {
      label: "Group",
      value: speciesGroup,
      set: (v) => void setSpeciesGroup(v),
      options: opts.speciesGroups.map((v) => ({ value: v, label: v })),
    },
    {
      label: "Species",
      value: species,
      set: (v) => void setSpecies(v),
      options: opts.species.map(([code, name]) => ({ value: code, label: name })),
    },
    {
      label: "Product",
      value: product,
      set: (v) => void setProduct(v),
      options: opts.products.map(([code, name]) => ({ value: code, label: name })),
    },
    {
      label: "Market",
      value: market,
      set: (v) => void setMarket(v),
      options: opts.markets.map((v) => ({ value: v, label: MARKET_LABELS[v] ?? v })),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        {filterDefs.map((f) => (
          <label key={f.label} className="grid gap-1 text-xs font-medium text-muted-foreground">
            {f.label}
            <Select value={f.value} onValueChange={f.set}>
              <SelectTrigger className="w-40" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {f.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSource(ALL);
            setRegionType(ALL);
            setState(ALL);
            setSpeciesGroup(ALL);
            setSpecies(ALL);
            setProduct(ALL);
            setMarket(ALL);
          }}
        >
          Reset
        </Button>
      </div>

      {selectedSeries.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {selectedSeries.map((s) => (
                <Badge
                  key={seriesId(s)}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => toggleSeries(seriesId(s))}
                  title="Remove from chart"
                >
                  {seriesLabel(s)} ✕
                </Badge>
              ))}
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Button
                  variant={effectiveMode === "ton" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setMode("ton")}
                >
                  $/ton
                </Button>
                <Button
                  variant={effectiveMode === "orig" ? "secondary" : "ghost"}
                  size="sm"
                  disabled={!sharedUnit}
                  title={
                    sharedUnit
                      ? `Chart in the published unit (${sharedUnit})`
                      : "Selected series use different units — $/ton is the common basis"
                  }
                  onClick={() => setMode("orig")}
                >
                  {sharedUnit ?? "original unit"}
                </Button>
              </span>
            </div>
            <PriceChart
              series={chartSeries}
              yLabel={
                effectiveMode === "orig" && sharedUnit
                  ? sharedUnit
                  : "$ per green ton (harmonized, USFS GTR-SRS-251 factors)"
              }
            />
            {caveats.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {caveats.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <div>
        <p className="mb-2 text-sm text-muted-foreground">
          {filtered.length.toLocaleString()} series match
          {filtered.length > shown.length &&
            ` (showing the first ${shown.length} — narrow the filters)`}
          . Select up to {MAX_PLOTTED} to chart.
        </p>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead>Region</TableHead>
                <TableHead>Species</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Years</TableHead>
                <TableHead className="text-right">Latest</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((s) => {
                const id = seriesId(s);
                const isSel = selected.includes(id);
                return (
                  <TableRow key={id} data-state={isSel ? "selected" : undefined}>
                    <TableCell>
                      <Button
                        variant={isSel ? "secondary" : "outline"}
                        size="sm"
                        disabled={!isSel && selected.length >= MAX_PLOTTED}
                        onClick={() => toggleSeries(id)}
                      >
                        {isSel ? "Remove" : "Plot"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{s.region_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {REGION_TYPE_LABELS[s.region_type] ?? s.region_type}
                      </div>
                    </TableCell>
                    <TableCell>{s.species_name}</TableCell>
                    <TableCell>{s.product_name}</TableCell>
                    <TableCell>{MARKET_LABELS[s.market] ?? s.market}</TableCell>
                    <TableCell className="tabular-nums">
                      {s.y0}–{s.y1}
                      <span className="text-xs text-muted-foreground"> ({s.n})</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.latest.o != null && s.latest.u ? (
                        <>
                          <div>
                            {fmtUsd(s.latest.o)}{" "}
                            <span className="text-xs text-muted-foreground">
                              {unitLabel(s.latest.u).replace("$/", "/")}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {fmtPeriod(s.latest.y, s.latest.q)}
                            {s.latest.t != null && ` · ${fmtUsd(s.latest.t)}/ton`}
                          </div>
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{s.source}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
