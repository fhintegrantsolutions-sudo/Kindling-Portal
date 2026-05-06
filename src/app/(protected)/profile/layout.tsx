import { ProfileTabs } from "./profile-tabs";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      </header>
      <ProfileTabs />
      <div>{children}</div>
    </div>
  );
}
