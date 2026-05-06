import { getCurrentProfile } from "@/lib/dal";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium">{profile?.email}</span>
        </p>
      </header>

      <ProfileForm
        defaults={{
          name: profile?.name ?? null,
          phone: profile?.phone ?? null,
          address_street: profile?.address_street ?? null,
          address_city: profile?.address_city ?? null,
          address_state: profile?.address_state ?? null,
          address_zip: profile?.address_zip ?? null,
          entity_type: profile?.entity_type ?? null,
          loan_agreement_title: profile?.loan_agreement_title ?? null,
        }}
      />
    </div>
  );
}
