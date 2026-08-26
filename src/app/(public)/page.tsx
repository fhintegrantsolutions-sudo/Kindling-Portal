import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ComingSoonPage() {
  return (
    <section className="flex min-h-[70svh] items-center justify-center px-4 py-20">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Kindling
        </p>
        <h1 className="mt-4 font-serif text-5xl font-bold tracking-tight md:text-6xl">
          Coming soon
        </h1>
        <p className="mx-auto mt-5 max-w-md text-lg text-muted-foreground">
          We&apos;re putting the finishing touches on the Kindling experience.
          Check back soon.
        </p>
        <div className="mt-8">
          <Link href="/dashboard">
            <Button size="lg">
              Go to dashboard
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
