"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
] as const;

export function PublicTopbar({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur supports-[backdrop-filter]:bg-sidebar/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-serif text-xl font-bold tracking-tight text-sidebar-primary"
        >
          <Image
            src="/logo.png"
            alt="Kindling logo"
            width={84}
            height={36}
            priority
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-sidebar-foreground",
                  active
                    ? "text-sidebar-foreground"
                    : "text-sidebar-foreground/60",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button size="sm">Go to dashboard</Button>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground"
              >
                Sign in
              </Link>
              <Link href="/request-access">
                <Button size="sm">Request access</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
