import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, FileText, Building2, Calendar, DollarSign, FileDown, Upload } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const PROJECT_TYPES = [
  "Real Estate - Single Family",
  "Real Estate - Multi-Family",
  "Real Estate - Commercial",
  "Real Estate - Land Development",
  "Business Acquisition",
  "Working Capital",
  "Equipment Financing",
  "Bridge Loan",
  "Construction",
  "Other",
];

const PAYMENT_STATUSES = [
  "Current",
  "Late",
  "Defaulted",
  "Paid Off",
  "Pending",
];

const NOTE_STATUSES = [
  "Pre Register",
  "Under Review",
  "Approved",
  "Funding",
  "Active",
  "Reselling",
  "Secondary Market",
  "Paid Off",
  "Default",
  "Closed",
];

const CLIENT_STATUSES = [
  "Coming Soon",
  "Available",
  "Funding in Progress",
  "Fully Funded",
  "Active",
  "Secondary Market",
  "Closed",
  "Not Available",
];

interface Note {
  id: string;
  noteId: string;
  borrower: string;
  title: string;
  principal: string;
  rate: string;
  termMonths: number;
  termYears?: number;
  projectType: string;
  loanPaymentStatus: string;
  contractDate?: string;
  paymentStartDate?: string;
  maturityDate?: string;
  fundingStartDate?: string;
  fundingEndDate?: string;
  fundingWindowEnd?: string;
  firstPaymentDate?: string;
  monthlyPayment?: string;
  status: string;
  clientStatus: string;
  type: string;
  interestType: string;
  description?: string;
  createdAt: string;
}

interface NoteFormProps {
  formData: {
    noteId: string;
    borrower: string;
    title: string;
    principal: string;
    rate: string;
    termMonths: string;
    termYears: string;
    projectType: string;
    loanPaymentStatus: string;
    contractDate: string;
    paymentStartDate: string;
    maturityDate: string;
    fundingStartDate: string;
    fundingEndDate: string;
    fundingWindowEnd: string;
    firstPaymentDate: string;
    status: string;
    clientStatus: string;
    type: string;
    interestType: string;
    description: string;
  };
  borrowers: any[];
  onFormDataChange: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
}

