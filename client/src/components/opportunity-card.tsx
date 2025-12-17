import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Clock, Percent, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { Note } from "@shared/schema";
import { formatCurrency, formatRate, formatTerm } from "@/lib/api";
import { RegistrationDialog } from "./registration-dialog";

interface OpportunityCardProps {
  opportunity: Note;
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const minInvestment = opportunity.minInvestment ? parseFloat(opportunity.minInvestment) : 0;
  const rate = parseFloat(opportunity.rate || "0");
  const closingDate = opportunity.fundingEndDate || opportunity.maturityDate;

  return (
    <>
      <Card className="flex flex-col h-full border-border/60 shadow-sm hover:shadow-lg transition-all duration-300" data-testid={`card-opportunity-${opportunity.id}`}>
        <CardHeader>
          <div className="flex justify-between items-start mb-2">
            <Badge variant="secondary" className="font-medium bg-primary/10 text-primary hover:bg-primary/20" data-testid={`badge-status-${opportunity.id}`}>
              {opportunity.status === "Funding" ? "Now Funding" : "Open for Investment"}
            </Badge>
            {closingDate && (
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1" data-testid={`text-closing-${opportunity.id}`}>
                <Clock className="w-3 h-3" /> Closes {format(new Date(closingDate), "MMM d")}
              </span>
            )}
          </div>
          <CardTitle className="font-serif text-2xl leading-tight mb-2" data-testid={`text-title-${opportunity.id}`}>
            {opportunity.noteId} - {opportunity.borrower}
          </CardTitle>
          <CardDescription className="line-clamp-2 text-sm leading-relaxed" data-testid={`text-description-${opportunity.id}`}>
            {opportunity.description || `${opportunity.type} opportunity with ${opportunity.borrower}`}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-lg border border-secondary">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1">
                <Percent className="w-3 h-3" /> Est. Annual Rate
              </p>
              <p className="text-2xl font-bold text-primary" data-testid={`text-rate-${opportunity.id}`}>
                {rate > 0 ? formatRate(rate) : "TBD"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Term
              </p>
              <p className="text-2xl font-bold text-foreground" data-testid={`text-term-${opportunity.id}`}>
                {opportunity.termMonths > 0 ? formatTerm(opportunity.termMonths) : "TBD"}
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            {minInvestment > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-primary/70" /> Min. Investment
                </span>
                <span className="font-medium" data-testid={`text-min-investment-${opportunity.id}`}>
                  {formatCurrency(minInvestment)}
                </span>
              </div>
            )}
            {opportunity.fundingStartDate && (
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary/70" /> Funding Started
                </span>
                <span className="font-medium">
                  {format(new Date(opportunity.fundingStartDate), "MMM d, yyyy")}
                </span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-2">
          <Button onClick={() => setDialogOpen(true)} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-11 text-base shadow-md hover:shadow-lg transition-all" data-testid={`button-register-${opportunity.id}`}>
            Participate Now
          </Button>
        </CardFooter>
      </Card>

      <RegistrationDialog
        opportunity={opportunity}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
