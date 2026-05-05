import { getCurrentProfile } from "@/lib/dal";
import { logout } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </header>
      <section className="flex flex-col gap-2 rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="font-medium">{profile?.email}</p>
        <p className="text-xs text-muted-foreground">Role: {profile?.role}</p>
      </section>
      <p className="text-sm text-muted-foreground">
        Lender pages land in Phase 4. Admin tooling lands in Phase 6.
      </p>
    </div>
  );
}
