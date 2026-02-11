import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import AdminLayout from "@/components/admin-layout";
import { 
  CheckCircle2, 
  Circle, 
  UserPlus, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  ArrowRight,
  FileCheck,
  Edit,
  Upload
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WorkflowItem {
  id: string;
  stage: "registration" | "participation" | "funded";
  registration?: any;
  user?: any;
  participation?: any;
  note?: any;
}

export default function AdminInvestorWorkflowPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<WorkflowItem | null>(null);
  const [isCreateParticipationOpen, setIsCreateParticipationOpen] = useState(false);
  const [isFundingDialogOpen, setIsFundingDialogOpen] = useState(false);
  const [fundingDetails, setFundingDetails] = useState({
    received: false,
    deposited: false,
    cleared: false,
    fundingType: "",
    investmentAmount: "",
    checkNumber: "",
    wireReferenceNumber: "",
    checkImageUrl: "",
    receivedDate: "",
    depositedDate: "",
    clearedDate: "",
    notes: "",
  });

  // Fetch all data
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

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users", {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

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

  const { data: notes = [] } = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const response = await fetch("/api/notes");
      if (!response.ok) throw new Error("Failed to fetch notes");
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
      if (!response.ok) throw new Error("Failed to approve registration");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "registrations"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({
        title: "Registration Approved",
        description: "User account created and welcome email sent.",
      });
      setSelectedItem(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create participation mutation
  const createParticipation = useMutation({
    mutationFn: async (data: { userId: string; noteId: string; investedAmount: string }) => {
      const response = await fetch("/api/participations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-username": "admin",
        },
        body: JSON.stringify({
          ...data,
          status: "Active",
        }),
      });
      if (!response.ok) throw new Error("Failed to create participation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "participations"] });
      toast({
        title: "Participation Created",
        description: "Investment participation has been created.",
      });
      setIsCreateParticipationOpen(false);
      setSelectedItem(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
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
      fundingType,
      investmentAmount,
      checkNumber,
      wireReferenceNumber,
      checkImageUrl,
      receivedDate,
      depositedDate,
      clearedDate,
      notes,
    }: {
      participationId: string;
      received?: boolean;
      deposited?: boolean;
      cleared?: boolean;
      fundingType?: string;
      investmentAmount?: string;
      checkNumber?: string;
      wireReferenceNumber?: string;
      checkImageUrl?: string;
      receivedDate?: string;
      depositedDate?: string;
      clearedDate?: string;
      notes?: string;
    }) => {
      const response = await fetch(`/api/admin/participations/${participationId}/funding-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-username": "admin",
        },
        body: JSON.stringify({ 
          received, 
          deposited, 
          cleared,
          fundingType,
          investmentAmount,
          checkNumber,
          wireReferenceNumber,
          checkImageUrl,
          receivedDate,
          depositedDate,
          clearedDate,
          notes,
        }),
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
  });

  // Build workflow items
  const buildWorkflowItems = (): WorkflowItem[] => {
    const items: WorkflowItem[] = [];

    // Stage 1: Pending registrations (no participation yet)
    registrations
      .filter((r: any) => r.status === "Pending")
      .forEach((reg: any) => {
        const note = notes.find((n: any) => n.id === reg.noteId);
        const participation = participations.find(
          (p: any) => p.noteId === reg.noteId && 
          (p.userId === reg.userId || !p.userId)
        );
        
        if (!participation) {
          items.push({
            id: `reg-${reg.id}`,
            stage: "registration",
            registration: reg,
            note,
          });
        }
      });

    // Stage 2: Participations created (not yet fully funded)
    participations
      .filter((p: any) => !p.fundingStatus?.cleared)
      .forEach((part: any) => {
        const user = users.find((u: any) => u.id === part.userId);
        const note = notes.find((n: any) => n.id === part.noteId);
        const registration = registrations.find(
          (r: any) => r.noteId === part.noteId && 
          (r.userId === part.userId || !r.userId)
        );
        
        items.push({
          id: `part-${part.id}`,
          stage: "participation",
          participation: part,
          user,
          note,
          registration,
        });
      });

    // Stage 3: Fully funded lenders
    participations
      .filter((p: any) => p.fundingStatus?.cleared)
      .forEach((part: any) => {
        const user = users.find((u: any) => u.id === part.userId);
        const note = notes.find((n: any) => n.id === part.noteId);
        
        items.push({
          id: `funded-${part.id}`,
          stage: "funded",
          participation: part,
          user,
          note,
        });
      });

    return items;
  };

  const workflowItems = buildWorkflowItems();
  const stageItems = {
    registration: workflowItems.filter((i) => i.stage === "registration"),
    participation: workflowItems.filter((i) => i.stage === "participation"),
    funded: workflowItems.filter((i) => i.stage === "funded"),
  };

  const isLoading = loadingRegistrations || loadingUsers || loadingParticipations;

  const getStageIcon = (stage: string, isActive: boolean) => {
    const iconClass = isActive ? "text-primary" : "text-muted-foreground";
    switch (stage) {
      case "registration":
        return <FileCheck className={`h-5 w-5 ${iconClass}`} />;
      case "participation":
        return <DollarSign className={`h-5 w-5 ${iconClass}`} />;
      case "funded":
        return <TrendingUp className={`h-5 w-5 ${iconClass}`} />;
      default:
        return <Circle className={`h-5 w-5 ${iconClass}`} />;
    }
  };

  const getStageBadgeVariant = (stage: string) => {
    switch (stage) {
      case "registration":
        return "secondary";
      case "participation":
        return "outline";
      case "funded":
        return "default";
      default:
        return "secondary";
    }
  };

  const renderWorkflowCard = (item: WorkflowItem) => {
    const userName = item.user
      ? item.user.name
      : item.registration
      ? `${item.registration.firstName} ${item.registration.lastName}`
      : "Unknown";
    
    const noteTitle = item.note?.title || "Unknown Note";
    // Always use actual investment amount if provided in funding status, otherwise use registered amount
    const amount = item.participation?.fundingStatus?.investmentAmount
      ? item.participation.fundingStatus.investmentAmount
      : item.participation?.investedAmount || item.registration?.investmentAmount || "0";

    return (
      <Card key={item.id} className="cursor-pointer hover:border-primary transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{userName}</CardTitle>
              <CardDescription>{noteTitle}</CardDescription>
            </div>
            <Badge variant={getStageBadgeVariant(item.stage)}>
              {item.stage === "registration" && "Pending Registration"}
              {item.stage === "participation" && "Awaiting Funds"}
              {item.stage === "funded" && "Fully Funded"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-2xl font-bold">{formatCurrency(parseFloat(amount))}</div>
            <div className="text-sm text-muted-foreground">Investment Amount</div>
          </div>

          {/* Stage-specific info */}
          {item.stage === "registration" && (
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Email:</span> {item.registration.email}
              </div>
              <Button
                onClick={() => {
                  setSelectedItem(item);
                  setIsCreateParticipationOpen(true);
                }}
                className="w-full"
              >
                Create Participation
              </Button>
            </div>
          )}

          {item.stage === "participation" && item.participation && (
            <div className="space-y-3">
              <div className="space-y-2">
                {item.participation.fundingStatus?.fundingType && (
                  <div className="text-sm">
                    <Badge variant="outline" className="capitalize">
                      {item.participation.fundingStatus.fundingType}
                    </Badge>
                    {item.participation.fundingStatus.checkNumber && (
                      <span className="ml-2 text-muted-foreground">
                        Check #{item.participation.fundingStatus.checkNumber}
                      </span>
                    )}
                    {item.participation.fundingStatus.wireReferenceNumber && (
                      <span className="ml-2 text-muted-foreground">
                        Wire: {item.participation.fundingStatus.wireReferenceNumber}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {item.participation.fundingStatus?.received && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  {item.participation.fundingStatus?.deposited && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  {item.participation.fundingStatus?.cleared && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {item.participation.fundingStatus?.cleared
                      ? "Fully Funded"
                      : item.participation.fundingStatus?.deposited
                      ? "Deposited"
                      : item.participation.fundingStatus?.received
                      ? "Received"
                      : "Pending"}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setSelectedItem(item);
                  setFundingDetails({
                    received: item.participation.fundingStatus?.received || false,
                    deposited: item.participation.fundingStatus?.deposited || false,
                    cleared: item.participation.fundingStatus?.cleared || false,
                    fundingType: item.participation.fundingStatus?.fundingType || "",
                    investmentAmount: item.participation.fundingStatus?.investmentAmount || "",
                    checkNumber: item.participation.fundingStatus?.checkNumber || "",
                    wireReferenceNumber: item.participation.fundingStatus?.wireReferenceNumber || "",
                    checkImageUrl: item.participation.fundingStatus?.checkImageUrl || "",
                    receivedDate: item.participation.fundingStatus?.receivedDate || "",
                    depositedDate: item.participation.fundingStatus?.depositedDate || "",
                    clearedDate: item.participation.fundingStatus?.clearedDate || "",
                    notes: item.participation.fundingStatus?.notes || "",
                  });
                  setIsFundingDialogOpen(true);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Manage Funding
              </Button>
            </div>
          )}

          {item.stage === "funded" && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Active Lender</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Investor Workflow</h1>
          <p className="text-muted-foreground">
            Track investors from registration through to fully funded lender status
          </p>
        </div>

        {/* Pipeline Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {getStageIcon("registration", true)}
                <CardTitle className="text-sm font-medium">Pending Registrations</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stageItems.registration.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting participation setup</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {getStageIcon("participation", true)}
                <CardTitle className="text-sm font-medium">Awaiting Funds</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stageItems.participation.length}</div>
              <p className="text-xs text-muted-foreground">Pending payment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {getStageIcon("funded", true)}
                <CardTitle className="text-sm font-medium">Active Lenders</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stageItems.funded.length}</div>
              <p className="text-xs text-muted-foreground">Fully funded</p>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Stages */}
        <Tabs defaultValue="registration" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="registration">
              Registrations ({stageItems.registration.length})
            </TabsTrigger>
            <TabsTrigger value="participation">
              Funding ({stageItems.participation.length})
            </TabsTrigger>
            <TabsTrigger value="funded">
              Active ({stageItems.funded.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registration" className="space-y-4 mt-4">
            {isLoading ? (
              <Card>
                <CardContent className="p-6">Loading...</CardContent>
              </Card>
            ) : stageItems.registration.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No pending registrations
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stageItems.registration.map(renderWorkflowCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="participation" className="space-y-4 mt-4">
            {isLoading ? (
              <Card>
                <CardContent className="p-6">Loading...</CardContent>
              </Card>
            ) : stageItems.participation.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No participations awaiting funding
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stageItems.participation.map(renderWorkflowCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="funded" className="space-y-4 mt-4">
            {isLoading ? (
              <Card>
                <CardContent className="p-6">Loading...</CardContent>
              </Card>
            ) : stageItems.funded.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No fully funded lenders yet
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stageItems.funded.map(renderWorkflowCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Participation Dialog */}
        <Dialog open={isCreateParticipationOpen} onOpenChange={setIsCreateParticipationOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Participation</DialogTitle>
              <DialogDescription>
                Create an investment participation for this registration. User account will be created when funds are cleared.
              </DialogDescription>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <div className="text-sm">
                    <span className="font-medium">Investor:</span>{" "}
                    {selectedItem.registration?.firstName} {selectedItem.registration?.lastName}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Email:</span>{" "}
                    {selectedItem.registration?.email}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Note:</span>{" "}
                    {selectedItem.note?.title || "Unknown"}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Amount:</span>{" "}
                    {formatCurrency(parseFloat(selectedItem.registration?.investmentAmount || "0"))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateParticipationOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedItem?.registration) {
                    createParticipation.mutate({
                      userId: selectedItem.registration.userId || selectedItem.registration.id,
                      noteId: selectedItem.registration.noteId,
                      investedAmount: selectedItem.registration.investmentAmount,
                    });
                  }
                }}
                disabled={createParticipation.isPending}
              >
                {createParticipation.isPending ? "Creating..." : "Create Participation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Funding Details Dialog */}
        <Dialog open={isFundingDialogOpen} onOpenChange={setIsFundingDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Funding Details</DialogTitle>
              <DialogDescription>
                Track payment type, status, and reference numbers for this investment
              </DialogDescription>
            </DialogHeader>
            {selectedItem?.participation && (
              <div className="space-y-6">
                {/* Investor Info */}
                <div className="grid gap-2 p-4 bg-muted rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium">Investor:</span>{" "}
                    {selectedItem.user?.name || selectedItem.registration?.firstName + " " + selectedItem.registration?.lastName || "Unknown"}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Amount:</span>{" "}
                    {formatCurrency(parseFloat(selectedItem.participation.investedAmount || "0"))}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Note:</span>{" "}
                    {selectedItem.note?.title || "Unknown"}
                  </div>
                </div>

                {/* Investment Amount */}
                <div className="space-y-2">
                  <Label htmlFor="investmentAmount">Actual Investment Amount *</Label>
                  <Input
                    id="investmentAmount"
                    type="number"
                    step="0.01"
                    value={fundingDetails.investmentAmount}
                    onChange={(e) =>
                      setFundingDetails({ ...fundingDetails, investmentAmount: e.target.value })
                    }
                    placeholder="Enter actual amount received"
                  />
                  <p className="text-xs text-muted-foreground">
                    Registered amount: {formatCurrency(parseFloat(selectedItem.participation.investedAmount || "0"))}
                  </p>
                </div>

                {/* Funding Type */}
                <div className="space-y-2">
                  <Label htmlFor="fundingType">Funding Type *</Label>
                  <Select
                    value={fundingDetails.fundingType}
                    onValueChange={(value) =>
                      setFundingDetails({ ...fundingDetails, fundingType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select funding type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wire">Wire Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="ach">ACH</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Conditional Fields Based on Type */}
                {fundingDetails.fundingType === "check" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="checkNumber">Check Number</Label>
                      <Input
                        id="checkNumber"
                        value={fundingDetails.checkNumber}
                        onChange={(e) =>
                          setFundingDetails({ ...fundingDetails, checkNumber: e.target.value })
                        }
                        placeholder="Enter check number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkImageUrl">Check Image URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="checkImageUrl"
                          value={fundingDetails.checkImageUrl}
                          onChange={(e) =>
                            setFundingDetails({ ...fundingDetails, checkImageUrl: e.target.value })
                          }
                          placeholder="Upload or paste image URL"
                        />
                        <Button variant="outline" size="icon">
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Upload check image to document storage and paste URL here
                      </p>
                    </div>
                  </div>
                )}

                {fundingDetails.fundingType === "wire" && (
                  <div className="space-y-2">
                    <Label htmlFor="wireReferenceNumber">Wire Reference Number</Label>
                    <Input
                      id="wireReferenceNumber"
                      value={fundingDetails.wireReferenceNumber}
                      onChange={(e) =>
                        setFundingDetails({ ...fundingDetails, wireReferenceNumber: e.target.value })
                      }
                      placeholder="Enter wire reference number"
                    />
                  </div>
                )}

                {/* Status Checkboxes */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">Funding Status</div>
                    <Badge 
                      variant={
                        fundingDetails.cleared && fundingDetails.clearedDate
                          ? "default" 
                          : fundingDetails.deposited && fundingDetails.depositedDate
                          ? "secondary" 
                          : fundingDetails.received && fundingDetails.receivedDate
                          ? "outline" 
                          : "destructive"
                      }
                    >
                      {fundingDetails.cleared && fundingDetails.clearedDate
                        ? "Funds Cleared" 
                        : fundingDetails.deposited && fundingDetails.depositedDate
                        ? "Funds Deposited" 
                        : fundingDetails.received && fundingDetails.receivedDate
                        ? "Funds Received" 
                        : "Awaiting Funds"}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="received"
                        checked={fundingDetails.received}
                        onCheckedChange={(checked) =>
                          setFundingDetails({ ...fundingDetails, received: checked as boolean })
                        }
                        disabled={!fundingDetails.receivedDate}
                      />
                      <div className="grid gap-1.5 flex-1">
                        <label
                          htmlFor="received"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Funds Received
                        </label>
                        <Input
                          type="date"
                          value={fundingDetails.receivedDate}
                          onChange={(e) =>
                            setFundingDetails({ ...fundingDetails, receivedDate: e.target.value })
                          }
                          placeholder="Date received"
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="deposited"
                        checked={fundingDetails.deposited}
                        onCheckedChange={(checked) =>
                          setFundingDetails({ ...fundingDetails, deposited: checked as boolean })
                        }
                        disabled={!fundingDetails.received || !fundingDetails.depositedDate}
                      />
                      <div className="grid gap-1.5 flex-1">
                        <label
                          htmlFor="deposited"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Deposited to Account
                        </label>
                        <Input
                          type="date"
                          value={fundingDetails.depositedDate}
                          onChange={(e) =>
                            setFundingDetails({ ...fundingDetails, depositedDate: e.target.value })
                          }
                          placeholder="Date deposited"
                          className="text-xs"
                          disabled={!fundingDetails.received}
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="cleared"
                        checked={fundingDetails.cleared}
                        onCheckedChange={(checked) =>
                          setFundingDetails({ ...fundingDetails, cleared: checked as boolean })
                        }
                        disabled={!fundingDetails.deposited || !fundingDetails.clearedDate}
                      />
                      <div className="grid gap-1.5 flex-1">
                        <label
                          htmlFor="cleared"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Cleared & Finalized
                        </label>
                        <Input
                          type="date"
                          value={fundingDetails.clearedDate}
                          onChange={(e) =>
                            setFundingDetails({ ...fundingDetails, clearedDate: e.target.value })
                          }
                          placeholder="Date cleared"
                          className="text-xs"
                          disabled={!fundingDetails.deposited}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={fundingDetails.notes}
                    onChange={(e) =>
                      setFundingDetails({ ...fundingDetails, notes: e.target.value })
                    }
                    placeholder="Add any additional notes about this funding..."
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFundingDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedItem?.participation) {
                    updateFundingStatus.mutate({
                      participationId: selectedItem.participation.id,
                      ...fundingDetails,
                    });
                    setIsFundingDialogOpen(false);
                  }
                }}
                disabled={updateFundingStatus.isPending}
              >
                {updateFundingStatus.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
