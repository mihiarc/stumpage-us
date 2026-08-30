import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What this site collects: no accounts, no cookies, no personal data. Cookieless aggregate analytics only.",
};

const ANALYTICS_ON = Boolean(process.env.NEXT_PUBLIC_CF_BEACON_TOKEN);

export default function PrivacyPage() {
  return (
    <div className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl px-4 py-8 prose-a:underline-offset-2">
      <h1>Privacy</h1>
      <p>
        This site is a static export. There is no server, no database, no
        accounts and no login. Nothing you do here is stored anywhere we can
        read, because there is nowhere for it to be stored.
      </p>

      <h2>What is not collected</h2>
      <ul>
        <li>
          <strong>No cookies.</strong> The site sets none, and nothing it loads
          sets any. There is no consent banner because there is nothing to
          consent to.
        </li>
        <li>
          <strong>No accounts and no personal data.</strong> We never ask for
          your name, email address or location, and there is no form to submit
          one to.
        </li>
        <li>
          <strong>No advertising or cross-site tracking.</strong> No ad network,
          no social widgets, no third-party trackers, and nothing that follows
          you to other sites.
        </li>
        <li>
          <strong>Your queries stay in your browser.</strong> Filters and
          selections live in the page URL so a view can be shared, but the URL
          is only sent anywhere if you choose to share it yourself.
        </li>
      </ul>

      <h2>What is collected</h2>
      {ANALYTICS_ON ? (
        <>
          <p>
            Aggregate traffic measurement through{" "}
            <a href="https://www.cloudflare.com/web-analytics/">
              Cloudflare Web Analytics
            </a>
            , which is cookieless and does not fingerprint or identify
            individual visitors. It records the page visited, the referring
            site, coarse country-level location, browser and device type, and
            page-performance timings.
          </p>
          <p>
            We use it for exactly one thing: knowing whether anyone finds this
            useful and which pages are worth maintaining. It cannot tell us who
            you are, and neither can we.
          </p>
        </>
      ) : (
        <p>
          Nothing. No analytics are running on this build. If that changes,
          this page changes with it in the same commit &mdash; it is generated
          from whether analytics are actually enabled, not written by hand and
          left to drift.
        </p>
      )}
      <p>
        Your browser also makes an ordinary web-server request for each page and
        data file, which the host (currently GitHub Pages) logs as any web
        server does. That is outside our control and covered by{" "}
        <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">
          GitHub&rsquo;s privacy statement
        </a>
        .
      </p>

      <h2>Data you download</h2>
      <p>
        The{" "}
        <Link href="/data">price dataset</Link> and the{" "}
        <Link href="/coverage">coverage record</Link> are static files. Once
        downloaded they are yours; nothing phones home, and we have no way to
        know what you do with them. Both are CC BY 4.0 &mdash; see{" "}
        <Link href="/about">About</Link> for how to cite them.
      </p>

      <h2>Corrections</h2>
      <p>
        The most useful thing you can send us is a correction to the{" "}
        <Link href="/directory">directory</Link> or the{" "}
        <Link href="/coverage">coverage record</Link> &mdash; a report we have
        marked dead that is alive, or a source in a state we recorded as having
        none. Open an issue on{" "}
        <a href="https://github.com/mihiarc/stumpage-us/issues">GitHub</a>. That
        is a public forum, so anything you write there is public.
      </p>
    </div>
  );
}
