import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DollarSign } from "lucide-react";
import type { NoteRegistration, Participation } from "@shared/schema";

interface EditInvestmentDialogProps {
  registration?: NoteRegistration;
  participation?: Participation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditInvestmentDialog({ registration, participation, open, onOpenChange, onSuccess }: EditInvestmentDialogProps) {
  const { toast } = useToast();
  const initialAmount = participation
    ? participation.investedAmount
    : registration?.investmentAmount || "";
  const [investmentAmount, setInvestmentAmount] = useState(initialAmount);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens or participation changes
  useEffect(() => {
    if (open) {
      const amount = participation?.investedAmount || registration?.investmentAmount || "";
      setInvestmentAmount(amount);
    }
  }, [open, participation?.investedAmount, registration?.investmentAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate minimum investment
    const amount = parseFloat(investmentAmount);
    if (amount < 2500) {
      toast({
        title: "Invalid Amount",
        description: "Minimum investment amount is $2,500.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const endpoint = participation
        ? `/api/participations/${participation.id}`
        : `/api/registrations/${registration?.id}`;
      const bodyField = participation ? "investedAmount" : "investmentAmount";

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [bodyField]: investmentAmount,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update investment amount");
      }

      toast({
        title: "Investment Amount Updated",
        description: "Your investment amount has been successfully updated.",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "There was an error updating your investment amount. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Edit Investment Amount
          </DialogTitle>
          <DialogDescription>
            Update your intended investment amount for this opportunity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="investmentAmount">Investment Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="investmentAmount"
                type="number"
                min="2500"
                step="0.01"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                className="pl-10"
                placeholder="2500.00"
                required
                data-testid="input-investment-amount"
              />
            </div>
            <p className="text-xs text-muted-foreground">Minimum investment: $2,500</p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              data-testid="button-save-investment-amount"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
