import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegistrationById } from "@/lib/db/admin-queries";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DecisionButtons } from "./decision-buttons";

export default async function AdminRegistrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await getRegistrationById(id);
  if (!r) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <Link
        href="/admin/registrations"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to registrations
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {r.note?.note_id} · submitted{" "}
            {new Date(r.created_at).toLocaleString()}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {r.first_name} {r.last_name}
          </h1>
          <p className="text-sm text-muted-foreground">{r.email}</p>
        </div>
        <span className="rounded-full border px-3 py-1 text-xs">
          {r.status}
        </span>
      </header>

      {r.status === "pending" ? (
        <DecisionButtons registrationId={r.id} />
      ) : null}

      {r.note ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Note</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="ID" value={r.note.note_id} />
            <Field label="Title" value={r.note.title} />
            <Field
              label="Principal"
              value={formatCurrency(r.note.principal)}
            />
            <Field label="Rate" value={formatPercent(r.note.rate)} />
            <Field label="Term" value={`${r.note.term_months} mo`} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Investment</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field
            label="Investment amount"
            value={formatCurrency(r.investment_amount)}
          />
          <Field label="Entity type" value={r.entity_type} />
          <Field label="Name for agreement" value={r.name_for_agreement} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lender contact</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Phone" value={r.phone} />
          <Field label="Email" value={r.email} />
          <Field
            label="Mailing address"
            value={
              [r.mailing_address, r.city, r.state, r.zip_code]
                .filter(Boolean)
                .join(", ") || "—"
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bank information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Bank name" value={r.bank_name} />
          <Field label="Account type" value={r.bank_account_type} />
          <Field label="Routing number" value={r.bank_routing_number} />
          <Field label="Account number" value={r.bank_account_number} />
          {r.bank_account_address ? (
            <Field
              label="Bank address"
              value={r.bank_account_address}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acknowledgment</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Lender acknowledged:{" "}
            <span className="font-medium">
              {r.acknowledge_lender ? "Yes" : "No"}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{value}</p>
    </div>
  );
}
