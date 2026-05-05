import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Link2 } from "lucide-react";

interface AccessRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isTccMember?: boolean;
  message?: string;
  referralCode?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function AdminAccessRequestsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery<AccessRequest[]>({
    queryKey: ["admin", "access-requests"],
    queryFn: async () => {
      const response = await fetch("/api/admin/access-requests", {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch access requests");
      return response.json();
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/admin/access-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-username": "admin" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: (_data, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "access-requests"] });
      toast({
        title: status === "approved" ? "Request Approved" : "Request Rejected",
        description: status === "approved"
          ? "You can now create an account for this person in User Management."
          : "The request has been marked as rejected.",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update request.", variant: "destructive" });
    },
  });

  const pending = requests.filter(r => r.status === "pending");
  const reviewed = requests.filter(r => r.status !== "pending");

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <UserPlus className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-serif font-bold">Access Requests</h1>
            <p className="text-sm text-muted-foreground">
              Prospective lenders who have submitted a request to join the network.
            </p>
          </div>
          {pending.length > 0 && (
            <Badge className="ml-2 bg-primary text-primary-foreground">{pending.length} pending</Badge>
          )}
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                Pending Review
                {pending.length > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0">{pending.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="reviewed">
                Reviewed
                {reviewed.length > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground">({reviewed.length})</span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              {pending.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No pending requests.
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardDescription>These requests need your action before you create their accounts.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>TCC Member</TableHead>
                          <TableHead>Referred By</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pending.map((req) => (
                          <TableRow key={req.id}>
                            <TableCell className="font-medium">{req.firstName} {req.lastName}</TableCell>
                            <TableCell>{req.email}</TableCell>
                            <TableCell>{req.phone}</TableCell>
                            <TableCell>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${req.isTccMember ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>
                                {req.isTccMember ? "Yes" : "No"}
                              </span>
                            </TableCell>
                            <TableCell>
                              {req.referralCode ? (
                                <div className="flex items-center gap-1 text-primary">
                                  <Link2 className="h-3 w-3" />
                                  <span className="text-xs font-mono">{req.referralCode}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              <span className="text-sm text-muted-foreground truncate block">
                                {req.message || "—"}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {new Date(req.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => updateStatus.mutate({ id: req.id, status: "approved" })}
                                  disabled={updateStatus.isPending}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateStatus.mutate({ id: req.id, status: "rejected" })}
                                  disabled={updateStatus.isPending}
                                >
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="reviewed" className="mt-4">
              {reviewed.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No reviewed requests yet.
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>TCC Member</TableHead>
                          <TableHead>Referred By</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reviewed.map((req) => (
                          <TableRow key={req.id}>
                            <TableCell className="font-medium">{req.firstName} {req.lastName}</TableCell>
                            <TableCell>{req.email}</TableCell>
                            <TableCell>{req.phone}</TableCell>
                            <TableCell>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${req.isTccMember ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>
                                {req.isTccMember ? "Yes" : "No"}
                              </span>
                            </TableCell>
                            <TableCell>
                              {req.referralCode ? (
                                <div className="flex items-center gap-1 text-primary">
                                  <Link2 className="h-3 w-3" />
                                  <span className="text-xs font-mono">{req.referralCode}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${STATUS_COLORS[req.status]}`}>
                                {req.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {new Date(req.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}
