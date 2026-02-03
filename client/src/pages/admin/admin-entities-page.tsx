import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Building2, 
  User, 
  Search, 
  FileCheck, 
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  UserPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Entity = {
  id: string;
  type: 'individual' | 'llc' | 'corporation' | 'trust' | 'partnership';
  legalName: string;
  taxId?: string;
  kycStatus: 'pending' | 'in_review' | 'approved' | 'rejected';
  accreditationStatus?: 'not_accredited' | 'self_certified' | 'verified' | 'expired';
  createdAt: any;
  updatedAt: any;
  rejectionReason?: string;
};

type EntityUser = {
  id: string;
  entityId: string;
  userId: string;
  role: 'owner' | 'authorized_signer' | 'trustee' | 'beneficial_owner';
  ownershipPercentage?: number;
  effectiveDate?: any;
  userName?: string;
};

type Document = {
  id: string;
  entityId: string;
  type: string;
  fileName: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  rejectionReason?: string;
};

const KYC_STATUS_CONFIG = {
  pending: { label: "Pending", icon: Clock, color: "bg-gray-500" },
  in_review: { label: "In Review", icon: AlertCircle, color: "bg-blue-500" },
  approved: { label: "Approved", icon: CheckCircle, color: "bg-green-500" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-red-500" },
};

export default function AdminEntitiesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [kycStatusFilter, setKycStatusFilter] = useState<string>("all");

  // Fetch entities
  const { data: entities = [], isLoading } = useQuery({
    queryKey: ["admin", "entities"],
    queryFn: async () => {
      const response = await fetch("/api/admin/entities", {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch entities");
      return response.json();
    },
  });

  // Fetch entity users
  const { data: entityUsers = [] } = useQuery<EntityUser[]>({
    queryKey: ["admin", "entity-users", selectedEntity?.id],
    queryFn: async () => {
      if (!selectedEntity) return [];
      const response = await fetch(`/api/admin/entities/${selectedEntity.id}/users`, {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch entity users");
      return response.json();
    },
    enabled: !!selectedEntity,
  });

  // Fetch entity documents
  const { data: entityDocuments = [] } = useQuery<Document[]>({
    queryKey: ["admin", "entity-documents", selectedEntity?.id],
    queryFn: async () => {
      if (!selectedEntity) return [];
      const response = await fetch(`/api/admin/entities/${selectedEntity.id}/documents`, {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch entity documents");
      return response.json();
    },
    enabled: !!selectedEntity,
  });

  // Update KYC status mutation
  const updateKycMutation = useMutation({
    mutationFn: async ({ 
      entityId, 
      status, 
      rejectionReason 
    }: { 
      entityId: string; 
      status: string; 
      rejectionReason?: string;
    }) => {
      const response = await fetch(`/api/admin/entities/${entityId}/kyc-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-username": "admin",
        },
        body: JSON.stringify({ status, rejectionReason }),
      });
      if (!response.ok) throw new Error("Failed to update KYC status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "entities"] });
      toast({
        title: "KYC Status Updated",
        description: "Entity KYC status has been updated successfully.",
      });
      setSelectedEntity(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update KYC status.",
        variant: "destructive",
      });
    },
  });

  // Approve document mutation
  const approveDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/admin/documents/${documentId}/approve`, {
        method: "POST",
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to approve document");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "entity-documents"] });
      toast({
        title: "Document Approved",
        description: "Document has been approved successfully.",
      });
    },
  });

  // Reject document mutation
  const rejectDocumentMutation = useMutation({
    mutationFn: async ({ documentId, reason }: { documentId: string; reason: string }) => {
      const response = await fetch(`/api/admin/documents/${documentId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-username": "admin",
        },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error("Failed to reject document");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "entity-documents"] });
      toast({
        title: "Document Rejected",
        description: "Document has been rejected.",
      });
    },
  });

  // Filter entities
  const filteredEntities = entities.filter((entity: Entity) => {
    const matchesSearch = 
      entity.legalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.taxId?.includes(searchQuery);
    const matchesStatus = kycStatusFilter === "all" || entity.kycStatus === kycStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Count by status
  const statusCounts = {
    pending: entities.filter((e: Entity) => e.kycStatus === "pending").length,
    in_review: entities.filter((e: Entity) => e.kycStatus === "in_review").length,
    approved: entities.filter((e: Entity) => e.kycStatus === "approved").length,
    rejected: entities.filter((e: Entity) => e.kycStatus === "rejected").length,
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Entity & KYC Management</h1>
          <p className="text-muted-foreground">
            Manage entities, review KYC documentation, and approve accreditations
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {Object.entries(statusCounts).map(([status, count]) => {
            const config = KYC_STATUS_CONFIG[status as keyof typeof KYC_STATUS_CONFIG];
            const Icon = config.icon;
            return (
              <Card key={status} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setKycStatusFilter(status)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                  <p className="text-xs text-muted-foreground">Entities</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search and Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Entities</CardTitle>
            <CardDescription>Search and filter entities by KYC status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or tax ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={kycStatusFilter} onValueChange={setKycStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Entities Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Legal Name</TableHead>
                    <TableHead>Tax ID</TableHead>
                    <TableHead>KYC Status</TableHead>
                    <TableHead>Accreditation</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading entities...
                      </TableCell>
                    </TableRow>
                  ) : filteredEntities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No entities found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntities.map((entity: Entity) => {
                      const kycConfig = KYC_STATUS_CONFIG[entity.kycStatus];
                      const Icon = entity.type === 'individual' ? User : Building2;
                      return (
                        <TableRow key={entity.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="capitalize">{entity.type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{entity.legalName}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {entity.taxId || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={kycConfig.color + " text-white"}>
                              {kycConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {entity.accreditationStatus ? (
                              <Badge variant="outline" className="capitalize">
                                {entity.accreditationStatus.replace('_', ' ')}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(entity.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedEntity(entity)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Entity Detail Dialog */}
        <Dialog open={!!selectedEntity} onOpenChange={() => setSelectedEntity(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedEntity?.type === 'individual' ? (
                  <User className="h-5 w-5" />
                ) : (
                  <Building2 className="h-5 w-5" />
                )}
                {selectedEntity?.legalName}
              </DialogTitle>
              <DialogDescription>
                Review entity details, documents, and update KYC status
              </DialogDescription>
            </DialogHeader>

            {selectedEntity && (
              <div className="space-y-6">
                {/* Entity Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Entity Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Type</Label>
                      <p className="capitalize font-medium">{selectedEntity.type}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Tax ID</Label>
                      <p className="font-mono font-medium">{selectedEntity.taxId || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">KYC Status</Label>
                      <div className="mt-1">
                        <Badge variant="secondary" className={KYC_STATUS_CONFIG[selectedEntity.kycStatus].color + " text-white"}>
                          {KYC_STATUS_CONFIG[selectedEntity.kycStatus].label}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Accreditation</Label>
                      <div className="mt-1">
                        {selectedEntity.accreditationStatus ? (
                          <Badge variant="outline" className="capitalize">
                            {selectedEntity.accreditationStatus.replace('_', ' ')}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Associated Users */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      Associated Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {entityUsers.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No users associated with this entity</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Ownership %</TableHead>
                            <TableHead>Effective Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entityUsers.map((eu) => (
                            <TableRow key={eu.id}>
                              <TableCell className="font-medium">{eu.userName || eu.userId}</TableCell>
                              <TableCell className="capitalize">{eu.role.replace('_', ' ')}</TableCell>
                              <TableCell>{eu.ownershipPercentage ? `${eu.ownershipPercentage}%` : "—"}</TableCell>
                              <TableCell>
                                {eu.effectiveDate ? new Date(eu.effectiveDate).toLocaleDateString() : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Documents */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileCheck className="h-5 w-5" />
                      Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {entityDocuments.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No documents uploaded</p>
                    ) : (
                      <div className="space-y-3">
                        {entityDocuments.map((doc) => (
                          <div key={doc.id} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{doc.fileName}</p>
                                  <Badge 
                                    variant={doc.status === 'approved' ? 'default' : doc.status === 'rejected' ? 'destructive' : 'secondary'}
                                  >
                                    {doc.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground capitalize">{doc.type.replace('_', ' ')}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                                </p>
                                {doc.rejectionReason && (
                                  <p className="text-sm text-red-600 mt-1">
                                    Rejection reason: {doc.rejectionReason}
                                  </p>
                                )}
                              </div>
                              {doc.status === 'pending' && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => approveDocumentMutation.mutate(doc.id)}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      const reason = prompt("Enter rejection reason:");
                                      if (reason) {
                                        rejectDocumentMutation.mutate({ documentId: doc.id, reason });
                                      }
                                    }}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* KYC Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  {selectedEntity.kycStatus !== 'approved' && (
                    <Button
                      onClick={() => updateKycMutation.mutate({ 
                        entityId: selectedEntity.id, 
                        status: 'approved' 
                      })}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve KYC
                    </Button>
                  )}
                  {selectedEntity.kycStatus !== 'in_review' && (
                    <Button
                      variant="outline"
                      onClick={() => updateKycMutation.mutate({ 
                        entityId: selectedEntity.id, 
                        status: 'in_review' 
                      })}
                      className="flex-1"
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Mark In Review
                    </Button>
                  )}
                  {selectedEntity.kycStatus !== 'rejected' && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        const reason = prompt("Enter rejection reason:");
                        if (reason) {
                          updateKycMutation.mutate({ 
                            entityId: selectedEntity.id, 
                            status: 'rejected',
                            rejectionReason: reason
                          });
                        }
                      }}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject KYC
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
