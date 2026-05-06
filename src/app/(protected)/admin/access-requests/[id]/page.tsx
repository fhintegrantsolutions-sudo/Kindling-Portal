import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getAccessRequestById,
  getNotesForPicker,
} from "@/lib/db/admin-queries";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApproveForm } from "./approve-form";

export default async function AdminAccessRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [r, notes] = await Promise.all([
    getAccessRequestById(id),
    getNotesForPicker(),
  ]);
  if (!r) notFound();

  const isPending = r.status === "pending";
  const isConverted = r.status === "converted";
  const isRejected = r.status === "rejected";

  // For converted access requests, find the participation it spawned
  let participationId: string | null = null;
  if (isConverted) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("participations")
      .select("id")
      .eq("access_request_id", r.id)
      .maybeSingle();
    participationId = (data?.id as string | undefined) ?? null;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <Link
        href="/admin/access-requests"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to access requests
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Submitted {new Date(r.created_at).toLocaleString()}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {r.first_name} {r.last_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {r.email} · {r.phone}
          </p>
        </div>
        <span className="rounded-full border px-3 py-1 text-xs">
          {r.status}
        </span>
      </header>

      {isConverted ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Converted</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {participationId ? (
              <Link
                href={`/admin/participations/${participationId}`}
                className="underline underline-offset-4 hover:text-foreground"
              >
                View participation → track funding + invite when cleared
              </Link>
            ) : (
              <p className="text-muted-foreground">
                Linked participation not found.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {isRejected ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This request was rejected.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {isPending ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approve</CardTitle>
          </CardHeader>
          <CardContent>
            <ApproveForm id={r.id} notes={notes} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submission details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
          <Field
            label="TCC member?"
            value={r.is_tcc_member ? "Yes" : "No"}
          />
          <Field label="Referral code" value={r.referral_code ?? "—"} />
          <Field
            label="Note assigned"
            value={r.note ? `${r.note.note_id} · ${r.note.title}` : "—"}
          />
          <Field
            label="Amount"
            value={
              r.investment_amount ? formatCurrency(r.investment_amount) : "—"
            }
          />
          {r.message ? (
            <div className="sm:col-span-3">
              <p className="text-xs text-muted-foreground">Message</p>
              <p className="text-sm">{r.message}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{value}</p>
    </div>
  );
}
