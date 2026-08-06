import { ExternalLink } from "lucide-react";
import { getCurrentProfile } from "@/lib/dal";
import {
  getCurrentEntityContext,
  getCurrentEntityIdentity,
} from "@/lib/entities/context";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const [profile, ctx, entity] = await Promise.all([
    getCurrentProfile(),
    getCurrentEntityContext(),
    // Identity of the SELECTED entity — null in "all" mode.
    getCurrentEntityIdentity(),
  ]);

  // The mailing address belongs to an ENTITY, not the login, so it can only be
  // shown/edited against one concrete entity. In "all" mode there's no target.
  if (ctx?.mode === "all") {
    return (
      <div className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium">{profile?.email}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Your mailing address, loan agreement details, and W-9 are set per
          entity. Choose an entity from the switcher to view them.
        </p>
      </div>
    );
  }

  const multiEntity = (ctx?.entities.length ?? 0) > 1;

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted-foreground">
        Signed in as <span className="font-medium">{profile?.email}</span>
      </p>
      {multiEntity && entity ? (
        <p className="-mt-4 text-sm text-muted-foreground">
          Mailing address for{" "}
          <span className="font-medium text-foreground">
            {entity.display_name}
          </span>
          . Each entity has its own.
        </p>
      ) : null}
      <ProfileForm
        defaults={{
          first_name: profile?.first_name ?? null,
          last_name: profile?.last_name ?? null,
          phone: profile?.phone ?? null,
          address_street: entity?.address_street ?? null,
          address_city: entity?.address_city ?? null,
          address_state: entity?.address_state ?? null,
          address_zip: entity?.address_zip ?? null,
        }}
      />

      {entity ? (
        <>
          {/* Loan agreement — admin-managed, read-only here (moved from its
              own tab). */}
          <section className="flex flex-col gap-4 border-t pt-6">
            <div>
              <h2 className="text-base font-semibold">Loan agreement</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These details appear on your loan agreements and can&apos;t be
                changed here. To update them, email{" "}
                <a
                  href="mailto:info@kindling.network"
                  className="underline underline-offset-4"
                >
                  info@kindling.network
                </a>
                .
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadonlyField label="Entity type" value={entity.entity_type} />
              {entity.entity_type && entity.entity_type !== "Individual" ? (
                <ReadonlyField
                  label="Business / entity name"
                  value={entity.business_name}
                />
              ) : null}
              <ReadonlyField
                label="Loan agreement title"
                value={entity.loan_agreement_title}
              />
            </div>
          </section>

          {/* W-9 — completed via the external digital form (moved from the
              Tax forms tab). */}
          <section className="flex flex-col gap-3 border-t pt-6">
            <div>
              <h2 className="text-base font-semibold">W-9</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep your W-9 on file up to date so we can report accurately.
                W-9s are completed and signed digitally.
              </p>
            </div>
            <div>
              <a
                href="https://www.kindling.network/forms"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline" })}
              >
                Update W-9
                <ExternalLink className="ml-2 size-4" />
              </a>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function ReadonlyField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
        {value ?? <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}
