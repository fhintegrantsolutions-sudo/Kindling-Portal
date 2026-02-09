import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatCurrency } from "@/lib/utils";
import { Users, DollarSign, Search, Filter, ChevronRight, FileText } from "lucide-react";

interface Payment {
  id: string;
  paymentDate: string;
  principalAmount: string;
  interestAmount: string;
  status: string;
}

interface Participation {
  id: string;
  userId: string;
  noteId: string;
  investedAmount: string;
  paymentAmount?: string;
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
  paymentSummary?: {
    totalPaidPrincipal: string;
    totalPaidInterest: string;
    totalPaid: string;
    paymentCount: number;
  };
}

export default function AdminLendersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [noteFilter, setNoteFilter] = useState<string>("all");
  const [selectedParticipation, setSelectedParticipation] = useState<Participation | null>(null);
  const [viewMode, setViewMode] = useState<string>("lenders");

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

  // Fetch payments for selected participation
  const { data: selectedPayments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["admin", "payments", selectedParticipation?.id],
    queryFn: async () => {
      if (!selectedParticipation?.id) return [];
      const response = await fetch(`/api/participations/${selectedParticipation.id}/payments`, {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch payments");
      return response.json();
    },
    enabled: !!selectedParticipation?.id,
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

  // Group participations by note
  const participationsByNote = useMemo(() => {
    const grouped: Record<string, { note: any; participations: Participation[]; totalInvested: number; totalPrincipal: number; totalInterest: number }> = {};
    
    for (const p of filteredParticipations) {
      const noteId = p.note?.noteId || "Unknown";
      if (!grouped[noteId]) {
        grouped[noteId] = {
          note: p.note,
          participations: [],
          totalInvested: 0,
          totalPrincipal: 0,
          totalInterest: 0,
        };
      }
      grouped[noteId].participations.push(p);
      grouped[noteId].totalInvested += parseFloat(p.fundingStatus?.investmentAmount || p.investedAmount || "0");
      grouped[noteId].totalPrincipal += parseFloat(p.paymentSummary?.totalPaidPrincipal || "0");
      grouped[noteId].totalInterest += parseFloat(p.paymentSummary?.totalPaidInterest || "0");
    }
    
    // Sort by noteId
    return Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredParticipations]);

  // Group participations by lender
  const participationsByLender = useMemo(() => {
    const grouped: Record<string, { user: any; participations: Participation[]; totalInvested: number; totalPrincipal: number; totalInterest: number }> = {};
    
    for (const p of filteredParticipations) {
      const oderId = p.user?.id || "Unknown";
      if (!grouped[oderId]) {
        grouped[oderId] = {
          user: p.user,
          participations: [],
          totalInvested: 0,
          totalPrincipal: 0,
          totalInterest: 0,
        };
      }
      grouped[oderId].participations.push(p);
      grouped[oderId].totalInvested += parseFloat(p.fundingStatus?.investmentAmount || p.investedAmount || "0");
      grouped[oderId].totalPrincipal += parseFloat(p.paymentSummary?.totalPaidPrincipal || "0");
      grouped[oderId].totalInterest += parseFloat(p.paymentSummary?.totalPaidInterest || "0");
    }
    
    // Sort by name
    return Object.entries(grouped).sort(([, a], [, b]) => (a.user?.name || "").localeCompare(b.user?.name || ""));
  }, [filteredParticipations]);

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

        {/* Tabbed View */}
        <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="lenders" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              By Lender
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              By Note
            </TabsTrigger>
          </TabsList>

          {/* By Lender View */}
          <TabsContent value="lenders" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>All Lenders</CardTitle>
                <CardDescription>
                  {participationsByLender.length} lender{participationsByLender.length !== 1 ? 's' : ''} with {filteredParticipations.length} participation{filteredParticipations.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading lenders...</div>
                ) : participationsByLender.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No lenders found matching your criteria.
                  </div>
                ) : (
                  <Accordion type="multiple" className="w-full">
                    {participationsByLender.map(([userId, data]) => (
                      <AccordionItem key={userId} value={userId}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex flex-col items-start">
                              <span className="font-semibold">{data.user?.name || "Unknown"}</span>
                              <span className="text-sm text-muted-foreground">{data.user?.email}</span>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                              <div className="text-right">
                                <div className="font-medium">{formatCurrency(data.totalInvested)}</div>
                                <div className="text-muted-foreground">{data.participations.length} note{data.participations.length !== 1 ? 's' : ''}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-green-600">{formatCurrency(data.totalPrincipal)}</div>
                                <div className="text-xs text-muted-foreground">Principal</div>
                              </div>
                              <div className="text-right">
                                <div className="text-amber-600">{formatCurrency(data.totalInterest)}</div>
                                <div className="text-xs text-muted-foreground">Interest</div>
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Note</TableHead>
                                <TableHead className="text-right">Invested</TableHead>
                                <TableHead className="text-right">Monthly</TableHead>
                                <TableHead className="text-right">Principal Paid</TableHead>
                                <TableHead className="text-right">Interest Paid</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {data.participations.map((p: Participation) => {
                                const actualAmount = p.fundingStatus?.investmentAmount || p.investedAmount;
                                const summary = p.paymentSummary;
                                return (
                                  <TableRow 
                                    key={p.id} 
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => setSelectedParticipation(p)}
                                  >
                                    <TableCell>
                                      <span className="font-mono text-sm font-medium">{p.note?.noteId || "-"}</span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(parseFloat(actualAmount || "0"))}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {p.paymentAmount ? formatCurrency(parseFloat(p.paymentAmount)) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right text-green-600">
                                      {summary ? formatCurrency(parseFloat(summary.totalPaidPrincipal)) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right text-amber-600">
                                      {summary ? formatCurrency(parseFloat(summary.totalPaidInterest)) : "-"}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(p)}</TableCell>
                                    <TableCell>
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* By Note View */}
          <TabsContent value="notes" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>By Note</CardTitle>
                <CardDescription>
                  {participationsByNote.length} note{participationsByNote.length !== 1 ? 's' : ''} with {filteredParticipations.length} participation{filteredParticipations.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading notes...</div>
                ) : participationsByNote.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No notes found matching your criteria.
                  </div>
                ) : (
                  <Accordion type="multiple" className="w-full">
                    {participationsByNote.map(([noteId, data]) => (
                      <AccordionItem key={noteId} value={noteId}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex flex-col items-start">
                              <span className="font-mono font-semibold">{noteId}</span>
                              <span className="text-sm text-muted-foreground">{data.note?.title || noteId}</span>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                              <div className="text-right">
                                <div className="font-medium">{formatCurrency(data.totalInvested)}</div>
                                <div className="text-muted-foreground">{data.participations.length} lender{data.participations.length !== 1 ? 's' : ''}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-green-600">{formatCurrency(data.totalPrincipal)}</div>
                                <div className="text-xs text-muted-foreground">Principal</div>
                              </div>
                              <div className="text-right">
                                <div className="text-amber-600">{formatCurrency(data.totalInterest)}</div>
                                <div className="text-xs text-muted-foreground">Interest</div>
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Lender</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-right">Invested</TableHead>
                                <TableHead className="text-right">Monthly</TableHead>
                                <TableHead className="text-right">Principal Paid</TableHead>
                                <TableHead className="text-right">Interest Paid</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {data.participations.map((p: Participation) => {
                                const actualAmount = p.fundingStatus?.investmentAmount || p.investedAmount;
                                const summary = p.paymentSummary;
                                return (
                                  <TableRow 
                                    key={p.id} 
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => setSelectedParticipation(p)}
                                  >
                                    <TableCell className="font-medium">
                                      {p.user?.name || "Unknown"}
                                    </TableCell>
                                    <TableCell>{p.user?.email || "-"}</TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(parseFloat(actualAmount || "0"))}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {p.paymentAmount ? formatCurrency(parseFloat(p.paymentAmount)) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right text-green-600">
                                      {summary ? formatCurrency(parseFloat(summary.totalPaidPrincipal)) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right text-amber-600">
                                      {summary ? formatCurrency(parseFloat(summary.totalPaidInterest)) : "-"}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(p)}</TableCell>
                                    <TableCell>
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Payment Detail Dialog */}
        <Dialog open={!!selectedParticipation} onOpenChange={(open) => !open && setSelectedParticipation(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Payment History</DialogTitle>
              <DialogDescription>
                {selectedParticipation?.user?.name} - {selectedParticipation?.note?.noteId}
              </DialogDescription>
            </DialogHeader>
            
            {selectedParticipation && (
              <div className="space-y-6">
                {/* Yearly Summary Table */}
                {selectedPayments.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Yearly Summary</h3>
                    <Table className="mb-6">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Year</TableHead>
                          <TableHead className="text-right">Principal Paid</TableHead>
                          <TableHead className="text-right">Interest Paid</TableHead>
                          <TableHead className="text-right">Total Paid</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(
                          selectedPayments.reduce((acc: Record<string, {principal: number, interest: number}>, p: Payment) => {
                            const year = new Date(p.paymentDate).getFullYear();
                            if (!acc[year]) acc[year] = { principal: 0, interest: 0 };
                            acc[year].principal += parseFloat(p.principalAmount || '0');
                            acc[year].interest += parseFloat(p.interestAmount || '0');
                            return acc;
                          }, {})
                        ).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([year, sums]) => (
                          <TableRow key={year}>
                            <TableCell>{year}</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(sums.principal)}</TableCell>
                            <TableCell className="text-right text-amber-600">{formatCurrency(sums.interest)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(sums.principal + sums.interest)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Invested</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">
                        {formatCurrency(parseFloat(selectedParticipation.fundingStatus?.investmentAmount || selectedParticipation.investedAmount || "0"))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Payment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">
                        {selectedParticipation.paymentAmount ? formatCurrency(parseFloat(selectedParticipation.paymentAmount)) : "-"}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-green-600">Principal Paid</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold text-green-600">
                        {selectedParticipation.paymentSummary ? formatCurrency(parseFloat(selectedParticipation.paymentSummary.totalPaidPrincipal)) : "-"}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-amber-600">Interest Paid</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold text-amber-600">
                        {selectedParticipation.paymentSummary ? formatCurrency(parseFloat(selectedParticipation.paymentSummary.totalPaidInterest)) : "-"}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Payment History Table */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Payment History ({selectedParticipation.paymentSummary?.paymentCount || 0} payments)</h3>
                  {loadingPayments ? (
                    <div className="py-4 text-center text-muted-foreground">Loading payments...</div>
                  ) : selectedPayments.length === 0 ? (
                    <div className="py-4 text-center text-muted-foreground">No payments recorded yet.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Principal</TableHead>
                          <TableHead className="text-right">Interest</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPayments.map((payment: Payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {new Date(payment.paymentDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {formatCurrency(parseFloat(payment.principalAmount || "0"))}
                            </TableCell>
                            <TableCell className="text-right text-amber-600">
                              {formatCurrency(parseFloat(payment.interestAmount || "0"))}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(parseFloat(payment.principalAmount || "0") + parseFloat(payment.interestAmount || "0"))}
                            </TableCell>
                            <TableCell>
                              <Badge variant={payment.status === "Completed" ? "default" : "secondary"}>
                                {payment.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
