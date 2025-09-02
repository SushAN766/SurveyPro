import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Users, TrendingUp, Play } from "lucide-react";

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/stats"],
    retry: false,
  });

  const statsData = [
    {
      title: "Total Surveys",
      value: stats?.totalSurveys || 0,
      icon: BarChart3,
      change: "+12%",
      trend: "up",
      color: "primary",
      testId: "stat-total-surveys"
    },
    {
      title: "Total Responses",
      value: stats?.totalResponses || 0,
      icon: Users,
      change: "+23%",
      trend: "up",
      color: "secondary",
      testId: "stat-total-responses"
    },
    {
      title: "Avg Completion Rate",
      value: `${stats?.avgCompletionRate || 0}%`,
      icon: TrendingUp,
      change: "-3%",
      trend: "down",
      color: "accent",
      testId: "stat-completion-rate"
    },
    {
      title: "Active Surveys",
      value: stats?.activeSurveys || 0,
      icon: Play,
      change: "+8%",
      trend: "up",
      color: "primary",
      testId: "stat-active-surveys"
    },
  ];

  const getIconBgColor = (color: string) => {
    switch (color) {
      case "primary":
        return "bg-primary/10 text-primary";
      case "secondary":
        return "bg-secondary/10 text-secondary";
      case "accent":
        return "bg-accent/10 text-accent";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  const getTrendColor = (trend: string) => {
    return trend === "up" ? "text-secondary" : "text-accent";
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-border">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-8 bg-muted rounded w-16"></div>
                  </div>
                  <div className="w-12 h-12 bg-muted rounded-lg"></div>
                </div>
                <div className="h-4 bg-muted rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => (
        <Card key={index} className="border-border hover:shadow-md transition-shadow" data-testid={stat.testId}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-semibold text-foreground" data-testid={`${stat.testId}-value`}>
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getIconBgColor(stat.color)}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <span className={`font-medium ${getTrendColor(stat.trend)}`}>
                {stat.change}
              </span>
              <span className="text-muted-foreground ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
