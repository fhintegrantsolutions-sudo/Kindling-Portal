import Link from "next/link";
import { notFound } from "next/navigation";
import { getChangeRequestById } from "@/lib/db/admin-queries";
import { typeDef, typeLabel } from "@/lib/change-requests/types";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResolveForm } from "./resolve-form";

// The value currently on file for each requested field, for side-by-side review.
function currentValue(
  r: NonNullable<Awaited<ReturnType<typeof getChangeRequestById>>>,
  key: string,
): string | null {
  if (key === "first_name") return r.current_first_name;
  if (key === "last_name") return r.current_last_name;
  if (r.type === "login_email" && key === "email") return r.lender_email;
  const e = r.entity as Record<string, string | null> | null;
  return e ? (e[key] ?? null) : null;
}

const MANUAL_HINT: Record<string, string> = {
  w9: "Send or collect the updated W-9 for this entity, then mark complete.",
  login_email:
    "Change the login email on the lender's user page (Change login email), then mark complete.",
  add_entity:
    "Add the entity on the lender's user page (Entities → Add entity), then mark complete.",
  bank_account:
    "Send the lender a Melio link to update their banking details, then mark complete.",
  other: "Handle the request, then mark complete.",
};

export default async function AdminChangeRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await getChangeRequestById(id);
  if (!r) notFound();
  const def = typeDef(r.type);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <Link
        href="/admin/change-requests"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to change requests
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Submitted {formatDate(r.created_at)}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {typeLabel(r.type)}
          </h1>
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/admin/users/${r.user_id}`}
              className="underline underline-offset-4"
            >
              {r.lender_name ?? "Lender"}
            </Link>
            {r.lender_email ? ` · ${r.lender_email}` : ""}
            {r.entity ? ` · ${r.entity.display_name}` : ""}
          </p>
        </div>
        <span className="rounded-full border px-3 py-1 text-xs capitalize">
          {r.status}
        </span>
      </header>

      {def && def.fields.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requested change</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Field</th>
                  <th className="py-2 pr-3 font-medium">Current</th>
                  <th className="py-2 font-medium">Requested</th>
                </tr>
              </thead>
              <tbody>
                {def.fields.map((f) => (
                  <tr key={f.key} className="border-b last:border-b-0">
                    <td className="py-2 pr-3 text-muted-foreground">{f.label}</td>
                    <td className="py-2 pr-3">
                      {r.type === "add_entity" ? "—" : (currentValue(r, f.key) ?? "—")}
                    </td>
                    <td className="py-2 font-medium">{r.details[f.key] ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {r.message ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lender&apos;s message</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">
            {r.message}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {r.status === "open" ? "Resolve" : "Resolution"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {r.status === "open" ? (
            <>
              <p className="text-muted-foreground">
                {def?.autoApply
                  ? "Approving writes the requested values to the lender's record and completes the request."
                  : (MANUAL_HINT[r.type] ?? "Handle the request, then mark complete.")}
              </p>
              <ResolveForm id={r.id} autoApply={Boolean(def?.autoApply)} />
            </>
          ) : (
            <p>
              <span className="capitalize">{r.status}</span>
              {r.resolved_at ? ` on ${formatDate(r.resolved_at)}` : ""}
              {r.admin_note ? ` — ${r.admin_note}` : ""}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
