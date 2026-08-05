import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Light top bar so the dark "Kindling" wordmark and orange mark read clearly.
// The hero section below is dark, which gives the bar good contrast.
export function PublicTopbar({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
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

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button size="sm">Go to dashboard</Button>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              {/* New participants join here — this flow (request-access)
                  captures whether they're a CoSpark member. */}
              <Link href="/request-access">
                <Button size="sm">Join</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
