import { useQuery } from "@tanstack/react-query";
import { getDashboardBundle } from "@/lib/backendApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface Activity {
  id: string;
  amount: number;
  type: string;
  category: string;
  record_date: string;
  notes: string | null;
  created_at: string;
}

export default function RecentActivity() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-bundle"],
    queryFn: getDashboardBundle,
  });

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !data?.recent?.length ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            No recent activity.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {data.recent.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <div className="font-medium capitalize">{item.category}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(item.record_date), "MMM d, yyyy")}
                    {item.notes && ` · ${item.notes}`}
                  </div>
                </div>
                <div className={`font-mono font-semibold ${item.type === "income" ? "text-accent" : "text-destructive"}`}>
                  {item.type === "income" ? "+" : "-"}₹{Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
