import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-8 text-sm text-muted-foreground">
        <p>
          A free public service for forest landowners, foresters, and
          researchers — the community successor to the USDA Forest Service{" "}
          <a
            href="https://www.srs.fs.usda.gov/econ/timberprices/"
            className="underline underline-offset-2 hover:text-foreground"
          >
            SRS Timber Price Information and Contacts
          </a>{" "}
          site, which is no longer actively maintained.
        </p>
        <p>
          All price data derives exclusively from public sources; each record
          carries its original source and unit. This site makes no
          representation as to the quality of work or business practices of any
          firm or service listed, and nothing here is an appraisal of any
          particular timber. See{" "}
          <Link href="/about" className="underline underline-offset-2 hover:text-foreground">
            About
          </Link>{" "}
          for methodology and caveats.
        </p>
      </div>
    </footer>
  );
}
