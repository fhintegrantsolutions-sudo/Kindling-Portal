import { AppSidebar } from "@/components/app-sidebar";
import { getCurrentProfile, verifySession } from "@/lib/dal";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  const profile = await getCurrentProfile();

  return (
    <div className="flex min-h-svh">
      <AppSidebar
        email={session.email}
        name={profile?.name ?? null}
        role={profile?.role ?? null}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
