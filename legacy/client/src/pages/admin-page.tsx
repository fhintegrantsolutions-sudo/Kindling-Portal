import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Plus, Building2, Mail, Phone, MapPin, Edit, Trash2 } from "lucide-react";

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("registrations");

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

  // Fetch borrowers
  const { data: borrowers = [], isLoading: loadingBorrowers } = useQuery({
    queryKey: ["admin", "borrowers"],
    queryFn: async () => {
      const response = await fetch("/api/admin/borrowers", {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch borrowers");
      return response.json();
    },
  });

  // Borrower form state
  const [isBorrowerDialogOpen, setIsBorrowerDialogOpen] = useState(false);
  const [isEditBorrowerDialogOpen, setIsEditBorrowerDialogOpen] = useState(false);
  const [isDeleteBorrowerDialogOpen, setIsDeleteBorrowerDialogOpen] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState<any>(null);
  const [borrowerFormData, setBorrowerFormData] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    taxId: "",
    businessType: "",
    notes: "",
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

  // Create borrower mutation
  const createBorrower = useMutation({
    mutationFn: async (data: typeof borrowerFormData) => {
      const response = await fetch("/api/admin/borrowers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-username": "admin",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create borrower");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "borrowers"] });
      setIsBorrowerDialogOpen(false);
      setBorrowerFormData({
        businessName: "",
        contactName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        taxId: "",
        businessType: "",
        notes: "",
      });
      toast({
        title: "Borrower Created",
        description: "The borrower has been successfully added.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update borrower mutation
  const updateBorrower = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof borrowerFormData }) => {
      const response = await fetch(`/api/admin/borrowers/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-username": "admin",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update borrower");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "borrowers"] });
      setIsEditBorrowerDialogOpen(false);
      setSelectedBorrower(null);
      toast({
        title: "Borrower Updated",
        description: "The borrower has been successfully updated.",
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

  // Delete borrower mutation
  const deleteBorrower = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/borrowers/${id}`, {
        method: "DELETE",
        headers: {
          "x-username": "admin",
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete borrower");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "borrowers"] });
      setIsDeleteBorrowerDialogOpen(false);
      setSelectedBorrower(null);
      toast({
        title: "Borrower Deleted",
        description: "The borrower has been successfully removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBorrowerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBorrower.mutate(borrowerFormData);
  };

  const handleEditBorrower = (borrower: any) => {
    setSelectedBorrower(borrower);
    setBorrowerFormData({
      businessName: borrower.businessName,
      contactName: borrower.contactName,
      email: borrower.email,
      phone: borrower.phone,
      address: borrower.address || "",
      city: borrower.city || "",
      state: borrower.state || "",
      zipCode: borrower.zipCode || "",
      taxId: borrower.taxId || "",
      businessType: borrower.businessType || "",
      notes: borrower.notes || "",
    });
    setIsEditBorrowerDialogOpen(true);
  };

  const handleUpdateBorrower = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBorrower) {
      updateBorrower.mutate({ id: selectedBorrower.id, data: borrowerFormData });
    }
  };

  const handleDeleteBorrower = (borrower: any) => {
    setSelectedBorrower(borrower);
    setIsDeleteBorrowerDialogOpen(true);
  };

  const confirmDeleteBorrower = () => {
    if (selectedBorrower) {
      deleteBorrower.mutate(selectedBorrower.id);
    }
  };

  const pendingRegistrations = registrations.filter((r: any) => r.status === "Pending");
  const pendingPayments = participations.filter(
    (p: any) => !p.fundingStatus?.cleared
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Portal</h1>
        <p className="text-muted-foreground">Manage registrations, payments, and notes</p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRegistrations.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayments.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Borrowers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{borrowers.length}</div>
            <p className="text-xs text-muted-foreground">Active businesses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{participations.length}</div>
            <p className="text-xs text-muted-foreground">All investments</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="registrations">
            Registrations {pendingRegistrations.length > 0 && (
              <Badge className="ml-2" variant="destructive">
                {pendingRegistrations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments">
            Payments {pendingPayments.length > 0 && (
              <Badge className="ml-2" variant="destructive">
                {pendingPayments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="borrowers">
            Borrowers
          </TabsTrigger>
        </TabsList>

        {/* Registrations Tab */}
        <TabsContent value="registrations" className="space-y-4">
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
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
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
        </TabsContent>

        {/* Borrowers Tab */}
        <TabsContent value="borrowers" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Dialog open={isBorrowerDialogOpen} onOpenChange={setIsBorrowerDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Borrower
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Borrower</DialogTitle>
                  <DialogDescription>
                    Enter the borrower's business and contact information.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBorrowerSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name *</Label>
                      <Input
                        id="businessName"
                        required
                        value={borrowerFormData.businessName}
                        onChange={(e) => setBorrowerFormData({ ...borrowerFormData, businessName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactName">Contact Name *</Label>
                      <Input
                        id="contactName"
                        required
                        value={borrowerFormData.contactName}
                        onChange={(e) => setBorrowerFormData({ ...borrowerFormData, contactName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={borrowerFormData.email}
                        onChange={(e) => setBorrowerFormData({ ...borrowerFormData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        required
                        value={borrowerFormData.phone}
                        onChange={(e) => setBorrowerFormData({ ...borrowerFormData, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessType">Business Type</Label>
                      <Input
                        id="businessType"
                        value={borrowerFormData.businessType}
                        onChange={(e) => setBorrowerFormData({ ...borrowerFormData, businessType: e.target.value })}
                        placeholder="e.g., LLC, Corporation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxId">Tax ID</Label>
                      <Input
                        id="taxId"
                        value={borrowerFormData.taxId}
                        onChange={(e) => setBorrowerFormData({ ...borrowerFormData, taxId: e.target.value })}
                        placeholder="EIN or SSN"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={borrowerFormData.address}
                      onChange={(e) => setBorrowerFormData({ ...borrowerFormData, address: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={borrowerFormData.city}
                        onChange={(e) => setBorrowerFormData({ ...borrowerFormData, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={borrowerFormData.state}
                        onChange={(e) => setBorrowerFormData({ ...borrowerFormData, state: e.target.value })}
                        maxLength={2}
                        placeholder="CA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">Zip Code</Label>
                      <Input
                        id="zipCode"
                        value={borrowerFormData.zipCode}
                        onChange={(e) => setBorrowerFormData({ ...borrowerFormData, zipCode: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={borrowerFormData.notes}
                      onChange={(e) => setBorrowerFormData({ ...borrowerFormData, notes: e.target.value })}
                      placeholder="Additional information"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsBorrowerDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createBorrower.isPending}>
                      {createBorrower.isPending ? "Creating..." : "Create Borrower"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Edit Borrower Dialog */}
            <Dialog open={isEditBorrowerDialogOpen} onOpenChange={setIsEditBorrowerDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Borrower</DialogTitle>
                  <DialogDescription>
                    Update the borrower's business and contact information.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdateBorrower} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-businessName">Business Name *</Label>
                      <Input
                        id="edit-businessName"
                        required
                        value={borrowerFormData.businessName}
                        onChange={(e) => setBorrowerFormData({ ...borrowerFormData, businessName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-contactName">Contact Name *</Label>
                      <Input
                        id="edit-contactName"
                        required
                        value={borrowerFormData.contactName}
                        onChange={(e) => setBorrowerFormData({ ...borrowerFormData, contactName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email *</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        required
                        value={borrowerFormData.email}
                        onChange={(e) => setBorrowerFormData({ ...borrowerFormData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">Phone *</Label>
                      <Input
                        id="edit-phone"
                        type="tel"
                        required
                        value={borrowerFormData.phone}
                        onChange={(e) => setBorrowerFormData({ ...borrowerFormData, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-businessType">Business Type</Label>
                      <Input
                        id="edit-businessType"
                        value={borrowerFormData.businessType}
                        onChange={(e) => setBorrowerFormData({ ...borrowerFormData, businessType: e.target.value })}
                        placeholder="e.g., LLC, Corporation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-taxId">Tax ID</Label>
                      <Input
                        id="edit-taxId"
                        value={borrowerFormData.taxId}
                        onChange={(e) => setBorrowerFormData({ ...borrowerFormData, taxId: e.target.value })}
                        placeholder="EIN or SSN"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-address">Address</Label>
                    <Input
                      id="edit-address"
                      value={borrowerFormData.address}
                      onChange={(e) => setBorrowerFormData({ ...borrowerFormData, address: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit-city">City</Label>
                      <Input
                        id="edit-city"
                        value={borrowerFormData.city}
                        onChange={(e) => setBorrowerFormData({ ...borrowerFormData, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-state">State</Label>
                      <Input
                        id="edit-state"
                        value={borrowerFormData.state}
                        onChange={(e) => setBorrowerFormData({ ...borrowerFormData, state: e.target.value })}
                        maxLength={2}
                        placeholder="CA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-zipCode">Zip Code</Label>
                      <Input
                        id="edit-zipCode"
                        value={borrowerFormData.zipCode}
                        onChange={(e) => setBorrowerFormData({ ...borrowerFormData, zipCode: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-notes">Notes</Label>
                    <Textarea
                      id="edit-notes"
                      value={borrowerFormData.notes}
                      onChange={(e) => setBorrowerFormData({ ...borrowerFormData, notes: e.target.value })}
                      placeholder="Additional information about the borrower"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditBorrowerDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateBorrower.isPending}>
                      {updateBorrower.isPending ? "Updating..." : "Update Borrower"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteBorrowerDialogOpen} onOpenChange={setIsDeleteBorrowerDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete <strong>{selectedBorrower?.businessName}</strong>.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmDeleteBorrower}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {deleteBorrower.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {loadingBorrowers ? (
            <Card>
              <CardContent className="p-6">Loading borrowers...</CardContent>
            </Card>
          ) : borrowers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No borrowers yet. Click "Add Borrower" to get started.</p>
              </CardContent>
            </Card>
          ) : (
            borrowers.map((borrower: any) => (
              <Card key={borrower.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {borrower.businessName}
                      </CardTitle>
                      <CardDescription>
                        Contact: {borrower.contactName}
                        {borrower.businessType && ` • ${borrower.businessType}`}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditBorrower(borrower)}
                        title="Edit borrower"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteBorrower(borrower)}
                        title="Delete borrower"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${borrower.email}`} className="hover:underline">
                        {borrower.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${borrower.phone}`} className="hover:underline">
                        {borrower.phone}
                      </a>
                    </div>
                  </div>
                  
                  {(borrower.address || borrower.city) && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        {borrower.address && <div>{borrower.address}</div>}
                        {borrower.city && (
                          <div>
                            {borrower.city}
                            {borrower.state && `, ${borrower.state}`}
                            {borrower.zipCode && ` ${borrower.zipCode}`}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {borrower.taxId && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Tax ID:</strong> {borrower.taxId}
                    </div>
                  )}
                  
                  {borrower.notes && (
                    <div className="text-sm">
                      <strong>Notes:</strong> {borrower.notes}
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Added {new Date(borrower.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
