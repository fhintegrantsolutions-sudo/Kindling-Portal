import { AppSidebar, MobileNav } from "@/components/app-sidebar";
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

  const navProps = {
    email: session.email,
    firstName: (profile?.first_name as string | null) ?? null,
    lastName: (profile?.last_name as string | null) ?? null,
    role: profile?.role ?? null,
    entities: (entityCtx?.entities ?? []).map((e) => ({
      id: e.id,
      display_name: e.display_name,
    })),
    currentEntityId: entityCtx?.currentEntityId ?? null,
    entityMode: entityCtx?.mode ?? ("one" as const),
  };

  return (
    <div className="flex h-svh overflow-hidden">
      <AppSidebar {...navProps} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <MobileNav {...navProps} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
