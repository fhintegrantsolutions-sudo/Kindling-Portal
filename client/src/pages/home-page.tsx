import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, PieChart, DollarSign, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function HomePage() {
  const features = [
    {
      icon: TrendingUp,
      title: "Exclusive Opportunities",
      description: "Access vetted private note investments typically reserved for institutional investors.",
    },
    {
      icon: PieChart,
      title: "Transparent Management",
      description: "Track all investments in one intuitive portal with real-time updates.",
    },
    {
      icon: DollarSign,
      title: "Consistent Returns",
      description: "Earn predictable monthly income from secured debt instruments.",
    },
  ];

  const steps = [
    { number: "1", title: "Request Access", description: "Contact us to begin the onboarding process" },
    { number: "2", title: "Get Verified", description: "Complete our simple verification process" },
    { number: "3", title: "Browse Opportunities", description: "Review curated investment opportunities" },
    { number: "4", title: "Invest & Earn", description: "Fund notes and track your returns" },
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-br from-sidebar via-sidebar/95 to-sidebar/90">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-sidebar-foreground mb-6">
            Private Note Investing, Simplified.
          </h1>
          <p className="text-lg md:text-xl text-sidebar-foreground/80 mb-8 max-w-3xl mx-auto">
            Access exclusive investment opportunities with transparent management and consistent returns.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#contact">
              <Button size="lg" className="text-base">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <Link href="/about">
              <Button size="lg" variant="outline" className="text-base bg-sidebar-foreground/10 hover:bg-sidebar-foreground/20 text-sidebar-foreground border-sidebar-foreground/20">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Value Propositions Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">Why Choose Kindling?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We provide individual investors with institutional-quality opportunities and unmatched transparency.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/60 hover:border-primary/50 transition-all duration-300">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Getting started with Kindling is simple. Follow these four steps to begin investing.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <Card key={index} className="relative">
                <CardHeader>
                  <Badge className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mb-4">
                    {step.number}
                  </Badge>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{step.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact/CTA Section */}
      <section id="contact" className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">Ready to Start Investing?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Contact us to request access to the Kindling platform and begin your private note investing journey.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <p className="text-base text-muted-foreground">Get in touch:</p>
            <a href="mailto:invest@kindling.com" className="text-primary hover:underline font-medium">
              invest@kindling.com
            </a>
          </div>
          <div className="mt-8">
            <Link href="/login">
              <Button size="lg">
                Already have an account? Login <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
