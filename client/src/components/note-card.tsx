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
  };
}

export function NoteCard({ note }: NoteProps) {
  return (
    <Card className="group hover:border-primary/50 transition-all duration-300 hover:shadow-md border-border/60">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <Badge variant="outline" className="mb-2 bg-secondary text-secondary-foreground border-none font-medium text-xs">
              {note.type}
            </Badge>
            <CardTitle className="font-serif text-xl group-hover:text-primary transition-colors">
              {note.title}
            </CardTitle>
          </div>
          <Badge className={note.status === "Active" ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25" : "bg-gray-100 text-gray-700"}>
            {note.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 text-sm">
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
      </CardContent>
      <CardFooter className="pt-2 border-t border-border/50 bg-secondary/20">
        <Button variant="ghost" className="w-full justify-between hover:bg-transparent hover:text-primary p-0 h-auto font-medium text-sm group-hover:translate-x-1 transition-transform">
          View Details <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}
