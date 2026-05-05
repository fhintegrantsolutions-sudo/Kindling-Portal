import Layout from "@/components/layout";
import { OpportunityCard } from "@/components/opportunity-card";
import { useOpportunities } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInDays } from "date-fns";

export default function OpportunitiesPage() {
  const { data: opportunities, isLoading } = useOpportunities();

  const activeOpportunities = opportunities?.filter((opp) => {
    const closingDate = opp.fundingEndDate;
    if (!closingDate) return true;
    const str = typeof closingDate === "string" ? closingDate : (closingDate as Date).toISOString();
    const [year, month, day] = str.split("T")[0].split("-").map(Number);
    const localClose = new Date(year, month - 1, day);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return differenceInDays(localClose, today) >= 0;
  });

  return (
    <Layout>
      <div className="space-y-8">
        <div className="max-w-3xl space-y-4">
          <h1 className="text-3xl font-serif font-bold text-foreground" data-testid="text-opportunities-title">Next Note Opportunity</h1>
          <p className="text-muted-foreground text-lg" data-testid="text-opportunities-description">
            Browse our curated selection of private note opportunities. Register your interest to lock in your participation for the next funding round.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {isLoading ? (
            <>
              <Skeleton className="h-96" />
              <Skeleton className="h-96" />
            </>
          ) : activeOpportunities && activeOpportunities.length > 0 ? (
            activeOpportunities.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground" data-testid="text-no-opportunities">
                No investment opportunities available at this time. Check back soon!
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
