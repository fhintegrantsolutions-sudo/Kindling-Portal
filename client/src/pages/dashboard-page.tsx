import Layout from "@/components/layout";
import { StatCard } from "@/components/stat-card";
import { NoteCard } from "@/components/note-card";
import { MOCK_USER, MOCK_NOTES } from "@/lib/mock-data";
import { DollarSign, PieChart, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const chartData = [
  { month: "Jan", interest: 850, principal: 100 },
  { month: "Feb", interest: 900, principal: 200 },
  { month: "Mar", interest: 880, principal: 170 },
  { month: "Apr", interest: 950, principal: 250 },
  { month: "May", interest: 980, principal: 270 },
  { month: "Jun", interest: 950, principal: 300 },
];

export default function DashboardPage() {
  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {MOCK_USER.name}. Here's your portfolio overview.</p>
          </div>
          <Button asChild className="bg-primary hover:bg-primary/90 shadow-sm gap-2">
            <Link href="/opportunities">
              Browse Opportunities <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Invested"
            value={`$${MOCK_USER.totalInvested.toLocaleString()}`}
            icon={DollarSign}
            description="+15% from last month"
          />
          <StatCard
            title="Active Notes"
            value={MOCK_USER.activeNotes}
            icon={PieChart}
            description="Across 3 distinct sectors"
          />
          <StatCard
            title="Est. Monthly Return"
            value={`$${MOCK_USER.monthlyReturn.toLocaleString()}`}
            icon={TrendingUp}
            description="Average yield of 10.5%"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <Card className="lg:col-span-2 border-none shadow-sm">
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
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--secondary-foreground))" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="hsl(var(--secondary-foreground))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tickMargin={10} 
                      tick={{ fill: "hsl(var(--muted-foreground))" }} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        borderColor: "hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        boxShadow: "var(--shadow-md)" 
                      }}
                      itemStyle={{ fontWeight: "bold" }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="principal" 
                      stackId="1"
                      stroke="hsl(var(--secondary-foreground))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorPrincipal)" 
                      name="Principal Repaid"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="interest" 
                      stackId="1"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorInterest)" 
                      name="Interest Income"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent/Featured Note */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-serif font-bold text-lg">Active Notes</h3>
              <Button variant="link" asChild className="h-auto p-0 text-primary">
                <Link href="/notes">View All</Link>
              </Button>
            </div>
            <div className="space-y-4">
              {MOCK_NOTES.slice(0, 2).map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
