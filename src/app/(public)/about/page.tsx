import {
  Building2,
  HeartHandshake,
  Landmark,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const BENEFITS = [
  {
    icon: Shield,
    title: "Curated opportunities",
    desc: "Every note is rigorously vetted before it appears in the portal.",
  },
  {
    icon: Zap,
    title: "Modern platform",
    desc: "Intuitive tools for tracking funding, payments, and beneficiaries.",
  },
  {
    icon: HeartHandshake,
    title: "Transparent fees",
    desc: "Clear pricing with no hidden charges.",
  },
  {
    icon: Building2,
    title: "Dedicated support",
    desc: "A team that knows the deals and the lenders behind them.",
  },
];

const TYPES = [
  {
    icon: Building2,
    title: "Real estate notes",
    desc: "Secured by property with steady amortizing payments and strong collateral.",
  },
  {
    icon: TrendingUp,
    title: "Venture debt",
    desc: "Growth-stage company financing offering higher yields with managed risk.",
  },
  {
    icon: Landmark,
    title: "Specialty finance",
    desc: "Bespoke debt instruments structured for a specific borrower or project.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="border-b bg-sidebar py-16 text-sidebar-foreground md:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center md:px-8">
          <h1 className="font-serif text-4xl font-bold tracking-tight md:text-5xl">
            About Kindling
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-sidebar-foreground/80">
            We connect individual lenders with vetted private note investments
            traditionally reserved for institutions.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-bold md:text-4xl">
              What we do
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Kindling combines rigorous deal curation with a modern portal so
              lenders can invest, track, and earn — all in one place.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <Card key={b.title}>
                  <CardHeader>
                    <div className="mb-3 flex size-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="size-6 text-primary" />
                    </div>
                    <CardTitle>{b.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {b.desc}
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
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-bold md:text-4xl">
              What you can invest in
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              We bring a diverse set of debt instruments to the platform.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <Card key={t.title}>
                  <CardHeader>
                    <div className="mb-3 flex size-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="size-6 text-primary" />
                    </div>
                    <CardTitle>{t.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {t.desc}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
