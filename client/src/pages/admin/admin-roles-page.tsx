import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Shield, Key, Users, Plus, X, Edit, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
}

export default function AdminRolesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      const response = await fetch("/api/admin/roles", {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch roles");
      return response.json();
    },
  });

  // Fetch all permissions
  const { data: allPermissions = [], isLoading: permissionsLoading } = useQuery<Permission[]>({
    queryKey: ["admin", "permissions"],
    queryFn: async () => {
      const response = await fetch("/api/admin/permissions", {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch permissions");
      return response.json();
    },
  });

  // Group permissions by resource
  const permissionsByResource = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Add permission to role
  const addPermission = useMutation({
    mutationFn: async ({ roleId, permissionId }: { roleId: string; permissionId: string }) => {
      const response = await fetch(`/api/admin/roles/${roleId}/permissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-username": "admin",
        },
        body: JSON.stringify({ permissionId }),
      });
      if (!response.ok) throw new Error("Failed to add permission");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      toast({
        title: "Permission Added",
        description: "The permission has been added to the role.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove permission from role
  const removePermission = useMutation({
    mutationFn: async ({ roleId, permissionId }: { roleId: string; permissionId: string }) => {
      const response = await fetch(`/api/admin/roles/${roleId}/permissions/${permissionId}`, {
        method: "DELETE",
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to remove permission");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      toast({
        title: "Permission Removed",
        description: "The permission has been removed from the role.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create role mutation
  const createRole = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await fetch("/api/admin/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-username": "admin",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create role");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      setIsCreateDialogOpen(false);
      setFormData({ name: "", description: "" });
      toast({
        title: "Role Created",
        description: "The role has been successfully created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update role mutation
  const updateRole = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; description?: string } }) => {
      const response = await fetch(`/api/admin/roles/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-username": "admin",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update role");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      setIsEditDialogOpen(false);
      setSelectedRole(null);
      setFormData({ name: "", description: "" });
      toast({
        title: "Role Updated",
        description: "The role has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete role mutation
  const deleteRole = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/roles/${id}`, {
        method: "DELETE",
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to delete role");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      setIsDeleteDialogOpen(false);
      setRoleToDelete(null);
      toast({
        title: "Role Deleted",
        description: "The role has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    createRole.mutate(formData);
  };

  const handleUpdateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole) {
      updateRole.mutate({ id: selectedRole.id, data: formData });
    }
  };

  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (role: Role) => {
    setRoleToDelete(role);
    setIsDeleteDialogOpen(true);
  };

  const handlePermissionToggle = (roleId: string, permissionId: string, isCurrentlyAssigned: boolean) => {
    if (isCurrentlyAssigned) {
      removePermission.mutate({ roleId, permissionId });
    } else {
      addPermission.mutate({ roleId, permissionId });
    }
  };

  const openPermissionsDialog = (role: Role) => {
    setSelectedRole(role);
    setIsPermissionsDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Roles & Permissions</h1>
            <p className="text-muted-foreground">Manage role-based access control</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
                <DialogDescription>
                  Add a new role to the system
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateRole} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Role Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., manager"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the role's purpose..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createRole.isPending}>
                    {createRole.isPending ? "Creating..." : "Create Role"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roles.length}</div>
              <p className="text-xs text-muted-foreground">System roles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allPermissions.length}</div>
              <p className="text-xs text-muted-foreground">Available permissions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resources</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(permissionsByResource).length}</div>
              <p className="text-xs text-muted-foreground">Protected resources</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="roles" className="w-full">
          <TabsList>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="permissions">All Permissions</TabsTrigger>
          </TabsList>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-4 mt-4">
            {rolesLoading ? (
              <Card>
                <CardContent className="p-6">Loading roles...</CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {roles.map((role) => (
                  <Card key={role.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-primary" />
                          <div>
                            <CardTitle className="text-lg">{role.name}</CardTitle>
                            <CardDescription className="text-sm">
                              {role.description || "No description"}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(role)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(role)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPermissionsDialog(role)}
                              >
                                <Key className="h-4 w-4 mr-2" />
                                Manage
                              </Button>
                            </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle>Manage Permissions: {selectedRole?.name}</DialogTitle>
                              <DialogDescription>
                                Add or remove permissions for this role
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-[500px] pr-4">
                              <div className="space-y-6">
                                {Object.entries(permissionsByResource).map(([resource, permissions]) => (
                                  <div key={resource} className="space-y-3">
                                    <h3 className="font-semibold text-sm text-primary capitalize">
                                      {resource.replace(/_/g, " ")}
                                    </h3>
                                    <div className="grid gap-2">
                                      {permissions.map((permission) => {
                                        const isAssigned = selectedRole?.permissions.some(
                                          (p) => p.id === permission.id
                                        );
                                        return (
                                          <div
                                            key={permission.id}
                                            className="flex items-center space-x-2 p-2 border rounded hover:bg-accent"
                                          >
                                            <Checkbox
                                              id={`${selectedRole?.id}-${permission.id}`}
                                              checked={isAssigned}
                                              onCheckedChange={() =>
                                                selectedRole &&
                                                handlePermissionToggle(
                                                  selectedRole.id,
                                                  permission.id,
                                                  isAssigned || false
                                                )
                                              }
                                            />
                                            <label
                                              htmlFor={`${selectedRole?.id}-${permission.id}`}
                                              className="flex-1 cursor-pointer text-sm"
                                            >
                                              <span className="font-medium">{permission.action}</span>
                                              {permission.description && (
                                                <span className="text-muted-foreground ml-2">
                                                  - {permission.description}
                                                </span>
                                              )}
                                            </label>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">
                          {role.permissions.length} permissions assigned
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.slice(0, 8).map((perm) => (
                            <Badge key={perm.id} variant="secondary" className="text-xs">
                              {perm.action}
                            </Badge>
                          ))}
                          {role.permissions.length > 8 && (
                            <Badge variant="outline" className="text-xs">
                              +{role.permissions.length - 8} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* All Permissions Tab */}
          <TabsContent value="permissions" className="mt-4">
            {permissionsLoading ? (
              <Card>
                <CardContent className="p-6">Loading permissions...</CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {Object.entries(permissionsByResource).map(([resource, permissions]) => (
                  <Card key={resource}>
                    <CardHeader>
                      <CardTitle className="text-lg capitalize flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        {resource.replace(/_/g, " ")}
                      </CardTitle>
                      <CardDescription>
                        {permissions.length} permissions available
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Action</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Assigned To</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {permissions.map((permission) => {
                            const assignedRoles = roles.filter((role) =>
                              role.permissions.some((p) => p.id === permission.id)
                            );
                            return (
                              <TableRow key={permission.id}>
                                <TableCell className="font-medium">
                                  {permission.action}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {permission.description || "-"}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {assignedRoles.map((role) => (
                                      <Badge key={role.id} variant="secondary">
                                        {role.name}
                                      </Badge>
                                    ))}
                                    {assignedRoles.length === 0 && (
                                      <span className="text-sm text-muted-foreground">
                                        Not assigned
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Role Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
              <DialogDescription>
                Update the role details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Role Name *</Label>
                <Input
                  id="edit-name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., manager"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the role's purpose..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateRole.isPending}>
                  {updateRole.isPending ? "Updating..." : "Update Role"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the role "{roleToDelete?.name}". 
                Users with this role will lose their associated permissions.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => roleToDelete && deleteRole.mutate(roleToDelete.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
