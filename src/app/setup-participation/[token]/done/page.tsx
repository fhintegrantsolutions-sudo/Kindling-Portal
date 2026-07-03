import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

export default function SetupDonePage() {
  return (
    <div className="min-h-svh bg-background">
      <header className="border-b bg-sidebar py-6 text-sidebar-foreground">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 md:px-8">
          <Image src="/logo.png" alt="Kindling logo" width={84} height={36} priority />
        </div>
      </header>
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center md:px-8">
        <CheckCircle2 className="size-14 text-primary" />
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          Submitted
        </h1>
        <p className="text-base text-muted-foreground">
          Thanks for your information. We&apos;ll follow up shortly with funding
          instructions. Once your funds clear, you&apos;ll receive a separate
          email to set up your portal account.
        </p>
      </main>
    </div>
  );
}
