import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileText,
  LineChart,
  LifeBuoy,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const CAPABILITIES = [
  "Secure document management",
  "Note setup and onboarding",
  "Payment servicing and tracking",
  "Principal and balance reporting",
  "Servicing history",
  "Note amendments and updates",
  "Ongoing administrative support",
];

const LIFECYCLE = [
  {
    icon: FileText,
    title: "Document",
    body: "Agreements and records are securely maintained.",
  },
  {
    icon: LineChart,
    title: "Manage",
    body: "Payment activity, balances, and servicing information are tracked.",
  },
  {
    icon: LifeBuoy,
    title: "Support",
    body: "Members have access to ongoing administrative assistance.",
  },
  {
    icon: CheckCircle2,
    title: "Complete",
    body: "Records are maintained through final payoff or completion.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-sidebar py-20 text-sidebar-foreground md:py-32">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
          <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            The operating platform behind a modern note experience.
          </h1>
          <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-4 text-lg text-sidebar-foreground/80">
            <p>
              Kindling provides the secure technology and administrative
              infrastructure that supports the lifecycle of private promissory
              notes within the CoSpark ecosystem. From onboarding and
              documentation to servicing, payment tracking, and ongoing
              recordkeeping, Kindling helps create a consistent, organized
              experience for members managing their notes.
            </p>
            <p>
              Built exclusively for CoSpark members, Kindling brings together the
              tools needed to securely access note information, manage
              documentation, and stay connected throughout the life of each note.
            </p>
          </div>
          <div className="mt-10">
            <Link href="/login">
              <Button size="lg">
                Access Kindling
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Simplifying Note Administration */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-bold md:text-4xl">
              Simplifying Note Administration
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Managing a note involves more than a signed agreement. It requires
              accurate records, timely processing, clear communication, and
              dependable systems. Kindling supports the operational side of note
              administration through:
            </p>
          </div>
          <ul className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
            {CAPABILITIES.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-lg border bg-card p-4 text-sm"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Check className="size-3 text-primary" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-8 max-w-2xl text-center text-base text-muted-foreground">
            Our goal is simple: create clarity and confidence through reliable
            processes and accurate information.
          </p>
        </div>
      </section>

      {/* Designed for the CoSpark Member Experience */}
      <section className="bg-muted/40 py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
          <h2 className="font-serif text-3xl font-bold md:text-4xl">
            Designed for the CoSpark Member Experience
          </h2>
          <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-4 text-base text-muted-foreground">
            <p>
              Kindling works alongside the CoSpark ecosystem to provide members
              with a centralized platform for managing their note activity. While
              CoSpark provides the membership experience and community framework,
              Kindling provides the technology and operational infrastructure that
              supports note administration.
            </p>
            <p>
              Members may participate in a variety of CoSpark programs and
              services based on their individual goals and eligibility. Kindling
              serves as the platform that helps manage the administrative
              experience once a note transaction has been established.
            </p>
          </div>
        </div>
      </section>

      {/* From Origination Through Completion */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-bold md:text-4xl">
              From Origination Through Completion
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Every note has a lifecycle. Kindling helps support each stage by
              providing organized systems and dependable servicing.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {LIFECYCLE.map((stage) => {
              const Icon = stage.icon;
              return (
                <div
                  key={stage.title}
                  className="flex flex-col gap-3 rounded-lg border bg-card p-6"
                >
                  <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold">
                    {stage.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{stage.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Built on Accuracy. Designed for Trust. */}
      <section className="bg-muted/40 py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
          <h2 className="font-serif text-3xl font-bold md:text-4xl">
            Built on Accuracy. Designed for Trust.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground">
            Financial agreements require careful administration. Kindling is
            committed to providing the systems, processes, and support needed to
            help ensure every serviced note is managed with consistency and
            attention to detail.
          </p>
        </div>
      </section>

      {/* Access Kindling */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
          <h2 className="font-serif text-3xl font-bold md:text-4xl">
            Access Kindling
          </h2>
          <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-2 text-base text-muted-foreground">
            <p>Kindling is available exclusively to CoSpark members.</p>
            <p>
              Existing members can access their Kindling account through the
              member portal.
            </p>
          </div>
          <div className="mt-8">
            <Link href="/login">
              <Button size="lg">
                Member portal
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border-t py-10">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Disclaimer
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Kindling provides technology and administrative servicing support for
            promissory notes. Kindling does not provide investment, legal, tax, or
            financial advice. Any note transaction is governed by the applicable
            agreements and documentation between the relevant parties.
            Availability of services and participation requirements are determined
            by applicable program terms and documentation.
          </p>
        </div>
      </section>
    </>
  );
}
