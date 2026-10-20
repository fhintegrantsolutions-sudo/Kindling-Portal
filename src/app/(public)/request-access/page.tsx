import { Suspense } from "react";
import { RequestAccessForm } from "./request-access-form";

export default function RequestAccessPage() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-2 md:px-8">
        <div className="flex flex-col gap-4">
          <h1 className="font-serif text-4xl font-bold tracking-tight">
            Join Kindling
          </h1>
          <p className="text-base text-muted-foreground">
            Kindling gives CoSpark members another way to engage with their
            financial goals within the CoSpark economy.
          </p>
          <p className="text-base text-muted-foreground">
            Kindling is available exclusively to CoSpark members. Tell us a bit
            about yourself, and our team will review your request and follow up
            with you regarding next steps.
          </p>
          <ul className="mt-2 flex flex-col gap-3 text-sm text-muted-foreground">
            <li>• Available exclusively to CoSpark members</li>
            <li>• Secure access to your note information and documents</li>
            <li>• Our team reviews every request and follows up with next steps</li>
          </ul>
          <p className="mt-4 font-serif text-lg font-semibold">
            Kindling. Make more of your financial opportunities.
          </p>
        </div>
        <div>
          <Suspense
            fallback={
              <div className="rounded-lg border bg-card p-8 text-sm text-muted-foreground">
                Loading…
              </div>
            }
          >
            <RequestAccessForm />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
