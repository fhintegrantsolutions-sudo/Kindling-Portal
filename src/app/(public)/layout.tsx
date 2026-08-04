import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PublicTopbar } from "@/components/public-topbar";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-svh flex-col">
      <PublicTopbar isAuthenticated={Boolean(user)} />
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-card py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground md:flex-row md:px-8">
          <div className="flex items-center gap-4">
            <p>© {new Date().getFullYear()} Kindling. All rights reserved.</p>
            <Link
              href="/privacy"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Privacy Policy
            </Link>
          </div>
          <p className="text-xs">
            Investments in private notes are not FDIC-insured and may lose value.
          </p>
        </div>
      </footer>
    </div>
  );
}
