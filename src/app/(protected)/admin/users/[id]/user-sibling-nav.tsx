import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { UserNeighbor } from "@/lib/db/admin-queries";

// Prev/next user navigation for the user detail header, so an admin auditing
// lender data can page straight through the list. A null neighbor (either end
// of the list) renders as a disabled, greyed-out control. Names can run long,
// so each label is capped and truncated rather than stretching the header.
export function UserSiblingNav({
  prev,
  next,
}: {
  prev: UserNeighbor;
  next: UserNeighbor;
}) {
  const base =
    "flex min-w-[6.5rem] max-w-[12rem] items-center justify-center gap-1 rounded-md border px-2 py-1";
  return (
    <div className="flex shrink-0 items-center gap-2 text-sm">
      {prev ? (
        <Link
          href={`/admin/users/${prev.id}`}
          title={prev.label}
          className={`${base} text-muted-foreground transition-colors hover:bg-muted/40`}
        >
          <ChevronLeft className="size-4 shrink-0" />
          <span className="truncate">{prev.label}</span>
        </Link>
      ) : (
        <span className={`${base} text-muted-foreground/40`}>
          <ChevronLeft className="size-4 shrink-0" />—
        </span>
      )}
      {next ? (
        <Link
          href={`/admin/users/${next.id}`}
          title={next.label}
          className={`${base} text-muted-foreground transition-colors hover:bg-muted/40`}
        >
          <span className="truncate">{next.label}</span>
          <ChevronRight className="size-4 shrink-0" />
        </Link>
      ) : (
        <span className={`${base} text-muted-foreground/40`}>
          —<ChevronRight className="size-4 shrink-0" />
        </span>
      )}
    </div>
  );
}
