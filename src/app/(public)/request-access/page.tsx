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
            Kindling is the platform that supports note administration for the
            CoSpark community. Tell us a bit about yourself and we&apos;ll review
            your request and help you get set up.
          </p>
          <ul className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
            <li>• Built exclusively for CoSpark members</li>
            <li>• Secure access to your note information and documents</li>
            <li>• A quick review, then we&apos;ll help you get started</li>
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
