import { useQuery } from "@tanstack/react-query";
import { getDashboardBundle } from "@/lib/backendApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function CategorySummary() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-bundle"],
    queryFn: getDashboardBundle,
  });

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">By Category</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !data?.categories?.length ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            No categories yet.
          </div>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {data.categories.map((cat, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{cat.category}</span>
                  <Badge variant={cat.type === "income" ? "default" : "destructive"} className="text-xs">
                    {cat.type}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold">
                    ₹{Number(cat.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground">{cat.record_count} records</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
