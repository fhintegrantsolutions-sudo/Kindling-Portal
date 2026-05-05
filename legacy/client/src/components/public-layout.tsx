import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Flame } from "lucide-react";
import { useCurrentUser } from "@/lib/api";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { data: user } = useCurrentUser();

  const navItems = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/">
              <a className="flex items-center gap-2 font-serif text-xl font-bold text-sidebar-foreground hover:text-sidebar-primary transition-colors">
                <Flame className="h-6 w-6 text-primary" />
                Kindling
              </a>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      location === item.href
                        ? "text-sidebar-foreground"
                        : "text-sidebar-foreground/60"
                    }`}
                  >
                    {item.label}
                  </a>
                </Link>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <Link href="/portal">
                  <Button variant="default">Go to Portal</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" className="text-sidebar-foreground hover:text-primary">
                      Login
                    </Button>
                  </Link>
                  <a href="#contact">
                    <Button variant="default">Get Started</Button>
                  </a>
                </>
              )}
            </div>

            {/* Mobile Menu */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="text-sidebar-foreground">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-sidebar">
                <div className="flex flex-col gap-6 mt-6">
                  {navItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <a
                        onClick={() => setOpen(false)}
                        className={`text-base font-medium transition-colors hover:text-primary ${
                          location === item.href
                            ? "text-sidebar-foreground"
                            : "text-sidebar-foreground/60"
                        }`}
                      >
                        {item.label}
                      </a>
                    </Link>
                  ))}
                  <div className="flex flex-col gap-3 mt-4">
                    {user ? (
                      <Link href="/portal">
                        <Button variant="default" className="w-full" onClick={() => setOpen(false)}>
                          Go to Portal
                        </Button>
                      </Link>
                    ) : (
                      <>
                        <Link href="/login">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setOpen(false)}
                          >
                            Login
                          </Button>
                        </Link>
                        <a href="#contact">
                          <Button
                            variant="default"
                            className="w-full"
                            onClick={() => setOpen(false)}
                          >
                            Get Started
                          </Button>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-sidebar text-sidebar-foreground border-t border-sidebar-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center gap-2 font-serif text-xl font-bold mb-4">
                <Flame className="h-6 w-6 text-primary" />
                Kindling
              </div>
              <p className="text-sm text-sidebar-foreground/70">
                Private note investing made simple and transparent.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/">
                    <a className="text-sidebar-foreground/70 hover:text-primary transition-colors">
                      Home
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/about">
                    <a className="text-sidebar-foreground/70 hover:text-primary transition-colors">
                      About
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/login">
                    <a className="text-sidebar-foreground/70 hover:text-primary transition-colors">
                      Login
                    </a>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#"
                    className="text-sidebar-foreground/70 hover:text-primary transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sidebar-foreground/70 hover:text-primary transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-sidebar-border">
            <p className="text-center text-sm text-sidebar-foreground/60">
              © {new Date().getFullYear()} Kindling. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
