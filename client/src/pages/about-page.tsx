import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Zap, Users, HeartHandshake, Building2, TrendingUp, Landmark, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function AboutPage() {
  const benefits = [
    {
      icon: Shield,
      title: "Curated Opportunities",
      description: "Every investment is rigorously vetted by our experienced team.",
    },
    {
      icon: Zap,
      title: "Technology Platform",
      description: "Modern, intuitive tools for tracking and managing your portfolio.",
    },
    {
      icon: Users,
      title: "Transparent Fees",
      description: "Clear, straightforward pricing with no hidden charges.",
    },
    {
      icon: HeartHandshake,
      title: "Dedicated Support",
      description: "Our team is here to help you succeed at every step.",
    },
  ];

  const investmentTypes = [
    {
      icon: Building2,
      title: "Real Estate Notes",
      description: "Secured by property with steady amortizing payments and strong collateral.",
    },
    {
      icon: TrendingUp,
      title: "Venture Debt",
      description: "Growth-stage company financing offering higher yields with managed risk.",
    },
    {
      icon: Landmark,
      title: "Infrastructure",
      description: "Essential services and long-term projects with stable, predictable returns.",
    },
  ];

  const processSteps = [
    {
      title: "Sourcing",
      description: "We identify and evaluate private note opportunities across real estate, venture debt, and infrastructure sectors.",
    },
    {
      title: "Due Diligence",
      description: "Each opportunity undergoes rigorous financial and legal analysis to ensure quality and security.",
    },
    {
      title: "Investor Access",
      description: "Qualified investors receive exclusive access to fund new notes through our platform.",
    },
    {
      title: "Active Management",
      description: "We monitor borrower performance and manage payment collections on your behalf.",
    },
    {
      title: "Transparent Reporting",
      description: "Track your returns and principal repayment in real-time through our intuitive portal.",
    },
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-sidebar via-sidebar/95 to-sidebar/90">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-sidebar-foreground mb-6">
            About Kindling
          </h1>
          <p className="text-lg md:text-xl text-sidebar-foreground/80 max-w-3xl mx-auto">
            Kindling democratizes access to private note investing by providing individual investors with
            institutional-quality opportunities and transparent portfolio management.
          </p>
        </div>
      </section>

      {/* Investment Process Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">Our Investment Process</h2>
            <p className="text-lg text-muted-foreground">
              From sourcing to reporting, we handle every step with care and expertise.
            </p>
          </div>
          <div className="space-y-6">
            {processSteps.map((step, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {index + 1}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Kindling Section */}
      <section className="py-16 md:py-24 bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">Why Choose Kindling</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We combine rigorous curation with modern technology to deliver an exceptional investing experience.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="border-border/60">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{benefit.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Investment Types Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">Investment Opportunities</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Diversify your portfolio with a range of private note investments across multiple sectors.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {investmentTypes.map((type, index) => (
              <Card key={index} className="border-border/60 hover:border-primary/50 transition-all duration-300">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <type.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{type.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{type.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">Ready to Invest?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Contact us today to learn more about how Kindling can help you build wealth through private note investing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/#contact">
              <Button size="lg">
                Contact Us <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Login to Portal
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
