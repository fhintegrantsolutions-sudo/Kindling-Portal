"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, Trash2 } from "lucide-react";
import {
  uploadParticipationDocument,
  deleteParticipationDocument,
  type DocumentActionState,
  type ParticipationDocument,
} from "@/lib/documents/actions";
import { formatDate } from "@/lib/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DocumentDownloadButton } from "@/components/document-download-button";

function formatBytes(n: number | null): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ParticipationDocuments({
  participationId,
  documents,
}: {
  participationId: string;
  documents: ParticipationDocument[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<DocumentActionState | undefined>();
  const [pending, startTransition] = useTransition();

  const upload = (formData: FormData) => {
    setState(undefined);
    startTransition(async () => {
      const res = await uploadParticipationDocument(
        participationId,
        undefined,
        formData,
      );
      setState(res);
      if (res.message) formRef.current?.reset();
    });
  };

  const remove = (id: string) => {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    setState(undefined);
    startTransition(async () => {
      const res = await deleteParticipationDocument(id);
      if (res.error) setState(res);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <p className="text-sm text-muted-foreground">
          PDFs attached to this lender&apos;s participation. Visible to the
          lender only after their funding clears.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-4 rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{d.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.type}
                      {d.size_bytes ? ` · ${formatBytes(d.size_bytes)}` : ""} ·{" "}
                      {formatDate(d.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <DocumentDownloadButton documentId={d.id} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => remove(d.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form
          ref={formRef}
          action={upload}
          className="flex flex-col gap-3 border-t pt-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Document type</Label>
            <select
              id="type"
              name="type"
              defaultValue="Acknowledgment Letter"
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="Acknowledgment Letter">
                Acknowledgment Letter
              </option>
              <option value="Amendment">Amendment</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="file">PDF file (max 25 MB)</Label>
            <Input
              id="file"
              name="file"
              type="file"
              accept="application/pdf"
              required
            />
          </div>
          {state?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          {state?.message ? (
            <Alert>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <div>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Uploading…" : "Upload document"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
