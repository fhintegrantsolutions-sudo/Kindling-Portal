"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  Building2,
  FileText,
  Handshake,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Shield,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { logout } from "@/lib/auth/actions";
import {
  EntitySwitcher,
  type SwitcherEntity,
} from "@/components/entity-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

type SidebarProps = {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  entities: SwitcherEntity[];
  currentEntityId: string | null;
  entityMode: "all" | "one";
};

// Desktop: a fixed left column, visible from md up.
export function AppSidebar(props: SidebarProps) {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:bg-sidebar md:text-sidebar-foreground">
      <SidebarBody {...props} />
    </aside>
  );
}

// Mobile: a light top bar with a hamburger that slides the same nav in from
// the left. Rendered above <main> in the protected layout and hidden from md up.
export function MobileNav(props: SidebarProps) {
  const [open, setOpen] = useState(false);
  return (
    <header className="flex items-center gap-3 border-b bg-background px-4 py-2.5 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="Open menu"
          className="inline-flex size-9 items-center justify-center rounded-md border text-foreground/80 transition-colors hover:bg-muted"
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent
          side="left"
          className="flex w-72 max-w-[80%] flex-col gap-0 bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          {/* Close the drawer after the tapped link navigates. */}
          <SidebarBody {...props} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <Image
        src="/logo.png"
        alt="Kindling"
        width={84}
        height={36}
        priority
        className="h-7 w-auto"
      />
    </header>
  );
}

// Shared inner content: logo, entity switcher, nav, and the pinned user footer.
// Used by both the desktop aside and the mobile drawer.
function SidebarBody({
  email,
  firstName,
  lastName,
  role,
  entities,
  currentEntityId,
  entityMode,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
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
    <>
      <div className="flex items-center gap-3 px-6 py-6">
        <Image
          src="/logo.png"
          alt="Kindling logo"
          width={84}
          height={36}
          priority
        />
      </div>
      {/* Renders nothing unless this login owns 2+ entities. */}
      <EntitySwitcher
        entities={entities}
        currentEntityId={currentEntityId}
        mode={entityMode}
      />
      <Separator className="bg-sidebar-border" />
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-4">
        {role !== "participations_admin"
          ? NAV.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.icon}
                pathname={pathname}
                onNavigate={onNavigate}
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
                onNavigate={onNavigate}
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
                onNavigate={onNavigate}
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
            onNavigate={onNavigate}
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
        <Link
          href="/portal-privacy"
          onClick={onNavigate}
          className="text-xs text-sidebar-foreground/50 underline-offset-4 hover:text-sidebar-foreground hover:underline"
        >
          Privacy Policy
        </Link>
      </div>
    </>
  );
}

function NavLink({
  href,
  label,
  Icon,
  pathname,
  exact,
  onNavigate,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  pathname: string | null;
  exact?: boolean;
  onNavigate?: () => void;
}) {
  const active = exact
    ? pathname === href
    : pathname === href || pathname?.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onNavigate}
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
