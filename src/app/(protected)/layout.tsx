import { AppSidebar } from "@/components/app-sidebar";
import { getCurrentProfile, verifySession } from "@/lib/dal";
import { getCurrentEntityContext } from "@/lib/entities/context";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  const profile = await getCurrentProfile();
  const entityCtx = await getCurrentEntityContext();

  return (
    <div className="flex min-h-svh">
      <AppSidebar
        email={session.email}
        firstName={(profile?.first_name as string | null) ?? null}
        lastName={(profile?.last_name as string | null) ?? null}
        role={profile?.role ?? null}
        entities={(entityCtx?.entities ?? []).map((e) => ({
          id: e.id,
          display_name: e.display_name,
        }))}
        currentEntityId={entityCtx?.currentEntityId ?? null}
        entityMode={entityCtx?.mode ?? "one"}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
