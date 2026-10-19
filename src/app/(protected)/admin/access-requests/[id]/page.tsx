import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getAccessRequestById,
  getNotesForPicker,
  getRelatedAccessRequests,
} from "@/lib/db/admin-queries";
import { formatCurrency, formatDate, formatNoteLabel } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApproveForm } from "./approve-form";
import { ArchiveButton } from "./archive-button";
import { CopyLink } from "./copy-link";
import { CoSparkToggle } from "./cospark-toggle";

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
  const related = await getRelatedAccessRequests(r.id, r.email);

  const isArchived = r.archived_at !== null;
  const isPending = r.status === "pending" && !isArchived;
  const isApproved = r.status === "approved" && !isArchived;
  const isConverted = r.status === "converted";
  const isRejected = r.status === "rejected";

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const setupUrl =
    isApproved && r.setup_token
      ? `${appUrl}/setup-participation/${r.setup_token}`
      : null;

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
            Submitted {formatDate(r.created_at)}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {r.first_name} {r.last_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {r.email} · {r.phone}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full border px-3 py-1 text-xs">
            {r.status}
            {isArchived ? " · archived" : ""}
          </span>
          {!isConverted && !isArchived ? (
            <ArchiveButton id={r.id} archived={false} />
          ) : null}
        </div>
      </header>

      {related.length > 0 ? (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="text-base">
              Returning lead · {related.length} other request
              {related.length === 1 ? "" : "s"} from this email
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            {related.map((o) => (
              <Link
                key={o.id}
                href={`/admin/access-requests/${o.id}`}
                className="underline-offset-4 hover:underline"
              >
                Submitted {formatDate(o.created_at)} · {o.status}
                {o.archived_at
                  ? ` · archived ${formatDate(o.archived_at)}`
                  : ""}{" "}
                →
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {isArchived ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Archived</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-3 text-sm">
            <p className="text-muted-foreground">
              Archived {formatDate(r.archived_at)}. Hidden from the working
              tabs{r.status === "approved" ? " and the setup link is inactive" : ""}.
              Restoring returns it to {r.status}.
            </p>
            <ArchiveButton id={r.id} archived />
          </CardContent>
        </Card>
      ) : null}

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

      {isApproved && setupUrl ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Awaiting lead submission</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">
              Approved. Email the link below to {r.first_name}; they fill out
              their legal info, then a participation appears in awaiting-funding
              state.
            </p>
            <CopyLink url={setupUrl} />
            {r.setup_token_expires_at ? (
              <p className="text-xs text-muted-foreground">
                Link expires{" "}
                {formatDate(r.setup_token_expires_at)}.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submission details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
          <CoSparkToggle requestId={r.id} isMember={r.is_tcc_member} />
          <Field label="Referral code" value={r.referral_code ?? "—"} />
          <Field
            label="Note assigned"
            value={r.note ? formatNoteLabel(r.note.note_id, r.note.title) : "—"}
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
