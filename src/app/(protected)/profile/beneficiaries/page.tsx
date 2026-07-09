import Link from "next/link";
import { getMyBeneficiaries } from "@/lib/db/queries";
import { formatDate } from "@/lib/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteBeneficiaryButton } from "./delete-button";

export default async function BeneficiariesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const beneficiaries = await getMyBeneficiaries();

  const primaryTotal = beneficiaries
    .filter((b) => b.type === "Primary")
    .reduce((sum, b) => sum + b.percentage, 0);
  const contingentTotal = beneficiaries
    .filter((b) => b.type === "Contingent")
    .reduce((sum, b) => sum + b.percentage, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          People who inherit your participation in the event of your passing.
        </p>
        <Link href="/profile/beneficiaries/new">
          <Button>Add beneficiary</Button>
        </Link>
      </div>

      {saved === "1" ? (
        <Alert>
          <AlertDescription>Beneficiary saved.</AlertDescription>
        </Alert>
      ) : null}

      {primaryTotal !== 0 && primaryTotal !== 100 ? (
        <Alert variant="destructive">
          <AlertDescription>
            Primary beneficiaries currently total {primaryTotal}%. They should
            sum to 100%.
          </AlertDescription>
        </Alert>
      ) : null}
      {contingentTotal !== 0 && contingentTotal !== 100 ? (
        <Alert variant="destructive">
          <AlertDescription>
            Contingent beneficiaries currently total {contingentTotal}%. They
            should sum to 100% (or 0% if you have none).
          </AlertDescription>
        </Alert>
      ) : null}

      {beneficiaries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No beneficiaries yet. Add one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {beneficiaries.map((b) => (
            <Card key={b.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {b.type}
                    </p>
                    <CardTitle>{b.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {b.relation}
                    </p>
                  </div>
                  <span className="rounded-full border px-2 py-0.5 text-xs">
                    {b.percentage}%
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  {b.dob ? <span>DOB {formatDate(b.dob)}</span> : null}
                  {b.phone ? <span>{b.phone}</span> : null}
                  {b.address ? <span>{b.address}</span> : null}
                </div>
                <div className="flex gap-2">
                  <Link href={`/profile/beneficiaries/${b.id}`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <DeleteBeneficiaryButton id={b.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

