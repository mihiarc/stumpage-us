import { Suspense } from "react";
import type { Metadata } from "next";
import { Explorer } from "@/components/explorer";

export const metadata: Metadata = {
  title: "Explore prices",
  description:
    "Filter and chart 49,000+ public stumpage and delivered timber price records across the US.",
};

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Explore prices</h1>
      <p className="mt-1 mb-6 max-w-3xl text-sm text-muted-foreground">
        Filter the public price series and chart up to five together. Prices are
        harmonized to $ per green ton (USFS GTR-SRS-251 conversion factors); the
        published unit is always shown too. Filters and selections live in the
        URL, so any view can be shared by copying the address.
      </p>
      <Suspense>
        <Explorer />
      </Suspense>
    </div>
  );
}
