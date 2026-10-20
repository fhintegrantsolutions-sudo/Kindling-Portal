import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// How-to guide for Profile → Beneficiaries.
export default function BeneficiariesHowToPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <Link
        href="/profile/beneficiaries"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to beneficiaries
      </Link>

      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          How to
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up your beneficiaries
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Beneficiaries are the people who inherit your participation in your
          notes in the event of your passing.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Before you start</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">
              Beneficiaries are set per entity.
            </strong>{" "}
            If you invest through more than one entity (for example, Personal
            and a trust or LLC), each one has its own list. Choose the entity
            from the switcher at the top of the left-hand menu first — the
            Beneficiaries page doesn&apos;t work in &ldquo;All entities&rdquo;
            view.
          </p>
          <p>
            <strong className="text-foreground">
              Primary and Contingent.
            </strong>{" "}
            <em>Primary</em> beneficiaries inherit first.{" "}
            <em>Contingent</em> beneficiaries inherit only if no primary
            beneficiary is able to. Contingent beneficiaries are optional.
          </p>
          <p>
            <strong className="text-foreground">The 100% rule.</strong> Your
            primary beneficiaries&apos; percentages must add up to exactly 100%.
            If you add contingent beneficiaries, their percentages must also add
            up to 100% on their own.
          </p>
          <div className="rounded-md bg-muted/50 p-3 text-xs">
            <p className="font-medium text-foreground">Example</p>
            <p className="mt-1">
              Primary: Spouse 100%. Contingent: Child A 50%, Child B 50%.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a beneficiary</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm text-muted-foreground marker:font-medium marker:text-foreground">
            <li>
              In the left-hand menu, choose the entity you want to set
              beneficiaries for.
            </li>
            <li>
              Go to <strong className="text-foreground">Profile</strong> →{" "}
              <strong className="text-foreground">Beneficiaries</strong>.
            </li>
            <li>
              Click <strong className="text-foreground">Add beneficiary</strong>.
            </li>
            <li>
              Fill in the form:
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
                <li>
                  <strong className="text-foreground">Name</strong> (required) —
                  their full legal name.
                </li>
                <li>
                  <strong className="text-foreground">Relation</strong>{" "}
                  (required) — for example Spouse, Child or Sibling.
                </li>
                <li>
                  <strong className="text-foreground">Type</strong> — Primary or
                  Contingent.
                </li>
                <li>
                  <strong className="text-foreground">Percentage</strong> — their
                  share, up to 100.
                </li>
                <li>
                  <strong className="text-foreground">Optional:</strong> date of
                  birth, phone, last 4 digits of their Social Security number,
                  and address. These help us identify and reach them if needed.
                </li>
              </ul>
            </li>
            <li>
              Click{" "}
              <strong className="text-foreground">Add beneficiary</strong> at
              the bottom of the form. Repeat for each beneficiary.
            </li>
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            Don&apos;t worry about getting the percentages exactly right while
            adding people — you can balance everyone afterwards on one screen
            (see below).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Change percentages (all at once)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            Every beneficiary&apos;s percentage can be changed right on the{" "}
            <strong className="text-foreground">Beneficiaries</strong> page:
          </p>
          <ol className="flex list-decimal flex-col gap-2 pl-5 marker:font-medium marker:text-foreground">
            <li>Type the new percentage in each person&apos;s box.</li>
            <li>
              Watch the totals update as you type — each group shows how much
              is left to assign or how much it&apos;s over.
            </li>
            <li>
              When Primary totals 100% (and Contingent totals 100%, or 0% if
              you have none), click{" "}
              <strong className="text-foreground">Save percentages</strong>.
            </li>
          </ol>
          <div className="rounded-md bg-muted/50 p-3 text-xs">
            <p className="font-medium text-foreground">Example</p>
            <p className="mt-1">
              To change Spouse 50% / Child 50% to Spouse 40% / Child 60%, type
              40 and 60, then click Save percentages — one save, no need to do
              one person at a time.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit details or remove a beneficiary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Click <strong className="text-foreground">Edit details</strong> to
          change a beneficiary&apos;s name, relation, type or contact details
          (then <strong className="text-foreground">Save changes</strong>), or{" "}
          <strong className="text-foreground">Delete</strong> to remove them.
          After removing someone, rebalance the remaining percentages and click
          Save percentages.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Copy beneficiaries to another entity
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            If you have more than one entity and want the same beneficiaries on
            each, you don&apos;t need to re-enter them:
          </p>
          <ol className="flex list-decimal flex-col gap-2 pl-5 marker:font-medium marker:text-foreground">
            <li>Switch to the entity that has no beneficiaries yet.</li>
            <li>
              Go to <strong className="text-foreground">Profile</strong> →{" "}
              <strong className="text-foreground">Beneficiaries</strong>.
            </li>
            <li>
              Under <strong className="text-foreground">Copy from another
              entity</strong>, choose the entity to copy from and click{" "}
              <strong className="text-foreground">Copy beneficiaries</strong>.
            </li>
          </ol>
          <p>
            The copy option appears only while the entity has no beneficiaries.
            After copying, you can edit each entity&apos;s list separately.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Need help?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Email us at{" "}
          <a
            href="mailto:info@kindling.network"
            className="underline underline-offset-4"
          >
            info@kindling.network
          </a>
          . Please allow 24–48 business hours for a response.
        </CardContent>
      </Card>
    </div>
  );
}
