import { useQuery } from "@tanstack/react-query";
import { getDashboardBundle } from "@/lib/backendApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, IndianRupee, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SummaryCards() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-bundle"],
    queryFn: getDashboardBundle,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Income",
      value: data?.summary?.total_income ?? 0,
      icon: TrendingUp,
      className: "text-accent",
    },
    {
      title: "Total Expenses",
      value: data?.summary?.total_expenses ?? 0,
      icon: TrendingDown,
      className: "text-destructive",
    },
    {
      title: "Net Balance",
      value: data?.summary?.net_balance ?? 0,
      icon: IndianRupee,
      className: "text-primary",
    },
    {
      title: "Total Records",
      value: data?.summary?.record_count ?? 0,
      icon: BarChart3,
      className: "text-muted-foreground",
      isCurrency: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            <card.icon className={`w-4 h-4 ${card.className}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono ${card.className}`}>
              {card.isCurrency === false
                ? card.value.toLocaleString()
                : `₹${Number(card.value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
