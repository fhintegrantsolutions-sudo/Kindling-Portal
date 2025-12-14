import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Percent, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface NoteProps {
  note: {
    id: number;
    title: string;
    principal: number;
    rate: string;
    term: string;
    startDate: string;
    nextPayment: string;
    status: string;
    type: string;
    interestType: string;
    nextPaymentBreakdown: {
      principal: number;
      interest: number;
    };
  };
}

export function NoteCard({ note }: NoteProps) {
  const totalPayment = note.nextPaymentBreakdown.principal + note.nextPaymentBreakdown.interest;

  return (
    <Card className="group hover:border-primary/50 transition-all duration-300 hover:shadow-md border-border/60">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex gap-2">
              <Badge variant="outline" className="mb-2 bg-secondary text-secondary-foreground border-none font-medium text-xs">
                {note.type}
              </Badge>
              <Badge variant="outline" className="mb-2 border-primary/20 text-primary/80 font-medium text-xs">
                {note.interestType}
              </Badge>
            </div>
            <CardTitle className="font-serif text-xl group-hover:text-primary transition-colors">
              {note.title}
            </CardTitle>
          </div>
          <Badge className={note.status === "Active" ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25" : "bg-gray-100 text-gray-700"}>
            {note.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <DollarSign className="w-3 h-3" /> Principal
            </span>
            <span className="font-semibold text-lg text-foreground">
              ${note.principal.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <Percent className="w-3 h-3" /> Rate
            </span>
            <span className="font-semibold text-lg text-primary">
              {note.rate}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <Calendar className="w-3 h-3" /> Term
            </span>
            <span className="font-medium">
              {note.term}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wide">
              Next Payment
            </span>
            <span className="font-medium">
              {format(new Date(note.nextPayment), "MMM d, yyyy")}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Payment Breakdown</p>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Principal</span>
                <span>${note.nextPaymentBreakdown.principal.toFixed(2)}</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-foreground/70" 
                  style={{ width: `${(note.nextPaymentBreakdown.principal / totalPayment) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Interest</span>
                <span>${note.nextPaymentBreakdown.interest.toFixed(2)}</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary" 
                  style={{ width: `${(note.nextPaymentBreakdown.interest / totalPayment) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 border-t border-border/50 bg-secondary/20">
        <Button variant="ghost" className="w-full justify-between hover:bg-transparent hover:text-primary p-0 h-auto font-medium text-sm group-hover:translate-x-1 transition-transform">
          View Details <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}
