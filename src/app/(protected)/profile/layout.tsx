import { ProfileTabs, type ProfileTab } from "./profile-tabs";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tabs: ProfileTab[] = [
    { label: "Profile info", href: "/profile", exact: true },
    { label: "Beneficiaries", href: "/profile/beneficiaries", exact: false },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      </header>
      <ProfileTabs tabs={tabs} />
      <div>{children}</div>
    </div>
  );
}
