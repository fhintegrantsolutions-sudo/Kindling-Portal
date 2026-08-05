import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOPICS = [
  "Notes and how they fit into the broader financial system",
  "Financial history and overlooked concepts",
  "Alternative ways of thinking about money",
  "Educational conversations with the CoSpark community",
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-sidebar py-20 text-sidebar-foreground md:py-32">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
          <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            See Money Differently.
          </h1>
          <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-4 text-lg text-sidebar-foreground/80">
            <p>
              Most people grow up believing there&apos;s only one way to borrow,
              lend, or build financially—through banks and traditional
              institutions.
            </p>
            <p>
              Kindling is a community inside the CoSpark ecosystem where members
              explore ideas that challenge conventional thinking and encourage a
              broader understanding of how financial systems work.
            </p>
            <p>
              Through conversations, shared perspectives, and educational
              content, members gain exposure to concepts that are rarely
              discussed in traditional financial education.
            </p>
          </div>
          <div className="mt-10">
            <Link href="/request-access">
              <Button size="lg">
                Join the Community
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Kindling */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
          <h2 className="font-serif text-3xl font-bold md:text-4xl">
            Why Kindling?
          </h2>
          <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-4 text-base text-muted-foreground">
            <p>
              Kindling was created for people who enjoy asking questions,
              challenging assumptions, and exploring ideas beyond mainstream
              financial thinking.
            </p>
            <p>
              Whether you&apos;re just beginning your journey or looking to
              expand your perspective, Kindling provides a place to learn
              alongside a curious community.
            </p>
          </div>
        </div>
      </section>

      {/* Inside Kindling */}
      <section className="bg-muted/40 py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-bold md:text-4xl">
              Inside Kindling
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Members participate in discussions around topics such as:
            </p>
          </div>
          <ul className="mx-auto mt-8 flex max-w-2xl flex-col gap-3">
            {TOPICS.map((topic) => (
              <li
                key={topic}
                className="flex items-start gap-3 rounded-lg border bg-card p-4 text-sm"
              >
                <MessageCircle className="mt-0.5 size-5 shrink-0 text-primary" />
                <span>{topic}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Curiosity Starts Here */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
          <h2 className="font-serif text-3xl font-bold md:text-4xl">
            Curiosity Starts Here
          </h2>
          <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-4 text-base text-muted-foreground">
            <p>Every new perspective begins with a question.</p>
            <p>
              Kindling is a place to explore ideas, ask better questions, and
              continue learning with others who are equally curious.
            </p>
          </div>
          <div className="mt-8">
            <Link href="/request-access">
              <Button size="lg">
                Become Part of the Conversation
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
