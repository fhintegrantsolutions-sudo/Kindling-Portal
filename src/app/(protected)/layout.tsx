import { AppSidebar, MobileNav } from "@/components/app-sidebar";
import { getCurrentProfile, verifySession } from "@/lib/dal";
import { getCurrentEntityContext } from "@/lib/entities/context";
import { getOpenChangeRequestCount } from "@/lib/db/admin-queries";
import { isDemo } from "@/lib/demo";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  const profile = await getCurrentProfile();
  const entityCtx = await getCurrentEntityContext();
  const demo = await isDemo();

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
    openChangeRequests:
      profile?.role === "admin" ? await getOpenChangeRequestCount() : 0,
  };

  return (
    <div className="flex h-svh overflow-hidden">
      <AppSidebar {...navProps} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <MobileNav {...navProps} />
        {demo ? (
          <div className="border-b bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <strong>Demo account</strong> — you&apos;re viewing a sample
            lender&apos;s portal. Names and personal details are placeholders,
            and changes are disabled.
          </div>
        ) : null}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
