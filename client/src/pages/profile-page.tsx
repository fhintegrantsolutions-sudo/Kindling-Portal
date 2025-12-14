import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCurrentUser, useMyBeneficiaries, useMyDocuments } from "@/lib/api";
import { FileText, Plus, Trash2, Upload, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { toast } = useToast();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: beneficiaries = [], isLoading: beneficiariesLoading } = useMyBeneficiaries();
  const { data: documents = [], isLoading: documentsLoading } = useMyDocuments();
  const [newBeneficiary, setNewBeneficiary] = useState({ name: "", relation: "", percentage: "" });
  const [isAddOpen, setIsAddOpen] = useState(false);

  const handleFileUpload = () => {
    toast({
      title: "File Uploaded",
      description: "Your W-9 form has been successfully uploaded and is pending review.",
    });
  };

  const addBeneficiary = () => {
    if (!newBeneficiary.name || !newBeneficiary.percentage) return;
    setNewBeneficiary({ name: "", relation: "", percentage: "" });
    setIsAddOpen(false);
    toast({ title: "Beneficiary Added", description: "Beneficiary list updated successfully." });
  };

  const removeBeneficiary = (id: string) => {
    toast({ title: "Beneficiary Removed", description: "Beneficiary removed from your account." });
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-5xl">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground" data-testid="text-profile-title">Profile & Documents</h1>
          <p className="text-muted-foreground">Manage your account details, tax documents, and beneficiaries.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Your contact details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {userLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input defaultValue={user?.name || ""} data-testid="input-name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input defaultValue={user?.email || ""} data-testid="input-email" />
                    </div>
                  </div>
                )}
                <Button variant="outline" className="w-full sm:w-auto" data-testid="button-update-profile">Update Profile</Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Beneficiaries</CardTitle>
                  <CardDescription>Manage your account beneficiaries</CardDescription>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-2" data-testid="button-add-beneficiary">
                      <Plus className="h-4 w-4" /> Add New
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Beneficiary</DialogTitle>
                      <DialogDescription>Enter the details for the new beneficiary.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input 
                          value={newBeneficiary.name} 
                          onChange={(e) => setNewBeneficiary({...newBeneficiary, name: e.target.value})}
                          data-testid="input-beneficiary-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Relationship</Label>
                        <Input 
                          value={newBeneficiary.relation} 
                          onChange={(e) => setNewBeneficiary({...newBeneficiary, relation: e.target.value})}
                          data-testid="input-beneficiary-relation"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Percentage (%)</Label>
                        <Input 
                          type="number"
                          value={newBeneficiary.percentage} 
                          onChange={(e) => setNewBeneficiary({...newBeneficiary, percentage: e.target.value})}
                          data-testid="input-beneficiary-percentage"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={addBeneficiary} data-testid="button-submit-beneficiary">Add Beneficiary</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {beneficiariesLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {beneficiaries.map((b) => (
                      <div key={b.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-secondary" data-testid={`beneficiary-${b.id}`}>
                        <div>
                          <p className="font-medium">{b.name}</p>
                          <p className="text-xs text-muted-foreground">{b.relation} • {b.percentage}% Share</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeBeneficiary(b.id)} className="text-muted-foreground hover:text-destructive" data-testid={`button-remove-beneficiary-${b.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {beneficiaries.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No beneficiaries added yet.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-sidebar text-sidebar-foreground border-none">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-sidebar-primary" />
                  <CardTitle className="text-lg">Tax Documents</CardTitle>
                </div>
                <CardDescription className="text-sidebar-foreground/60">Upload your W-9 for tax reporting.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-sidebar-border rounded-lg p-6 text-center hover:bg-sidebar-accent/50 transition-colors cursor-pointer" onClick={handleFileUpload} data-testid="upload-w9">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-sidebar-foreground/50" />
                  <p className="text-sm font-medium">Click to upload W-9</p>
                  <p className="text-xs text-sidebar-foreground/50 mt-1">PDF, JPG up to 5MB</p>
                </div>
                <Separator className="bg-sidebar-border" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Uploaded Documents</p>
                  {documentsLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : documents.length > 0 ? (
                    documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 rounded hover:bg-sidebar-accent/50 cursor-pointer" data-testid={`document-${doc.id}`}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-sidebar-primary" />
                          <span className="text-sm">{doc.fileName}</span>
                        </div>
                        <span className={`text-xs ${doc.status === 'Verified' ? 'text-green-400' : 'text-yellow-400'}`}>{doc.status}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-sidebar-foreground/50">No documents uploaded yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
