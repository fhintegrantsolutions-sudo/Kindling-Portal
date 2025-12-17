import Layout from "@/components/layout";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  DollarSign, 
  Percent, 
  Calendar, 
  FileText, 
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Info,
  StickyNote
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { 
  useParticipation, 
  useParticipationPayments, 
  useParticipationDocuments,
  formatCurrency,
  formatCurrencyPrecise,
  formatRate,
  formatTerm
} from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export default function NoteDetailPage() {
  const [, params] = useRoute("/notes/:id");
  const participationId = params?.id || "";
  
  const { data: participation, isLoading: loadingParticipation } = useParticipation(participationId);
  const { data: payments, isLoading: loadingPayments } = useParticipationPayments(participationId);
  const { data: documents, isLoading: loadingDocuments } = useParticipationDocuments(participationId);

  if (loadingParticipation) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </Layout>
    );
  }

  if (!participation) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Investment not found.</p>
          <Link href="/notes">
            <Button variant="link" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to My Notes
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const { note } = participation;
  const investedAmount = parseFloat(participation.investedAmount);
  const notePrincipal = parseFloat(note.principal);
  const rate = parseFloat(note.rate);
  const noteMonthlyPayment = note.monthlyPayment ? parseFloat(note.monthlyPayment) : 0;
  
  const participationShare = notePrincipal > 0 ? investedAmount / notePrincipal : 0;
  const monthlyPayment = noteMonthlyPayment * participationShare;
  
  const sortedPayments = payments?.slice().sort((a, b) => 
    new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
  ) || [];
  const totalPaidPrincipal = payments?.reduce((sum, p) => sum + parseFloat(p.principalAmount), 0) || 0;
  const totalPaidInterest = payments?.reduce((sum, p) => sum + parseFloat(p.interestAmount), 0) || 0;
  
  // Calculate remaining balance based on the 25th rule
  // On or after the 25th, include that month's payment in the calculation
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Find payments that should be considered "applied" based on date
  // A payment is applied if: we're on or past the 25th of its payment month
  const isPaymentApplied = (paymentDate: string | Date) => {
    const paymentDateStr = typeof paymentDate === 'string' ? paymentDate : paymentDate.toISOString().split('T')[0];
    const [pYear, pMonth] = paymentDateStr.split('-').map(Number);
    
    // Payment is applied if:
    // - Payment is from a past month/year, OR
    // - Payment is from current month and we're on or after the 25th
    const isPastMonth = pYear < currentYear || (pYear === currentYear && pMonth - 1 < currentMonth);
    const isCurrentMonthApplied = pYear === currentYear && pMonth - 1 === currentMonth && currentDay >= 25;
    
    return isPastMonth || isCurrentMonthApplied;
  };
  
  const appliedPrincipal = sortedPayments.reduce((sum, p) => {
    if (isPaymentApplied(p.paymentDate)) {
      return sum + parseFloat(p.principalAmount);
    }
    return sum;
  }, 0);
  
  const appliedInterest = sortedPayments.reduce((sum, p) => {
    if (isPaymentApplied(p.paymentDate)) {
      return sum + parseFloat(p.interestAmount);
    }
    return sum;
  }, 0);
  
  const remainingBalance = investedAmount - appliedPrincipal;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case "Scheduled":
        return <Clock className="w-4 h-4 text-amber-600" />;
      case "Missed":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-500/15 text-emerald-700";
      case "Scheduled":
        return "bg-amber-500/15 text-amber-700";
      case "Missed":
        return "bg-red-500/15 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/notes">
            <Button variant="ghost" size="icon" data-testid="button-back-to-notes">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-serif font-bold text-foreground" data-testid="text-note-title">
                {note.noteId}
              </h1>
              <Badge className={note.status === "Active" ? "bg-emerald-500/15 text-emerald-700" : "bg-gray-100 text-gray-700"} data-testid="badge-note-status">
                {note.status}
              </Badge>
            </div>
            <p className="text-muted-foreground" data-testid="text-borrower">{note.borrower}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-invested-amount">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                Your Investment
              </div>
              <p className="text-2xl font-bold">{formatCurrency(investedAmount)}</p>
            </CardContent>
          </Card>
          <Card data-testid="card-interest-rate">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Percent className="w-4 h-4" />
                Interest Rate
              </div>
              <p className="text-2xl font-bold text-primary">{formatRate(rate)}</p>
            </CardContent>
          </Card>
          <Card data-testid="card-monthly-payment">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Calendar className="w-4 h-4" />
                Monthly Payment
              </div>
              <p className="text-2xl font-bold">{formatCurrencyPrecise(monthlyPayment)}</p>
            </CardContent>
          </Card>
          <Card data-testid="card-remaining-balance">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                Remaining Balance
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-sm">
                      <p>Updates on the 25th of every month when payments are applied.</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(remainingBalance)}</p>
            </CardContent>
          </Card>
        </div>

        {(appliedPrincipal > 0 || appliedInterest > 0) && (
          <Card data-testid="card-earnings-chart">
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Earnings Summary
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-sm">
                      <p>Updates on the 25th of every month when payments are applied.</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Principal Returned", value: appliedPrincipal, color: "#64748b" },
                        { name: "Interest Earned", value: appliedInterest, color: "#16a34a" },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${formatCurrencyPrecise(value)}`}
                      labelLine={false}
                    >
                      <Cell fill="#64748b" />
                      <Cell fill="#16a34a" />
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrencyPrecise(value)}
                    />
                    <Legend 
                      verticalAlign="bottom"
                      formatter={(value) => <span className="text-sm">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Principal Returned</p>
                  <p className="text-xl font-bold">{formatCurrencyPrecise(appliedPrincipal)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Interest Earned</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrencyPrecise(appliedInterest)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Payment</p>
                  <p className="text-xl font-bold text-primary">{formatCurrencyPrecise(appliedPrincipal + appliedInterest)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3" data-testid="card-payment-history">
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPayments ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : sortedPayments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Principal</TableHead>
                      <TableHead className="text-right">Interest</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Remaining Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPayments.map((payment, index) => {
                      const cumulativePrincipal = sortedPayments
                        .slice(0, index + 1)
                        .reduce((sum, p) => sum + parseFloat(p.principalAmount), 0);
                      const remainingBalanceForRow = investedAmount - cumulativePrincipal;
                      return (
                        <TableRow key={payment.id} data-testid={`row-payment-${index}`}>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell>{format(new Date(payment.paymentDate), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-right">{formatCurrencyPrecise(payment.principalAmount)}</TableCell>
                          <TableCell className="text-right">{formatCurrencyPrecise(payment.interestAmount)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrencyPrecise(parseFloat(payment.principalAmount) + parseFloat(payment.interestAmount))}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrencyPrecise(remainingBalanceForRow)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8" data-testid="text-no-payments">
                  No payment history yet.
                </p>
              )}
              
              {sortedPayments.length > 0 && (
                <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Principal Received:</span>
                    <span className="ml-2 font-medium">{formatCurrencyPrecise(totalPaidPrincipal)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Interest Received:</span>
                    <span className="ml-2 font-medium text-primary">{formatCurrencyPrecise(totalPaidInterest)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card data-testid="card-lender-documents">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-lg flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Lender Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {loadingDocuments ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : documents && documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc, index) => (
                      <div 
                        key={doc.id} 
                        className="flex items-center justify-between p-2 rounded-lg border bg-secondary/20 hover:bg-secondary/40 transition-colors"
                        data-testid={`doc-item-${index}`}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{doc.fileName}</p>
                            <p className="text-xs text-muted-foreground">{doc.type}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" data-testid={`button-download-doc-${index}`}>
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4 text-sm" data-testid="text-no-documents">
                    No documents available yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-user-notes">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-lg flex items-center gap-2">
                  <StickyNote className="w-4 h-4" />
                  My Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Textarea 
                  placeholder="Add your personal notes about this investment..."
                  className="min-h-[120px] resize-none"
                  data-testid="textarea-user-notes"
                />
                <p className="text-xs text-muted-foreground mt-2">Notes are saved automatically.</p>
              </CardContent>
            </Card>

            <Card className="bg-secondary/30" data-testid="card-see-note-details">
              <CardContent className="py-4">
                <a 
                  href="#note-details" 
                  className="text-primary hover:underline font-medium flex items-center gap-2"
                  data-testid="link-see-note-details"
                >
                  <FileText className="w-4 h-4" />
                  See Note Details
                </a>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card id="note-details" data-testid="card-note-details">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Note Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              <div>
                <p className="text-muted-foreground">Note Type</p>
                <p className="font-medium">{note.type}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Interest Type</p>
                <p className="font-medium">{note.interestType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Term</p>
                <p className="font-medium">{formatTerm(note.termMonths)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Note Principal</p>
                <p className="font-medium">{formatCurrency(note.principal)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Your Ownership Share</p>
                <p className="font-medium">{(participationShare * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Purchase Date</p>
                <p className="font-medium">{format(new Date(participation.purchaseDate), "MMM d, yyyy")}</p>
              </div>
              {note.firstPaymentDate && (
                <div>
                  <p className="text-muted-foreground">First Payment Date</p>
                  <p className="font-medium">{note.firstPaymentDate}</p>
                </div>
              )}
              {note.maturityDate && (
                <div>
                  <p className="text-muted-foreground">Maturity Date</p>
                  <p className="font-medium">{format(new Date(note.maturityDate), "MMM d, yyyy")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
