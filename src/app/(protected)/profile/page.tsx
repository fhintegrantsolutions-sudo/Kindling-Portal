import { getCurrentProfile } from "@/lib/dal";
import {
  getCurrentEntityContext,
  getCurrentEntityIdentity,
} from "@/lib/entities/context";
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
          Your mailing address is set per entity. Choose an entity from the
          switcher to view or edit it.
        </p>
      </div>
    );
  }

  const multiEntity = (ctx?.entities.length ?? 0) > 1;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Signed in as <span className="font-medium">{profile?.email}</span>
      </p>
      {multiEntity && entity ? (
        <p className="text-sm text-muted-foreground">
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
    </div>
  );
}
