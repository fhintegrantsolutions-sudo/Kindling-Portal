import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import AdminLayout from "@/components/admin-layout";

export default function AdminPaymentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all participations
  const { data: participations = [], isLoading: loadingParticipations } = useQuery({
    queryKey: ["admin", "participations"],
    queryFn: async () => {
      const response = await fetch("/api/admin/participations", {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch participations");
      return response.json();
    },
  });

  // Update funding status mutation
  const updateFundingStatus = useMutation({
    mutationFn: async ({
      participationId,
      received,
      deposited,
      cleared,
    }: {
      participationId: string;
      received?: boolean;
      deposited?: boolean;
      cleared?: boolean;
    }) => {
      const response = await fetch(`/api/admin/participations/${participationId}/funding-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-username": "admin",
        },
        body: JSON.stringify({ received, deposited, cleared }),
      });
      if (!response.ok) throw new Error("Failed to update funding status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "participations"] });
      toast({
        title: "Status Updated",
        description: "Funding status has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pendingPayments = participations.filter(
    (p: any) => !p.fundingStatus?.cleared
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Track and manage lender participation funding status</p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayments.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>

        {/* Payments List */}
        <div className="space-y-4">
          {loadingParticipations ? (
            <Card>
              <CardContent className="p-6">Loading payments...</CardContent>
            </Card>
          ) : participations.length === 0 ? (
            <Card>
              <CardContent className="p-6">No participations found.</CardContent>
            </Card>
          ) : (
            participations.map((participation: any) => {
              const fundingStatus = participation.fundingStatus || {
                received: false,
                deposited: false,
                cleared: false,
              };

              return (
                <Card key={participation.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{participation.note?.title}</CardTitle>
                        <CardDescription>
                          {participation.user?.name} • {participation.user?.email}
                        </CardDescription>
                      </div>
                      <Badge variant={fundingStatus.cleared ? "default" : "secondary"}>
                        {fundingStatus.cleared ? "Cleared" : "Processing"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-sm font-medium">Investment Amount</div>
                      <div className="text-2xl font-bold">
                        {formatCurrency(parseFloat(participation.investedAmount))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`received-${participation.id}`}
                          checked={fundingStatus.received}
                          onCheckedChange={(checked) =>
                            updateFundingStatus.mutate({
                              participationId: participation.id,
                              received: checked as boolean,
                              deposited: fundingStatus.deposited,
                              cleared: fundingStatus.cleared,
                            })
                          }
                        />
                        <label
                          htmlFor={`received-${participation.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Funds Received
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`deposited-${participation.id}`}
                          checked={fundingStatus.deposited}
                          onCheckedChange={(checked) =>
                            updateFundingStatus.mutate({
                              participationId: participation.id,
                              received: fundingStatus.received,
                              deposited: checked as boolean,
                              cleared: fundingStatus.cleared,
                            })
                          }
                        />
                        <label
                          htmlFor={`deposited-${participation.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Funds Deposited
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`cleared-${participation.id}`}
                          checked={fundingStatus.cleared}
                          onCheckedChange={(checked) =>
                            updateFundingStatus.mutate({
                              participationId: participation.id,
                              received: fundingStatus.received,
                              deposited: fundingStatus.deposited,
                              cleared: checked as boolean,
                            })
                          }
                        />
                        <label
                          htmlFor={`cleared-${participation.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Funds Cleared
                        </label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
