import { requireParticipationsAccess } from "@/lib/dal";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layout accepts any admin variant; non-participations pages enforce
  // `requireAdmin()` themselves and redirect scoped admins back to their
  // home (/admin/participations).
  await requireParticipationsAccess();
  return <>{children}</>;
}
