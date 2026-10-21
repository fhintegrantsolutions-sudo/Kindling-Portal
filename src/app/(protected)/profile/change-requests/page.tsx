import { getMyChangeRequests } from "@/lib/db/queries";
import { getCurrentEntityContext } from "@/lib/entities/context";
import { typeDef, typeLabel } from "@/lib/change-requests/types";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangeRequestForm } from "./change-request-form";

const STATUS_STYLE: Record<string, string> = {
  open: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  completed: "border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400",
  declined: "text-muted-foreground",
};
const STATUS_LABEL: Record<string, string> = {
  open: "In review",
  completed: "Completed",
  declined: "Declined",
};

export default async function ChangeRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const [ctx, requests] = await Promise.all([
    getCurrentEntityContext(),
    getMyChangeRequests(),
  ]);
  const entities = (ctx?.entities ?? []).map((e) => ({
    id: e.id,
    display_name: e.display_name,
  }));

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Need to update your details, W-9 or loan agreement information? Submit a
        request and our team will take care of it — usually within 24–48
        business hours.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New request</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangeRequestForm
            entities={entities}
            defaultEntityId={ctx?.currentEntityId ?? null}
            initialType={typeDef(type ?? "") ? type : undefined}
          />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Your requests</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {requests.map((r) => {
              const def = typeDef(r.type);
              const summary = def
                ? def.fields
                    .map((f) => r.details[f.key])
                    .filter(Boolean)
                    .join(", ")
                : "";
              return (
                <li key={r.id} className="rounded-md border bg-card p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{typeLabel(r.type)}</p>
                      <p className="text-xs text-muted-foreground">
                        {[r.entity_name, `Submitted ${formatDate(r.created_at)}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {summary ? (
                        <p className="mt-1 truncate text-xs">{summary}</p>
                      ) : null}
                      {r.admin_note && r.status !== "open" ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Note from Kindling: {r.admin_note}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLE[r.status] ?? ""}`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
