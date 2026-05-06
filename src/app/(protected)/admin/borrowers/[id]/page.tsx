import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAdminBorrowerById,
  getNotesForBorrower,
} from "@/lib/db/admin-queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BorrowerForm } from "../borrower-form";

export default async function EditBorrowerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [borrower, notes] = await Promise.all([
    getAdminBorrowerById(id),
    getNotesForBorrower(id),
  ]);
  if (!borrower) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <Link
        href="/admin/borrowers"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to borrowers
      </Link>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {borrower.business_name}
        </h1>
      </header>

      <BorrowerForm
        borrowerId={borrower.id}
        defaults={{
          business_name: borrower.business_name,
          contact_name: borrower.contact_name,
          email: borrower.email,
          phone: borrower.phone,
          address: borrower.address,
          city: borrower.city,
          state: borrower.state,
          zip_code: borrower.zip_code,
          tax_id: borrower.tax_id,
          business_type: borrower.business_type,
          notes: borrower.notes,
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Notes from this borrower ({notes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No notes linked to this borrower yet.
            </p>
          ) : (
            notes.map((n) => (
              <Link
                key={n.id}
                href={`/admin/notes/${n.id}`}
                className="flex items-center justify-between gap-4 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">
                    {n.note_id} · {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {n.status} · {n.client_status}
                  </p>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
