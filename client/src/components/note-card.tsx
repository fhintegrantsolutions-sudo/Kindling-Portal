import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Calendar, DollarSign, Percent, ArrowRight, Edit, XCircle, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import type { Note, Participation, NoteRegistration } from "@shared/schema";
import { formatCurrency, formatCurrencyPrecise, formatRate, formatTerm } from "@/lib/api";
import { EditInvestmentDialog } from "./edit-investment-dialog";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";

interface NoteCardProps {
  note: Note;
  participation?: Participation;
  registration?: NoteRegistration;
  onRegistrationUpdate?: () => void;
}

export function NoteCard({ note, participation, registration, onRegistrationUpdate }: NoteCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const { toast } = useToast();

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

  // Calculate days until funding opens/closes (for upcoming notes)
  const fundingStartDate = note.fundingStartDate ? convertToDate(note.fundingStartDate) : null;
  const fundingEndDate = note.fundingEndDate ? convertToDate(note.fundingEndDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilOpen = fundingStartDate ? differenceInDays(fundingStartDate, today) : null;
  const daysUntilClose = fundingEndDate ? differenceInDays(fundingEndDate, today) : null;

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

  const handleDeclineParticipation = async () => {
    if (!participation) return;

    if (!confirm(`Are you sure you want to decline participation in ${note.noteId}?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/participations/${participation.id}/decline`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to decline participation');
      }

      const result = await response.json();
      console.log('Declined participation result:', result);

      // Refresh the data first
      if (onRegistrationUpdate) {
        onRegistrationUpdate();
      }

      // Small delay to ensure data is refreshed before showing toast
      setTimeout(() => {
        toast({
          title: "Participation Declined",
          description: `You have declined participation in ${note.noteId}. Check the Declined tab to reactivate.`,
        });
      }, 100);
    } catch (error) {
      console.error('Error declining participation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to decline participation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReactivateParticipation = async () => {
    if (!participation) return;

    setIsReactivating(true);
    try {
      const response = await fetch(`/api/participations/${participation.id}/reactivate`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to reactivate participation');
      }

      toast({
        title: "Participation Reactivated",
        description: `You have reactivated participation in ${note.noteId}. It will now appear in your Upcoming notes.`,
      });

      // Refresh the data
      if (onRegistrationUpdate) {
        onRegistrationUpdate();
      }
    } catch (error) {
      console.error('Error reactivating participation:', error);
      toast({
        title: "Error",
        description: "Failed to reactivate participation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsReactivating(false);
    }
  };

  const isDeclined = participation?.status === "Declined";

  return (
    <Card className="group hover:border-primary/50 transition-all duration-300 hover:shadow-md border-border/60" data-testid={`card-note-${note.id}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="font-serif text-xl group-hover:text-primary transition-colors" data-testid={`text-title-${note.id}`}>
              {note.noteId}
            </CardTitle>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {isUpcomingParticipation && (
              <>
                {daysUntilOpen !== null && daysUntilOpen > 0 ? (
                  <div className="text-[10px] text-muted-foreground font-semibold whitespace-nowrap">
                    Opens in {daysUntilOpen} {daysUntilOpen === 1 ? 'day' : 'days'}
                  </div>
                ) : daysUntilClose !== null && daysUntilClose >= 0 ? (
                  <div className="text-[10px] text-primary font-semibold whitespace-nowrap">
                    {daysUntilClose > 0 ? `Closes in ${daysUntilClose} ${daysUntilClose === 1 ? 'day' : 'days'}` : 'Closes today'}
                  </div>
                ) : null}
              </>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide whitespace-nowrap">Status</span>
              <Badge className={
              note.clientStatus === "Active" ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25" :
              note.clientStatus === "Processing" ? "bg-orange-500/15 text-orange-700 hover:bg-orange-500/25" :
              note.clientStatus === "Funding in Progress" ? "bg-blue-500/15 text-blue-700 hover:bg-blue-500/25" :
              note.clientStatus === "Coming Soon" ? "bg-purple-500/15 text-purple-700 hover:bg-purple-500/25" :
              note.clientStatus === "Fully Funded" ? "bg-cyan-500/15 text-cyan-700 hover:bg-cyan-500/25" :
              note.clientStatus === "Paid Off" ? "bg-gray-500/15 text-gray-700 hover:bg-gray-500/25" :
              "bg-gray-100 text-gray-700"
            } data-testid={`badge-status-${note.id}`}>
              {note.clientStatus}
            </Badge>
          </div>
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
        {isDeclined ? (
          <Button
            variant="outline"
            className="w-full justify-between hover:bg-primary hover:text-primary-foreground font-medium text-sm"
            onClick={handleReactivateParticipation}
            disabled={isReactivating}
            data-testid={`button-reactivate-${note.id}`}
          >
            {isReactivating ? "Reactivating..." : "Reactivate Participation"} <RotateCcw className="w-4 h-4 ml-2" />
          </Button>
        ) : isUpcomingParticipation ? (
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1 justify-between hover:bg-primary hover:text-primary-foreground font-medium text-sm"
              onClick={() => setEditDialogOpen(true)}
              disabled={isDeleting}
              data-testid={`button-edit-investment-${note.id}`}
            >
              Edit <Edit className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              className="flex-1 justify-between hover:bg-destructive hover:text-destructive-foreground font-medium text-sm"
              onClick={handleDeclineParticipation}
              disabled={isDeleting}
              data-testid={`button-decline-${note.id}`}
            >
              {isDeleting ? "Declining..." : "Decline"} <XCircle className="w-4 h-4 ml-2" />
            </Button>
          </div>
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
