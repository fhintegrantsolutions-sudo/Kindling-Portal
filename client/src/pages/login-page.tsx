import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowRight, Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useCurrentUser } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { data: user } = useCurrentUser();
  const { toast } = useToast();

  // Capture referral code from URL, store it, and record the click
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("referralCode", ref);
      // Track the click server-side (fire and forget)
      fetch("/api/referrals/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: ref }),
      }).catch(() => {});
    }
  }, []);

  // Redirect to portal if already logged in
  useEffect(() => {
    if (user) {
      setLocation(user.role === "admin" ? "/portal/admin" : "/portal");
    }
  }, [user, setLocation]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    setLoginError(null);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setLoginError(data.error || "Invalid email or password");
        return;
      }

      const userData = await response.json();

      // Invalidate user cache so useCurrentUser picks up the session
      await queryClient.invalidateQueries({ queryKey: ["me"] });

      // Admins go to admin portal; lenders go to dashboard (or opportunities if referred)
      if (userData.role === "admin") {
        setLocation("/portal/admin");
      } else {
        setLocation("/portal");
      }
    } catch {
      setLoginError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left Side - Hero/Brand */}
      <div className="hidden md:flex flex-col justify-between bg-sidebar p-12 text-sidebar-foreground relative overflow-hidden">
        {/* Abstract Background Shapes */}
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
            Private Note Investing, <br/>
            <span className="text-sidebar-primary">Simplified.</span>
          </h1>
          <p className="text-lg text-sidebar-foreground/70 max-w-md leading-relaxed">
            Access exclusive investment opportunities with transparent management and consistent returns.
          </p>
        </div>

        <div className="relative z-10 text-sm text-sidebar-foreground/50">
          © {new Date().getFullYear()} Kindling. All rights reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <Link href="/">
            <a className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
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
              <CardTitle className="text-2xl font-serif text-center">Client Portal</CardTitle>
              <CardDescription className="text-center">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Password</FormLabel>
                          <Button variant="link" className="p-0 h-auto text-xs font-normal text-muted-foreground hover:text-primary">
                            Forgot password?
                          </Button>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="h-11 pr-10" />
                            <button
                              type="button"
                              onClick={() => setShowPassword(v => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              tabIndex={-1}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {loginError && (
                    <p className="text-sm text-destructive text-center">{loginError}</p>
                  )}
                  <Button type="submit" className="w-full h-11 text-base bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Lock className="w-4 h-4 animate-pulse" /> Authenticating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Sign In <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 text-center text-sm text-muted-foreground">
              <p>
                Don't have an account?{" "}
                <a href="/request-access" className="font-medium text-primary hover:underline">
                  Request access
                </a>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
