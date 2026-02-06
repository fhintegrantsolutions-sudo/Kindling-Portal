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
import { useToast } from "@/hooks/use-toast";
import { Users, Search, Shield, Plus, X, Mail, Phone, MapPin, UserCog, DollarSign, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";

interface Participation {
  id: string;
  userId: string;
  noteId: string;
  investedAmount: string;
  purchaseDate: string;
  status: string;
  note?: {
    id: string;
    noteId: string;
    title: string;
  };
}

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  role: string;
  createdAt?: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRolesDialogOpen, setIsRolesDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users", {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Fetch all roles
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      const response = await fetch("/api/admin/roles", {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch roles");
      return response.json();
    },
  });

  // Fetch user's assigned roles
  const { data: userRoles = [], isLoading: userRolesLoading } = useQuery<Role[]>({
    queryKey: ["admin", "users", selectedUser?.id, "roles"],
    queryFn: async () => {
      if (!selectedUser) return [];
      const response = await fetch(`/api/admin/users/${selectedUser.id}/roles`, {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch user roles");
      return response.json();
    },
    enabled: !!selectedUser && isRolesDialogOpen,
  });

  // Fetch all participations to filter by user
  const { data: allParticipations = [] } = useQuery<Participation[]>({
    queryKey: ["admin", "participations"],
    queryFn: async () => {
      const response = await fetch("/api/admin/participations", {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch participations");
      return response.json();
    },
  });

  // Get participations for selected user
  const userParticipations = selectedUser 
    ? allParticipations.filter(p => p.userId === selectedUser.id)
    : [];

  // Assign role to user
  const assignRole = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-username": "admin",
        },
        body: JSON.stringify({ roleId }),
      });
      if (!response.ok) throw new Error("Failed to assign role");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users", selectedUser?.id, "roles"] });
      toast({
        title: "Role Assigned",
        description: "The role has been assigned to the user.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign role.",
        variant: "destructive",
      });
    },
  });

  // Remove role from user
  const removeRole = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/roles/${roleId}`, {
        method: "DELETE",
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to remove role");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users", selectedUser?.id, "roles"] });
      toast({
        title: "Role Removed",
        description: "The role has been removed from the user.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove role.",
        variant: "destructive",
      });
    },
  });

  // Filter and sort users by name
  const filteredUsers = users
    .filter((user) => {
      const matchesSearch =
        !searchTerm ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === "all" || user.role === roleFilter;

      return matchesSearch && matchesRole;
    })
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  // Get unique roles from users for filter
  const uniqueUserRoles = [...new Set(users.map((u) => u.role).filter(Boolean))];

  const handleManageRoles = (user: User) => {
    setSelectedUser(user);
    setIsRolesDialogOpen(true);
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setIsDetailsDialogOpen(true);
  };

  const handleAssignRole = (roleId: string) => {
    if (selectedUser) {
      assignRole.mutate({ userId: selectedUser.id, roleId });
    }
  };

  const handleRemoveRole = (roleId: string) => {
    if (selectedUser) {
      removeRole.mutate({ userId: selectedUser.id, roleId });
    }
  };

  // Get roles not yet assigned to user
  const availableRoles = roles.filter(
    (role) => !userRoles.some((ur) => ur.id === role.id)
  );

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage users and their role assignments
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                Registered accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Admins</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter((u) => u.role === "admin").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Admin users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Lenders</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter((u) => u.role === "lender").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Lender accounts
              </p>
            </CardContent>
          </Card>
        </div>

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
                    placeholder="Search by name, email, or username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueUserRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No users found matching your criteria.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Base Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || "-"}</TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell className="font-mono text-sm">{user.username || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {user.role || "lender"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(user)}
                          >
                            Details
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleManageRoles(user)}
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Roles
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* User Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                View information for {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">
                      {selectedUser.name?.charAt(0) || "U"}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{selectedUser.name}</p>
                    <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedUser.email}</span>
                  </div>
                  {selectedUser.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedUser.phone}</span>
                    </div>
                  )}
                  {(selectedUser.address || selectedUser.city) && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {[selectedUser.address, selectedUser.city, selectedUser.state, selectedUser.zipCode]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Base Role</p>
                  <Badge variant={selectedUser.role === "admin" ? "default" : "secondary"}>
                    {selectedUser.role || "lender"}
                  </Badge>
                </div>

                {selectedUser.createdAt && (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Account created on {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Note Participations */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Note Participations</p>
                  </div>
                  {userParticipations.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No note participations</p>
                  ) : (
                    <div className="space-y-2">
                      {userParticipations.map((participation) => (
                        <div 
                          key={participation.id} 
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {participation.note?.noteId || participation.noteId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {participation.note?.title}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-primary">
                              {formatCurrency(parseFloat(participation.investedAmount))}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {participation.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t mt-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Invested:</span>
                          <span className="font-semibold">
                            {formatCurrency(
                              userParticipations.reduce(
                                (sum, p) => sum + parseFloat(p.investedAmount || "0"),
                                0
                              )
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={() => {
                setIsDetailsDialogOpen(false);
                handleManageRoles(selectedUser!);
              }}>
                <Shield className="h-4 w-4 mr-1" />
                Manage Roles
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manage Roles Dialog */}
        <Dialog open={isRolesDialogOpen} onOpenChange={setIsRolesDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Manage Roles</DialogTitle>
              <DialogDescription>
                Assign or remove roles for {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Current Roles */}
              <div>
                <h4 className="text-sm font-medium mb-3">Assigned Roles</h4>
                {userRolesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading roles...</p>
                ) : userRoles.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center bg-muted rounded-lg">
                    No custom roles assigned
                  </p>
                ) : (
                  <ScrollArea className="max-h-[200px]">
                    <div className="space-y-2">
                      {userRoles.map((role) => (
                        <div
                          key={role.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{role.name}</p>
                            {role.description && (
                              <p className="text-xs text-muted-foreground">{role.description}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRole(role.id)}
                            disabled={removeRole.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Add Role */}
              {availableRoles.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Add Role</h4>
                  <div className="flex gap-2">
                    <Select
                      onValueChange={(value) => handleAssignRole(value)}
                      disabled={assignRole.isPending}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a role to assign..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Base Role Info */}
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  <strong>Base Role:</strong> {selectedUser?.role || "lender"} — This is set in the user's account settings and determines their primary access level.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRolesDialogOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
