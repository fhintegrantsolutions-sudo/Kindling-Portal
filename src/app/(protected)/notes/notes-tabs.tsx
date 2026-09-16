"use client";

import { useState } from "react";
import Link from "next/link";
import type { ParticipationWithNote } from "@/lib/db/queries";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Bucket = "active" | "pending" | "closed";

// A lender's position sorts into a tab from their funding state + the note's
// lifecycle. Only an "Open" note still accepts funding, so an unfunded position
// is "Pending" (can still fund) while the note is Open, and "Closed" (lapsed)
// once it isn't. A funded position on a live note (Open/Funded) is "Active";
// anything on a Completed/Defaulted/Cancelled note is "Closed".
function bucketOf(p: ParticipationWithNote): Bucket {
  const s = p.note?.status;
  const live = s === "Open" || s === "Funded";
  if (p.funding_received && live) return "active";
  if (!p.funding_received && s === "Open") return "pending";
  return "closed";
}

function fundingLabel(p: ParticipationWithNote, bucket: Bucket): string {
  if (p.funding_cleared) return "Cleared";
  if (p.funding_deposited) return "Deposited";
  if (p.funding_received) return "Received";
  // Unfunded: "Pending" while still fundable, "Closed" once the window shut.
  return bucket === "closed" ? "Closed" : "Pending";
}

const TABS: { key: Bucket; label: string; description: string }[] = [
  {
    key: "active",
    label: "Active",
    description: "Notes you've funded — earning interest through the term.",
  },
  {
    key: "pending",
    label: "Pending",
    description:
      "You've committed to these notes but haven't sent funds yet. You can still fund them while the note is open.",
  },
  {
    key: "closed",
    label: "Closed",
    description:
      "The funding window closed before these were funded, or the note has finished. No action is needed.",
  },
];

export function NotesTabs({
  participations,
}: {
  participations: ParticipationWithNote[];
}) {
  const rows = participations.map((p) => ({ p, bucket: bucketOf(p) }));
  const counts: Record<Bucket, number> = {
    active: rows.filter((r) => r.bucket === "active").length,
    pending: rows.filter((r) => r.bucket === "pending").length,
    closed: rows.filter((r) => r.bucket === "closed").length,
  };
  // Open on the first non-empty tab, preferring Active.
  const [tab, setTab] = useState<Bucket>(
    counts.active ? "active" : counts.pending ? "pending" : "closed",
  );
  const shown = rows.filter((r) => r.bucket === tab);

  return (
    <>
      <nav className="flex gap-1 border-b">
        {TABS.map((t) => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`border-b-2 px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-xs text-muted-foreground">
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </nav>

      <p className="text-sm text-muted-foreground">
        {TABS.find((t) => t.key === tab)?.description}
      </p>

      {shown.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No {tab} participations.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {shown.map(({ p, bucket }) => {
            const note = p.note;
            const href = note ? `/notes/${note.note_id}` : "#";
            return (
              <Link
                key={p.id}
                href={href}
                className="block rounded-lg transition-colors hover:bg-muted/40"
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          {note?.note_id}
                        </p>
                        <CardTitle>{note?.title}</CardTitle>
                      </div>
                      <span className="rounded-full border px-2 py-0.5 text-xs">
                        {note?.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Field
                      label="Invested"
                      value={formatCurrency(p.invested_amount)}
                    />
                    <Field
                      label="Rate"
                      value={note ? formatPercent(note.rate) : "—"}
                    />
                    <Field
                      label="Term"
                      value={note ? `${note.term_months} mo` : "—"}
                    />
                    <Field label="Funding" value={fundingLabel(p, bucket)} />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
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
