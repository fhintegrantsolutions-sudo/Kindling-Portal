import Link from "next/link";
import { previewMergeLogins } from "@/lib/admin/merge-actions";
import {
  getPossibleDuplicateLogins,
  getUsers,
} from "@/lib/db/admin-queries";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MergeForm } from "./merge-form";
import { MergePicker } from "./merge-picker";

/**
 * Admin merge tool. Reads ?survivor=<id>&absorbed=<id>&absorbed=<id>….
 *
 * With no (or incomplete) params it renders the PICKER, which can select any
 * logins at all — the "Possible duplicate logins" name-matcher is a shortcut
 * inside it, not the only way in.
 *
 * The survivor is switched by NAVIGATING (the links below rewrite the query
 * string), so the preview is always recomputed on the server for the survivor
 * actually chosen. No client state holds a stale preview.
 */
export default async function MergeLoginsPage({
  searchParams,
}: {
  searchParams: Promise<{ survivor?: string; absorbed?: string | string[] }>;
}) {
  const sp = await searchParams;
  const survivorId = (sp.survivor ?? "").trim();
  const absorbedIds = (
    Array.isArray(sp.absorbed) ? sp.absorbed : sp.absorbed ? [sp.absorbed] : []
  )
    .map((id) => id.trim())
    .filter((id) => id && id !== survivorId);

  const heading = (
    <header className="flex flex-col gap-1">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        Admin · Users · Merge
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">
        Merge duplicate logins
      </h1>
      <p className="text-sm text-muted-foreground">
        One person, one login. The absorbed login&apos;s entities — and every
        position they hold — move to the survivor.
      </p>
      <Link
        href="/admin/users"
        className="mt-1 w-fit text-xs underline underline-offset-4 hover:no-underline"
      >
        ← Back to users
      </Link>
    </header>
  );

  if (!survivorId || absorbedIds.length === 0) {
    const [users, duplicates] = await Promise.all([
      getUsers(),
      getPossibleDuplicateLogins(),
    ]);
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
        {heading}
        <MergePicker
          candidates={users.map((u) => ({
            id: u.id,
            email: u.email,
            first_name: u.first_name,
            last_name: u.last_name,
            entity_count: u.entity_count,
            position_count: u.position_count,
            created_at: u.created_at,
          }))}
          duplicateGroups={duplicates.map((g) => ({
            name: g.name,
            loginIds: g.logins.map((l) => l.id),
          }))}
        />
      </div>
    );
  }

  const { preview, error } = await previewMergeLogins(survivorId, absorbedIds);

  if (error || !preview) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
        {heading}
        <Alert variant="destructive">
          <AlertDescription>
            {error ?? "Could not build a merge preview."}
          </AlertDescription>
        </Alert>
        <Link
          href="/admin/users/merge"
          className="w-fit text-xs underline underline-offset-4 hover:no-underline"
        >
          Change selection
        </Link>
      </div>
    );
  }

  // Every login in the group can be the survivor — the admin swaps by
  // navigating, and the preview is rebuilt from scratch for that choice.
  const group = [
    { id: preview.survivor.id, name: preview.survivor.name, email: preview.survivor.email },
    ...preview.absorbed.map((a) => ({ id: a.id, name: a.name, email: a.email })),
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      {heading}

      <section className="flex flex-col gap-2 rounded-lg border bg-card p-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm font-medium">Who survives?</p>
          <Link
            href="/admin/users/merge"
            className="shrink-0 text-xs underline underline-offset-4 hover:no-underline"
          >
            Change selection
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          The survivor keeps their login and email. Everyone else is merged into
          them and can no longer sign in.
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {group.map((candidate) => {
            const params = new URLSearchParams();
            params.set("survivor", candidate.id);
            for (const other of group) {
              if (other.id !== candidate.id) params.append("absorbed", other.id);
            }
            const isSurvivor = candidate.id === preview.survivor.id;
            return (
              <Link
                key={candidate.id}
                href={`/admin/users/merge?${params.toString()}`}
                aria-current={isSurvivor ? "true" : undefined}
                className={`flex items-center justify-between gap-4 rounded-md border p-3 text-sm transition-colors ${
                  isSurvivor
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <span className="flex flex-col">
                  <span className="font-medium">{candidate.name ?? "—"}</span>
                  <span className="text-xs text-muted-foreground">
                    {candidate.email ?? "—"}
                  </span>
                </span>
                <span className="shrink-0 text-xs">
                  {isSurvivor ? (
                    <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary">
                      Survivor
                    </span>
                  ) : (
                    <span className="text-muted-foreground underline underline-offset-4">
                      Make survivor
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <MergeForm preview={preview} />
    </div>
  );
}
