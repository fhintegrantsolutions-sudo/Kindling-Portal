import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Percent, Calendar, CheckCircle2, Info } from "lucide-react";
import { Link } from "wouter";
import { format, differenceInDays } from "date-fns";
import type { Note } from "@shared/schema";
import { formatCurrency, formatRate, formatTerm } from "@/lib/api";
import { RegistrationDialog } from "./registration-dialog";

interface OpportunityCardProps {
  opportunity: Note;
}

// Parse a date value to a local midnight Date, avoiding UTC-to-local timezone drift
function parseLocalDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  const str = typeof d === "string" ? d : (d as Date).toISOString();
  const [year, month, day] = str.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);

  const minInvestment = opportunity.minInvestment ? parseFloat(opportunity.minInvestment) : 0;
  const rate = parseFloat(opportunity.rate || "0");
  const closingDate = opportunity.fundingEndDate;
  const closingDateLocal = parseLocalDate(closingDate as any);
  const openingDateLocal = parseLocalDate(opportunity.fundingStartDate as any);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysUntilClose = closingDateLocal ? differenceInDays(closingDateLocal, today) : null;
  const daysUntilOpen = openingDateLocal ? differenceInDays(openingDateLocal, today) : null;

  // Check if user has already registered for this opportunity
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const response = await fetch(`/api/registrations/check/${opportunity.id}`);
        if (response.ok) {
          const data = await response.json();
          setHasRegistered(data.hasRegistered);
        }
      } catch (error) {
        console.error("Failed to check registration status:", error);
      } finally {
        setIsCheckingRegistration(false);
      }
    };

    checkRegistrationStatus();
  }, [opportunity.id]);

  return (
    <>
      <Card className="flex flex-col h-full border-border/60 shadow-sm hover:shadow-lg transition-all duration-300" data-testid={`card-opportunity-${opportunity.id}`}>
        <CardHeader>
          <div className="flex justify-between items-start mb-2">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary" className="font-medium bg-primary/10 text-primary hover:bg-primary/20" data-testid={`badge-status-${opportunity.id}`}>
                {opportunity.status === "Funding" ? "Now Funding" : "Pre Register Now"}
              </Badge>
            </div>
            {daysUntilOpen !== null && daysUntilOpen > 0 ? (
              <div className="text-[10px] text-muted-foreground font-semibold" data-testid={`text-closing-${opportunity.id}`}>
                Opens in {daysUntilOpen} days
              </div>
            ) : closingDate && daysUntilClose !== null && (
              <div className="text-[10px] text-primary font-semibold" data-testid={`text-closing-${opportunity.id}`}>
                {daysUntilClose > 0 ? `Closes in ${daysUntilClose} days` : daysUntilClose === 0 ? 'Closes today' : 'Closed'}
              </div>
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
          <div className="relative grid grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-lg border border-secondary">
            {opportunity.interestType && (
              <Badge variant="outline" className="absolute top-2 right-2 font-medium bg-background border-border text-xs" data-testid={`badge-interest-type-${opportunity.id}`}>
                {opportunity.interestType}
              </Badge>
            )}
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
            {openingDateLocal && (
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary/70" /> Funding Open
                </span>
                <span className="font-medium">
                  {format(openingDateLocal, "MMM d, yyyy")}
                </span>
              </div>
            )}
            {closingDateLocal && (
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary/70" /> Funding Closes
                </span>
                <span className="font-medium">
                  {format(closingDateLocal, "MMM d, yyyy")}
                </span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-2 flex-col gap-2 items-stretch">
          {hasRegistered ? (
            <>
              <Button
                disabled
                className="w-full bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 font-medium h-11 text-base border border-emerald-500/30 flex items-center justify-center gap-2"
                data-testid={`button-register-${opportunity.id}`}
              >
                <CheckCircle2 className="w-4 h-4" /> Already Registered
              </Button>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground px-1">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  To review your submission or make adjustments, visit{" "}
                  <Link href="/portal/notes" className="text-primary font-medium hover:underline">
                    My Notes
                  </Link>{" "}
                  → <span className="font-medium">Upcoming</span> tab.
                </span>
              </p>
            </>
          ) : (
            <Button
              onClick={() => setDialogOpen(true)}
              disabled={isCheckingRegistration}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-11 text-base shadow-md hover:shadow-lg transition-all"
              data-testid={`button-register-${opportunity.id}`}
            >
              {isCheckingRegistration ? "Loading..." : "Register to Participate"}
            </Button>
          )}
        </CardFooter>
      </Card>

      <RegistrationDialog
        opportunity={opportunity}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onRegistrationSuccess={() => setHasRegistered(true)}
      />
    </>
  );
}
