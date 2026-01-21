import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminLayout from "@/components/admin-layout";
import { UserCheck, DollarSign, Building2, Users } from "lucide-react";

export default function AdminOverviewPage() {
  // Fetch all registrations
  const { data: registrations = [] } = useQuery({
    queryKey: ["admin", "registrations"],
    queryFn: async () => {
      const response = await fetch("/api/admin/registrations", {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch registrations");
      return response.json();
    },
  });

  // Fetch all participations
  const { data: participations = [] } = useQuery({
    queryKey: ["admin", "participations"],
    queryFn: async () => {
      const response = await fetch("/api/admin/participations", {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch participations");
      return response.json();
    },
  });

  // Fetch borrowers
  const { data: borrowers = [] } = useQuery({
    queryKey: ["admin", "borrowers"],
    queryFn: async () => {
      const response = await fetch("/api/admin/borrowers", {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch borrowers");
      return response.json();
    },
  });

  const pendingRegistrations = registrations.filter((r: any) => r.status === "Pending");
  const pendingPayments = participations.filter(
    (p: any) => !p.fundingStatus?.cleared
  );

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Portal</h1>
          <p className="text-muted-foreground">Overview of registrations, payments, and borrowers</p>
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Registrations</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRegistrations.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingPayments.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting processing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Borrowers</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{borrowers.length}</div>
              <p className="text-xs text-muted-foreground">Active businesses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Participations</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{participations.length}</div>
              <p className="text-xs text-muted-foreground">All investments</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Registrations</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingRegistrations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending registrations</p>
              ) : (
                <div className="space-y-2">
                  {pendingRegistrations.slice(0, 5).map((reg: any) => (
                    <div key={reg.id} className="flex items-center justify-between text-sm">
                      <span>{reg.name}</span>
                      <span className="text-muted-foreground">{new Date(reg.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending payments</p>
              ) : (
                <div className="space-y-2">
                  {pendingPayments.slice(0, 5).map((payment: any) => (
                    <div key={payment.id} className="flex items-center justify-between text-sm">
                      <span>{payment.note?.title || "Unknown Note"}</span>
                      <span className="text-muted-foreground">{new Date(payment.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
