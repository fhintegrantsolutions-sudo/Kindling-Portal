import Link from "next/link";
import { BorrowerForm } from "../borrower-form";

export default function NewBorrowerPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <Link
        href="/admin/borrowers"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to borrowers
      </Link>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New borrower</h1>
      </header>

      <BorrowerForm
        defaults={{
          business_name: "",
          contact_name: "",
          email: "",
          phone: "",
          address: null,
          city: null,
          state: null,
          zip_code: null,
          tax_id: null,
          business_type: null,
          notes: null,
        }}
      />
    </div>
  );
}
