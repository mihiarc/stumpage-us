// Prefix for static assets fetched by raw URL (fetch(), <a href>, MapLibre
// sources) — next/link handles basePath automatically, these do not.
// NEXT_PUBLIC_BASE_PATH is set by the GitHub Pages workflow ("/stumpage-us")
// and empty for local dev and custom-domain deploys; it must match
// next.config.ts basePath.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  return `${BASE_PATH}${path}`;
}
