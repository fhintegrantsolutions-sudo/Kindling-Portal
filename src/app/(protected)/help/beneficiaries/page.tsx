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
              the bottom of the form. Repeat for each beneficiary until each
              group totals 100%.
            </li>
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            The total for each group is shown next to its heading. If a group
            doesn&apos;t add up to 100%, you&apos;ll see a red reminder at the
            top of the page until it does.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit or remove a beneficiary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            Click <strong className="text-foreground">Edit</strong> on a
            beneficiary to change their details or percentage (then{" "}
            <strong className="text-foreground">Save changes</strong>), or{" "}
            <strong className="text-foreground">Delete</strong> to remove them.
          </p>
          <p>
            <strong className="text-foreground">Changing percentages:</strong>{" "}
            a group can&apos;t go over 100%. To shift shares between people,
            lower one person&apos;s percentage first, then raise the
            other&apos;s.
          </p>
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              Tip: &ldquo;…which exceeds the 100% limit&rdquo;
            </p>
            <p className="mt-1">
              If you see a message like{" "}
              <em>
                &ldquo;Your Primary beneficiaries already account for 50%, and
                this 60% entry would bring the total to 110%, which exceeds the
                100% limit… At most 50% is available here,&rdquo;
              </em>{" "}
              the other beneficiaries in that group already use part of the
              100%, so this person can only be given what&apos;s left (50% in
              this example).
            </p>
            <p className="mt-2 font-medium text-foreground">To fix it:</p>
            <ol className="mt-1 flex list-decimal flex-col gap-1 pl-5">
              <li>
                Enter the amount that&apos;s available (or less) and save — or
                cancel this change.
              </li>
              <li>
                Click <strong>Edit</strong> on another beneficiary in the same
                group, lower their percentage, and{" "}
                <strong>Save changes</strong>.
              </li>
              <li>
                Come back and raise this beneficiary&apos;s percentage. The
                group should now total exactly 100%.
              </li>
            </ol>
            <p className="mt-2">
              Example: to change Spouse 50% / Child 50% to Spouse 40% / Child
              60%, first lower Spouse to 40%, then raise Child to 60%.
            </p>
          </div>
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
