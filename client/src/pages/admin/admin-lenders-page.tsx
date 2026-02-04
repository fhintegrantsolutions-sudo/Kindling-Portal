import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Users, DollarSign, Search, Filter } from "lucide-react";

interface Participation {
  id: string;
  userId: string;
  noteId: string;
  investedAmount: string;
  purchaseDate: string;
  status: string;
  fundingStatus?: {
    received?: boolean;
    deposited?: boolean;
    cleared?: boolean;
    fundingType?: string;
    investmentAmount?: string;
    checkNumber?: string;
    wireReferenceNumber?: string;
    receivedDate?: string;
    depositedDate?: string;
    clearedDate?: string;
  };
  note?: {
    id: string;
    noteId: string;
    title: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function AdminLendersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [noteFilter, setNoteFilter] = useState<string>("all");

  // Fetch all participations with user and note details
  const { data: participations = [], isLoading } = useQuery({
    queryKey: ["admin", "participations"],
    queryFn: async () => {
      const response = await fetch("/api/admin/participations", {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch participations");
      return response.json();
    },
  });

  // Fetch notes for filter dropdown
  const { data: notes = [] } = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const response = await fetch("/api/notes");
      if (!response.ok) throw new Error("Failed to fetch notes");
      return response.json();
    },
  });

  // Filter participations
  const filteredParticipations = participations.filter((p: Participation) => {
    const matchesSearch =
      !searchTerm ||
      p.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.note?.noteId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "cleared" && p.fundingStatus?.cleared) ||
      (statusFilter === "deposited" && p.fundingStatus?.deposited && !p.fundingStatus?.cleared) ||
      (statusFilter === "received" && p.fundingStatus?.received && !p.fundingStatus?.deposited) ||
      (statusFilter === "awaiting" && !p.fundingStatus?.received);

    const matchesNote = noteFilter === "all" || p.noteId === noteFilter;

    return matchesSearch && matchesStatus && matchesNote;
  });

  // Calculate totals
  const totalInvested = filteredParticipations.reduce(
    (sum: number, p: Participation) =>
      sum + parseFloat(p.fundingStatus?.investmentAmount || p.investedAmount || "0"),
    0
  );

  const totalLenders = new Set(filteredParticipations.map((p: Participation) => p.userId)).size;

  const getStatusBadge = (p: Participation) => {
    const fs = p.fundingStatus || {};
    if (fs.cleared) return <Badge variant="default">Funds Cleared</Badge>;
    if (fs.deposited) return <Badge variant="secondary">Funds Deposited</Badge>;
    if (fs.received) return <Badge variant="outline">Funds Received</Badge>;
    return <Badge variant="destructive">Awaiting Funds</Badge>;
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Lenders</h1>
          <p className="text-muted-foreground">
            View all lenders and their investments across notes
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Total Lenders</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLenders}</div>
              <p className="text-xs text-muted-foreground">
                Unique investors
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalInvested)}</div>
              <p className="text-xs text-muted-foreground">
                Across {filteredParticipations.length} participation{filteredParticipations.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Filtered Results</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredParticipations.length}</div>
              <p className="text-xs text-muted-foreground">
                of {participations.length} total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or note..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={noteFilter} onValueChange={setNoteFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by note" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Notes</SelectItem>
                  {notes.map((note: any) => (
                    <SelectItem key={note.id} value={note.id}>
                      {note.noteId} - {note.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="awaiting">Awaiting Funds</SelectItem>
                  <SelectItem value="received">Funds Received</SelectItem>
                  <SelectItem value="deposited">Funds Deposited</SelectItem>
                  <SelectItem value="cleared">Funds Cleared</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lenders Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Lenders</CardTitle>
            <CardDescription>
              {filteredParticipations.length} participation{filteredParticipations.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading lenders...</div>
            ) : filteredParticipations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No lenders found matching your criteria.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lender</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right">Registered</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead>Payment Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Purchase Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParticipations.map((p: Participation) => {
                    const actualAmount = p.fundingStatus?.investmentAmount || p.investedAmount;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.user?.name || "Unknown"}
                        </TableCell>
                        <TableCell>{p.user?.email || "-"}</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {p.note?.noteId || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(parseFloat(p.investedAmount || "0"))}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(parseFloat(actualAmount || "0"))}
                        </TableCell>
                        <TableCell>
                          {p.fundingStatus?.fundingType ? (
                            <Badge variant="outline" className="capitalize">
                              {p.fundingStatus.fundingType}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(p)}</TableCell>
                        <TableCell>
                          {p.purchaseDate
                            ? new Date(p.purchaseDate).toLocaleDateString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
