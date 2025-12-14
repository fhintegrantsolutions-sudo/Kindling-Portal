import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Percent, ArrowUpRight, Clock } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface OpportunityProps {
  opportunity: {
    id: number;
    title: string;
    targetRaise: number;
    minInvestment: number;
    rate: string;
    term: string;
    description: string;
    closingDate: string;
  };
}

export function OpportunityCard({ opportunity }: OpportunityProps) {
  const { toast } = useToast();

  const handleRegister = () => {
    toast({
      title: "Registration Initiated",
      description: `You have requested to participate in ${opportunity.title}. A representative will contact you shortly.`,
    });
  };

  return (
    <Card className="flex flex-col h-full border-border/60 shadow-sm hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <Badge variant="secondary" className="font-medium bg-primary/10 text-primary hover:bg-primary/20">
            Open for Investment
          </Badge>
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> Closes {format(new Date(opportunity.closingDate), "MMM d")}
          </span>
        </div>
        <CardTitle className="font-serif text-2xl leading-tight mb-2">
          {opportunity.title}
        </CardTitle>
        <CardDescription className="line-clamp-2 text-sm leading-relaxed">
          {opportunity.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 space-y-6">
        <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-lg border border-secondary">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Annual Rate</p>
            <p className="text-2xl font-bold text-primary">{opportunity.rate}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Term</p>
            <p className="text-2xl font-bold text-foreground">{opportunity.term}</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary/70" /> Target Raise
            </span>
            <span className="font-medium">${(opportunity.targetRaise / 1000000).toFixed(1)}M</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-primary/70" /> Min. Investment
            </span>
            <span className="font-medium">${opportunity.minInvestment.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        <Button onClick={handleRegister} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-11 text-base shadow-md hover:shadow-lg transition-all">
          Register Interest
        </Button>
      </CardFooter>
    </Card>
  );
}
