"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NoteTabs({ noteUuid }: { noteUuid: string }) {
  const pathname = usePathname();
  const base = `/admin/notes/${noteUuid}`;
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/schedule`, label: "Schedule" },
    { href: `${base}/bonuses`, label: "Bonuses" },
    { href: `${base}/settings`, label: "Settings" },
  ] as const;

  return (
    <nav className="flex gap-1 border-b">
      {tabs.map((t) => {
        const active = isActive(pathname, t.href, base);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm transition-colors -mb-px",
              active
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

function isActive(pathname: string | null, href: string, base: string) {
  if (!pathname) return false;
  if (href === base) {
    // Overview: only active when we're on the exact base path.
    return pathname === base;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
