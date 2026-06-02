import Link from "next/link";
import { notFound } from "next/navigation";
import { getParticipationById } from "@/lib/db/admin-queries";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FundingForm } from "./funding-form";
import { InviteButton } from "./invite-button";
import { AmountReceivedEditor } from "./amount-received-editor";

export default async function AdminParticipationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getParticipationById(id);
  if (!p) notFound();

  const isNewLead = p.user_id === null;
  const inviteDisabled = !p.funding_cleared || !isNewLead;
  const inviteReason = !isNewLead
    ? "This lender already has a portal account."
    : !p.funding_cleared
      ? "Funding must be cleared before inviting."
      : undefined;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <Link
        href="/admin/participations"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to participations
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {p.note?.note_id} · created{" "}
            {new Date(p.created_at).toLocaleDateString()}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {p.note?.title}
          </h1>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs ${
            isNewLead
              ? "border-primary/40 bg-primary/10 text-primary"
              : "text-muted-foreground"
          }`}
        >
          {isNewLead ? "New lead" : "Returning lender"}
        </span>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lender</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {p.lender ? (
            <>
              <p className="font-medium">{p.lender.name ?? "—"}</p>
              <p className="text-muted-foreground">
                {p.lender.email ?? "—"}
                {p.lender.phone ? ` · ${p.lender.phone}` : ""}
              </p>
              {p.lender.isProspect ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Prospect — no portal account yet. Will be invited when
                  funding clears.
                </p>
              ) : p.user_id ? (
                <Link
                  href={`/admin/users/${p.user_id}`}
                  className="mt-1 text-xs underline underline-offset-4"
                >
                  View user →
                </Link>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground">
              No lender info found. (Orphaned participation?)
            </p>
          )}
        </CardContent>
      </Card>

      {p.note ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Investment</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field
              label="Invested"
              value={formatCurrency(p.invested_amount)}
            />
            <Field label="Status" value={p.status} />
            <Field
              label="Note principal"
              value={formatCurrency(p.note.principal)}
            />
            <Field label="Rate" value={formatPercent(p.note.rate)} />
          </CardContent>
        </Card>
      ) : null}

      <AmountReceivedEditor
        participationId={p.id}
        investedAmount={p.invested_amount}
        submittedAmount={p.submitted_amount}
      />

      <FundingForm
        participationId={p.id}
        defaults={{
          funding_received: p.funding_received,
          funding_deposited: p.funding_deposited,
          funding_cleared: p.funding_cleared,
          funding_type: p.funding_type,
          funding_received_date: p.funding_received_date,
          funding_deposited_date: p.funding_deposited_date,
          funding_cleared_date: p.funding_cleared_date,
          funding_check_number: p.funding_check_number,
          funding_wire_reference_number: p.funding_wire_reference_number,
          funding_other_type_description: p.funding_other_type_description,
          funding_notes: p.funding_notes,
        }}
      />

      {isNewLead ? (
        <InviteButton
          participationId={p.id}
          disabled={inviteDisabled}
          disabledReason={inviteReason}
        />
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
