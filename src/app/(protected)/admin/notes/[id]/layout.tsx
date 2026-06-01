import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAdminNoteById,
  getAdminNoteNeighbors,
} from "@/lib/db/admin-queries";
import { NoteTabs } from "./note-tabs";
import { NoteSiblingNav } from "./note-sibling-nav";

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
  const neighbors = await getAdminNoteNeighbors(note.note_id);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <Link
        href="/admin/notes"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to notes
      </Link>
      <div className="flex items-start justify-between gap-4">
        <header>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {note.note_id}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {note.title}
          </h1>
        </header>
        <NoteSiblingNav prev={neighbors.prev} next={neighbors.next} />
      </div>
      <NoteTabs noteUuid={note.id} />
      {children}
    </div>
  );
}
