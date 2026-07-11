import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TaxFormsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>W-9</CardTitle>
          <CardDescription>
            Keep your W-9 on file up to date so we can report accurately. W-9s
            are completed and signed digitally.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="https://www.kindling.network/forms"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            Update W-9
            <ExternalLink className="ml-2 size-4" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
