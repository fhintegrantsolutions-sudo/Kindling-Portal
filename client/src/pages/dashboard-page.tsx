import Layout from "@/components/layout";
import { StatCard } from "@/components/stat-card";
import { DollarSign, PieChart, TrendingUp, ArrowRight, Info, Percent, Banknote, Gift, FileCheck, TrendingDown } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useMyParticipations, useMyActivities, useOpportunities, formatCurrency, formatCurrencyPrecise } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { format, addMonths } from "date-fns";
import { useMemo, useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DashboardPage() {
  const { data: participations, isLoading } = useMyParticipations();
  const { data: opportunities } = useOpportunities();
  const [projectionAmount, setProjectionAmount] = useState(2500);
  
  const nextOpportunity = opportunities?.[0];

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
  const [showFullTerm, setShowFullTerm] = useState(false);
  
  useEffect(() => {
    if (chartData.length > 0) {
      setSliderValue([defaultStartIndex]);
    }
  }, [defaultStartIndex, chartData.length]);

  const visibleChartData = useMemo(() => {
    if (showFullTerm) return chartData;
    const startIdx = sliderValue[0];
    return chartData.slice(startIdx, startIdx + 12);
  }, [chartData, sliderValue, showFullTerm]);

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

  const projectionChartData = useMemo(() => {
    const allMonths: Record<string, { month: string; current: number; withNext: number }> = {};
    
    let cumulativeCurrent = 0;
    chartData.forEach((d) => {
      cumulativeCurrent += d.interest + d.principal;
      allMonths[d.month] = { 
        month: d.month, 
        current: cumulativeCurrent, 
        withNext: cumulativeCurrent 
      };
    });
    
    if (nextOpportunity && projectionAmount >= 2500) {
      const rate = parseFloat(nextOpportunity.rate);
      const termMonths = nextOpportunity.termMonths;
      const monthlyRate = rate / 100 / 12;
      
      const monthlyPayment = (projectionAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
        (Math.pow(1 + monthlyRate, termMonths) - 1);
      
      let startDate = nextOpportunity.paymentStartDate 
        ? new Date(nextOpportunity.paymentStartDate)
        : addMonths(new Date(), 2);
      startDate.setDate(25);
      
      let balance = projectionAmount;
      let cumulativeNew = 0;
      
      for (let i = 0; i < termMonths && balance > 0.01; i++) {
        const paymentDate = addMonths(startDate, i);
        const monthKey = format(paymentDate, "MMM yyyy");
        
        const interestPayment = balance * monthlyRate;
        const principalPayment = Math.min(monthlyPayment - interestPayment, balance);
        cumulativeNew += interestPayment + principalPayment;
        
        if (!allMonths[monthKey]) {
          const lastCurrent = Object.values(allMonths).pop()?.current || cumulativeCurrent;
          allMonths[monthKey] = { month: monthKey, current: lastCurrent, withNext: lastCurrent + cumulativeNew };
        } else {
          allMonths[monthKey].withNext = allMonths[monthKey].current + cumulativeNew;
        }
        
        balance -= principalPayment;
      }
      
      const sortedMonths = Object.values(allMonths).sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });
      
      let lastWithNext = 0;
      return sortedMonths.map((m) => {
        if (m.withNext > m.current) {
          lastWithNext = m.withNext;
        } else if (lastWithNext > 0) {
          m.withNext = Math.max(m.withNext, lastWithNext);
        }
        return m;
      });
    }
    
    return Object.values(allMonths).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });
  }, [chartData, nextOpportunity, projectionAmount]);

  const projectionStats = useMemo(() => {
    if (!nextOpportunity || projectionAmount < 2500) return null;
    
    const rate = parseFloat(nextOpportunity.rate);
    const termMonths = nextOpportunity.termMonths;
    const monthlyRate = rate / 100 / 12;
    
    const monthlyPayment = (projectionAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
      (Math.pow(1 + monthlyRate, termMonths) - 1);
    
    const totalPayments = monthlyPayment * termMonths;
    const totalInterest = totalPayments - projectionAmount;
    
    return {
      monthlyPayment,
      totalInterest,
      totalReturn: totalPayments,
      rate,
      term: termMonths,
      noteId: nextOpportunity.noteId,
    };
  }, [nextOpportunity, projectionAmount]);

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
                <div className="flex items-center gap-2 border rounded-lg p-1">
                  <button
                    onClick={() => setShowFullTerm(false)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${!showFullTerm ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    data-testid="button-12-months"
                  >
                    12 Months
                  </button>
                  <button
                    onClick={() => setShowFullTerm(true)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${showFullTerm ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    data-testid="button-full-term"
                  >
                    Full Term
                  </button>
                </div>
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
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        borderColor: "hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        boxShadow: "var(--shadow-md)" 
                      }}
                      itemStyle={{ fontWeight: "bold" }}
                      formatter={(value: number, name: string) => {
                        const prefix = name === 'Principal Repaid' ? 'P: ' : 'I: ';
                        return [`${prefix}$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`];
                      }}
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
              {!showFullTerm && chartData.length > 12 && (
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

        {nextOpportunity && (
          <div>
            <Card className="border-none shadow-sm">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="font-serif">Investment Projection</CardTitle>
                    <CardDescription>
                      See how your cumulative earnings would grow by participating in {nextOpportunity.noteId}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="projection-amount" className="text-sm whitespace-nowrap">Investment Amount:</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="projection-amount"
                        type="number"
                        min={2500}
                        step={500}
                        value={projectionAmount}
                        onChange={(e) => setProjectionAmount(Math.max(2500, parseInt(e.target.value) || 2500))}
                        className="pl-7 w-32"
                        data-testid="input-projection-amount"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-3">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={projectionChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="month" 
                            axisLine={false} 
                            tickLine={false} 
                            tickMargin={10} 
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                            interval={Math.floor(projectionChartData.length / 12)}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                            tickFormatter={(value) => `$${value.toLocaleString()}`}
                          />
                          <RechartsTooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))", 
                              borderColor: "hsl(var(--border))",
                              borderRadius: "var(--radius)",
                              boxShadow: "var(--shadow-md)" 
                            }}
                            formatter={(value: number, name: string) => [
                              `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                              name === 'current' ? 'Current Portfolio' : 'With Next Note'
                            ]}
                          />
                          <Area 
                            type="monotone"
                            dataKey="current" 
                            stroke="hsl(var(--muted-foreground))"
                            fill="hsl(var(--muted-foreground)/0.2)"
                            strokeWidth={2}
                            name="Current Portfolio"
                          />
                          <Area 
                            type="monotone"
                            dataKey="withNext" 
                            stroke="hsl(var(--primary))"
                            fill="hsl(var(--primary)/0.3)"
                            strokeWidth={2}
                            name="With Next Note"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-muted-foreground/50" />
                        <span>Current Portfolio</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <span>With {nextOpportunity.noteId}</span>
                      </div>
                    </div>
                  </div>
                  
                  {projectionStats && (
                    <div className="space-y-4">
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Additional Monthly Payment</p>
                        <p className="text-xl font-bold text-primary" data-testid="text-projection-monthly">
                          +{formatCurrencyPrecise(projectionStats.monthlyPayment)}
                        </p>
                      </div>
                      <div className="p-4 bg-secondary/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Total Interest Earned</p>
                        <p className="text-xl font-bold" data-testid="text-projection-interest">
                          {formatCurrencyPrecise(projectionStats.totalInterest)}
                        </p>
                      </div>
                      <div className="p-4 bg-secondary/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Note Details</p>
                        <p className="text-sm font-medium">{projectionStats.rate}% for {projectionStats.term} months</p>
                      </div>
                      <Link href="/opportunities">
                        <Button className="w-full gap-2" data-testid="button-view-opportunity">
                          View Opportunity <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
