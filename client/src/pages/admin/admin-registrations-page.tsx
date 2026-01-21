import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import AdminLayout from "@/components/admin-layout";

export default function AdminRegistrationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all registrations
  const { data: registrations = [], isLoading: loadingRegistrations } = useQuery({
    queryKey: ["admin", "registrations"],
    queryFn: async () => {
      const response = await fetch("/api/admin/registrations", {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch registrations");
      return response.json();
    },
  });

  // Approve registration mutation
  const approveRegistration = useMutation({
    mutationFn: async (registrationId: string) => {
      const response = await fetch(`/api/admin/registrations/${registrationId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-username": "admin",
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve registration");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "registrations"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "participations"] });
      toast({
        title: "Registration Approved",
        description: "User account created and welcome email sent.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pendingRegistrations = registrations.filter((r: any) => r.status === "Pending");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Registrations</h1>
          <p className="text-muted-foreground">Review and approve pending lender registrations</p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRegistrations.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        {/* Registrations List */}
        <div className="space-y-4">
          {loadingRegistrations ? (
            <Card>
              <CardContent className="p-6">Loading registrations...</CardContent>
            </Card>
          ) : registrations.length === 0 ? (
            <Card>
              <CardContent className="p-6">No registrations found.</CardContent>
            </Card>
          ) : (
            registrations.map((registration: any) => (
              <Card key={registration.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        {registration.firstName} {registration.lastName}
                      </CardTitle>
                      <CardDescription>
                        {registration.email} • {registration.phone}
                      </CardDescription>
                    </div>
                    <Badge variant={registration.status === "Pending" ? "secondary" : "default"}>
                      {registration.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-sm font-medium">Investment Amount</div>
                      <div className="text-2xl font-bold">
                        {formatCurrency(parseFloat(registration.investmentAmount))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Entity Type</div>
                      <div>{registration.entityType}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Name for Agreement</div>
                      <div>{registration.nameForAgreement}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Bank Details</div>
                      <div className="text-sm text-muted-foreground">
                        {registration.bankName} • {registration.bankAccountType}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Address</div>
                    <div className="text-sm text-muted-foreground">
                      {registration.mailingAddress}, {registration.city}, {registration.state}{" "}
                      {registration.zipCode}
                    </div>
                  </div>
                  {registration.status === "Pending" && (
                    <Button
                      onClick={() => approveRegistration.mutate(registration.id)}
                      disabled={approveRegistration.isPending}
                    >
                      {approveRegistration.isPending ? "Approving..." : "Approve & Create User"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
