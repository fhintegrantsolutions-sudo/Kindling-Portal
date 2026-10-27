"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveAccessRequest,
  moveAccessRequestToPending,
  rejectAccessRequest,
  setAccessRequestArchived,
} from "@/lib/admin/access-request-actions";
import type { AccessRequestListItem } from "@/lib/db/admin-queries";
import { formatCurrency, formatDate, formatNoteLabel } from "@/lib/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CopyLink } from "./[id]/copy-link";

type Column = "pending" | "approved" | "converted" | "rejected" | "archived";
type Note = { id: string; note_id: string; title: string };

const COLUMNS: { key: Column; label: string; hint?: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Awaiting lead submission" },
  {
    key: "converted",
    label: "Converted",
    hint: "Moves here automatically when the lead submits their setup form.",
  },
  { key: "rejected", label: "Rejected" },
  { key: "archived", label: "Archived" },
];

const columnOf = (r: AccessRequestListItem): Column =>
  r.archived_at ? "archived" : r.status;

// Which moves are allowed from a card's current column. Converted is never a
// drop target (it's reached when the lead submits); archived cards can only go
// back to the stage they came from.
function canMove(r: AccessRequestListItem, to: Column): boolean {
  const from = columnOf(r);
  if (from === to) return false;
  if (from === "archived") return to === r.status;
  if (to === "archived") return true;
  if (to === "converted" || r.status === "converted") return false;
  if (to === "pending") return from === "approved" || from === "rejected";
  if (to === "approved") return from === "pending";
  if (to === "rejected") return from === "pending" || from === "approved";
  return false;
}

