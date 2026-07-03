"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  Building2,
  ClipboardList,
  FileText,
  Handshake,
  Inbox,
  LayoutDashboard,
  LogOut,
  PieChart,
  Shield,
  TrendingUp,
  User,
  Users,
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

// Two groups separated by a thin divider in the sidebar: the note-workflow
// items (everything tied to a deal), then the admin tools (system-level
// user / referral management).
const ADMIN_WORKFLOW = [
  { label: "Overview", href: "/admin", icon: Shield },
  { label: "Access requests", href: "/admin/access-requests", icon: Inbox },
  { label: "Participations", href: "/admin/participations", icon: Banknote },
  { label: "Notes", href: "/admin/notes", icon: FileText },
  { label: "Borrowers", href: "/admin/borrowers", icon: Building2 },
] as const;
const ADMIN_TOOLS = [
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Referrals", href: "/admin/referrals", icon: Handshake },
] as const;

export function AppSidebar({
  email,
  firstName,
  lastName,
  role,
}: {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
}) {
  const pathname = usePathname();
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const initials =
    [firstName, lastName]
      .filter(Boolean)
      .map((p) => p![0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    (email ?? "?")[0]?.toUpperCase() ||
    "?";

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:bg-sidebar md:text-sidebar-foreground">
      <div className="flex items-center gap-3 px-6 py-6">
        <Image
          src="/logo.png"
          alt="Kindling logo"
          width={84}
          height={36}
          priority
        />
      </div>
      <Separator className="bg-sidebar-border" />
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {role !== "participations_admin"
          ? NAV.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.icon}
                pathname={pathname}
              />
            ))
          : null}
        {role === "admin" ? (
          <>
            <p className="mt-4 px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Admin
            </p>
            {ADMIN_WORKFLOW.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.icon}
                pathname={pathname}
                exact={item.href === "/admin"}
              />
            ))}
            <div className="my-2 border-t border-sidebar-border" />
            {ADMIN_TOOLS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.icon}
                pathname={pathname}
              />
            ))}
          </>
        ) : role === "participations_admin" ? (
          // Scoped admin — only the participations link is visible. The
          // lender-side NAV items above are hidden by the role check in
          // the parent block.
          <NavLink
            href="/admin/participations"
            label="Participations"
            Icon={Banknote}
            pathname={pathname}
          />
        ) : null}
      </nav>
      <Separator className="bg-sidebar-border" />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-9 border border-sidebar-border">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {fullName || "Lender"}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {email}
            </p>
          </div>
        </div>
        <form action={logout}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  label,
  Icon,
  pathname,
  exact,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  pathname: string | null;
  exact?: boolean;
}) {
  const active = exact
    ? pathname === href
    : pathname === href || pathname?.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
