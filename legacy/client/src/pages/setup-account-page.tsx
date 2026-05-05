import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CheckCircle, Loader2 } from "lucide-react";

const setupSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SetupFormData = z.infer<typeof setupSchema>;

type TokenState =
  | { status: "loading" }
  | { status: "valid"; firstName: string; email: string }
  | { status: "invalid"; message: string; email?: string }
  | { status: "done" };

export default function SetupAccountPage() {
  const [, setLocation] = useLocation();
  const [tokenState, setTokenState] = useState<TokenState>({ status: "loading" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isRequestingNewLink, setIsRequestingNewLink] = useState(false);
  const [newLinkRequested, setNewLinkRequested] = useState(false);

  const token = new URLSearchParams(window.location.search).get("token");

  useEffect(() => {
    if (!token) {
      setTokenState({ status: "invalid", message: "No setup token found in this link." });
      return;
    }
    fetch(`/api/setup-account/validate?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setTokenState({
            status: "invalid",
            message: data.error || "This link is invalid or has expired.",
            email: data.email // Try to get email from error response
          });
        } else {
          setTokenState({ status: "valid", firstName: data.firstName, email: data.email });
        }
      })
      .catch(() => setTokenState({ status: "invalid", message: "Unable to verify your link. Please try again." }));
  }, [token]);

  const form = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: SetupFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/setup-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: values.password }),
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSubmitError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setTokenState({ status: "done" });
      setTimeout(() => setLocation("/portal"), 2500);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestNewLink = async (email: string) => {
    setIsRequestingNewLink(true);
    try {
      const response = await fetch("/api/setup-account/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Failed to send new link. Please try again.");
        return;
      }
      setNewLinkRequested(true);
    } catch {
      alert("Failed to send new link. Please try again.");
    } finally {
      setIsRequestingNewLink(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left Side */}
      <div className="hidden md:flex flex-col justify-between bg-sidebar p-12 text-sidebar-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-sidebar-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <img
              src="/attached_assets/Kindling_Logo_Transparent_1765674411263.png"
              alt="Kindling Logo"
              className="h-12 w-auto"
            />
            <span className="font-serif text-3xl font-bold text-sidebar-primary">Kindling</span>
          </div>
          <h1 className="font-serif text-5xl font-bold leading-tight mb-6">
            Almost <span className="text-sidebar-primary">there.</span>
          </h1>
          <p className="text-lg text-sidebar-foreground/70 max-w-md leading-relaxed">
            Choose a password to complete your account setup and gain access to the Kindling portal.
          </p>
        </div>
        <div className="relative z-10 text-sm text-sidebar-foreground/50">
          © {new Date().getFullYear()} Kindling. All rights reserved.
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <Card className="w-full border-none shadow-none md:shadow-lg md:border md:border-border/50">
            <CardHeader className="space-y-1">
              <div className="md:hidden flex items-center justify-center mb-6">
                <img
                  src="/attached_assets/Kindling_Logo_Transparent_1765674411263.png"
                  alt="Kindling Logo"
                  className="h-12 w-auto"
                />
              </div>
              <CardTitle className="text-2xl font-serif text-center">Set Up Your Account</CardTitle>
              <CardDescription className="text-center">
                {tokenState.status === "valid"
                  ? `Welcome, ${tokenState.firstName}! Choose a password to get started.`
                  : "Complete your Kindling account setup."}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {tokenState.status === "loading" && (
                <div className="flex flex-col items-center py-10 gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm">Verifying your link...</p>
                </div>
              )}

              {tokenState.status === "invalid" && (
                <div className="flex flex-col items-center text-center py-6 space-y-4">
                  {!newLinkRequested ? (
                    <>
                      <p className="text-destructive font-medium">{tokenState.message}</p>
                      {tokenState.email && (
                        <>
                          <p className="text-sm text-muted-foreground">
                            We can send a fresh setup link to your email address.
                          </p>
                          <Button
                            onClick={() => handleRequestNewLink(tokenState.email!)}
                            disabled={isRequestingNewLink}
                            className="w-full"
                          >
                            {isRequestingNewLink ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Sending...
                              </>
                            ) : (
                              "Request New Setup Link"
                            )}
                          </Button>
                        </>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Or contact us at{" "}
                        <a href="mailto:info@kindling.network" className="text-primary hover:underline">
                          info@kindling.network
                        </a>
                      </p>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-12 w-12 text-primary" />
                      <h3 className="text-lg font-semibold">New Link Sent!</h3>
                      <p className="text-muted-foreground">
                        Check your email for a fresh setup link. It will arrive within a few minutes.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Don't see it? Check your spam folder or{" "}
                        <a href="mailto:info@kindling.network" className="text-primary hover:underline">
                          contact support
                        </a>
                      </p>
                    </>
                  )}
                </div>
              )}

              {tokenState.status === "done" && (
                <div className="flex flex-col items-center text-center py-6 space-y-4">
                  <CheckCircle className="h-14 w-14 text-primary" />
                  <h3 className="text-xl font-semibold">Account Created!</h3>
                  <p className="text-muted-foreground">
                    Your account is ready. Taking you to the portal now...
                  </p>
                </div>
              )}

              {tokenState.status === "valid" && (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="At least 8 characters" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Re-enter your password" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {submitError && (
                      <p className="text-sm text-destructive text-center">{submitError}</p>
                    )}
                    <Button
                      type="submit"
                      className="w-full h-11 text-base bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating Account...</>
                      ) : (
                        "Create My Account"
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
