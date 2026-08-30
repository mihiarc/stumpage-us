import type { Metadata } from "next";
import Link from "next/link";
import { DirectoryEntryCard } from "@/components/directory-entry";
import { DIRECTORY, DIRECTORY_VERIFIED_DATE } from "@/content/directory";
import { STATE_NAMES } from "@/lib/geo";

export const metadata: Metadata = {
  title: "Price report directory",
  description:
    "Every US timber price reporting service we know of, state by state — with status and data-provenance flags.",
};

export default function DirectoryPage() {
  const national = DIRECTORY.filter((e) => e.state === "US");
  const international = DIRECTORY.filter((e) => e.state === "INTL");
  const byState = new Map<string, typeof DIRECTORY>();
  for (const e of DIRECTORY) {
    if (e.state === "US" || e.state === "INTL") continue;
    byState.set(e.state, [...(byState.get(e.state) ?? []), e]);
  }
  const states = [...byState.keys()].sort((a, b) =>
    (STATE_NAMES[a] ?? a).localeCompare(STATE_NAMES[b] ?? b),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">
        Timber price report directory
      </h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Every price reporting service we can find, with two flags that are
        usually missing: whether the report is still <em>alive</em>, and whose
        data it actually is. Several &ldquo;free&rdquo; state reports are
        licensed <strong>TimberMart-South redistributions</strong> — fine to
        read, but the numbers are copyrighted survey data, not public data.
        Entries were checked at least as recently as{" "}
        {DIRECTORY_VERIFIED_DATE}; many carry a later date of their own.
        Corrections welcome.
      </p>
      <nav className="my-6 flex flex-wrap gap-1.5 text-sm">
        {states.map((st) => (
          <a
            key={st}
            href={`#${st}`}
            className="rounded-md border px-2 py-0.5 text-muted-foreground hover:text-foreground"
          >
            {st}
          </a>
        ))}
      </nav>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">National</h2>
        <div className="grid gap-3">
          {national.map((e) => (
            <DirectoryEntryCard key={`${e.org}${e.report}`} entry={e} />
          ))}
        </div>
      </section>

      {states.map((st) => (
        <section key={st} id={st} className="mb-10 scroll-mt-20">
          <h2 className="mb-3 text-lg font-semibold">
            <Link
              href={`/states/${st.toLowerCase()}`}
              className="underline underline-offset-2"
            >
              {STATE_NAMES[st] ?? st}
            </Link>
          </h2>
          <div className="grid gap-3">
            {byState.get(st)!.map((e) => (
              <DirectoryEntryCard key={`${e.org}${e.report}`} entry={e} />
            ))}
          </div>
        </section>
      ))}

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">International</h2>
        <div className="grid gap-3">
          {international.map((e) => (
            <DirectoryEntryCard key={`${e.org}${e.report}`} entry={e} />
          ))}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        A state missing from this page is not a claim that nothing exists
        there. See the{" "}
        <Link href="/coverage" className="underline underline-offset-2">
          coverage record
        </Link>{" "}
        for which states we have actually searched, which we searched and found
        nothing in, and which we have not yet reached. This directory makes no
        representation as to the quality of any listed service.
      </p>
    </div>
  );
}
