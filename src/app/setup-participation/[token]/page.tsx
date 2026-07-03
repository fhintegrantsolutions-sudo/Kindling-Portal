import Image from "next/image";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SetupForm } from "./setup-form";

export default async function SetupParticipationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: ar } = await supabase
    .from("access_requests")
    .select("*")
    .eq("setup_token", token)
    .maybeSingle();
  if (!ar) notFound();

  // Status / expiry gates
  if (ar.status === "rejected") {
    return <ErrorPanel title="Link inactive" message="This setup link is no longer active. Please contact us." />;
  }
  if (ar.status === "pending") {
    return <ErrorPanel title="Not yet ready" message="Your access request is still being reviewed. We'll send a setup link once we're ready." />;
  }
  if (ar.status === "converted") {
    return <ErrorPanel title="Already submitted" message="Thanks — we already have your information. We'll be in touch about funding." />;
  }
  if (ar.setup_token_expires_at && new Date(ar.setup_token_expires_at as string) < new Date()) {
    return <ErrorPanel title="Link expired" message="This setup link has expired. Please reach out for a fresh one." />;
  }

  // Fetch the note for context
  type NoteCtx = {
    note_id: string;
    title: string;
    principal: string;
    rate: string;
    term_months: number;
    min_investment: string | null;
  };
  let note: NoteCtx | null = null;
  if (ar.note_id) {
    const { data } = await supabase
      .from("notes")
      .select("note_id, title, principal, rate, term_months, min_investment")
      .eq("id", ar.note_id)
      .maybeSingle();
    note = (data as unknown as NoteCtx) ?? null;
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b bg-sidebar py-6 text-sidebar-foreground">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 md:px-8">
          <Image src="/logo.png" alt="Kindling logo" width={84} height={36} priority />
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 md:px-8">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            Welcome, {ar.first_name as string}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            We need a few details to finalize your participation. After you
            submit, we&apos;ll follow up about funding.
          </p>
        </div>

        {note ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">The note</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
              <Field label="Note" value={`${note.note_id} · ${note.title}`} />
              <Field label="Rate" value={formatPercent(note.rate)} />
              <Field label="Term" value={`${note.term_months} mo`} />
              <Field
                label="Min investment"
                value={
                  note.min_investment
                    ? formatCurrency(note.min_investment)
                    : "—"
                }
              />
            </CardContent>
          </Card>
        ) : null}

        <SetupForm
          token={token}
          defaults={{
            min_investment: (note?.min_investment as string | null) ?? null,
            first_name: (ar.first_name as string) ?? null,
            last_name: (ar.last_name as string) ?? null,
            email: (ar.email as string) ?? null,
            phone: (ar.phone as string) ?? null,
          }}
        />
      </main>
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

function ErrorPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-8">
      <div className="max-w-md rounded-lg border bg-card p-8 text-center">
        <h1 className="font-serif text-xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
