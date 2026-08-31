import { cn } from "@/lib/utils";
import { sourceColorVar } from "@/lib/format";

/**
 * Legend key for a dataset: a solid swatch in the source's identity colour,
 * always placed immediately before the source's name. Decorative on its own —
 * the name beside it carries the meaning — so it is hidden from screen readers.
 */
export function SourceMark({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ background: sourceColorVar(code) }}
    />
  );
}
