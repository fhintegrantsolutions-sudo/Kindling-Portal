import Link from "next/link";
import { ChevronDown } from "lucide-react";

// Lender FAQ. Answers marked [TO CONFIRM] need Kindling to fill in or verify
// (contact details, payout method, legal/tax wording) before launch.

type QA = { q: string; a: React.ReactNode };
type Section = { title: string; items: QA[] };

const TO_CONFIRM = (
  <span className="rounded bg-amber-500/15 px-1 text-xs font-medium text-amber-700 dark:text-amber-400">
    [TO CONFIRM]
  </span>
);

const SECTIONS: Section[] = [
  {
    title: "Getting started",
    items: [
      {
        q: "What is Kindling, and who can participate?",
        a: (
          <>
            Kindling gives CoSpark members another way to engage with their
            financial goals within the CoSpark economy. Lenders participate in
            notes — loans to borrowers — and receive monthly payments of
            principal and interest. Kindling is available exclusively to
            CoSpark members.
          </>
        ),
      },
      {
        q: "How do I get access?",
        a: (
          <>
            Submit a request on the{" "}
            <Link href="/request-access" className="underline underline-offset-4">
              Request access
            </Link>{" "}
            page. Our team reviews it and, once approved, emails you a link to
            complete your participation details. After your funds clear, you
            receive an invitation to set up your portal login.
          </>
        ),
      },
      {
        q: "I didn't get my setup or invitation email. What should I do?",
        a: (
          <>
            Check your spam or promotions folder first. Setup links expire
            after 14 days — if yours has expired or never arrived, contact us
            and we&apos;ll send a fresh one. {TO_CONFIRM}
          </>
        ),
      },
    ],
  },
  {
    title: "How notes work",
    items: [
      {
        q: "What is a note?",
        a: (
          <>
            A note is a loan to a borrower for a specific project, with a set
            interest rate and term (for example, 9.5% over 60 months). Several
            lenders participate in each note, and each lender receives payments
            based on the amount they put in.
          </>
        ),
      },
      {
        q: "What is the minimum investment?",
        a: (
          <>
            Each note lists its minimum on the{" "}
            <Link href="/opportunities" className="underline underline-offset-4">
              Opportunities
            </Link>{" "}
            page and on the setup form.
          </>
        ),
      },
      {
        q: "Is the interest rate fixed?",
        a: (
          <>
            The rate shown while a note is being funded is a projection. It is
            finalized once all funds have been collected and the total
            transaction amount is confirmed. After that, it is fixed for the
            term of the note.
          </>
        ),
      },
      {
        q: "What's the difference between amortized and interest-only notes?",
        a: (
          <>
            On an <strong>amortized</strong> note, every monthly payment is the
            same amount and includes both principal and interest, so your
            balance goes down each month. On an <strong>interest-only</strong>{" "}
            note, monthly payments are interest only and your principal is
            returned in the final payment.
          </>
        ),
      },
      {
        q: "What happens if a borrower pays late or defaults?",
        a: <>{TO_CONFIRM} Describe Kindling&apos;s process and lender risk here.</>,
      },
      {
        q: "Can I withdraw my money early?",
        a: <>{TO_CONFIRM} Describe whether and how early exits work.</>,
      },
    ],
  },
  {
    title: "Joining a note",
    items: [
      {
        q: "How do I know when a new note is coming?",
        a: (
          <>
            The{" "}
            <Link href="/opportunities" className="underline underline-offset-4">
              Opportunities
            </Link>{" "}
            page shows the next note and a countdown to when its funding opens.
            Starting 30 days before funding opens, you can click{" "}
            <strong>I&apos;m interested</strong> to let us know you plan to
            participate.
          </>
        ),
      },
      {
        q: "Does clicking “I'm interested” commit me?",
        a: (
          <>
            No. It simply lets us know you&apos;re planning to participate, with
            an optional estimated amount. You can update or withdraw it at any
            time before funding opens. If you have more than one entity, each
            can register interest separately.
          </>
        ),
      },
      {
        q: "How do I register and send funds?",
        a: (
          <>
            When funding opens, register for the note and choose your amount.
            You can fund by wire or check — we&apos;ll follow up with
            instructions. If the funds will come from a different name than the
            one on your registration (for example, your LLC&apos;s account), tell
            us on the form so we can match them.
          </>
        ),
      },
      {
        q: "When is my participation confirmed?",
        a: (
          <>
            Your funding moves through <strong>Received</strong>,{" "}
            <strong>Deposited</strong> and <strong>Cleared</strong>. Once it has
            cleared, your participation is active and your payment schedule
            appears on the note&apos;s page.
          </>
        ),
      },
      {
        q: "What is an acknowledgment letter, and where do I find it?",
        a: (
          <>
            It confirms your participation in a note. Once your funding has
            cleared, you can download it from the note&apos;s page under{" "}
            <strong>Documents</strong>.
          </>
        ),
      },
    ],
  },
  {
    title: "Payments",
    items: [
      {
        q: "When do I get paid, and how much?",
        a: (
          <>
            Payments are monthly on the note&apos;s scheduled due date. Your
            monthly payment is shown on the note&apos;s page, along with your
            full payment schedule — you can also download it as a PDF.
          </>
        ),
      },
      {
        q: "How is my payment calculated?",
        a: (
          <>
            Your payment is your own invested amount amortized at the
            note&apos;s interest rate and term. You can check it with any
            standard amortization calculator, such as{" "}
            <a
              href="https://www.calculator.net/amortization-calculator.html"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              calculator.net
            </a>
            : enter your amount, the note&apos;s term and its rate.
          </>
        ),
      },
      {
        q: "Why is my first payment smaller?",
        a: (
          <>
            A one-time fee is taken from the interest of your first payment.
            Every payment after that is your full monthly amount. Your fee is
            shown on your payment schedule.
          </>
        ),
      },
      {
        q: "What do “Pending” and “Received” mean on my schedule?",
        a: (
          <>
            <strong>Pending</strong> means the borrower&apos;s payment has come
            in and your payment is being processed for its due date.{" "}
            <strong>Received</strong> means your payment has been made.{" "}
            <strong>Scheduled</strong> is a future payment.
          </>
        ),
      },
      {
        q: "How are payments sent to me?",
        a: <>{TO_CONFIRM} ACH / direct deposit / check — and how to update bank details.</>,
      },
    ],
  },
  {
    title: "Fees",
    items: [
      {
        q: "What fees are there?",
        a: (
          <>
            There are one-time fees on each note, taken only from the interest
            of your first payment — never from your principal. Your share is
            based on the amount you invested. {TO_CONFIRM}
          </>
        ),
      },
      {
        q: "Are there any ongoing fees?",
        a: <>{TO_CONFIRM}</>,
      },
    ],
  },
  {
    title: "Entities and your account",
    items: [
      {
        q: "Can I invest through an LLC, trust or IRA?",
        a: (
          <>
            Yes. Each one is set up as its own entity, with its own address,
            loan agreement name and W-9. {TO_CONFIRM} Note any requirements for
            IRA custodians.
          </>
        ),
      },
      {
        q: "How do I switch between my entities?",
        a: (
          <>
            Use the switcher at the top of the left-hand menu, just below the
            Kindling logo. Choose <strong>All entities</strong> to see
            everything at once. On a phone, open the menu first.
          </>
        ),
      },
      {
        q: "What is the “exact name for the loan agreement”?",
        a: (
          <>
            The formal name used on your documentation. Use the exact legal
            name — for a person, first and last name (optionally with a middle
            name or initial), such as &ldquo;Jane Quinn Doe&rdquo;; for an
            entity, its full legal name, such as &ldquo;Jane Q. Doe Revocable
            Trust&rdquo; or &ldquo;Acme Capital LLC.&rdquo;
          </>
        ),
      },
      {
        q: "How do I update my address, phone or beneficiaries?",
        a: (
          <>
            Go to{" "}
            <Link href="/profile" className="underline underline-offset-4">
              Profile
            </Link>
            . Addresses and beneficiaries are set per entity, so choose the
            entity first.
          </>
        ),
      },
      {
        q: "How do I reset my password?",
        a: (
          <>
            On the sign-in page, click <strong>Forgot password?</strong> and
            follow the emailed link.
          </>
        ),
      },
    ],
  },
  {
    title: "Taxes and documents",
    items: [
      {
        q: "Will I receive a 1099?",
        a: (
          <>
            Yes. Your 1099 is delivered electronically whenever possible; if it
            can&apos;t be, it is mailed to the address on file for that entity.{" "}
            {TO_CONFIRM} Add the expected delivery timing.
          </>
        ),
      },
      {
        q: "Why do you need a W-9, and how do I submit one?",
        a: (
          <>
            We need a W-9 for each entity to report your interest income
            accurately. Payments may be held until your W-9 is on file. Submit
            or update it from{" "}
            <Link href="/profile" className="underline underline-offset-4">
              Profile
            </Link>{" "}
            → <strong>Update W-9</strong>.
          </>
        ),
      },
      {
        q: "Where are my documents and payment schedules?",
        a: (
          <>
            Open the note from{" "}
            <Link href="/notes" className="underline underline-offset-4">
              My Notes
            </Link>
            . Your payment schedule (with a PDF download) and documents such as
            your acknowledgment letter are on that page.
          </>
        ),
      },
    ],
  },
  {
    title: "Referrals and support",
    items: [
      {
        q: "How does my referral link work?",
        a: (
          <>
            If you have a referral code, find it under Profile →{" "}
            <strong>Referrals</strong>. Share the link with anyone who&apos;d
            like to request access. {TO_CONFIRM}
          </>
        ),
      },
      {
        q: "Who do I contact with questions?",
        a: <>{TO_CONFIRM} Email, phone and typical response time.</>,
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Frequently asked questions
        </h1>
        <p className="text-sm text-muted-foreground">
          Answers to common questions about Kindling, notes and payments.
        </p>
      </header>

      {SECTIONS.map((section) => (
        <section key={section.title} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </h2>
          <div className="divide-y rounded-lg border bg-card">
            {section.items.map((item) => (
              <details key={item.q} className="group px-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="pb-4 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
