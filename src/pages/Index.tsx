import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, LogOut, IndianRupee, Users } from "lucide-react";
import SummaryCards from "@/components/dashboard/SummaryCards";
import MonthlyChart from "@/components/dashboard/MonthlyChart";
import CategorySummary from "@/components/dashboard/CategorySummary";
import RecentActivity from "@/components/dashboard/RecentActivity";
import RecordsTable from "@/components/dashboard/RecordsTable";
import RecordForm from "@/components/dashboard/RecordForm";
import ThemeToggle from "@/components/ThemeToggle";

export default function Index() {
  const { user, role, loading, signOut, isAdmin, isAnalyst } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold">Finance Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Badge variant="secondary" className="capitalize">{role ?? "loading"}</Badge>
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
            {isAdmin && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/users"><Users className="w-4 h-4 mr-1" /> Users</Link>
              </Button>
            )}
            {isAnalyst && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/analyst/insights"><BarChart3 className="w-4 h-4 mr-1" /> Insights</Link>
              </Button>
            )}
            {(isAdmin || isAnalyst) && <RecordForm />}
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <SummaryCards />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthlyChart />
          <CategorySummary />
        </div>
        <RecordsTable />
        <RecentActivity />
      </main>
    </div>
  );
}
