import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Coming-soon top bar: branding + a single dashboard entry point. The button
// sends signed-in members straight to their dashboard; everyone else is
// redirected to the login screen by the protected route.
export function PublicTopbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link href="/" aria-label="Kindling home" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Kindling"
            width={140}
            height={60}
            priority
            className="h-9 w-auto md:h-10"
          />
        </Link>

        <Link href="/dashboard">
          <Button size="sm">Go to dashboard</Button>
        </Link>
      </div>
    </header>
  );
}
