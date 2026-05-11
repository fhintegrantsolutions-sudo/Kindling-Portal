import { getCurrentProfile } from "@/lib/dal";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Signed in as <span className="font-medium">{profile?.email}</span>
      </p>
      <ProfileForm
        defaults={{
          first_name: profile?.first_name ?? null,
          last_name: profile?.last_name ?? null,
          phone: profile?.phone ?? null,
          address_street: profile?.address_street ?? null,
          address_city: profile?.address_city ?? null,
          address_state: profile?.address_state ?? null,
          address_zip: profile?.address_zip ?? null,
          entity_type: profile?.entity_type ?? null,
          business_name: (profile?.business_name as string | null) ?? null,
          loan_agreement_title: profile?.loan_agreement_title ?? null,
        }}
      />
    </div>
  );
}
