import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentEntityIdentity } from "@/lib/entities/context";

export default async function TaxFormsPage() {
  // Each entity files its own W-9, so an "all entities" W-9 is meaningless.
  const entity = await getCurrentEntityIdentity();

  if (!entity) {
    return (
      <p className="text-sm text-muted-foreground">
        Loan agreement details are specific to one entity. Choose an entity from
        the switcher to see its details.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>W-9 — {entity.display_name}</CardTitle>
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
