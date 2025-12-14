import Layout from "@/components/layout";
import { OpportunityCard } from "@/components/opportunity-card";
import { MOCK_OPPORTUNITIES } from "@/lib/mock-data";

export default function OpportunitiesPage() {
  return (
    <Layout>
      <div className="space-y-8">
        <div className="max-w-3xl space-y-4">
          <h1 className="text-3xl font-serif font-bold text-foreground">Investment Opportunities</h1>
          <p className="text-muted-foreground text-lg">
            Browse our curated selection of private note opportunities. Register your interest to lock in your participation for the next funding round.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {MOCK_OPPORTUNITIES.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
