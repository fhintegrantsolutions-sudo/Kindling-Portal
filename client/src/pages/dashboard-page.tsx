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
import { format, addMonths } from "date-fns";
import { useMemo, useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";

export default function DashboardPage() {
  const { data: participations, isLoading } = useMyParticipations();

  const chartData = useMemo(() => {
    if (!participations || participations.length === 0) return [];
    
    const monthlyData: Record<string, { month: string; interest: number; principal: number }> = {};
    
    participations.forEach((p) => {
      const invested = parseFloat(p.investedAmount);
      const notePrincipal = parseFloat(p.note.principal);
      const rate = parseFloat(p.note.rate);
      const termMonths = p.note.termMonths;
      const monthlyRate = rate / 100 / 12;
      const share = notePrincipal > 0 ? invested / notePrincipal : 0;
      
      const noteMonthlyPayment = p.note.monthlyPayment 
        ? parseFloat(p.note.monthlyPayment) 
        : (invested * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
      
      const scaledPayment = p.note.monthlyPayment ? noteMonthlyPayment * share : noteMonthlyPayment;
      
      let startDate = p.note.paymentStartDate 
        ? new Date(p.note.paymentStartDate) 
        : new Date(p.purchaseDate);
      startDate.setDate(25);
      
      let balance = invested;
      
      for (let i = 0; i < termMonths && balance > 0.01; i++) {
        const paymentDate = addMonths(startDate, i);
        const monthKey = format(paymentDate, "MMM yyyy");
        
        const interestPayment = balance * monthlyRate;
        const principalPayment = Math.min(scaledPayment - interestPayment, balance);
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { month: monthKey, interest: 0, principal: 0 };
        }
        
        monthlyData[monthKey].interest += interestPayment;
        monthlyData[monthKey].principal += principalPayment;
        
        balance -= principalPayment;
      }
    });
    
    return Object.values(monthlyData).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });
  }, [participations]);

  const currentMonthKey = format(new Date(), "MMM yyyy");
  const defaultStartIndex = useMemo(() => {
    const idx = chartData.findIndex(d => d.month === currentMonthKey);
    return idx >= 0 ? idx : 0;
  }, [chartData, currentMonthKey]);

  const [sliderValue, setSliderValue] = useState<number[]>([0]);
  
  useEffect(() => {
    if (chartData.length > 0) {
      setSliderValue([defaultStartIndex]);
    }
  }, [defaultStartIndex, chartData.length]);

  const visibleChartData = useMemo(() => {
    const startIdx = sliderValue[0];
    return chartData.slice(startIdx, startIdx + 12);
  }, [chartData, sliderValue]);

  const maxSliderValue = Math.max(0, chartData.length - 12);

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
                  <BarChart data={visibleChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tickMargin={10} 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
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
                      formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
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
              {chartData.length > 12 && (
                <div className="mt-4 px-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>{chartData[0]?.month}</span>
                    <span className="font-medium">Slide to view different time periods</span>
                    <span>{chartData[chartData.length - 1]?.month}</span>
                  </div>
                  <Slider
                    value={sliderValue}
                    onValueChange={setSliderValue}
                    max={maxSliderValue}
                    step={1}
                    className="w-full"
                    data-testid="slider-chart-timeline"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
