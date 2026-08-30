/**
 * Link-rot detector for the source catalogue in src/content/directory.ts.
 *
 * Run with `bun run check:links`. Scheduled monthly by
 * .github/workflows/link-check.yml — this is a rot detector, not a monitor.
 *
 * ## Why this exists
 *
 * ROADMAP invariant 12: one unfunded maintainer, so anything needing a human
 * every quarter eventually stops working. Phase 1 re-verified 26 entries by
 * hand and turned up two silent failures a robot would have caught months
 * earlier — Virginia Tech's URL had changed, and the USFS SRS directory had
 * moved hosts entirely. Nothing surfaced either one.
 *
 * ## Why it is three-valued
 *
 * The naive version calls every non-200 "broken" and is worse than nothing.
 * Measured against this catalogue on 2026-08-30, two of six sampled *live,
 * correct* sites answered 403 to an automated request — Oklahoma State
 * Extension and UNECE both serve humans fine and refuse robots. A checker
 * that cries wolf on a third of the catalogue gets ignored within two runs.
 *
 * So the outcome mirrors the epistemics STATE_RESEARCH already commits to,
 * where "searched and found nothing" is a different claim from "never
 * looked":
 *
 *   ok            2xx/3xx — resolved, content unjudged
 *   dead          404/410/NXDOMAIN — positive evidence of rot
 *   unverifiable  403/429/5xx/TLS/timeout — a robot cannot tell
 *
 * Only `dead` is reported as rot. `unverifiable` is listed separately as
 * needing a human, and roughly a third of the catalogue landing there is the
 * expected result, not a bug to engineer away. The bias is deliberate: `dead`
 * requires positive evidence, and every ambiguous signal degrades to
 * `unverifiable`.
 *
 * ## What it must never do
 *
 * **Never write to `status` or `verified` in src/content/directory.ts.**
 * `status` is editorial judgment, not HTTP. The SRS directory answers 200 and
 * is deliberately catalogued as `stale` because relocating is not
 * maintaining; Minnesota DNR answers 200 and is `stale` because it is five
 * annual editions behind. A robot that "corrected" those to `live` would
 * silently destroy exactly the distinction Phase 1 exists to make, in the file
 * that is the source of a published dataset. `verified` means a person read
 * the *content*, not that a URL resolved.
 *
 * This script reports. A human decides.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DIRECTORY, type DirectoryEntry } from "../src/content/directory";

/** Identify the checker honestly rather than spoofing a browser to dodge 403s. */
const USER_AGENT =
  "stumpage-us-link-check/1 (+https://github.com/mihiarc/stumpage-us)";
const TIMEOUT_MS = 20_000;
const CONCURRENCY = 6;
/** One retry for signals that are plausibly transient (5xx, timeout, socket). */
const RETRY_DELAY_MS = 3_000;

export type Verdict = "ok" | "unverifiable" | "dead";

export interface CheckResult {
  url: string;
  verdict: Verdict;
  /** HTTP status, or null when the request never produced a response. */
  status: number | null;
  /** Why this verdict, in a few words — the thing a human reads first. */
  reason: string;
  /** Set only when the URL redirected somewhere materially different. */
  movedTo: string | null;
  /** Catalogue entries pointing at this URL; 47 distinct URLs across 50 entries. */
  entries: DirectoryEntry[];
}

/**
 * Server-side default documents. A CMS appending one of these is answering the
 * same address, not relocating — SharePoint does it to every bare directory —
 * so treat it as equal rather than reporting a move nobody needs to act on.
 */
const DEFAULT_DOCS = /\/(?:pages\/)?(?:default|index|home)\.(?:aspx?|html?|php|jsp)$/i;

/**
 * Compare URLs ignoring differences that are not a move: an http->https
 * upgrade, a trailing slash, host case, `www.`, an appended default document.
 * Anything else redirecting means the catalogue's URL is stale even though the
 * link still works — the USFS SRS case, which is worth a human's attention but
 * is not rot.
 */
