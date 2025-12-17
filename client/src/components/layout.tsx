import { Link, useLocation } from "wouter";
import { NAV_ITEMS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/lib/api";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { data: user } = useCurrentUser();
  
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';

  const NavContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img 
            src="/attached_assets/Kindling_Logo_Transparent_1765674411263.png" 
            alt="Kindling Logo" 
            className="h-10 w-auto"
          />
          <span className="font-serif text-2xl font-bold tracking-tight text-sidebar-primary">
            Kindling
          </span>
        </div>
      </div>

      <div className="flex-1 py-6 px-4 space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group cursor-pointer",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
              onClick={() => setIsMobileOpen(false)}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-sidebar-primary" : "group-hover:text-sidebar-primary transition-colors")} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="p-6 border-t border-sidebar-border mt-auto">
        <div className="flex items-center gap-3 mb-6">
          <Avatar className="h-10 w-10 border border-sidebar-border">
            <AvatarImage src="" />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate text-sidebar-foreground">{user?.name || 'Loading...'}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email || ''}</p>
          </div>
        </div>
        <Link href="/auth" className="w-full">
          <Button variant="outline" className="w-full justify-start gap-2 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 fixed inset-y-0 z-50">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar z-50 px-4 flex items-center justify-between border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <img 
            src="/attached_assets/Kindling_Logo_Transparent_1765674411263.png" 
            alt="Kindling Logo" 
            className="h-8 w-auto"
          />
          <span className="font-serif text-xl font-bold text-sidebar-primary">Kindling</span>
        </div>
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80 bg-sidebar border-r-sidebar-border">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen transition-all duration-300 ease-in-out">
        <div className="h-full p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
