import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Percent, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import type { Note, Participation } from "@shared/schema";
import { formatCurrency, formatRate, formatTerm } from "@/lib/api";

interface NoteCardProps {
  note: Note;
  participation?: Participation;
}

export function NoteCard({ note, participation }: NoteCardProps) {
  const principal = participation 
    ? parseFloat(participation.investedAmount) 
    : parseFloat(note.principal);
  const rate = parseFloat(note.rate);
  const monthlyPayment = note.monthlyPayment ? parseFloat(note.monthlyPayment) : 0;
  
  const estimatedMonthlyInterest = (principal * (rate / 100)) / 12;
  const estimatedMonthlyPrincipal = monthlyPayment > 0 
    ? Math.max(0, monthlyPayment - estimatedMonthlyInterest) 
    : 0;
  const totalPayment = estimatedMonthlyPrincipal + estimatedMonthlyInterest;

  const nextPaymentDate = note.paymentStartDate 
    ? new Date(note.paymentStartDate)
    : new Date();

  return (
    <Card className="group hover:border-primary/50 transition-all duration-300 hover:shadow-md border-border/60" data-testid={`card-note-${note.id}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex gap-2">
              <Badge variant="outline" className="mb-2 bg-secondary text-secondary-foreground border-none font-medium text-xs" data-testid={`badge-type-${note.id}`}>
                {note.type}
              </Badge>
              <Badge variant="outline" className="mb-2 border-primary/20 text-primary/80 font-medium text-xs" data-testid={`badge-interest-type-${note.id}`}>
                {note.interestType}
              </Badge>
            </div>
            <CardTitle className="font-serif text-xl group-hover:text-primary transition-colors" data-testid={`text-title-${note.id}`}>
              {note.noteId} - {note.borrower}
            </CardTitle>
          </div>
          <Badge className={note.status === "Active" ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25" : "bg-gray-100 text-gray-700"} data-testid={`badge-status-${note.id}`}>
            {note.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <DollarSign className="w-3 h-3" /> {participation ? "Invested" : "Principal"}
            </span>
            <span className="font-semibold text-lg text-foreground" data-testid={`text-principal-${note.id}`}>
              {formatCurrency(principal)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <Percent className="w-3 h-3" /> Rate
            </span>
            <span className="font-semibold text-lg text-primary" data-testid={`text-rate-${note.id}`}>
              {formatRate(rate)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <Calendar className="w-3 h-3" /> Term
            </span>
            <span className="font-medium" data-testid={`text-term-${note.id}`}>
              {formatTerm(note.termMonths)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wide">
              Next Payment
            </span>
            <span className="font-medium" data-testid={`text-next-payment-${note.id}`}>
              {note.firstPaymentDate || format(nextPaymentDate, "MMM d, yyyy")}
            </span>
          </div>
        </div>

        {totalPayment > 0 && (
          <div className="pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Est. Monthly Breakdown</p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Principal</span>
                  <span>{formatCurrency(estimatedMonthlyPrincipal)}</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-foreground/70" 
                    style={{ width: `${(estimatedMonthlyPrincipal / totalPayment) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Interest</span>
                  <span>{formatCurrency(estimatedMonthlyInterest)}</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${(estimatedMonthlyInterest / totalPayment) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 border-t border-border/50 bg-secondary/20">
        <Button variant="ghost" className="w-full justify-between hover:bg-transparent hover:text-primary p-0 h-auto font-medium text-sm group-hover:translate-x-1 transition-transform" data-testid={`button-view-details-${note.id}`}>
          View Details <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}