function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.protocol = "https:";
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    u.pathname = u.pathname.replace(DEFAULT_DOCS, "").replace(/\/+$/, "");
    u.hash = "";
    return u.toString();
  } catch {
    return raw;
  }
}

/**
 * Classify a thrown fetch error. Only an unambiguous name-resolution failure
 * is rot; everything else a robot cannot distinguish from a bad afternoon.
 */
function classifyError(err: unknown): { verdict: Verdict; reason: string } {
  const e = err as { code?: string; name?: string; message?: string; cause?: { code?: string } };
  const code = e?.code ?? e?.cause?.code ?? "";
  const message = e?.message ?? String(err);

  if (e?.name === "TimeoutError" || e?.name === "AbortError" || code === "ETIMEDOUT") {
    return { verdict: "unverifiable", reason: `no response within ${TIMEOUT_MS / 1000}s` };
  }
  // Bun and Node spell name resolution differently; accept either.
  if (
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    code === "DNS_ENOTFOUND" ||
    /failed to lookup address|getaddrinfo|ENOTFOUND|name not resolved/i.test(message)
  ) {
    // EAI_AGAIN is a temporary resolver failure, not a missing name.
    if (code === "EAI_AGAIN") {
      return { verdict: "unverifiable", reason: "temporary DNS failure" };
    }
    return { verdict: "dead", reason: "host does not resolve" };
  }
  if (/certificate|TLS|SSL/i.test(message) || code.startsWith("ERR_TLS") || code.startsWith("CERT_")) {
    return { verdict: "unverifiable", reason: `TLS problem (${code || "unspecified"})` };
  }
  return { verdict: "unverifiable", reason: `request failed (${code || message.slice(0, 60)})` };
}

function classifyStatus(status: number): { verdict: Verdict; reason: string } {
  if (status >= 200 && status < 400) return { verdict: "ok", reason: `HTTP ${status}` };
  if (status === 404 || status === 410) {
    return { verdict: "dead", reason: `HTTP ${status}` };
  }
  if (status === 401 || status === 403) {
    return { verdict: "unverifiable", reason: `HTTP ${status} — refuses automated requests` };
  }
  if (status === 429) return { verdict: "unverifiable", reason: "HTTP 429 — rate limited" };
  if (status >= 500) return { verdict: "unverifiable", reason: `HTTP ${status} — server error` };
  return { verdict: "unverifiable", reason: `HTTP ${status}` };
}

async function request(url: string, method: "HEAD" | "GET"): Promise<Response> {
  return fetch(url, {
    method,
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "user-agent": USER_AGENT,
      // Ask for HTML explicitly; a few CDNs 406 an unqualified robot.
      accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
    },
  });
}

async function checkOnce(
  url: string,
): Promise<{ verdict: Verdict; reason: string; status: number | null; finalUrl: string | null }> {
  // HEAD first because it is cheap, but plenty of these hosts answer it with
  // 403/405 while serving GET fine, so never take a HEAD refusal as the answer.
  try {
    const head = await request(url, "HEAD");
    if (head.ok) {
      return { ...classifyStatus(head.status), status: head.status, finalUrl: head.url };
    }
  } catch {
    // fall through to GET
  }
  try {
    const res = await request(url, "GET");
    // Drain so the connection can be reused/closed promptly; body is unjudged.
    await res.arrayBuffer().catch(() => undefined);
    return { ...classifyStatus(res.status), status: res.status, finalUrl: res.url };
  } catch (err) {
    return { ...classifyError(err), status: null, finalUrl: null };
  }
}

