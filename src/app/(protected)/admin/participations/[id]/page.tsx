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

export default async function AdminParticipationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getParticipationById(id);
  if (!p) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <Link
        href="/admin/participations"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to participations
      </Link>

      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {p.note?.note_id} · created{" "}
          {new Date(p.created_at).toLocaleDateString()}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {p.note?.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          Lender: {p.lender?.name ?? "—"} ({p.lender?.email ?? "—"})
        </p>
      </header>

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
