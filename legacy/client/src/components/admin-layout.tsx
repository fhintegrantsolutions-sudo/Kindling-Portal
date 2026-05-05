import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, UserCheck, DollarSign, Building2, LayoutDashboard, FileText, Users, Shield, Workflow, UserCog, Link2, UserPlus, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { label: "Overview", icon: LayoutDashboard, href: "/portal/admin" },
      { label: "Access Requests", icon: UserPlus, href: "/portal/admin/access-requests" },
      { label: "Investor Workflow", icon: Workflow, href: "/portal/admin/investor-workflow" },
    ],
  },
  {
    label: "Investors",
    items: [
      { label: "Lenders", icon: Users, href: "/portal/admin/lenders" },
      { label: "Registrations", icon: UserCheck, href: "/portal/admin/registrations" },
      { label: "Referrals", icon: Link2, href: "/portal/admin/referrals" },
    ],
  },
  {
    label: "Financial",
    items: [
      { label: "Notes", icon: FileText, href: "/portal/admin/notes" },
      { label: "Payments", icon: DollarSign, href: "/portal/admin/payments" },
      { label: "Borrowers", icon: Building2, href: "/portal/admin/borrowers" },
    ],
  },
  {
    label: "Settings",
    collapsible: true,
    items: [
      { label: "User Management", icon: UserCog, href: "/portal/admin/users" },
      { label: "Entities & KYC", icon: Building2, href: "/portal/admin/entities" },
      { label: "Roles & Permissions", icon: Shield, href: "/portal/admin/roles" },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const NavContent = () => {
    const isInSettings = NAV_GROUPS[3].items.some(i => location === i.href);

    return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Kindling Logo"
            className="h-10 w-auto"
          />
          <div>
            <span className="font-serif text-2xl font-bold tracking-tight text-sidebar-primary block">
              Kindling
            </span>
            <span className="text-xs text-sidebar-foreground/60">Admin Portal</span>
          </div>
        </div>
      </div>

      <div className="flex-1 py-4 px-4 overflow-y-auto space-y-5">
        {NAV_GROUPS.map((group, gi) => {
          const isCollapsible = group.collapsible;
          const isExpanded = !isCollapsible || settingsOpen || isInSettings;

          return (
            <div key={gi}>
              {group.label && (
                isCollapsible ? (
                  <button
                    onClick={() => setSettingsOpen(o => !o)}
                    className="flex items-center justify-between w-full px-1 mb-1 group"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40 group-hover:text-sidebar-foreground/60 transition-colors">
                      {group.label}
                    </span>
                    <ChevronDown className={cn(
                      "h-3 w-3 text-sidebar-foreground/40 transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )} />
                  </button>
                ) : (
                  <p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40 px-1 mb-1">
                    {group.label}
                  </p>
                )
              )}
              {isExpanded && (
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200 group cursor-pointer",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                        onClick={() => setIsMobileOpen(false)}
                      >
                        <item.icon className={cn("h-4 w-4", isActive ? "text-sidebar-primary" : "group-hover:text-sidebar-primary transition-colors")} />
                        <span className="text-sm">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-6 border-t border-sidebar-border mt-auto">
        <div className="flex items-center gap-3 mb-6">
          <Avatar className="h-10 w-10 border border-sidebar-border">
            <AvatarImage src="" />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground">A</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate text-sidebar-foreground">Admin User</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">admin@kindling.com</p>
          </div>
        </div>
        <Link href="/portal">
          <Button variant="outline" className="w-full justify-start gap-2 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LogOut className="h-4 w-4" />
            Exit Admin
          </Button>
        </Link>
      </div>
    </div>
  );
  };

  return (
    <div className="min-h-screen flex bg-background font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-72 fixed inset-y-0 z-50">
        <NavContent />
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Kindling Logo" className="h-8 w-auto" />
            <span className="font-serif text-xl font-bold text-sidebar-primary">Kindling</span>
            <span className="text-xs text-sidebar-foreground/60">Admin</span>
          </div>
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground">
                {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <NavContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-72">
        <div className="md:p-0 pt-16 md:pt-0">
          {children}
        </div>
      </main>
    </div>
  );
}
