import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, Link2, TrendingUp, CheckCircle, Clock, DollarSign, Copy, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  isActive: boolean;
  clickCount: number;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Referral {
  id: string;
  referrerId: string;
  referredUserId?: string;
  referredEmail?: string;
  referredName?: string;
  referralCode: string;
  status: "pending" | "signed_up" | "invested" | "qualified";
  signupDate?: string;
  firstInvestmentDate?: string;
  firstInvestmentAmount?: number;
  notes?: string;
  createdAt: string;
  referrer?: {
    id: string;
    name: string;
    email: string;
  };
  referred?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function AdminReferralsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch all referral codes
  const { data: referralCodes = [], isLoading: codesLoading } = useQuery<ReferralCode[]>({
    queryKey: ["admin", "referral-codes"],
    queryFn: async () => {
      const response = await fetch("/api/admin/referral-codes", {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch referral codes");
      return response.json();
    },
  });

  // Fetch all referrals
  const { data: referrals = [], isLoading: referralsLoading } = useQuery<Referral[]>({
    queryKey: ["admin", "referrals"],
    queryFn: async () => {
      const response = await fetch("/api/admin/referrals", {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch referrals");
      return response.json();
    },
  });

  // Update referral mutation
  const updateReferral = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Referral> }) => {
      const response = await fetch(`/api/admin/referrals/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-username": "admin",
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update referral");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "referrals"] });
      toast({
        title: "Referral Updated",
        description: "The referral has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedReferral(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update referral.",
        variant: "destructive",
      });
    },
  });

  // Filter referrals
  const filteredReferrals = referrals.filter((referral) => {
    const matchesSearch =
      !searchTerm ||
      referral.referrer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referrer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referredName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referredEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referralCode?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || referral.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Summary stats
  const totalReferrals = referrals.length;
  const pendingCount = referrals.filter(r => r.status === "pending").length;
  const signedUpCount = referrals.filter(r => r.status === "signed_up").length;
  const investedCount = referrals.filter(r => r.status === "invested").length;
  const qualifiedCount = referrals.filter(r => r.status === "qualified").length;
  const totalInvestmentVolume = referrals.reduce((sum, r) => sum + (r.firstInvestmentAmount || 0), 0);

  // Active codes count
  const activeCodesCount = referralCodes.filter(c => c.isActive).length;

  const handleEditReferral = (referral: Referral) => {
    setSelectedReferral(referral);
    setIsEditDialogOpen(true);
  };

  const handleSaveReferral = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedReferral) return;

    const formData = new FormData(e.currentTarget);
    const updates = {
      status: formData.get("status") as string,
      referredName: formData.get("referredName") as string,
      referredEmail: formData.get("referredEmail") as string,
      notes: formData.get("notes") as string,
    };

    updateReferral.mutate({ id: selectedReferral.id, updates });
  };

  const copyReferralLink = (code: string) => {
    const link = `${window.location.origin}/login?ref=${code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "Referral link copied to clipboard.",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive", label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      signed_up: { variant: "default", label: "Signed Up" },
      invested: { variant: "default", label: "Invested" },
      qualified: { variant: "default", label: "Qualified" },
    };

    const config = variants[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Referral Management</h1>
          <p className="text-muted-foreground">
            Track and manage user referrals and referral codes
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReferrals}</div>
              <p className="text-xs text-muted-foreground">
                All time referrals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting signup
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Converted</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{signedUpCount + investedCount + qualifiedCount}</div>
              <p className="text-xs text-muted-foreground">
                Signed up or invested
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Investment Volume</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalInvestmentVolume)}</div>
              <p className="text-xs text-muted-foreground">
                From referred users
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Codes Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Referral Codes</CardTitle>
                <CardDescription>
                  {activeCodesCount} active code{activeCodesCount !== 1 ? "s" : ""} • {referralCodes.length} total
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {codesLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading codes...</div>
            ) : referralCodes.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No referral codes found.
              </div>
            ) : (
              <div className="space-y-2">
                {referralCodes.slice(0, 5).map((code) => (
                  <div
                    key={code.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-mono font-semibold text-primary">{code.code}</p>
                        <p className="text-sm text-muted-foreground">{code.user?.name}</p>
                      </div>
                      <Badge variant={code.isActive ? "default" : "secondary"}>
                        {code.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{code.clickCount} clicks</p>
                        <p className="text-xs text-muted-foreground">
                          {referrals.filter(r => r.referralCode === code.code).length} referrals
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyReferralLink(code.code)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Link
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="signed_up">Signed Up</SelectItem>
                  <SelectItem value="invested">Invested</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Referrals Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Referrals</CardTitle>
            <CardDescription>
              {filteredReferrals.length} referral{filteredReferrals.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {referralsLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading referrals...</div>
            ) : filteredReferrals.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No referrals found matching your criteria.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referred Person</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Investment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{referral.referrer?.name || "-"}</p>
                          <p className="text-xs text-muted-foreground">{referral.referrer?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{referral.referredName || referral.referred?.name || "-"}</p>
                          <p className="text-xs text-muted-foreground">
                            {referral.referredEmail || referral.referred?.email || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{referral.referralCode}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(referral.status)}</TableCell>
                      <TableCell>
                        {referral.firstInvestmentAmount
                          ? formatCurrency(referral.firstInvestmentAmount)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {new Date(referral.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditReferral(referral)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Referral Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Referral</DialogTitle>
              <DialogDescription>
                Update referral information and status
              </DialogDescription>
            </DialogHeader>
            {selectedReferral && (
              <form onSubmit={handleSaveReferral} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={selectedReferral.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="signed_up">Signed Up</SelectItem>
                      <SelectItem value="invested">Invested</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referredName">Referred Person Name</Label>
                  <Input
                    id="referredName"
                    name="referredName"
                    defaultValue={selectedReferral.referredName || ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referredEmail">Referred Person Email</Label>
                  <Input
                    id="referredEmail"
                    name="referredEmail"
                    type="email"
                    defaultValue={selectedReferral.referredEmail || ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Admin Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    defaultValue={selectedReferral.notes || ""}
                    placeholder="Add any notes about this referral..."
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateReferral.isPending}>
                    {updateReferral.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
