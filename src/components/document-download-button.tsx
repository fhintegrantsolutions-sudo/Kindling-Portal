"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { getDocumentDownloadUrl } from "@/lib/documents/actions";
import { Button } from "@/components/ui/button";

// Fetches a short-lived signed URL on click, then opens it. The bucket is
// private, so the URL is minted server-side only after an ownership + cleared
// re-check.
export function DocumentDownloadButton({ documentId }: { documentId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await getDocumentDownloadUrl(documentId);
            if (res.url) {
              window.open(res.url, "_blank", "noopener,noreferrer");
            } else {
              setError(res.error ?? "Could not open document.");
            }
          });
        }}
      >
        <Download className="size-3.5" />
        {pending ? "Opening…" : "Download"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
