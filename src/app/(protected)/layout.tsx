import { verifySession } from "@/lib/dal";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySession();
  return <>{children}</>;
}
