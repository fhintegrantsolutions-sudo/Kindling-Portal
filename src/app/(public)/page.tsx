import Link from "next/link";
import { ArrowRight, DollarSign, PieChart, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Exclusive opportunities",
    description:
      "Access vetted private note investments typically reserved for institutional investors.",
  },
  {
    icon: PieChart,
    title: "Transparent management",
    description:
      "Track every investment in one place with real-time funding and payment status.",
  },
  {
    icon: DollarSign,
    title: "Consistent returns",
    description:
      "Earn predictable monthly income from secured debt instruments.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Request access",
    desc: "Tell us about yourself so we can begin onboarding.",
  },
  {
    n: "2",
    title: "Get verified",
    desc: "Complete a quick verification with our team.",
  },
  {
    n: "3",
    title: "Browse opportunities",
    desc: "Review curated private notes when they open.",
  },
  {
    n: "4",
    title: "Invest & earn",
    desc: "Fund notes and track your returns from the portal.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="bg-sidebar py-20 text-sidebar-foreground md:py-32">
        <div className="mx-auto max-w-4xl px-4 text-center md:px-8">
          <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Private note investing, simplified.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-sidebar-foreground/80 md:text-xl">
            Access curated investment opportunities with transparent management
            and consistent returns.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/request-access">
              <Button size="lg">
                Request access
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <Link href="/about">
              <Button
                size="lg"
                variant="outline"
                className="border-sidebar-foreground/30 bg-transparent text-sidebar-foreground hover:bg-sidebar-foreground/10"
              >
                Learn more
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-12 text-center">
            <h2 className="font-serif text-3xl font-bold md:text-4xl">
              Why Kindling
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Institutional-quality opportunities and unmatched transparency,
              built for individual investors.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.title}>
                  <CardHeader>
                    <div className="mb-3 flex size-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="size-6 text-primary" />
                    </div>
                    <CardTitle>{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {f.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-muted/40 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-12 text-center">
            <h2 className="font-serif text-3xl font-bold md:text-4xl">
              How it works
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Four steps from interested to invested.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-lg border bg-card p-6">
                <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  {s.n}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
          <h2 className="font-serif text-3xl font-bold md:text-4xl">
            Ready to get started?
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Request access and our team will reach out to begin onboarding.
          </p>
          <div className="mt-8">
            <Link href="/request-access">
              <Button size="lg">
                Request access
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
