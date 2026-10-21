import Link from "next/link";
import { ChevronDown } from "lucide-react";

// Lender FAQ.

type QA = { q: string; a: React.ReactNode };
type Section = { title: string; items: QA[] };

const SECTIONS: Section[] = [
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
        a: (
          <>
            Kindling notes are backed by CoSpark via points, so a late payment
            or default by a borrower is covered through CoSpark.
          </>
        ),
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
            It confirms your participation in a note. Your acknowledgment
            letter is uploaded once the note&apos;s contract has been signed by
            CoSpark and the borrower. After that (and once your funding has
            cleared), you can download it from the note&apos;s page under{" "}
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
            A one-time fee, paid to CoSpark, is taken from the interest of
            your first payment. Every payment after that is your full monthly
            amount. Your fee is shown on your payment schedule.
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
        a: (
          <>
            Payments are sent through <strong>Melio</strong>. You&apos;ll
            receive a link from Melio to enter your banking details, and your
            monthly payments are deposited from there. To change your bank
            account, go to{" "}
            <Link
              href="/profile/change-requests?type=bank_account"
              className="underline underline-offset-4"
            >
              Profile → Change requests → Update bank account information
            </Link>{" "}
            and we&apos;ll send you a new Melio link. Never enter bank account
            details in the portal.
          </>
        ),
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
            Each note has one-time fees — a service fee and a CoSpark
            membership — which are paid to CoSpark. They are taken once, from
            the interest on your first payment of the note, and never from your
            principal. Your share is based on the amount you invested.
          </>
        ),
      },
      {
        q: "Are there any ongoing fees?",
        a: <>No. There are no ongoing fees.</>,
      },
    ],
  },
  {
    title: "Entities and your account",
    items: [
      {
        q: "Can I participate through another entity, like a trust, LLC or IRA?",
        a: (
          <>
            Yes. Go to{" "}
            <Link
              href="/profile/change-requests"
              className="underline underline-offset-4"
            >
              Profile → Change requests
            </Link> and choose <strong>Add an entity</strong>. You&apos;ll
            keep the same login, and once the entity is set up you can switch
            between your entities in the portal.
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
            entity first. When you change a mailing address, you may also need
            to update your W-9. See{" "}
            <Link
              href="/help/beneficiaries"
              className="underline underline-offset-4"
            >
              how to set up beneficiaries
            </Link>{" "}
            for a step-by-step guide.
          </>
        ),
      },
      {
        q: "How do I change my name, email or loan agreement details?",
        a: (
          <>
            Submit a request from{" "}
            <Link
              href="/profile/change-requests"
              className="underline underline-offset-4"
            >
              Profile → Change requests
            </Link>. You can request a name change, a new login email, a
            new email for an entity, or changes to your loan agreement title,
            entity type or business name. We&apos;ll review it — usually within
            24–48 business hours — and you can track its status on the same
            page.
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
            Yes. 1099s are sent by mid-February. You&apos;ll receive an email
            from <strong>Zendesk</strong> with your 1099. If it can&apos;t be
            delivered electronically, it is mailed to the address on file for
            that entity.
          </>
        ),
      },
      {
        q: "Why do you need a W-9, and how do I submit one?",
        a: (
          <>
            We need a W-9 for each entity to report your interest income
            accurately. Payments may be held until your W-9 is on file. To
            submit or update one, go to{" "}
            <Link
              href="/profile/change-requests?type=w9"
              className="underline underline-offset-4"
            >
              Profile → Change requests → Update W-9
            </Link>
            , complete the W-9 form, then submit the request so we know to look
            for it.
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
    title: "Support",
    items: [
      {
        q: "Who do I contact with questions?",
        a: (
          <>
            Email us at{" "}
            <a
              href="mailto:info@kindling.network"
              className="underline underline-offset-4"
            >
              info@kindling.network
            </a>
            . Please allow 24–48 business hours for a response.
          </>
        ),
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
