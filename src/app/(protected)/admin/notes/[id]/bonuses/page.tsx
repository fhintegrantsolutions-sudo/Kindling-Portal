import { notFound } from "next/navigation";
import { getAdminNoteById, getNoteBonuses } from "@/lib/db/admin-queries";
import { BonusesSection } from "../bonuses-section";

export default async function NoteBonusesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [note, bonuses] = await Promise.all([
    getAdminNoteById(id),
    getNoteBonuses(id),
  ]);
  if (!note) notFound();

  return <BonusesSection noteUuid={note.id} bonuses={bonuses} />;
}