async function check(url: string, entries: DirectoryEntry[]): Promise<CheckResult> {
  let out = await checkOnce(url);
  // Retry once for signals that are plausibly a bad moment rather than rot.
  // A transient 503 must never be reported, and must never block a deploy.
  const transient =
    out.verdict === "unverifiable" && (out.status === null || out.status >= 500 || out.status === 429);
  if (transient) {
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    const retry = await checkOnce(url);
    out =
      retry.verdict === "ok" ? retry : { ...retry, reason: `${retry.reason} (twice)` };
  }

  const movedTo =
    out.finalUrl && normalizeUrl(out.finalUrl) !== normalizeUrl(url) ? out.finalUrl : null;

  return {
    url,
    verdict: out.verdict,
    status: out.status,
    reason: out.reason,
    movedTo,
    entries,
  };
}

/** Run `jobs` with bounded concurrency, in order, so hosts are not hammered. */
async function pool<T>(jobs: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const out: T[] = new Array(jobs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, jobs.length) }, async () => {
      while (next < jobs.length) {
        const i = next++;
        out[i] = await jobs[i]();
      }
    }),
  );
  return out;
}

function label(e: DirectoryEntry): string {
  return `${e.state} — ${e.org}: ${e.report}`;
}

/**
 * A stable digest of the *actionable* findings only. The workflow compares it
 * against the digest embedded in the open issue so a monthly re-run that finds
 * the same two dead links updates the body silently instead of pinging the
 * maintainer again. Deliberately excludes the run date and the unverifiable
 * list, both of which churn without meaning anything.
 */
function fingerprint(results: CheckResult[]): string {
  const material = results
    .filter((r) => r.verdict === "dead" || (r.verdict === "ok" && r.movedTo))
    .map((r) => `${r.verdict}\t${r.url}\t${r.movedTo ?? ""}`)
    .sort()
    .join("\n");
  return createHash("sha256").update(material).digest("hex").slice(0, 16);
}

/**
 * The issue body. Findings first; the full tally after, so opening the issue
 * shows the whole picture rather than only what changed.
 */
function renderReport(results: CheckResult[], checkedOn: string): string {
  const dead = results.filter((r) => r.verdict === "dead");
  const moved = results.filter((r) => r.verdict === "ok" && r.movedTo);
  const unverifiable = results.filter((r) => r.verdict === "unverifiable");
  const ok = results.filter((r) => r.verdict === "ok");

  const lines: string[] = [];
  lines.push(`Automated sweep of the ${results.length} distinct URLs in \`src/content/directory.ts\`, run ${checkedOn}.`);
  lines.push("");
  lines.push(
    "**Nothing here is a verdict on an entry's `status`.** `status` is editorial " +
      "judgment — whether the publisher is still maintaining the report — and this " +
      "check only knows whether a URL resolved. Update `status` and `verified` by " +
      "hand, after reading the page.",
  );
  lines.push("");

  if (dead.length > 0) {
    lines.push(`## Dead — ${dead.length}`);
    lines.push("");
    lines.push("Positive evidence of rot: 404, 410 or a host that no longer resolves.");
    lines.push("");
    for (const r of dead) {
      lines.push(`- **${r.reason}** — <${r.url}>`);
      for (const e of r.entries) lines.push(`  - ${label(e)} (\`status: ${e.status}\`)`);
    }
    lines.push("");
  }

  if (moved.length > 0) {
    lines.push(`## Moved — ${moved.length}`);
    lines.push("");
    lines.push(
      "These still resolve, so nothing is broken for a reader, but the catalogue " +
        "is pointing at an old address. This is the failure mode that hid the USFS " +
        "SRS relocation.",
    );
    lines.push("");
    for (const r of moved) {
      lines.push(`- <${r.url}>`);
      lines.push(`  → <${r.movedTo}>`);
      for (const e of r.entries) lines.push(`  - ${label(e)}`);
    }
    lines.push("");
  }

  if (unverifiable.length > 0) {
    lines.push(`## Unverifiable — ${unverifiable.length}`);
    lines.push("");
    lines.push(
      "A robot cannot tell whether these are healthy. Most are live sites that " +
        "refuse automated requests. **Expected, not a defect** — do not \"fix\" these " +
        "by spoofing a browser user-agent. Worth a human glance only if one moves " +
        "here from `ok` and stays.",
    );
    lines.push("");
    for (const r of unverifiable) {
      lines.push(`- ${r.reason} — <${r.url}>`);
    }
    lines.push("");
  }

  lines.push("## Tally");
  lines.push("");
  lines.push("| Verdict | Count |");
  lines.push("| --- | ---: |");
  lines.push(`| ok | ${ok.length} |`);
  lines.push(`| unverifiable | ${unverifiable.length} |`);
  lines.push(`| dead | ${dead.length} |`);
  lines.push(`| **total distinct URLs** | **${results.length}** |`);
  lines.push("");
  lines.push(
    `Across ${DIRECTORY.length} catalogue entries (${results.length} distinct URLs — some entries share one).`,
  );
  lines.push("");
  lines.push(`<!-- link-check-fingerprint: ${fingerprint(results)} -->`);

  return lines.join("\n") + "\n";
}

