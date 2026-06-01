import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Neighbor = { id: string; note_id: string } | null;

// Prev/next note navigation for the note detail header. A null neighbor (the
// ends of the list) renders as a disabled, greyed-out control.
export function NoteSiblingNav({
  prev,
  next,
}: {
  prev: Neighbor;
  next: Neighbor;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 text-sm">
      {prev ? (
        <Link
          href={`/admin/notes/${prev.id}`}
          className="flex min-w-[6.5rem] items-center justify-center gap-1 rounded-md border px-2 py-1 text-muted-foreground transition-colors hover:bg-muted/40"
        >
          <ChevronLeft className="size-4" />
          {prev.note_id}
        </Link>
      ) : (
        <span className="flex min-w-[6.5rem] items-center justify-center gap-1 rounded-md border px-2 py-1 text-muted-foreground/40">
          <ChevronLeft className="size-4" />—
        </span>
      )}
      {next ? (
        <Link
          href={`/admin/notes/${next.id}`}
          className="flex min-w-[6.5rem] items-center justify-center gap-1 rounded-md border px-2 py-1 text-muted-foreground transition-colors hover:bg-muted/40"
        >
          {next.note_id}
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className="flex min-w-[6.5rem] items-center justify-center gap-1 rounded-md border px-2 py-1 text-muted-foreground/40">
          —<ChevronRight className="size-4" />
        </span>
      )}
    </div>
  );
}