export function AccessRequestBoard({
  items: initial,
  notes,
}: {
  items: AccessRequestListItem[];
  notes: Note[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Column | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [approving, setApproving] = useState<AccessRequestListItem | null>(
    null,
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = items.find((i) => i.id === openId) ?? null;

  const dragged = items.find((i) => i.id === dragId) ?? null;

  const patch = (id: string, p: Partial<AccessRequestListItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const move = (r: AccessRequestListItem, to: Column) => {
    if (!canMove(r, to)) return;
    setError(null);
    if (to === "approved") {
      setApproving(r);
      return;
    }
    if (
      to === "rejected" &&
      !confirm(`Reject ${r.first_name} ${r.last_name}'s access request?`)
    ) {
      return;
    }
    if (
      to === "pending" &&
      r.status === "approved" &&
      !confirm("Move back to Pending? Their setup link will stop working.")
    ) {
      return;
    }
    const before = { status: r.status, archived_at: r.archived_at };
    // Optimistic update, then reconcile with the server.
    if (to === "archived") patch(r.id, { archived_at: new Date().toISOString() });
    else if (columnOf(r) === "archived") patch(r.id, { archived_at: null });
    else patch(r.id, { status: to as AccessRequestListItem["status"] });

    startTransition(async () => {
      let err: string | undefined;
      try {
        if (to === "archived") err = (await setAccessRequestArchived(r.id, true)).error;
        else if (columnOf(r) === "archived")
          err = (await setAccessRequestArchived(r.id, false)).error;
        else if (to === "pending") err = (await moveAccessRequestToPending(r.id)).error;
        else if (to === "rejected") await rejectAccessRequest(r.id);
      } catch (e) {
        err = e instanceof Error ? e.message : "Couldn't move the request.";
      }
      if (err) {
        patch(r.id, before);
        setError(err);
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const cards = items
            .filter((i) => columnOf(i) === col.key)
            .sort((a, b) => b.created_at.localeCompare(a.created_at));
          const droppable = dragged ? canMove(dragged, col.key) : false;
          return (
            <section
              key={col.key}
              onDragOver={(e) => {
                if (!droppable) return;
                e.preventDefault();
                setOverCol(col.key);
              }}
              onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                setOverCol(null);
                if (dragged) move(dragged, col.key);
                setDragId(null);
              }}
              className={`flex w-72 shrink-0 flex-col gap-2 rounded-lg border p-2 transition-colors ${
                overCol === col.key && droppable
                  ? "border-primary bg-primary/5"
                  : dragged && !droppable
                    ? "bg-muted/20 opacity-60"
                    : "bg-muted/30"
              }`}
            >
              <header className="flex items-baseline justify-between px-1 pt-1">
                <h2 className="text-xs font-semibold uppercase tracking-wider">
                  {col.label}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {cards.length}
                </span>
              </header>
              {col.hint ? (
                <p className="px-1 text-[11px] text-muted-foreground">
                  {col.hint}
                </p>
              ) : null}
              <div className="flex min-h-16 flex-col gap-2">
                {cards.map((r) => (
                  <Card
                    key={r.id}
                    r={r}
                    onDragStart={() => setDragId(r.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                    onMove={(to) => move(r, to)}
                    onOpen={() => setOpenId(r.id)}
                    busy={pending}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <Sheet
        open={opened !== null}
        onOpenChange={(o) => {
          if (!o) setOpenId(null);
        }}
      >
        <SheetContent className="overflow-y-auto">
          {opened ? (
            <LeadDetails
              r={opened}
              onMove={(to) => {
                setOpenId(null);
                move(opened, to);
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      {approving ? (
        <ApproveDialog
          request={approving}
          notes={notes}
          onClose={(approved) => {
            if (approved) patch(approving.id, { status: "approved" });
            setApproving(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function Card({
  r,
  onDragStart,
  onDragEnd,
  onMove,
  onOpen,
  busy,
}: {
  r: AccessRequestListItem;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (to: Column) => void;
  onOpen: () => void;
  busy: boolean;
}) {
  const targets = COLUMNS.filter((c) => canMove(r, c.key));
  return (
    <article
      draggable={targets.length > 0}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", r.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        // Open the details panel unless the click was on the Move to menu.
        if ((e.target as HTMLElement).closest("select")) return;
        onOpen();
      }}
      className={`cursor-pointer rounded-md border bg-card p-3 text-sm shadow-sm transition-colors hover:border-primary/50 ${
        targets.length > 0 ? "active:cursor-grabbing" : ""
      }`}
    >
      <p className="font-medium">
        {r.first_name} {r.last_name}
      </p>
      <p className="truncate text-xs text-muted-foreground">{r.email}</p>
      <p className="mt-1 text-xs">
        {r.note ? formatNoteLabel(r.note.note_id, r.note.title) : "No note yet"}
        {r.investment_amount
          ? ` · ${formatCurrency(r.investment_amount)}`
          : ""}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px]">
        <span className="text-muted-foreground">{formatDate(r.created_at)}</span>
        {r.is_tcc_member ? (
          <span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-primary">
            CoSpark
          </span>
        ) : null}
        {r.other_request_count > 0 ? (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-amber-700 dark:text-amber-400">
            Returning
          </span>
        ) : null}
      </div>
      {targets.length > 0 ? (
        <select
          aria-label="Move to"
          value=""
          disabled={busy}
          onChange={(e) => {
            if (e.target.value) onMove(e.target.value as Column);
          }}
          className="mt-2 h-7 w-full rounded border bg-background px-2 text-xs text-muted-foreground"
        >
          <option value="">Move to…</option>
          {targets.map((t) => (
            <option key={t.key} value={t.key}>
              {t.key === "archived" ? "Archive" : t.label}
            </option>
          ))}
        </select>
      ) : null}
    </article>
  );
}

// Side panel with a lead's details, opened by clicking a card.
function LeadDetails({
  r,
  onMove,
}: {
  r: AccessRequestListItem;
  onMove: (to: Column) => void;
}) {
  const col = columnOf(r);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const expired =
    r.setup_token_expires_at !== null &&
    new Date(r.setup_token_expires_at) < new Date();
  const targets = COLUMNS.filter((c) => canMove(r, c.key));
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
  return (
    <>
      <SheetHeader>
        <SheetTitle>
          {r.first_name} {r.last_name}
        </SheetTitle>
        <SheetDescription>
          {COLUMNS.find((c) => c.key === col)?.label}
          {col === "archived" ? ` (was ${r.status})` : ""} · submitted{" "}
          {formatDate(r.created_at)}
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 px-4 pb-6">
        <div>
          {row(
            "Email",
            <a href={`mailto:${r.email}`} className="underline underline-offset-4">
              {r.email}
            </a>,
          )}
          {row("Phone", r.phone || "—")}
          {row(
            "Note",
            r.note ? formatNoteLabel(r.note.note_id, r.note.title) : "—",
          )}
          {row(
            "Amount",
            r.investment_amount ? formatCurrency(r.investment_amount) : "—",
          )}
          {row("CoSpark member", r.is_tcc_member ? "Yes" : "No")}
          {row("Referral code", r.referral_code ?? "—")}
          {r.other_request_count > 0
            ? row(
                "Returning",
                `${r.other_request_count} other request${r.other_request_count === 1 ? "" : "s"}`,
              )
            : null}
        </div>

        {r.message ? (
          <div>
            <p className="text-xs text-muted-foreground">Message</p>
            <p className="whitespace-pre-wrap text-sm">{r.message}</p>
          </div>
        ) : null}

        {r.status === "approved" && r.setup_token ? (
          <div className="flex flex-col gap-2">
            <CopyLink url={`${appUrl}/setup-participation/${r.setup_token}`} />
            {r.setup_token_expires_at ? (
              <p
                className={`text-xs ${expired ? "font-medium text-destructive" : "text-muted-foreground"}`}
              >
                {expired ? "Expired" : "Expires"}{" "}
                {formatDate(r.setup_token_expires_at)}
              </p>
            ) : null}
          </div>
        ) : null}

        {targets.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {targets.map((t) => (
              <Button
                key={t.key}
                type="button"
                size="sm"
                variant={t.key === "approved" ? "default" : "outline"}
                onClick={() => onMove(t.key)}
              >
                {t.key === "archived"
                  ? "Archive"
                  : t.key === "approved"
                    ? "Approve"
                    : col === "archived"
                      ? `Restore to ${t.label}`
                      : `Move to ${t.label}`}
              </Button>
            ))}
          </div>
        ) : null}

        <Link
          href={`/admin/access-requests/${r.id}`}
          className="text-sm underline underline-offset-4"
        >
          Open full page →
        </Link>
      </div>
    </>
  );
}

// Pending -> Awaiting lead submission: pick the note, generate the setup link.
function ApproveDialog({
  request,
  notes,
  onClose,
}: {
  request: AccessRequestListItem;
  notes: Note[];
  onClose: (approved: boolean) => void;
}) {
  const [noteId, setNoteId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const approve = () => {
    setError(null);
    const fd = new FormData();
    fd.set("note_id", noteId);
    startTransition(async () => {
      const res = await approveAccessRequest(request.id, undefined, fd);
      if (res.setupUrl) setUrl(res.setupUrl);
      else setError(res.fieldErrors?.note_id ?? res.error ?? "Couldn't approve.");
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-lg border bg-background p-5 shadow-lg">
        <div>
          <h2 className="text-base font-semibold">
            Approve {request.first_name} {request.last_name}
          </h2>
          <p className="text-sm text-muted-foreground">
            Pick the note, then approve to generate their setup link.
          </p>
        </div>
        {url ? (
          <CopyLink url={url} />
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="board_note_id">Note</Label>
            <select
              id="board_note_id"
              value={noteId}
              onChange={(e) => setNoteId(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">— select —</option>
              {notes.map((n) => (
                <option key={n.id} value={n.id}>
                  {formatNoteLabel(n.note_id, n.title)}
                </option>
              ))}
            </select>
          </div>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          {url ? (
            <Button type="button" onClick={() => onClose(true)}>
              Done
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onClose(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="button" onClick={approve} disabled={pending || !noteId}>
                {pending ? "Approving…" : "Approve & generate link"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
