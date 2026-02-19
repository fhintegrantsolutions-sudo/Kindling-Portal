import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle } from "lucide-react";

const requestAccessSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(1, "Phone number is required"),
  isTccMember: z.boolean().default(false),
  message: z.string().optional(),
});

type RequestAccessFormData = z.infer<typeof requestAccessSchema>;

export default function RequestAccessPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    // Pick up referral code from URL or localStorage
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || localStorage.getItem("referralCode");
    if (ref) {
      setReferralCode(ref);
      localStorage.setItem("referralCode", ref);
      // Track the referral click server-side
      fetch("/api/referrals/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: ref }),
      }).catch(() => {});
    }
  }, []);

  const form = useForm<RequestAccessFormData>({
    resolver: zodResolver(requestAccessSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", isTccMember: false, message: "" },
  });

  const onSubmit = async (values: RequestAccessFormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, referralCode: referralCode || undefined }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left Side - Hero/Brand */}
      <div className="hidden md:flex flex-col justify-between bg-sidebar p-12 text-sidebar-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-sidebar-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

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
            Join Our <span className="text-sidebar-primary">Network.</span>
          </h1>
          <p className="text-lg text-sidebar-foreground/70 max-w-md leading-relaxed">
            Submit your information and our team will review your request. We'll reach out to verify your details and set up your account.
          </p>
        </div>

        <div className="relative z-10 text-sm text-sidebar-foreground/50">
          © {new Date().getFullYear()} Kindling. All rights reserved.
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <Link href="/login">
            <a className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </a>
          </Link>

          <Card className="w-full border-none shadow-none md:shadow-lg md:border md:border-border/50">
            <CardHeader className="space-y-1">
              <div className="md:hidden flex items-center justify-center mb-6">
                <img
                  src="/attached_assets/Kindling_Logo_Transparent_1765674411263.png"
                  alt="Kindling Logo"
                  className="h-12 w-auto"
                />
              </div>
              <CardTitle className="text-2xl font-serif text-center">Request to Join</CardTitle>
              <CardDescription className="text-center">
                Tell us about yourself and we'll be in touch to get you set up.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {submitted ? (
                <div className="flex flex-col items-center text-center py-6 space-y-4">
                  <CheckCircle className="h-14 w-14 text-primary" />
                  <h3 className="text-xl font-semibold">Request Received</h3>
                  <p className="text-muted-foreground">
                    Thank you! Our team will review your request and reach out to you shortly to complete your account setup.
                  </p>
                  <Link href="/login">
                    <a className="text-sm text-primary hover:underline">Return to Login</a>
                  </Link>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Jane" {...field} className="h-11" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Smith" {...field} className="h-11" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="name@example.com" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="(555) 000-0000" {...field} className="h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isTccMember"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between p-3 rounded-lg border bg-secondary/20">
                            <FormLabel className="cursor-pointer">Are you a TCC member?</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us a bit about your goals..."
                              className="resize-none"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {error && (
                      <p className="text-sm text-destructive text-center">{error}</p>
                    )}
                    <Button
                      type="submit"
                      className="w-full h-11 text-base bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Submitting..." : "Request to Join"}
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
