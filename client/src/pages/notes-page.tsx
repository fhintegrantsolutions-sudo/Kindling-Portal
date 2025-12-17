import Layout from "@/components/layout";
import { NoteCard } from "@/components/note-card";
import { Input } from "@/components/ui/input";
import { Search, Filter, ArrowUpDown } from "lucide-react";
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
  const [sortBy, setSortBy] = useState("noteId");

  const filteredParticipations = participations?.filter(p => {
    const matchesSearch = p.note.noteId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.note.borrower.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.note.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || p.note.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const sortedParticipations = [...filteredParticipations].sort((a, b) => {
    switch (sortBy) {
      case "noteId":
        return a.note.noteId.localeCompare(b.note.noteId);
      case "invested-high":
        return parseFloat(b.investedAmount) - parseFloat(a.investedAmount);
      case "invested-low":
        return parseFloat(a.investedAmount) - parseFloat(b.investedAmount);
      case "rate-high":
        return parseFloat(b.note.rate) - parseFloat(a.note.rate);
      case "rate-low":
        return parseFloat(a.note.rate) - parseFloat(b.note.rate);
      case "term-long":
        return b.note.termMonths - a.note.termMonths;
      case "term-short":
        return a.note.termMonths - b.note.termMonths;
      default:
        return 0;
    }
  });

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

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]" data-testid="select-sort-by">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="noteId">Note ID</SelectItem>
                <SelectItem value="invested-high">Invested (High to Low)</SelectItem>
                <SelectItem value="invested-low">Invested (Low to High)</SelectItem>
                <SelectItem value="rate-high">Rate (High to Low)</SelectItem>
                <SelectItem value="rate-low">Rate (Low to High)</SelectItem>
                <SelectItem value="term-long">Term (Longest)</SelectItem>
                <SelectItem value="term-short">Term (Shortest)</SelectItem>
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
