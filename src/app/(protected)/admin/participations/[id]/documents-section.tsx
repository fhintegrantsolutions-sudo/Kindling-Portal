"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, Trash2, UploadCloud, X } from "lucide-react";
import {
  uploadParticipationDocument,
  deleteParticipationDocument,
  type DocumentActionState,
  type ParticipationDocument,
} from "@/lib/documents/actions";
import { formatDate } from "@/lib/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const [state, setState] = useState<DocumentActionState | undefined>();
  const [staged, setStaged] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  // Add dropped/picked files to the staging list. Reject non-PDFs up front so
  // the batch never trips the server's PDF-only guard mid-upload.
  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);
    const rejected = incoming.filter((f) => f.type !== "application/pdf");
    const pdfs = incoming.filter((f) => f.type === "application/pdf");
    setState(
      rejected.length > 0
        ? { error: `Skipped ${rejected.length} non-PDF file(s). Only PDFs are allowed.` }
        : undefined,
    );
    setStaged((prev) => {
      // De-dupe by name+size so dropping the same file twice doesn't stack.
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      const fresh = pdfs.filter((f) => !seen.has(`${f.name}:${f.size}`));
      return [...prev, ...fresh];
    });
  };

  const unstage = (name: string, size: number) =>
    setStaged((prev) => prev.filter((f) => !(f.name === name && f.size === size)));

  const uploadAll = () => {
    if (staged.length === 0) return;
    const type = typeRef.current?.value ?? "Acknowledgment Letter";
    setState(undefined);
    startTransition(async () => {
      const failures: string[] = [];
      let ok = 0;
      // Sequential: keeps storage/table writes and revalidation orderly.
      for (const file of staged) {
        const fd = new FormData();
        fd.set("type", type);
        fd.set("file", file);
        const res = await uploadParticipationDocument(
          participationId,
          undefined,
          fd,
        );
        if (res.error) failures.push(`${file.name}: ${res.error}`);
        else ok += 1;
      }
      setStaged([]);
      if (inputRef.current) inputRef.current.value = "";
      setState(
        failures.length > 0
          ? { error: failures.join(" · ") }
          : { message: `Uploaded ${ok} document${ok === 1 ? "" : "s"}.` },
      );
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

        <div className="flex flex-col gap-3 border-t pt-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Document type</Label>
            <select
              id="type"
              ref={typeRef}
              defaultValue="Acknowledgment Letter"
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="Acknowledgment Letter">
                Acknowledgment Letter
              </option>
              <option value="Amendment">Amendment</option>
            </select>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />

          {/* Drag-and-drop zone (also click-to-browse). */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-8 text-center text-sm transition-colors ${
              dragging
                ? "border-primary bg-primary/5"
                : "border-input hover:bg-muted/40"
            }`}
          >
            <UploadCloud className="size-6 text-muted-foreground" />
            <span>
              <span className="font-medium">Drag &amp; drop PDFs here</span> or
              click to browse
            </span>
            <span className="text-xs text-muted-foreground">
              PDF only · max 25 MB each
            </span>
          </button>

          {staged.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {staged.map((f) => (
                <li
                  key={`${f.name}:${f.size}`}
                  className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatBytes(f.size)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => unstage(f.name, f.size)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

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
            <Button
              type="button"
              size="sm"
              disabled={pending || staged.length === 0}
              onClick={uploadAll}
            >
              {pending
                ? "Uploading…"
                : staged.length > 1
                  ? `Upload ${staged.length} documents`
                  : "Upload document"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
