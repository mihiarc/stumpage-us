"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, TreePine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/explore", label: "Explore prices" },
  { href: "/states", label: "States" },
  { href: "/directory", label: "Directory" },
  { href: "/coverage", label: "Coverage" },
  { href: "/sources", label: "Sources" },
  { href: "/data", label: "Download" },
  { href: "/about", label: "About" },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // both icons render; the .dark class decides which is visible (no
  // mounted-state dance, no hydration mismatch)
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
    </Button>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <TreePine className="size-5 text-emerald-700 dark:text-emerald-500" />
          <span className="whitespace-nowrap">US Timber Prices</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-1.5 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                pathname?.startsWith(item.href) &&
                  "bg-muted text-foreground font-medium",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
