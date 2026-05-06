"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/40 bg-primary/5 p-5">
      <div>
        <p className="text-sm font-medium">Setup link for the lead</p>
        <p className="text-xs text-muted-foreground">
          Email this link to the lead. They&apos;ll fill out their legal info
          and we&apos;ll then track funding off-platform. The link expires in
          14 days.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border bg-background px-3 py-2 text-xs">
          {url}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* ignore */
            }
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
