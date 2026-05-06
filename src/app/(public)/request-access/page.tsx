import { Suspense } from "react";
import { RequestAccessForm } from "./request-access-form";

export default function RequestAccessPage() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-2 md:px-8">
        <div className="flex flex-col gap-4">
          <h1 className="font-serif text-4xl font-bold tracking-tight">
            Request access
          </h1>
          <p className="text-base text-muted-foreground">
            Tell us a bit about yourself. We&apos;ll review your request and
            reach out to start onboarding.
          </p>
          <ul className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
            <li>• Quick verification process — typically a few business days</li>
            <li>• Direct access to vetted private note opportunities</li>
            <li>• Modern portal for tracking your portfolio</li>
          </ul>
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