async function main() {
  const outDir = join(process.cwd(), ".link-check");
  const checkedOn = new Date().toISOString().slice(0, 10);

  const byUrl = new Map<string, DirectoryEntry[]>();
  for (const e of DIRECTORY) {
    const list = byUrl.get(e.url) ?? [];
    list.push(e);
    byUrl.set(e.url, list);
  }

  console.log(
    `checking ${byUrl.size} distinct URLs from ${DIRECTORY.length} catalogue entries...`,
  );

  const jobs = [...byUrl.entries()].map(
    ([url, entries]) => () => check(url, entries),
  );
  const results = await pool(jobs, CONCURRENCY);

  const order: Record<Verdict, number> = { dead: 0, unverifiable: 1, ok: 2 };
  results.sort((a, b) => order[a.verdict] - order[b.verdict] || a.url.localeCompare(b.url));

  const dead = results.filter((r) => r.verdict === "dead");
  const moved = results.filter((r) => r.verdict === "ok" && r.movedTo);
  const unverifiable = results.filter((r) => r.verdict === "unverifiable");

  for (const r of results) {
    const mark = r.verdict === "dead" ? "DEAD" : r.verdict === "unverifiable" ? "  ? " : "  ok";
    console.log(`  ${mark}  ${r.reason.padEnd(38)} ${r.url}`);
    if (r.movedTo) console.log(`        -> moved to ${r.movedTo}`);
  }
  console.log("");
  console.log(
    `  ${results.length - dead.length - unverifiable.length} ok, ` +
      `${unverifiable.length} unverifiable, ${dead.length} dead, ${moved.length} moved`,
  );

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "report.md"), renderReport(results, checkedOn), "utf-8");
  writeFileSync(
    join(outDir, "results.json"),
    JSON.stringify(
      {
        checked_on: checkedOn,
        entries: DIRECTORY.length,
        distinct_urls: results.length,
        results: results.map((r) => ({
          url: r.url,
          verdict: r.verdict,
          status: r.status,
          reason: r.reason,
          moved_to: r.movedTo,
          entries: r.entries.map((e) => ({ state: e.state, org: e.org, status: e.status })),
        })),
      },
      null,
      2,
    ) + "\n",
    "utf-8",
  );

  // Actionable = something a human should change in the catalogue. Unverifiable
  // is the steady state, so it never on its own opens an issue — an issue that
  // is always open is an issue nobody reads.
  const actionable = dead.length + moved.length;
  writeFileSync(join(outDir, "actionable"), `${actionable}\n`, "utf-8");
  writeFileSync(join(outDir, "fingerprint"), `${fingerprint(results)}\n`, "utf-8");
  console.log(`  ${actionable} actionable finding(s) -> .link-check/`);

  // Always exit 0. A transient outage must never block a deploy, and a red X
  // on an unfunded repo becomes background noise.
}

main();
