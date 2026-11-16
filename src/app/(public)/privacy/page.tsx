import Link from "next/link";

// Update this whenever the policy text changes.
const LAST_UPDATED = "November 15, 2026";

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
            This Privacy Policy applies to the public Kindling website (the
            &ldquo;Site&rdquo;). It explains what information we collect when
            you visit the Site or request access, why we collect it, how we use
            and share it, how long we keep it, and the choices you have.
            Kindling (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
            is operated by Kindling LLC, 102 S Weber Street, Colorado Springs, CO
            80903.
          </p>
          <p>
            By using the Site, you agree to the terms of this Privacy Policy.
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
                code if you have one, whether you&rsquo;re an existing
                community member, and whether you agree to receive text
                messages.
              </li>
            </ul>

            <p className="mt-4 font-medium text-foreground">
              Information we collect automatically
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                Log and device data, including IP address, browser type and
                version, device and operating system information, pages viewed,
                the referring website, time spent on pages, and the date and
                time of your visit.
              </li>
              <li>
                Cookies, pixels, and similar technologies (see &ldquo;Cookies,
                analytics &amp; advertising&rdquo; below).
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
              <li>
                Send you emails about Kindling, including updates and marketing
                communications (see &ldquo;Email communications&rdquo; below)
              </li>
              <li>
                Send you text messages, if you agreed to receive them (see
                &ldquo;Text messages&rdquo; below)
              </li>
              <li>Operate, maintain, and secure the Site</li>
              <li>Understand how the Site is used and improve it</li>
              <li>Measure the effectiveness of our advertising</li>
              <li>
                Comply with legal obligations and prevent fraud, abuse, and
                security issues
              </li>
            </ul>
            <p className="mt-3 font-medium text-foreground">
              We do not sell or rent your personal information.
            </p>
          </Block>

          <Block title="3. Email communications">
            <p>
              If you request access or otherwise give us your email address, you
              may receive emails from Kindling, including follow-up about your
              request, educational content, updates about Kindling, and
              marketing communications.
            </p>
            <p>
              You can unsubscribe from marketing emails at any time by clicking
              the unsubscribe link in any of them. We may still send you
              non-marketing messages, such as replies to your request.
            </p>
          </Block>

          <Block title="4. Text messages">
            <p>
              If you check the box on our request-access form agreeing to
              receive text messages, Kindling may send texts to the phone number
              you provided about your request, updates, and offers. Consent to
              texts is optional and is not a condition of requesting access.
            </p>
            <p>
              Message frequency varies. Message and data rates may apply. Reply
              STOP to any message to opt out, or HELP for help. You can also
              contact us at info@kindling.network.
            </p>
            <p className="font-medium text-foreground">
              We do not sell, rent, or share your mobile phone number or text
              messaging consent with third parties or affiliates for their
              marketing or promotional purposes. Text messaging opt-in data and
              consent are not shared with any third parties, except service
              providers that send messages on our behalf.
            </p>
          </Block>

          <Block title="5. Cookies, analytics & advertising">
            <p>
              We use cookies and similar technologies to operate the Site,
              remember your preferences, understand how visitors use the Site,
              and measure and improve our advertising. We may use services such
              as:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Google Analytics</li>
              <li>Google Tag Manager</li>
              <li>Meta (Facebook) Pixel</li>
              <li>Other analytics or advertising platforms</li>
            </ul>
            <p>
              These tools may collect information about your use of the Site,
              your browser, device identifiers, and your interactions with our
              ads. You can control or disable cookies through your browser
              settings, and you can opt out of many forms of ad tracking through
              your browser or industry opt-out tools, such as{" "}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                className="font-medium underline underline-offset-4"
              >
                Google&rsquo;s Analytics opt-out
              </a>{" "}
              and{" "}
              <a
                href="https://optout.aboutads.info"
                className="font-medium underline underline-offset-4"
              >
                the Digital Advertising Alliance
              </a>
              .
            </p>
          </Block>

          <Block title="6. How we share your information">
            <p>We share information only as needed to operate the Site:</p>
            <ul className="ml-5 mt-2 list-disc space-y-1">
              <li>
                <span className="font-medium">Service providers</span> who
                process data on our behalf under contract, including our hosting
                provider (Vercel), our database provider (Supabase), and our
                customer-relationship and messaging provider (GoHighLevel /
                LeadConnector), which we use to follow up on your access request
                and send emails and text messages.
              </li>
              <li>
                <span className="font-medium">
                  Analytics and advertising providers
                </span>
                , such as Google and Meta, as described in &ldquo;Cookies,
                analytics &amp; advertising&rdquo; above.
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

          <Block title="7. How long we keep it">
            <p>
              We keep the information you submit through the Site for as long as
              needed to respond to your request and for our legitimate business
              and legal purposes. If you don&rsquo;t become an account holder, we
              delete or de-identify request information when it&rsquo;s no longer
              needed.
            </p>
          </Block>

          <Block title="8. Your privacy rights">
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
            <p>
              <span className="font-medium">California residents</span> may have
              rights under the California Consumer Privacy Act (CCPA), including
              the right to know what personal information we collect, to access
              it, to correct inaccurate information, to request its deletion, and
              to opt out of certain sharing of it. To exercise these rights,
              contact us using the details below.
            </p>
          </Block>

          <Block title="9. Data security">
            <p>
              We use administrative, technical, and physical safeguards designed
              to protect your information, including encryption in transit. No
              method of transmission or storage is completely secure, so we
              cannot guarantee absolute security.
            </p>
          </Block>

          <Block title="10. Third-party links">
            <p>
              The Site may link to other websites, such as social media and
              scheduling services. We are not responsible for their privacy
              practices, and we encourage you to review their privacy policies.
            </p>
          </Block>

          <Block title="11. Children's privacy">
            <p>
              The Site is intended for adults (18+) and is not directed to
              children. We do not knowingly collect personal information from
              children. If we learn that we have, we will take steps to delete
              it.
            </p>
          </Block>

          <Block title="12. International visitors">
            <p>
              If you visit the Site from outside the United States, your
              information may be transferred to and processed in the United
              States, where privacy laws may differ from those where you live.
              By using the Site, you consent to that transfer.
            </p>
          </Block>

          <Block title="13. Do Not Track">
            <p>
              Some browsers send &ldquo;Do Not Track&rdquo; signals. Because
              there is no common industry standard for them, the Site may not
              respond to these signals.
            </p>
          </Block>

          <Block title="14. Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time. We&rsquo;ll
              post the updated version here and revise the &ldquo;Last
              updated&rdquo; date at the top. Changes take effect when posted,
              and your continued use of the Site means you accept them.
            </p>
          </Block>

          <Block title="15. Contact us">
            <p>
              Questions or requests about this Privacy Policy? Contact us at:
            </p>
            <p className="mt-2">
              Kindling LLC
              <br />
              Email:{" "}
              <a
                href="mailto:info@kindling.network"
                className="font-medium underline underline-offset-4"
              >
                info@kindling.network
              </a>
              <br />
              102 S Weber Street
              <br />
              Colorado Springs, CO 80903
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
