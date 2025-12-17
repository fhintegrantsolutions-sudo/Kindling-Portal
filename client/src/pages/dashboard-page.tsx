import Layout from "@/components/layout";
import { StatCard } from "@/components/stat-card";
import { DollarSign, PieChart, TrendingUp, ArrowRight, Info, Percent, Banknote, Gift, FileCheck } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMyParticipations, useMyActivities, formatCurrency, formatCurrencyPrecise } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const chartData = [
  { month: "Jan", interest: 850, principal: 100 },
  { month: "Feb", interest: 900, principal: 200 },
  { month: "Mar", interest: 880, principal: 170 },
  { month: "Apr", interest: 950, principal: 250 },
  { month: "May", interest: 980, principal: 270 },
  { month: "Jun", interest: 950, principal: 300 },
];

export default function DashboardPage() {
  const { data: participations, isLoading } = useMyParticipations();

  const totalInvested = participations?.reduce((sum, p) => sum + parseFloat(p.investedAmount), 0) || 0;
  const activeNotes = participations?.length || 0;
  const weightedRate = totalInvested > 0 && participations?.length
    ? participations.reduce((sum, p) => sum + parseFloat(p.investedAmount) * parseFloat(p.note.rate), 0) / totalInvested
    : 0;
  
  // Calculate monthly interest and principal for all participations
  const monthlyInterest = participations?.reduce((sum, p) => {
    const invested = parseFloat(p.investedAmount);
    const rate = parseFloat(p.note.rate);
    return sum + (invested * (rate / 100)) / 12;
  }, 0) || 0;
  
  const monthlyPrincipal = participations?.reduce((sum, p) => {
    const invested = parseFloat(p.investedAmount);
    const notePrincipal = parseFloat(p.note.principal);
    const noteMonthlyPayment = p.note.monthlyPayment ? parseFloat(p.note.monthlyPayment) : 0;
    const share = notePrincipal > 0 ? invested / notePrincipal : 0;
    const scaledPayment = noteMonthlyPayment * share;
    const interest = (invested * (parseFloat(p.note.rate) / 100)) / 12;
    return sum + Math.max(0, scaledPayment - interest);
  }, 0) || 0;
  
  const totalMonthlyPayment = monthlyInterest + monthlyPrincipal;

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-muted-foreground" data-testid="text-welcome">Welcome back, Karen. Here's your portfolio overview.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              <StatCard
                title="Total Invested"
                value={formatCurrency(totalInvested)}
                icon={DollarSign}
                description={`Across ${activeNotes} active notes`}
              />
              <StatCard
                title="Active Notes"
                value={activeNotes}
                icon={PieChart}
                description="Currently generating returns"
              />
              <Card className="border-none shadow-sm" data-testid="card-monthly-return">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-muted-foreground">Monthly Payment</p>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrencyPrecise(totalMonthlyPayment)}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Expected monthly income
                  </p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm" data-testid="card-blended-yield">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <p className="text-sm font-medium text-muted-foreground">Blended Yield</p>
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{weightedRate.toFixed(2)}%</div>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    Weighted average rate
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-sm">
                          <p>The blended yield is the weighted average interest rate across all your note investments, based on the amount invested in each note.</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div>
          {/* Main Chart */}
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-serif">Portfolio Performance</CardTitle>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--primary))]" />
                  <span>Interest</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--secondary-foreground))]" />
                  <span>Principal Repaid</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tickMargin={10} 
                      tick={{ fill: "hsl(var(--muted-foreground))" }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        borderColor: "hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        boxShadow: "var(--shadow-md)" 
                      }}
                      itemStyle={{ fontWeight: "bold" }}
                    />
                    <Bar 
                      dataKey="principal" 
                      stackId="1"
                      fill="hsl(var(--secondary-foreground))" 
                      name="Principal Repaid"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar 
                      dataKey="interest" 
                      stackId="1"
                      fill="hsl(var(--primary))" 
                      name="Interest Income"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
