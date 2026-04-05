import { useQuery } from "@tanstack/react-query";
import { Navigate, Link } from "react-router-dom";
import { getDashboardBundle, type MonthlyTrend } from "@/lib/backendApi";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ThemeToggle from "@/components/ThemeToggle";
import { ArrowLeft, IndianRupee, Lightbulb, LogOut, TrendingDown, TrendingUp } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Insights() {
  const { user, role, loading, signOut, isAnalyst } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-bundle"],
    queryFn: getDashboardBundle,
    enabled: isAnalyst,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAnalyst) return <Navigate to="/" replace />;

  const summary = data?.summary;
  const trends = data?.trends ?? [];
  const categories = data?.categories ?? [];
  const recent = data?.recent ?? [];

  const strongestMonth = trends.reduce<MonthlyTrend | null>((best, m) => {
    if (!best || Number(m.net) > Number(best.net)) return m;
    return best;
  }, null);

  const highestExpenseMonth = trends.reduce<MonthlyTrend | null>((worst, m) => {
    if (!worst || Number(m.expenses) > Number(worst.expenses)) return m;
    return worst;
  }, null);

  const topExpenseCategory = categories
    .filter((c) => c.type === "expense")
    .sort((a, b) => Number(b.total_amount) - Number(a.total_amount))[0];

  const topIncomeCategory = categories
    .filter((c) => c.type === "income")
    .sort((a, b) => Number(b.total_amount) - Number(a.total_amount))[0];

  const savingsRate =
    summary && Number(summary.total_income) > 0
      ? ((Number(summary.net_balance) / Number(summary.total_income)) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold">Analyst Insights</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Badge variant="secondary" className="capitalize">{role ?? "loading"}</Badge>
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-1" /> Dashboard</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Income</CardTitle></CardHeader>
                <CardContent className="text-2xl font-mono font-bold text-accent">₹{Number(summary?.total_income ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</CardContent>
              </Card>
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Expenses</CardTitle></CardHeader>
                <CardContent className="text-2xl font-mono font-bold text-destructive">₹{Number(summary?.total_expenses ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</CardContent>
              </Card>
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Net Balance</CardTitle></CardHeader>
                <CardContent className="text-2xl font-mono font-bold text-primary">₹{Number(summary?.net_balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</CardContent>
              </Card>
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Savings Rate</CardTitle></CardHeader>
                <CardContent className="text-2xl font-mono font-bold">{savingsRate}%</CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <Card className="xl:col-span-2 border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Income vs Expense vs Net (Monthly)</CardTitle>
                </CardHeader>
                <CardContent>
                  {!trends.length ? (
                    <div className="h-72 flex items-center justify-center text-muted-foreground">No trend data available.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trends}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`} />
                        <Legend />
                        <Line type="monotone" dataKey="income" name="Income" stroke="hsl(160, 60%, 45%)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="expenses" name="Expenses" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="net" name="Net" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Lightbulb className="w-5 h-5" /> Key Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-accent" /> Strongest Month</div>
                    <p className="text-muted-foreground">
                      {strongestMonth ? `${strongestMonth.month} with net ₹${Number(strongestMonth.net).toLocaleString("en-IN")}` : "No data available"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4 text-destructive" /> Highest Expense Month</div>
                    <p className="text-muted-foreground">
                      {highestExpenseMonth ? `${highestExpenseMonth.month} with expenses ₹${Number(highestExpenseMonth.expenses).toLocaleString("en-IN")}` : "No data available"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="font-medium mb-1">Top Income Category</div>
                    <p className="text-muted-foreground">
                      {topIncomeCategory ? `${topIncomeCategory.category} (₹${Number(topIncomeCategory.total_amount).toLocaleString("en-IN")})` : "No data available"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="font-medium mb-1">Top Expense Category</div>
                    <p className="text-muted-foreground">
                      {topExpenseCategory ? `${topExpenseCategory.category} (₹${Number(topExpenseCategory.total_amount).toLocaleString("en-IN")})` : "No data available"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="font-medium mb-1">Recent Activity Captured</div>
                    <p className="text-muted-foreground">{recent.length} latest records are included in trend analysis snapshots.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Category Contribution Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {!categories.length ? (
                  <div className="h-24 flex items-center justify-center text-muted-foreground">No category data available.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categories
                      .sort((a, b) => Number(b.total_amount) - Number(a.total_amount))
                      .map((cat, idx) => (
                        <div key={`${cat.category}-${cat.type}-${idx}`} className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="capitalize font-medium">{cat.category}</span>
                            <Badge variant={cat.type === "income" ? "default" : "destructive"} className="text-xs">{cat.type}</Badge>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-semibold">₹{Number(cat.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                            <div className="text-xs text-muted-foreground">{cat.record_count} records</div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
