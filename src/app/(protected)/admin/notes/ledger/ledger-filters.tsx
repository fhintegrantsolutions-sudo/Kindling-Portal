"use client";

import { useRouter } from "next/navigation";

export function LedgerFilters({
  basePath,
  month,
  borrowerId,
  borrowers,
}: {
  basePath: string;
  month: string;
  borrowerId: string | null;
  borrowers: Array<{ id: string; business_name: string }>;
}) {
  const router = useRouter();

  return (
    <select
      value={borrowerId ?? ""}
      onChange={(e) => {
        const qs = new URLSearchParams({ month });
        if (e.target.value) qs.set("borrower", e.target.value);
        router.push(`${basePath}?${qs.toString()}`);
      }}
      className="h-8 rounded-md border bg-background px-2 text-xs"
    >
      <option value="">All borrowers</option>
      {borrowers.map((b) => (
        <option key={b.id} value={b.id}>
          {b.business_name}
        </option>
      ))}
    </select>
  );
}
