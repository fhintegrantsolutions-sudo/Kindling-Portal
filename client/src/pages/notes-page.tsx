import Layout from "@/components/layout";
import { NoteCard } from "@/components/note-card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useMyParticipations } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NotesPage() {
  const { data: participations, isLoading } = useMyParticipations();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("oldest");
  const [noteFilter, setNoteFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  // Get unique notes and years for filters
  const uniqueNotes = Array.from(new Set(participations?.map(p => p.note.noteId) || [])).sort();
  const uniqueYears = Array.from(new Set(participations?.map(p => {
    const year = new Date(p.purchaseDate).getFullYear();
    return year;
  }) || [])).sort((a, b) => b - a);

  const filteredParticipations = participations?.filter(p => {
    const matchesSearch = p.note.noteId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.note.borrower.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.note.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || p.note.status === statusFilter;
    const matchesNote = noteFilter === "all" || p.note.noteId === noteFilter;
    const matchesYear = yearFilter === "all" || new Date(p.purchaseDate).getFullYear().toString() === yearFilter;
    
    return matchesSearch && matchesStatus && matchesNote && matchesYear;
  }) || [];

  const sortedParticipations = [...filteredParticipations].sort((a, b) => {
    const dateA = new Date(a.purchaseDate).getTime();
    const dateB = new Date(b.purchaseDate).getTime();
    return sortOrder === "oldest" ? dateA - dateB : dateB - dateA;
  });

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-serif font-bold text-foreground" data-testid="text-notes-title">My Notes</h1>
            <p className="text-muted-foreground" data-testid="text-notes-description">Manage and view details of your active note participations.</p>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto">
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
            <div className="flex gap-2 w-full md:w-72">
              <Select value={noteFilter} onValueChange={setNoteFilter}>
                <SelectTrigger className="flex-1" data-testid="select-note-filter">
                  <SelectValue placeholder="All Notes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Notes</SelectItem>
                  {uniqueNotes.map(noteId => (
                    <SelectItem key={noteId} value={noteId}>{noteId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="flex-1" data-testid="select-year-filter">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {uniqueYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-full md:w-72" data-testid="select-sort-order">
                <SelectValue placeholder="Sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oldest">Oldest to Newest</SelectItem>
                <SelectItem value="newest">Newest to Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </>
          ) : sortedParticipations.length > 0 ? (
            sortedParticipations.map((participation) => (
              <NoteCard key={participation.id} note={participation.note} participation={participation} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground" data-testid="text-no-notes">
                {searchQuery ? "No notes match your search." : "You have no active investments."}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
