import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowRight, Lock } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setLocation("/");
    }, 1000);
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
            Access exclusive private note opportunities, manage your portfolio, and track your returns in one secure portal.
          </p>
        </div>

        <div className="relative z-10 text-sm text-sidebar-foreground/50">
          © {new Date().getFullYear()} Kindling. All rights reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md border-none shadow-none md:shadow-lg md:border md:border-border/50">
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
                        <Input type="password" placeholder="••••••••" {...field} className="h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              <Button variant="link" className="p-0 h-auto font-medium text-primary hover:underline">
                Contact Support
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
