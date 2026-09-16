import Link from "next/link";
import { getMyParticipations } from "@/lib/db/queries";
import { Card, CardContent } from "@/components/ui/card";
import { NotesTabs } from "./notes-tabs";

export default async function MyNotesPage() {
  const participations = await getMyParticipations();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">My Notes</h1>
        <p className="text-sm text-muted-foreground">
          Your active and historical participations.
        </p>
      </header>

      {participations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No participations yet.
            </p>
            <Link
              href="/opportunities"
              className="text-sm font-medium underline underline-offset-4"
            >
              Browse opportunities →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <NotesTabs participations={participations} />
      )}
    </div>
  );
}
