import Layout from "@/components/layout";
import { NoteCard } from "@/components/note-card";
import { MOCK_NOTES } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function NotesPage() {
  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-serif font-bold text-foreground">My Notes</h1>
            <p className="text-muted-foreground">Manage and view details of your active note participations.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search notes..." className="pl-10 bg-background" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_NOTES.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
