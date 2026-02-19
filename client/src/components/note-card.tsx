import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Calendar, DollarSign, Percent, ArrowRight, Edit } from "lucide-react";
import { Link } from "wouter";
import type { Note, Participation, NoteRegistration } from "@shared/schema";
import { formatCurrency, formatCurrencyPrecise, formatRate, formatTerm } from "@/lib/api";
import { EditInvestmentDialog } from "./edit-investment-dialog";

interface NoteCardProps {
  note: Note;
  participation?: Participation;
  registration?: NoteRegistration;
  onRegistrationUpdate?: () => void;
}

export function NoteCard({ note, participation, registration, onRegistrationUpdate }: NoteCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const investedAmount = participation
    ? parseFloat(participation.investedAmount)
    : registration?.investmentAmount
    ? parseFloat(registration.investmentAmount)
    : parseFloat(note.principal);
  const notePrincipal = parseFloat(note.principal);
  const rate = parseFloat(note.rate);
  const noteMonthlyPayment = note.monthlyPayment ? parseFloat(note.monthlyPayment) : 0;

  const participationShare = notePrincipal > 0 ? investedAmount / notePrincipal : 0;
  const monthlyPayment = participation ? noteMonthlyPayment * participationShare : noteMonthlyPayment;

  // Check if this is an upcoming note participation that can be edited
  const isUpcomingParticipation = participation && (
    note.status === "Funding" ||
    note.status === "Pre Register" ||
    note.clientStatus === "Funding in Progress" ||
    note.clientStatus === "Coming Soon"
  );

  // Use actual payment count if available
  const paymentCount = (participation as any)?.paymentCount ?? 0;

  // Helper to safely convert Date or Timestamp to Date
  const convertToDate = (dateValue: any): Date => {
    if (!dateValue) return new Date();
    if (typeof dateValue === 'string') return new Date(dateValue);
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === 'object' && dateValue.toDate) return dateValue.toDate();
    return new Date();
  };

  // Calculate term progress based on actual payments made
  const calculateTermProgress = () => {
    if (!note.termMonths) return 0;

    // For upcoming notes, show 0 until first payment is made
    if (isUpcomingParticipation && paymentCount === 0) {
      return 0;
    }

    // If we have payment count, use that; otherwise estimate from contract date
    let monthsElapsed = 0;
    if (paymentCount > 0) {
      monthsElapsed = paymentCount;
    } else if (note.contractDate) {
      const contractDate = convertToDate(note.contractDate);
      const now = new Date();
      monthsElapsed = (now.getFullYear() - contractDate.getFullYear()) * 12 + (now.getMonth() - contractDate.getMonth());
    }

    const progress = Math.min(100, Math.max(0, (monthsElapsed / note.termMonths) * 100));
    return progress;
  };

  const termProgress = calculateTermProgress();
  const monthsElapsed = (isUpcomingParticipation && paymentCount === 0) ? 0 : (paymentCount > 0 ? paymentCount : (note.contractDate ? Math.floor((new Date().getTime() - convertToDate(note.contractDate).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0));

  return (
    <Card className="group hover:border-primary/50 transition-all duration-300 hover:shadow-md border-border/60" data-testid={`card-note-${note.id}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="font-serif text-xl group-hover:text-primary transition-colors" data-testid={`text-title-${note.id}`}>
              {note.noteId} - {note.title || note.borrower}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide whitespace-nowrap">Note Status</span>
            <Badge className={note.status === "Active" ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25" : "bg-gray-100 text-gray-700"} data-testid={`badge-status-${note.id}`}>
              {note.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-6 text-sm">
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wide whitespace-nowrap">
              <DollarSign className="w-3 h-3" /> {participation ? "Invested" : "Principal"}
            </span>
            <span className="font-semibold text-lg text-foreground whitespace-nowrap" data-testid={`text-principal-${note.id}`}>
              {formatCurrency(investedAmount)}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <Percent className="w-3 h-3" /> Rate
            </span>
            <span className="font-semibold text-lg text-primary" data-testid={`text-rate-${note.id}`}>
              {formatRate(rate)}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <Calendar className="w-3 h-3" /> Term
            </span>
            <span className="font-medium" data-testid={`text-term-${note.id}`}>
              {formatTerm(note.termMonths)}
            </span>
          </div>
        </div>
        {note.interestType && (
          <Badge variant="outline" className="self-start border-primary/20 text-primary/80 font-medium text-xs" data-testid={`badge-interest-type-${note.id}`}>
            {note.interestType}
          </Badge>
        )}

        {monthlyPayment > 0 && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Monthly Payment</span>
              <span className="font-semibold text-lg text-primary" data-testid={`text-monthly-payment-${note.id}`}>
                {formatCurrencyPrecise(monthlyPayment)}
              </span>
            </div>
          </div>
        )}

        {participation && note.termMonths > 0 && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Term Progress</span>
              <span className="text-xs text-muted-foreground">
                {Math.min(monthsElapsed, note.termMonths)} of {note.termMonths} months
              </span>
            </div>
            <Progress value={termProgress} className="h-2" />
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 border-t border-border/50 bg-secondary/20">
        {isUpcomingParticipation ? (
          <Button
            variant="outline"
            className="w-full justify-between hover:bg-primary hover:text-primary-foreground font-medium text-sm"
            onClick={() => setEditDialogOpen(true)}
            data-testid={`button-edit-investment-${note.id}`}
          >
            Edit Investment Amount <Edit className="w-4 h-4 ml-2" />
          </Button>
        ) : participation ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/portal/notes/${participation.id}`} className="w-full">
                  <Button variant="ghost" className="w-full justify-between hover:bg-transparent hover:text-primary p-0 h-auto font-medium text-sm group-hover:translate-x-1 transition-transform" data-testid={`button-view-details-${note.id}`}>
                    View Details <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-sm">
                <ul className="list-disc list-inside space-y-1">
                  <li>Earnings Summary</li>
                  <li>Payment History</li>
                  <li>Lender Documents</li>
                  <li>Note Details</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button variant="ghost" className="w-full justify-between hover:bg-transparent text-muted-foreground p-0 h-auto font-medium text-sm cursor-default" disabled data-testid={`button-view-details-${note.id}`}>
            View Details <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardFooter>

      {isUpcomingParticipation && participation && (
        <EditInvestmentDialog
          participation={participation}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={onRegistrationUpdate}
        />
      )}
    </Card>
  );
}
