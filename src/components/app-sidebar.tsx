"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  PieChart,
  TrendingUp,
  User,
} from "lucide-react";
import { logout } from "@/lib/auth/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Notes", href: "/notes", icon: PieChart },
  { label: "Opportunities", href: "/opportunities", icon: TrendingUp },
  { label: "Profile", href: "/profile", icon: User },
] as const;

export function AppSidebar({
  email,
  name,
}: {
  email: string | null;
  name: string | null;
}) {
  const pathname = usePathname();
  const initials = (name ?? email ?? "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-card md:py-6">
      <div className="px-6 pb-6">
        <span className="font-serif text-2xl font-semibold tracking-tight">
          Kindling
        </span>
      </div>
      <Separator />
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Separator />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{name ?? "Lender"}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
        <form action={logout}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
