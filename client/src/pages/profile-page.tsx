import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser, useMyBeneficiaries, useMyDocuments } from "@/lib/api";
import { FileText, HelpCircle, Plus, Trash2, Upload, User, ExternalLink, Building2, Eye } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { toast } = useToast();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: beneficiaries = [], isLoading: beneficiariesLoading } = useMyBeneficiaries();
  const { data: documents = [], isLoading: documentsLoading } = useMyDocuments();
  const [newBeneficiary, setNewBeneficiary] = useState({ name: "", relation: "", percentage: "", type: "Primary", dob: "", phone: "", address: "" });
  const [isAddOpen, setIsAddOpen] = useState(false);

  const handleFileUpload = () => {
    toast({
      title: "File Uploaded",
      description: "Your W-9 form has been successfully uploaded and is pending review.",
    });
  };

  const addBeneficiary = () => {
    if (!newBeneficiary.name || !newBeneficiary.percentage) return;
    setNewBeneficiary({ name: "", relation: "", percentage: "", type: "Primary", dob: "", phone: "", address: "" });
    setIsAddOpen(false);
    toast({ title: "Beneficiary Added", description: "Beneficiary list updated successfully." });
  };

  const primaryBeneficiaries = beneficiaries.filter(b => b.type === "Primary" || !b.type);
  const contingentBeneficiaries = beneficiaries.filter(b => b.type === "Contingent");
  
  const primaryTotal = primaryBeneficiaries.reduce((sum, b) => sum + b.percentage, 0);
  const contingentTotal = contingentBeneficiaries.reduce((sum, b) => sum + b.percentage, 0);

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
                  <div className="space-y-4">
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input defaultValue={user?.phone || ""} placeholder="(555) 123-4567" data-testid="input-phone" />
                      </div>
                      <div className="space-y-2">
                        <Label>Street Address</Label>
                        <Input defaultValue={user?.address || ""} placeholder="123 Main Street" data-testid="input-address" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input defaultValue={user?.city || ""} placeholder="City" data-testid="input-city" />
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input defaultValue={user?.state || ""} placeholder="State" data-testid="input-state" />
                      </div>
                      <div className="space-y-2">
                        <Label>ZIP Code</Label>
                        <Input defaultValue={user?.zipCode || ""} placeholder="12345" data-testid="input-zip" />
                      </div>
                    </div>
                  </div>
                )}
                <Button variant="outline" className="w-full sm:w-auto" data-testid="button-update-profile">Update Profile</Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Entity Information</CardTitle>
                    <CardDescription>For investments held by a business or trust</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Entity Type</Label>
                  <Select defaultValue="individual">
                    <SelectTrigger data-testid="select-entity-type">
                      <SelectValue placeholder="Select entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="business">Business (LLC, Corp, Partnership)</SelectItem>
                      <SelectItem value="trust">Trust</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Entity Name</Label>
                    <Input placeholder="Business or Trust name" data-testid="input-entity-name" />
                  </div>
                  <div className="space-y-2">
                    <Label>EIN / Tax ID</Label>
                    <Input placeholder="XX-XXXXXXX" data-testid="input-entity-ein" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Entity Address (if different from personal)</Label>
                  <Input placeholder="123 Business St, City, State ZIP" data-testid="input-entity-address" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>State of Formation</Label>
                    <Input placeholder="State" data-testid="input-entity-state" />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Formation</Label>
                    <Input type="date" data-testid="input-entity-formation-date" />
                  </div>
                </div>
                <Button variant="outline" className="w-full sm:w-auto" data-testid="button-update-entity">Update Entity</Button>
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
                        <Label>Beneficiary Type</Label>
                        <Select 
                          value={newBeneficiary.type} 
                          onValueChange={(value) => setNewBeneficiary({...newBeneficiary, type: value})}
                        >
                          <SelectTrigger data-testid="select-beneficiary-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Primary">Primary Beneficiary</SelectItem>
                            <SelectItem value="Contingent">Contingent Beneficiary</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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
                      <div className="space-y-2">
                        <Label>Date of Birth</Label>
                        <Input 
                          type="date"
                          value={newBeneficiary.dob} 
                          onChange={(e) => setNewBeneficiary({...newBeneficiary, dob: e.target.value})}
                          data-testid="input-beneficiary-dob"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input 
                          value={newBeneficiary.phone} 
                          onChange={(e) => setNewBeneficiary({...newBeneficiary, phone: e.target.value})}
                          placeholder="(555) 123-4567"
                          data-testid="input-beneficiary-phone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mailing Address</Label>
                        <Input 
                          value={newBeneficiary.address} 
                          onChange={(e) => setNewBeneficiary({...newBeneficiary, address: e.target.value})}
                          placeholder="123 Main St, City, State ZIP"
                          data-testid="input-beneficiary-address"
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
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground">Primary Beneficiary</h4>
                        {primaryBeneficiaries.length > 0 && (
                          <span className={`text-xs font-medium ${primaryTotal === 100 ? 'text-emerald-600' : 'text-destructive'}`}>
                            Total: {primaryTotal}% {primaryTotal === 100 ? '✓' : '(must equal 100%)'}
                          </span>
                        )}
                      </div>
                      {primaryBeneficiaries.length > 0 ? (
                        primaryBeneficiaries.map((b) => (
                          <div key={b.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-secondary" data-testid={`beneficiary-${b.id}`}>
                            <div>
                              <p className="font-medium">{b.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {b.relation} • {b.percentage}% Share
                                {b.dob && ` • DOB: ${b.dob}`}
                              </p>
                              {(b.phone || b.address) && (
                                <p className="text-xs text-muted-foreground">
                                  {b.phone && `${b.phone}`}{b.phone && b.address && ' • '}{b.address && `${b.address}`}
                                </p>
                              )}
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeBeneficiary(b.id)} className="text-muted-foreground hover:text-destructive" data-testid={`button-remove-beneficiary-${b.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground py-2">No primary beneficiary added yet.</p>
                      )}
                    </div>
                    {contingentBeneficiaries.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-foreground">Contingent Beneficiary</h4>
                            <span className={`text-xs font-medium ${contingentTotal === 100 ? 'text-emerald-600' : 'text-destructive'}`}>
                              Total: {contingentTotal}% {contingentTotal === 100 ? '✓' : '(must equal 100%)'}
                            </span>
                          </div>
                          {contingentBeneficiaries.map((b) => (
                            <div key={b.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-secondary" data-testid={`beneficiary-${b.id}`}>
                              <div>
                                <p className="font-medium">{b.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {b.relation} • {b.percentage}% Share
                                  {b.dob && ` • DOB: ${b.dob}`}
                                </p>
                                {(b.phone || b.address) && (
                                  <p className="text-xs text-muted-foreground">
                                    {b.phone && `${b.phone}`}{b.phone && b.address && ' • '}{b.address && `${b.address}`}
                                  </p>
                                )}
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => removeBeneficiary(b.id)} className="text-muted-foreground hover:text-destructive" data-testid={`button-remove-beneficiary-${b.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </>
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
                <a 
                  href="https://www.irs.gov/pub/irs-pdf/fw9.pdf" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-sidebar-accent hover:bg-sidebar-accent/80 rounded-lg text-sidebar-foreground font-medium transition-colors"
                  data-testid="button-fill-w9"
                >
                  <ExternalLink className="h-4 w-4" />
                  Download W-9 Form
                </a>
                <div className="border-2 border-dashed border-sidebar-border rounded-lg p-6 text-center hover:bg-sidebar-accent/50 transition-colors cursor-pointer" onClick={handleFileUpload} data-testid="upload-w9">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-sidebar-foreground/50" />
                  <p className="text-sm font-medium">Upload Signed W-9</p>
                  <p className="text-xs text-sidebar-foreground/50 mt-1">PDF, JPG up to 5MB</p>
                </div>
                <Separator className="bg-sidebar-border" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Uploaded Documents</p>
                  {documentsLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : documents.length > 0 ? (
                    documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 rounded hover:bg-sidebar-accent/50" data-testid={`document-${doc.id}`}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-sidebar-primary" />
                          <span className="text-sm">{doc.fileName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${doc.status === 'Verified' ? 'text-green-400' : 'text-yellow-400'}`}>{doc.status}</span>
                          <a 
                            href={doc.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-sidebar-accent rounded transition-colors"
                            data-testid={`button-preview-doc-${doc.id}`}
                            title="Preview document"
                          >
                            <Eye className="h-4 w-4 text-sidebar-foreground/70 hover:text-sidebar-foreground" />
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-sidebar-foreground/50">No documents uploaded yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-border">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  To update bank account information for payments from a note, please contact{" "}
                  <a href="mailto:info@kindling.network" className="text-primary hover:underline font-medium">
                    info@kindling.network
                  </a>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>Common questions about your account and investments</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How do I update my bank account information?</AccordionTrigger>
                <AccordionContent>
                  To update your bank account information for receiving payments, please contact us at{" "}
                  <a href="mailto:info@kindling.network" className="text-primary hover:underline">info@kindling.network</a>.
                  For security purposes, bank account changes require verification.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>When will I receive my monthly payments?</AccordionTrigger>
                <AccordionContent>
                  Payments are processed on the 25th of each month. If the 25th falls on a weekend or holiday, 
                  payments will be processed on the next business day. Newly funded notes will begin payments 
                  the following month after funding.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>How do I add or update beneficiaries?</AccordionTrigger>
                <AccordionContent>
                  You can add beneficiaries directly from this page using the "Add Beneficiary" button in the 
                  Beneficiaries section above. To remove a beneficiary, click the trash icon next to their name.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>What tax documents do I need to provide?</AccordionTrigger>
                <AccordionContent>
                  All investors are required to submit a W-9 form for tax reporting purposes. You can upload 
                  your W-9 in the Tax Documents section. You will receive a 1099-INT form annually for interest 
                  income earned.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-5">
                <AccordionTrigger>How is my blended yield calculated?</AccordionTrigger>
                <AccordionContent>
                  Your blended yield is the weighted average interest rate across all your note investments, 
                  calculated based on the amount you have invested in each note. This gives you a single 
                  rate that represents your overall portfolio performance.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