const NoteForm = ({ formData, borrowers, onFormDataChange, onSubmit, onCancel, submitLabel }: NoteFormProps) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="basic">Basic Info</TabsTrigger>
        <TabsTrigger value="financial">Financial</TabsTrigger>
        <TabsTrigger value="dates">Dates</TabsTrigger>
        <TabsTrigger value="additional">Additional</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-4 mt-4">
        <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="noteId">Note ID *</Label>
        <Input
          id="noteId"
          required
          value={formData.noteId}
          onChange={(e) => onFormDataChange({ ...formData, noteId: e.target.value })}
          placeholder="N-2024-001"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="borrower">Borrower *</Label>
        <Select
          value={formData.borrower}
          onValueChange={(value) => onFormDataChange({ ...formData, borrower: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select borrower" />
          </SelectTrigger>
          <SelectContent>
            {borrowers.map((borrower: any) => (
              <SelectItem key={borrower.id} value={borrower.id}>
                {borrower.businessName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="title">Note Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => onFormDataChange({ ...formData, title: e.target.value })}
          placeholder="Austin Multi-Family Fund II"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="projectType">Project Type *</Label>
        <Select
          value={formData.projectType}
          onValueChange={(value) => onFormDataChange({ ...formData, projectType: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select project type" />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="loanPaymentStatus">Payment Status *</Label>
        <Select
          value={formData.loanPaymentStatus}
          onValueChange={(value) => onFormDataChange({ ...formData, loanPaymentStatus: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Backend Status *</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => onFormDataChange({ ...formData, status: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select note status" />
          </SelectTrigger>
          <SelectContent>
            {NOTE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientStatus">Client Status *</Label>
        <Select
          value={formData.clientStatus}
          onValueChange={(value) => onFormDataChange({ ...formData, clientStatus: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select client-facing status" />
          </SelectTrigger>
          <SelectContent>
            {CLIENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
        </div>
      </TabsContent>

      <TabsContent value="financial" className="space-y-4 mt-4">
        <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="principal">Loan Amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            id="principal"
            type="text"
            className="pl-7"
            value={formData.principal ? parseFloat(formData.principal.replace(/,/g, '')).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : ''}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9.,]/g, '');
              const numericValue = value.replace(/,/g, '');
              const parts = numericValue.split('.');
              if (parts.length > 2) return;
              if (parts[1] && parts[1].length > 2) return;
              onFormDataChange({ ...formData, principal: numericValue });
            }}
            onBlur={(e) => {
              const value = e.target.value.replace(/,/g, '');
              if (value && !isNaN(parseFloat(value))) {
                const formatted = parseFloat(value).toFixed(2);
                onFormDataChange({ ...formData, principal: formatted });
              }
            }}
            placeholder="100,000.00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rate">Interest Rate (%) *</Label>
        <Input
          id="rate"
          required
          value={formData.rate}
          onChange={(e) => onFormDataChange({ ...formData, rate: e.target.value })}
          placeholder="10.5"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="termMonths">Term (Months) *</Label>
        <Input
          id="termMonths"
          required
          type="number"
          value={formData.termMonths}
          onChange={(e) => {
            const months = e.target.value;
            const years = months ? (parseFloat(months) / 12).toFixed(2) : "";
            let maturityDate = formData.maturityDate;
            
            // Calculate maturity date if payment start date exists
            if (formData.paymentStartDate && months) {
              const startDate = new Date(formData.paymentStartDate);
              startDate.setMonth(startDate.getMonth() + parseInt(months));
              maturityDate = startDate.toISOString().split('T')[0];
            }
            
            onFormDataChange({ ...formData, termMonths: months, termYears: years, maturityDate });
          }}
          placeholder="24"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="termYears">Term (Years)</Label>
        <Input
          id="termYears"
          type="number"
          step="0.1"
          value={formData.termYears}
          onChange={(e) => onFormDataChange({ ...formData, termYears: e.target.value })}
          placeholder="2.0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="interestType">Interest Type *</Label>
        <Select
          value={formData.interestType}
          onValueChange={(value) => onFormDataChange({ ...formData, interestType: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Amortized">Amortized</SelectItem>
            <SelectItem value="Simple Interest">Simple Interest</SelectItem>
            <SelectItem value="Interest Only">Interest Only</SelectItem>
          </SelectContent>
        </Select>
      </div>
        </div>
      </TabsContent>

      <TabsContent value="dates" className="space-y-4 mt-4">
        <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="contractDate">Contract Date</Label>
        <Input
          id="contractDate"
          type="date"
          value={formData.contractDate}
          onChange={(e) => onFormDataChange({ ...formData, contractDate: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentStartDate">Payment Start Date</Label>
        <Input
          id="paymentStartDate"
          type="date"
          value={formData.paymentStartDate}
          onChange={(e) => {
            const startDate = e.target.value;
            let maturityDate = formData.maturityDate;
            
            // Calculate maturity date if term months exists
            if (startDate && formData.termMonths) {
              const date = new Date(startDate);
              date.setMonth(date.getMonth() + parseInt(formData.termMonths));
              maturityDate = date.toISOString().split('T')[0];
            }
            
            onFormDataChange({ ...formData, paymentStartDate: startDate, maturityDate });
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="maturityDate">Maturity Date</Label>
        <Input
          id="maturityDate"
          type="date"
          value={formData.maturityDate}
          onChange={(e) => onFormDataChange({ ...formData, maturityDate: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fundingStartDate">Funding Start Date</Label>
        <Input
          id="fundingStartDate"
          type="date"
          value={formData.fundingStartDate}
          onChange={(e) => onFormDataChange({ ...formData, fundingStartDate: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fundingEndDate">Funding End Date</Label>
        <Input
          id="fundingEndDate"
          type="date"
          value={formData.fundingEndDate}
          onChange={(e) => onFormDataChange({ ...formData, fundingEndDate: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fundingWindowEnd">Funding Window End</Label>
        <Input
          id="fundingWindowEnd"
          type="text"
          value={formData.fundingWindowEnd}
          onChange={(e) => onFormDataChange({ ...formData, fundingWindowEnd: e.target.value })}
          placeholder="e.g., End of Q1 2025"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="firstPaymentDate">First Payment Date</Label>
        <Input
          id="firstPaymentDate"
          type="text"
          value={formData.firstPaymentDate}
          onChange={(e) => onFormDataChange({ ...formData, firstPaymentDate: e.target.value })}
          placeholder="e.g., January 15th"
        />
      </div>
        </div>
      </TabsContent>

      <TabsContent value="additional" className="space-y-4 mt-4">
        <div className="grid gap-4 md:grid-cols-2">
        </div>
      </TabsContent>
    </Tabs>

    <div className="space-y-2">
      <Label htmlFor="description">Description</Label>
      <Textarea
        id="description"
        value={formData.description}
        onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
        placeholder="Additional note details..."
        rows={3}
      />
    </div>

    <div className="flex justify-end space-x-2">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button type="submit">
        {submitLabel}
      </Button>
    </div>
  </form>
);

export default function AdminNotesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [formData, setFormData] = useState({
    noteId: "",
    borrower: "",
    title: "",
    principal: "",
    rate: "",
    termMonths: "",
    termYears: "",
    projectType: "",
    loanPaymentStatus: "Current",
    contractDate: "",
    paymentStartDate: "",
    maturityDate: "",
    fundingStartDate: "",
    fundingEndDate: "",
    fundingWindowEnd: "",
    firstPaymentDate: "",
    status: "Active",
    clientStatus: "Available",
    type: "",
    interestType: "Amortized",
    description: "",
  });

  // Fetch notes
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["admin", "notes"],
    queryFn: async () => {
      const response = await fetch("/api/notes", {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch notes");
      return response.json();
    },
  });

  // Fetch borrowers for dropdown
  const { data: borrowers = [] } = useQuery({
    queryKey: ["admin", "borrowers"],
    queryFn: async () => {
      const response = await fetch("/api/admin/borrowers", {
        headers: { "x-username": "admin" },
      });
      if (!response.ok) throw new Error("Failed to fetch borrowers");
      return response.json();
    },
  });

  // Create note mutation
  const createNote = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-username": "admin",
        },
        body: JSON.stringify({
          ...data,
          termMonths: parseInt(data.termMonths),
          termYears: data.termYears ? parseFloat(data.termYears) : undefined,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create note");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notes"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Note Created",
        description: "The note has been successfully added.",
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

  // Update note mutation
  const updateNote = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await fetch(`/api/admin/notes/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-username": "admin",
        },
        body: JSON.stringify({
          ...data,
          termMonths: parseInt(data.termMonths),
          termYears: data.termYears ? parseFloat(data.termYears) : undefined,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update note");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notes"] });
      setIsEditDialogOpen(false);
      setSelectedNote(null);
      toast({
        title: "Note Updated",
        description: "The note has been successfully updated.",
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

  // Delete note mutation
  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/notes/${id}`, {
        method: "DELETE",
        headers: {
          "x-username": "admin",
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete note");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notes"] });
      setIsDeleteDialogOpen(false);
      setSelectedNote(null);
      toast({
        title: "Note Deleted",
        description: "The note has been successfully removed.",
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

  // Create funding instructions mutation (API to be implemented)
  const createFundingInstructions = useMutation({
    mutationFn: async (noteId: string) => {
      // Placeholder - API endpoint to be implemented
      const response = await fetch(`/api/notes/${noteId}/funding-instructions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-username": "admin",
        },
      });
      if (!response.ok) {
        // Check if response is HTML (404 page) instead of JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          throw new Error("API endpoint not yet implemented");
        }
        throw new Error("Failed to generate funding instructions");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Funding Instructions Generated",
        description: "The PDF has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Coming Soon",
        description: "Funding instructions generation will be available soon.",
        variant: "default",
      });
    },
  });

  // Upload funding instructions mutation (API to be implemented)
  const uploadFundingInstructions = useMutation({
    mutationFn: async ({ noteId, file }: { noteId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(`/api/notes/${noteId}/funding-instructions/upload`, {
        method: "POST",
        headers: {
          "x-username": "admin",
        },
        body: formData,
      });
      
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          throw new Error("API endpoint not yet implemented");
        }
        throw new Error("Failed to upload funding instructions");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notes"] });
      toast({
        title: "Upload Successful",
        description: "Funding instructions PDF has been uploaded.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Coming Soon",
        description: "Funding instructions upload will be available soon.",
        variant: "default",
      });
    },
  });

  const handleFileUpload = (noteId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      uploadFundingInstructions.mutate({ noteId, file });
    } else if (file) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
    }
    // Reset input
    event.target.value = "";
  };

  const resetForm = () => {
    setFormData({
      noteId: "",
      borrower: "",
      title: "",
      principal: "",
      rate: "",
      termMonths: "",
      termYears: "",
      projectType: "",
      loanPaymentStatus: "Current",
      contractDate: "",
      paymentStartDate: "",
      maturityDate: "",
      fundingStartDate: "",
      fundingEndDate: "",
      fundingWindowEnd: "",
      firstPaymentDate: "",
      status: "Active",
      clientStatus: "Available",
      type: "",
      interestType: "Amortized",
      description: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createNote.mutate(formData);
  };

  const handleEdit = (note: Note) => {
    setSelectedNote(note);
    setFormData({
      noteId: note.noteId,
      borrower: note.borrower,
      title: note.title,
      principal: note.principal,
      rate: note.rate,
      termMonths: note.termMonths.toString(),
      termYears: note.termYears?.toString() || "",
      projectType: note.projectType,
      loanPaymentStatus: note.loanPaymentStatus,
      contractDate: note.contractDate ? note.contractDate.split('T')[0] : "",
      paymentStartDate: note.paymentStartDate ? note.paymentStartDate.split('T')[0] : "",
      maturityDate: note.maturityDate ? note.maturityDate.split('T')[0] : "",
      fundingStartDate: note.fundingStartDate ? note.fundingStartDate.split('T')[0] : "",
      fundingEndDate: note.fundingEndDate ? note.fundingEndDate.split('T')[0] : "",
      fundingWindowEnd: note.fundingWindowEnd ? note.fundingWindowEnd.split('T')[0] : "",
      firstPaymentDate: note.firstPaymentDate ? note.firstPaymentDate.split('T')[0] : "",
      status: note.status,
      clientStatus: note.clientStatus,
      type: note.type,
      interestType: note.interestType,
      description: note.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedNote) {
      updateNote.mutate({ id: selectedNote.id, data: formData });
    }
  };

  const handleDelete = (note: Note) => {
    setSelectedNote(note);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedNote) {
      deleteNote.mutate(selectedNote.id);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notes Management</h1>
            <p className="text-muted-foreground">Create and manage loan notes</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Note</DialogTitle>
                <DialogDescription>
                  Enter the loan note details and borrower information.
                </DialogDescription>
              </DialogHeader>
              <NoteForm 
                formData={formData}
                borrowers={borrowers}
                onFormDataChange={setFormData}
                onSubmit={handleSubmit}
                onCancel={() => setIsDialogOpen(false)}
                submitLabel={createNote.isPending ? "Creating..." : "Create Note"}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Notes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notes.filter((note: Note) => note.clientStatus === "Active").length}</div>
              <p className="text-xs text-muted-foreground">Active loan notes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Principal</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Notes</SelectItem>
                    {Array.from(new Set(notes
                      .filter((note: Note) => note.clientStatus === "Active" && note.contractDate)
                      .map((note: Note) => new Date(note.contractDate!).getFullYear())))
                      .sort((a, b) => b - a)
                      .map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="text-2xl font-bold">
                  {formatCurrency(notes
                    .filter((note: Note) => 
                      note.clientStatus === "Active" && 
                      (selectedYear === "all" || (note.contractDate && new Date(note.contractDate).getFullYear().toString() === selectedYear))
                    )
                    .reduce((sum: number, note: Note) => sum + parseFloat(note.principal || "0"), 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedYear === "all" ? "Across all notes" : `For ${selectedYear}`}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Borrowers</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{borrowers.length}</div>
              <p className="text-xs text-muted-foreground">Registered borrowers</p>
            </CardContent>
          </Card>
        </div>

        {/* Notes View with Tabs */}
        <Tabs defaultValue="cards" className="w-full">
          <TabsList>
            <TabsTrigger value="cards">Card View</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="space-y-4 mt-4">
            {isLoading ? (
              <Card>
                <CardContent className="p-6">Loading notes...</CardContent>
              </Card>
            ) : notes.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No notes yet. Click "Add Note" to get started.</p>
                </CardContent>
              </Card>
            ) : (
              [...notes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((note: Note) => {
                const borrower = borrowers.find((b: any) => b.id === note.borrower);
                return (
                  <Card key={note.id}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <FileText className="h-4 w-4" />
                          {note.title}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>Note ID: {note.noteId} • {borrower?.businessName || "Unknown Borrower"}</span>
                            <span className="text-xs text-muted-foreground">Backend:</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              note.status === 'Active' ? 'bg-green-100 text-green-800' :
                              note.status === 'Funding' ? 'bg-blue-100 text-blue-800' :
                              note.status === 'Pre Register' ? 'bg-purple-100 text-purple-800' :
                              note.status === 'Under Review' ? 'bg-yellow-100 text-yellow-800' :
                              note.status === 'Approved' ? 'bg-cyan-100 text-cyan-800' :
                              note.status === 'Reselling' ? 'bg-orange-100 text-orange-800' :
                              note.status === 'Secondary Market' ? 'bg-indigo-100 text-indigo-800' :
                              note.status === 'Paid Off' ? 'bg-gray-100 text-gray-800' :
                              note.status === 'Default' ? 'bg-red-100 text-red-800' :
                              note.status === 'Closed' ? 'bg-gray-100 text-gray-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {note.status}
                            </span>
                            <span className="text-xs text-muted-foreground">Client:</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              note.clientStatus === 'Available' ? 'bg-green-100 text-green-800' :
                              note.clientStatus === 'Funding in Progress' ? 'bg-blue-100 text-blue-800' :
                              note.clientStatus === 'Coming Soon' ? 'bg-purple-100 text-purple-800' :
                              note.clientStatus === 'Fully Funded' ? 'bg-cyan-100 text-cyan-800' :
                              note.clientStatus === 'Active' ? 'bg-green-100 text-green-800' :
                              note.clientStatus === 'Secondary Market' ? 'bg-indigo-100 text-indigo-800' :
                              note.clientStatus === 'Not Available' ? 'bg-red-100 text-red-800' :
                              note.clientStatus === 'Closed' ? 'bg-gray-100 text-gray-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {note.clientStatus}
                            </span>
                          </div>
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(note)}
                          title="Edit note"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(note)}
                          title="Delete note"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">Loan Amount</div>
                        <div className="text-base font-bold">{formatCurrency(parseFloat(note.principal))}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">Interest Rate</div>
                        <div className="text-base font-bold">{note.rate}%</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">Term</div>
                        <div className="text-base font-bold">{note.termMonths} months</div>
                      </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2 text-sm">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">Project Type</div>
                        <div>{note.projectType}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">Payment Status</div>
                        <div>{note.loanPaymentStatus}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">Contract Date</div>
                        <div>{note.contractDate ? new Date(note.contractDate).toLocaleDateString() : "N/A"}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">Maturity Date</div>
                        <div>{note.maturityDate ? new Date(note.maturityDate).toLocaleDateString() : "N/A"}</div>
                      </div>
                    </div>

                    {note.description && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground">Description</div>
                        <p className="text-xs">{note.description}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t text-xs">
                      <div className="text-xs text-muted-foreground">
                        Created {new Date(note.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => createFundingInstructions.mutate(note.id)}
                          disabled={createFundingInstructions.isPending}
                        >
                          <FileDown className="mr-2 h-4 w-4" />
                          {createFundingInstructions.isPending ? "Generating..." : "Create Funding Instructions"}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => document.getElementById(`upload-${note.id}`)?.click()}
                          disabled={uploadFundingInstructions.isPending}
                        >
                          <Upload className="mr-1.5 h-3 w-3" />
                          {uploadFundingInstructions.isPending ? "Uploading..." : "Upload PDF"}
                        </Button>
                        <input
                          id={`upload-${note.id}`}
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => handleFileUpload(note.id, e)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
          </TabsContent>

          <TabsContent value="table" className="mt-4">
            {isLoading ? (
              <Card>
                <CardContent className="p-6">Loading notes...</CardContent>
              </Card>
            ) : notes.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No notes yet. Click "Add Note" to get started.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Note ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Borrower</TableHead>
                        <TableHead className="text-right">Loan Amount</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Term</TableHead>
                        <TableHead>Backend Status</TableHead>
                        <TableHead>Client Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...notes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((note: Note) => {
                        const borrower = borrowers.find((b: any) => b.id === note.borrower);
                        return (
                          <TableRow key={note.id}>
                            <TableCell className="font-medium">{note.noteId}</TableCell>
                            <TableCell>{note.title || '-'}</TableCell>
                            <TableCell>{borrower?.businessName || "Unknown"}</TableCell>
                            <TableCell className="text-right">{formatCurrency(parseFloat(note.principal || "0"))}</TableCell>
                            <TableCell className="text-right">{note.rate}%</TableCell>
                            <TableCell className="text-right">{note.termMonths} mo</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                note.status === 'Active' ? 'bg-green-100 text-green-800' :
                                note.status === 'Funding' ? 'bg-blue-100 text-blue-800' :
                                note.status === 'Pre Register' ? 'bg-purple-100 text-purple-800' :
                                note.status === 'Under Review' ? 'bg-yellow-100 text-yellow-800' :
                                note.status === 'Approved' ? 'bg-cyan-100 text-cyan-800' :
                                note.status === 'Reselling' ? 'bg-orange-100 text-orange-800' :
                                note.status === 'Secondary Market' ? 'bg-indigo-100 text-indigo-800' :
                                note.status === 'Paid Off' ? 'bg-gray-100 text-gray-800' :
                                note.status === 'Default' ? 'bg-red-100 text-red-800' :
                                note.status === 'Closed' ? 'bg-gray-100 text-gray-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {note.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                note.clientStatus === 'Available' ? 'bg-green-100 text-green-800' :
                                note.clientStatus === 'Funding in Progress' ? 'bg-blue-100 text-blue-800' :
                                note.clientStatus === 'Coming Soon' ? 'bg-purple-100 text-purple-800' :
                                note.clientStatus === 'Fully Funded' ? 'bg-cyan-100 text-cyan-800' :
                                note.clientStatus === 'Active' ? 'bg-green-100 text-green-800' :
                                note.clientStatus === 'Secondary Market' ? 'bg-indigo-100 text-indigo-800' :
                                note.clientStatus === 'Not Available' ? 'bg-red-100 text-red-800' :
                                note.clientStatus === 'Closed' ? 'bg-gray-100 text-gray-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {note.clientStatus}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEdit(note)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDelete(note)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Note</DialogTitle>
              <DialogDescription>
                Update the loan note details and borrower information.
              </DialogDescription>
            </DialogHeader>
            <NoteForm 
              formData={formData}
              borrowers={borrowers}
              onFormDataChange={setFormData}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditDialogOpen(false)}
              submitLabel={updateNote.isPending ? "Updating..." : "Update Note"}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{selectedNote?.title}</strong>.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleteNote.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
