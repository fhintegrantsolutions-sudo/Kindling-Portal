import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <section className="flex min-h-[70svh] items-center justify-center px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Kindling
        </p>
        <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight md:text-6xl">
          Make more of your financial opportunities.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Kindling is part of a private community. It gives members of the
          community another way to engage with their financial goals.
        </p>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          As part of a community built around participation and shared
          opportunity, Kindling opens the door to new possibilities for
          members.
        </p>

        <p className="mt-10 font-serif text-xl font-semibold">
          Kindling. Part of a private community.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Available exclusively to members of the community.
        </p>

        <div className="mt-8">
          <Link href="/request-access" className={buttonVariants({ size: "lg" })}>
            Join Kindling
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Already a community member and joined Kindling?{" "}
          <Link
            href="/dashboard"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            Access your dashboard
          </Link>
        </p>
      </div>
    </section>
  );
}
