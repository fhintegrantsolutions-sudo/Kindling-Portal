import Link from "next/link";

// Update this whenever the policy text changes.
const LAST_UPDATED = "August 4, 2026";

export const metadata = {
  title: "Privacy Policy · Kindling",
  description:
    "How the public Kindling website collects, uses, shares, and retains your information, and the choices you have.",
};

export default function PrivacyPolicyPage() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <h1 className="font-serif text-3xl font-bold tracking-tight md:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-foreground/90">
          <p>
            This Privacy Policy applies to the public Kindling website and the
            CoSpark community pages (the &ldquo;Site&rdquo;). It explains what
            information we collect when you visit the Site or request access,
            why we collect it, how we use and share it, how long we keep it, and
            the choices you have. Kindling (&ldquo;we,&rdquo; &ldquo;us,&rdquo;
            or &ldquo;our&rdquo;) is operated by{" "}
            <Placeholder>Legal entity name</Placeholder>,{" "}
            <Placeholder>business mailing address</Placeholder>.
          </p>
          <p className="rounded-md bg-muted/50 p-3 text-muted-foreground">
            If you have a Kindling investor account, the information collected
            inside the portal (your investor profile, investments,
            beneficiaries, and documents) is covered by our separate{" "}
            <Link
              href="/portal-privacy"
              className="font-medium underline underline-offset-4"
            >
              Portal Privacy Policy
            </Link>
            .
          </p>

          <Block title="1. Information we collect">
            <p className="font-medium text-foreground">
              Information you provide to us
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <span className="font-medium">Access requests &amp; contact:</span>{" "}
                when you fill out the request-access form, we collect your name,
                email address, phone number, any message you send, a referral
                code if you have one, and whether you&rsquo;re an existing
                community member.
              </li>
            </ul>

            <p className="mt-4 font-medium text-foreground">
              Information we collect automatically
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                Log and device data, including IP address, browser and device
                information, pages viewed, and timestamps.
              </li>
              <li>
                Cookies and similar technologies used to operate the Site (see
                &ldquo;Cookies &amp; analytics&rdquo; below).
              </li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              The public Site does not collect payment or bank information, and
              it does not provide access to any investment opportunities.
            </p>
          </Block>

          <Block title="2. Why we collect it and how we use it">
            <ul className="ml-5 list-disc space-y-1">
              <li>Respond to your access request and contact you about it</li>
              <li>Operate, maintain, and secure the Site</li>
              <li>Understand how the Site is used and improve it</li>
              <li>
                Comply with legal obligations and prevent fraud, abuse, and
                security issues
              </li>
            </ul>
            <p className="mt-3 font-medium text-foreground">
              We do not sell or rent your personal information.
            </p>
          </Block>

          <Block title="3. Cookies & analytics">
            <p>
              We use cookies and similar technologies to operate the Site and
              remember your preferences. We may use limited analytics to
              understand how the Site is used and to improve it
              <Placeholder> name your analytics provider here, if any</Placeholder>
              . You can control cookies through your browser settings.
            </p>
          </Block>

          <Block title="4. How we share your information">
            <p>We share information only as needed to operate the Site:</p>
            <ul className="ml-5 mt-2 list-disc space-y-1">
              <li>
                <span className="font-medium">Service providers</span> who
                process data on our behalf under contract, including our hosting
                provider (Vercel), our database provider (Supabase), and our
                customer-relationship and messaging provider (GoHighLevel /
                LeadConnector), which we use to follow up on your access request.
              </li>
              <li>
                <span className="font-medium">Legal &amp; regulatory</span>{" "}
                disclosures when required by law or legal process, or to protect
                rights, safety, and property.
              </li>
              <li>
                <span className="font-medium">Business transfers</span> in
                connection with a merger, financing, acquisition, or sale of
                assets.
              </li>
            </ul>
            <p className="mt-3">
              We do not sell or rent your personal information to third parties.
            </p>
          </Block>

          <Block title="5. How long we keep it">
            <p>
              We keep the information you submit through the Site for as long as
              needed to respond to your request and for our legitimate business
              and legal purposes. If you don&rsquo;t become an account holder, we
              delete or de-identify request information when it&rsquo;s no longer
              needed.
            </p>
          </Block>

          <Block title="6. Accessing or deleting your information">
            <p>
              You may request to access, correct, or delete the information you
              submitted through the Site by contacting us at{" "}
              <a
                href="mailto:info@kindling.network"
                className="font-medium underline underline-offset-4"
              >
                info@kindling.network
              </a>
              . We will respond consistent with applicable law. Depending on
              where you live, you may have additional rights, such as to request
              a copy of your data or to object to certain processing.
            </p>
          </Block>

          <Block title="7. Data security">
            <p>
              We use administrative, technical, and physical safeguards designed
              to protect your information, including encryption in transit. No
              method of transmission or storage is completely secure, so we
              cannot guarantee absolute security.
            </p>
          </Block>

          <Block title="8. Children's privacy">
            <p>
              The Site is intended for adults (18+) and is not directed to
              children. We do not knowingly collect personal information from
              children.
            </p>
          </Block>

          <Block title="9. Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time. We&rsquo;ll
              post the updated version here and revise the &ldquo;Last
              updated&rdquo; date at the top.
            </p>
          </Block>

          <Block title="10. Contact us">
            <p>
              Questions or requests about this Privacy Policy? Contact us at:
            </p>
            <p className="mt-2">
              Kindling
              <br />
              Email:{" "}
              <a
                href="mailto:info@kindling.network"
                className="font-medium underline underline-offset-4"
              >
                info@kindling.network
              </a>
              <br />
              <Placeholder>Mailing address</Placeholder>
            </p>
          </Block>
        </div>

        <div className="mt-12 border-t pt-6">
          <Link
            href="/"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-serif text-xl font-semibold">{title}</h2>
      {children}
    </div>
  );
}

// Bracketed, highlighted text marking a value the site owner must fill in
// before publishing. Deliberately visible so nothing placeholder ships
// unnoticed.
function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-yellow-100 px-1 text-yellow-900">
      [{children}]
    </span>
  );
}
