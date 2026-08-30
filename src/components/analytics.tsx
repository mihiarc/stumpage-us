import Script from "next/script";

/**
 * Cloudflare Web Analytics — cookieless, no personal data, no consent banner.
 *
 * Inert unless NEXT_PUBLIC_CF_BEACON_TOKEN is set at build time, so local dev
 * and any fork stay unmeasured by default. Set it in the deploy workflow to
 * switch measurement on for the published site. The token is a public write-only
 * beacon identifier, not a secret: it ships in the HTML by design and grants
 * nothing but the ability to send pageviews to this site's own dashboard.
 *
 * Whatever this collects must stay consistent with what /privacy promises.
 */
export function Analytics() {
  const token = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;
  if (!token) return null;
  return (
    <Script
      src="https://static.cloudflareinsights.com/beacon.min.js"
      strategy="afterInteractive"
      data-cf-beacon={JSON.stringify({ token })}
    />
  );
}
