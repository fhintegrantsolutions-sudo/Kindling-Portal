import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminNoteById } from "@/lib/db/admin-queries";
import { NoteTabs } from "./note-tabs";

export default async function NoteAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await getAdminNoteById(id);
  if (!note) notFound();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <Link
        href="/admin/notes"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to notes
      </Link>
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {note.note_id}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{note.title}</h1>
      </header>
      <NoteTabs noteUuid={note.id} />
      {children}
    </div>
  );
}
