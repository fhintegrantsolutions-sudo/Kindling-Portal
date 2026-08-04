import Link from "next/link";

// Update this whenever the policy text changes.
const LAST_UPDATED = "August 4, 2026";

export const metadata = {
  title: "Portal Privacy Policy · Kindling",
  description:
    "How the Kindling investor portal collects, uses, shares, and retains your account and investment information.",
};

export default function PortalPrivacyPolicyPage() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <h1 className="font-serif text-3xl font-bold tracking-tight md:text-4xl">
          Portal Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-foreground/90">
          <p>
            This Privacy Policy applies to the Kindling investor portal (the
            &ldquo;Portal&rdquo;) &mdash; the signed-in area where account
            holders manage their investor profile, participations, beneficiaries,
            and documents. It explains what personal information we collect in
            the Portal, why, how we use and share it, how long we keep it, and
            the rights you have. Kindling (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
            &ldquo;our&rdquo;) is operated by{" "}
            <Placeholder>Legal entity name</Placeholder>,{" "}
            <Placeholder>business mailing address</Placeholder>.
          </p>
          <p className="rounded-md bg-muted/50 p-3 text-muted-foreground">
            Information collected on our public website (for example, the
            request-access form) is covered by our separate{" "}
            <Link
              href="/privacy"
              className="font-medium underline underline-offset-4"
            >
              website Privacy Policy
            </Link>
            .
          </p>

          <Block title="1. Information we collect">
            <p className="font-medium text-foreground">
              Information you provide to us
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <span className="font-medium">Account &amp; investor profile:</span>{" "}
                login email, name, mailing address, phone number, and
                correspondence details for each investor entity you hold.
              </li>
              <li>
                <span className="font-medium">Investment information:</span> the
                notes you participate in, amounts, funding method and reference
                details (such as a wire reference or check number), and related
                documents such as loan agreements and acknowledgment letters.
              </li>
              <li>
                <span className="font-medium">Beneficiary information</span> you
                choose to provide: beneficiary names, relationship, date of
                birth, the last four digits of a Social Security number,
                address, and phone number.
              </li>
              <li>
                <span className="font-medium">Tax &amp; identity documents</span>{" "}
                you upload or that we prepare for you.
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
                Cookies used to authenticate you and keep you signed in;
                disabling these may prevent you from using the Portal.
              </li>
            </ul>

            <p className="mt-4">
              <span className="font-medium text-foreground">
                Payment &amp; funding information.
              </span>{" "}
              Investment funding is generally handled by wire transfer or check
              outside of the Portal. We record funding references (such as a wire
              reference or check number) but do not collect full bank account
              numbers through the Portal.
            </p>
          </Block>

          <Block title="2. Why we collect it and how we use it">
            <ul className="ml-5 list-disc space-y-1">
              <li>Provide, operate, and secure the Portal and your account</li>
              <li>Administer your note participations and funding</li>
              <li>
                Communicate with you about your account, investments, and
                requests
              </li>
              <li>
                Prepare and deliver documents (e.g., loan agreements,
                acknowledgment letters, tax forms)
              </li>
              <li>
                Comply with legal, regulatory, tax, and recordkeeping
                obligations
              </li>
              <li>
                Detect, prevent, and address fraud, security, and technical
                issues
              </li>
            </ul>
            <p className="mt-3 font-medium text-foreground">
              We do not sell or rent your personal information.
            </p>
          </Block>

          <Block title="3. How we share your information">
            <p>We share personal information only as needed to operate the Portal:</p>
            <ul className="ml-5 mt-2 list-disc space-y-1">
              <li>
                <span className="font-medium">Service providers</span> who
                process data on our behalf under contract, including our database
                provider (Supabase), our application hosting provider (Vercel),
                and our customer-relationship and messaging provider (GoHighLevel
                / LeadConnector) used to send communications.
              </li>
              <li>
                <span className="font-medium">Professional advisors</span> such
                as accountants, auditors, and legal counsel.
              </li>
              <li>
                <span className="font-medium">Legal &amp; regulatory</span>{" "}
                disclosures when required by law, regulation, or legal process,
                or to protect rights, safety, and property.
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

          <Block title="4. How long we keep it">
            <p>
              We retain personal information for as long as your account is
              active and as needed to provide the Portal. Because we operate in a
              financial and lending context, we also retain certain records for
              longer periods to comply with legal, tax, regulatory, and
              recordkeeping requirements, and to resolve disputes and enforce
              agreements. When information is no longer needed, we delete or
              de-identify it.
            </p>
          </Block>

          <Block title="5. Accessing, correcting, or deleting your information">
            <p>
              You can update much of your profile directly within the Portal. To
              request access, correction, or deletion of your personal
              information, contact us at{" "}
              <a
                href="mailto:info@kindling.network"
                className="font-medium underline underline-offset-4"
              >
                info@kindling.network
              </a>
              . We will respond consistent with applicable law. Please note we
              may need to retain certain information to meet legal, tax, or
              regulatory obligations even after a deletion request.
            </p>
            <p className="mt-3">
              Depending on where you live, you may have additional rights &mdash;
              for example, to request a copy of your data, to restrict or object
              to certain processing, or to lodge a complaint with a regulator.
            </p>
          </Block>

          <Block title="6. Data security">
            <p>
              We use administrative, technical, and physical safeguards designed
              to protect your information, including access controls and
              encryption in transit. No method of transmission or storage is
              completely secure, so we cannot guarantee absolute security.
            </p>
          </Block>

          <Block title="7. Children's privacy">
            <p>
              The Portal is intended for adults (18+). We do not knowingly
              collect personal information from children.
            </p>
          </Block>

          <Block title="8. Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time. We&rsquo;ll
              post the updated version here and revise the &ldquo;Last
              updated&rdquo; date at the top.
            </p>
          </Block>

          <Block title="9. Contact us">
            <p>
              Questions or requests about this Privacy Policy or your personal
              information? Contact us at:
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
            href="/dashboard"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Back to portal
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
