import type { Metadata } from "next";
import Link from "next/link";
import { CoverageMap } from "@/components/coverage-map";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getStateCoverage } from "@/lib/coverage";
import { STATE_NAMES } from "@/lib/geo";

export const metadata: Metadata = {
  title: "States",
  description: "Browse public timber price coverage state by state.",
};

export default function StatesPage() {
  const coverage = getStateCoverage();
  const rows = Object.entries(coverage)
    .map(([code, c]) => ({ code, ...c }))
    .sort((a, b) => (STATE_NAMES[a.code] ?? a.code).localeCompare(STATE_NAMES[b.code] ?? b.code));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">States</h1>
      <p className="mt-1 mb-6 max-w-3xl text-sm text-muted-foreground">
        Every state a public price series covers. &ldquo;State-level&rdquo;
        series are attributed to exactly that state (statewide averages or
        sub-state regions); &ldquo;regional&rdquo; series cover the state as
        part of a USFS region or multi-state average.
      </p>
      <CoverageMap coverage={coverage} />
      <div className="mt-8 overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>State</TableHead>
              <TableHead className="text-right">State-level series</TableHead>
              <TableHead className="text-right">Regional series</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.code}>
                <TableCell>
                  <Link
                    href={`/states/${r.code.toLowerCase()}`}
                    className="font-medium underline underline-offset-2"
                  >
                    {STATE_NAMES[r.code] ?? r.code}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.direct.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.regional.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.total.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
