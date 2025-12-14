import Layout from "@/components/layout";
import { NoteCard } from "@/components/note-card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useActiveNotes } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function NotesPage() {
  const { data: notes, isLoading } = useActiveNotes();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotes = notes?.filter(note => 
    note.noteId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.borrower.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.type.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-serif font-bold text-foreground" data-testid="text-notes-title">My Notes</h1>
            <p className="text-muted-foreground" data-testid="text-notes-description">Manage and view details of your active note participations.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search notes..." 
              className="pl-10 bg-background" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-notes"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </>
          ) : filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground" data-testid="text-no-notes">
                {searchQuery ? "No notes match your search." : "No active notes found."}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
