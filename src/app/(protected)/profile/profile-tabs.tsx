"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type ProfileTab = {
  label: string;
  href: string;
  exact: boolean;
};

export function ProfileTabs({ tabs }: { tabs: ProfileTab[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-3 py-2 text-sm transition-colors ${
              active
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
