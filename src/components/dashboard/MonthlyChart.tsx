import { useQuery } from "@tanstack/react-query";
import { getDashboardBundle } from "@/lib/backendApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function MonthlyChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-bundle"],
    queryFn: getDashboardBundle,
  });

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Monthly Trends</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !data?.trends?.length ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No data yet. Add some financial records to see trends.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={[...(data?.trends ?? [])].reverse()}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`} />
              <Legend />
              <Bar dataKey="income" fill="hsl(160, 60%, 45%)" name="Income" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="hsl(0, 72%, 51%)" name="Expenses" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
