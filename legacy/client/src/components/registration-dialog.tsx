import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/lib/api";
import type { Note } from "@shared/schema";
import { formatCurrency } from "@/lib/api";

const registrationSchema = z.object({
  entityType: z.string().min(1, "Entity type is required"),
  nameForAgreement: z.string().min(1, "Name for loan agreement is required"),
  investmentAmount: z.coerce.number().min(2500, "Minimum investment is $2,500"),
  bankName: z.string().min(1, "Bank name is required"),
  bankAccountType: z.string().min(1, "Bank account type is required"),
  bankAccountNumber: z.string().min(1, "Bank account number is required"),
  bankRoutingNumber: z.string().min(9, "Valid routing number is required"),
  bankAccountAddress: z.string().optional(),
  acknowledgeLender: z.literal(true, {
    errorMap: () => ({ message: "You must acknowledge you are the lender" }),
  }),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface RegistrationDialogProps {
  opportunity: Note;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistrationSuccess?: () => void;
}

const ENTITY_TYPES = [
  "Individual",
  "Joint Tenants",
  "Tenants in Common",
  "Trust",
  "LLC",
  "Corporation",
  "Partnership",
  "IRA/Retirement Account",
];

export function RegistrationDialog({ opportunity, open, onOpenChange, onRegistrationSuccess }: RegistrationDialogProps) {
  const { toast } = useToast();
  const { data: user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      entityType: "",
      nameForAgreement: user?.name || "",
      investmentAmount: parseFloat(opportunity.minInvestment || "2500"),
      bankName: "",
      bankAccountType: "",
      bankAccountNumber: "",
      bankRoutingNumber: "",
      bankAccountAddress: "",
      acknowledgeLender: undefined as unknown as true,
    },
  });

  useEffect(() => {
    if (user) {
      setValue("nameForAgreement", user.name || "");
    }
  }, [user, setValue]);

  const acknowledgeLender = watch("acknowledgeLender");
  const minInvestment = parseFloat(opportunity.minInvestment || "2500");

  const onSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);
    try {
      const referralCode = localStorage.getItem("referralCode") || undefined;
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: opportunity.id,
          ...data,
          ...(referralCode ? { referralCode } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit registration");
      }

      toast({
        title: "Registration Submitted",
        description: `Your interest in ${opportunity.noteId} has been registered. We will contact you shortly with next steps.`,
      });
      localStorage.removeItem("referralCode");
      reset();
      onOpenChange(false);
      onRegistrationSuccess?.();
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: "There was an error submitting your registration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            Register to Participate: {opportunity.noteId}
          </DialogTitle>
          <DialogDescription>
            Complete this form to register your interest in this investment opportunity.
            Minimum investment: {formatCurrency(minInvestment)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Information for Loan Agreement</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entityType">Type of Entity *</Label>
                <Select onValueChange={(value) => setValue("entityType", value)}>
                  <SelectTrigger data-testid="select-entity-type">
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.entityType && (
                  <p className="text-sm text-destructive">{errors.entityType.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="investmentAmount">Investment Amount *</Label>
                <Input
                  id="investmentAmount"
                  type="number"
                  min={minInvestment}
                  step="100"
                  {...register("investmentAmount")}
                  data-testid="input-investment-amount"
                />
                {errors.investmentAmount && (
                  <p className="text-sm text-destructive">{errors.investmentAmount.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nameForAgreement">Name for Loan Agreement *</Label>
              <Input
                id="nameForAgreement"
                placeholder="Personal full name or entity name"
                {...register("nameForAgreement")}
                data-testid="input-name-agreement"
              />
              {errors.nameForAgreement && (
                <p className="text-sm text-destructive">{errors.nameForAgreement.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Bank Account Information</h3>
            <p className="text-sm text-muted-foreground">
              Your bank account information is required for receiving interest payments.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name *</Label>
                <Input
                  id="bankName"
                  {...register("bankName")}
                  data-testid="input-bank-name"
                />
                {errors.bankName && (
                  <p className="text-sm text-destructive">{errors.bankName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccountType">Account Type *</Label>
                <Select onValueChange={(value) => setValue("bankAccountType", value)}>
                  <SelectTrigger data-testid="select-bank-account-type">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Checking">Checking</SelectItem>
                    <SelectItem value="Savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
                {errors.bankAccountType && (
                  <p className="text-sm text-destructive">{errors.bankAccountType.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber">Account Number *</Label>
                <Input
                  id="bankAccountNumber"
                  type="password"
                  {...register("bankAccountNumber")}
                  data-testid="input-bank-account-number"
                />
                {errors.bankAccountNumber && (
                  <p className="text-sm text-destructive">{errors.bankAccountNumber.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankRoutingNumber">Routing Number *</Label>
                <Input
                  id="bankRoutingNumber"
                  {...register("bankRoutingNumber")}
                  data-testid="input-bank-routing-number"
                />
                {errors.bankRoutingNumber && (
                  <p className="text-sm text-destructive">{errors.bankRoutingNumber.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccountAddress">Bank Account Address (Optional)</Label>
              <Input
                id="bankAccountAddress"
                {...register("bankAccountAddress")}
                data-testid="input-bank-address"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Servicing of the Note</h3>
            <p className="text-sm text-muted-foreground">
              Kindling, LLC will act as the servicer for this Note. As servicer, Kindling will 
              handle collection of payments from the Borrower and distribution of payments to you, 
              the Lender, according to the terms of the Loan Agreement.
            </p>
            <div className="flex items-start space-x-3 p-4 bg-secondary/30 rounded-lg border">
              <Checkbox
                id="acknowledgeLender"
                checked={acknowledgeLender}
                onCheckedChange={(checked) => setValue("acknowledgeLender", checked === true ? true : undefined as unknown as true)}
                data-testid="checkbox-acknowledge-lender"
              />
              <div className="space-y-1">
                <Label htmlFor="acknowledgeLender" className="font-medium cursor-pointer">
                  I acknowledge I am the Lender *
                </Label>
                <p className="text-sm text-muted-foreground">
                  By checking this box, I confirm that I understand I am the Lender in this 
                  transaction and that Kindling, LLC will act as the servicer for this Note.
                </p>
              </div>
            </div>
            {errors.acknowledgeLender && (
              <p className="text-sm text-destructive">{errors.acknowledgeLender.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-registration"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              data-testid="button-submit-registration"
            >
              {isSubmitting ? "Submitting..." : "Submit Registration"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
