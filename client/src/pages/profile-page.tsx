import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MOCK_BENEFICIARIES, MOCK_USER } from "@/lib/mock-data";
import { FileText, Plus, Trash2, Upload, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function ProfilePage() {
  const { toast } = useToast();
  const [beneficiaries, setBeneficiaries] = useState(MOCK_BENEFICIARIES);
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
    setBeneficiaries([...beneficiaries, { 
      id: Date.now(), 
      name: newBeneficiary.name, 
      relation: newBeneficiary.relation, 
      percentage: Number(newBeneficiary.percentage) 
    }]);
    setNewBeneficiary({ name: "", relation: "", percentage: "" });
    setIsAddOpen(false);
    toast({ title: "Beneficiary Added", description: "Beneficiary list updated successfully." });
  };

  const removeBeneficiary = (id: number) => {
    setBeneficiaries(beneficiaries.filter(b => b.id !== id));
    toast({ title: "Beneficiary Removed", description: "Beneficiary removed from your account." });
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-5xl">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Profile & Documents</h1>
          <p className="text-muted-foreground">Manage your account details, tax documents, and beneficiaries.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Info Card */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your contact details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input defaultValue={MOCK_USER.name} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input defaultValue={MOCK_USER.email} />
                  </div>
                </div>
                <Button variant="outline" className="w-full sm:w-auto">Update Profile</Button>
              </CardContent>
            </Card>

            {/* Beneficiaries Card */}
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Beneficiaries</CardTitle>
                  <CardDescription>Manage your account beneficiaries</CardDescription>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-2">
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
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Relationship</Label>
                        <Input 
                          value={newBeneficiary.relation} 
                          onChange={(e) => setNewBeneficiary({...newBeneficiary, relation: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Percentage (%)</Label>
                        <Input 
                          type="number"
                          value={newBeneficiary.percentage} 
                          onChange={(e) => setNewBeneficiary({...newBeneficiary, percentage: e.target.value})}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={addBeneficiary}>Add Beneficiary</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {beneficiaries.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-secondary">
                      <div>
                        <p className="font-medium">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.relation} • {b.percentage}% Share</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeBeneficiary(b.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {beneficiaries.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No beneficiaries added yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Documents Sidebar */}
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
                <div className="border-2 border-dashed border-sidebar-border rounded-lg p-6 text-center hover:bg-sidebar-accent/50 transition-colors cursor-pointer" onClick={handleFileUpload}>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-sidebar-foreground/50" />
                  <p className="text-sm font-medium">Click to upload W-9</p>
                  <p className="text-xs text-sidebar-foreground/50 mt-1">PDF, JPG up to 5MB</p>
                </div>
                <Separator className="bg-sidebar-border" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Uploaded Documents</p>
                  <div className="flex items-center justify-between p-2 rounded hover:bg-sidebar-accent/50 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-sidebar-primary" />
                      <span className="text-sm">2023_W9_Form.pdf</span>
                    </div>
                    <span className="text-xs text-green-400">Verified</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
