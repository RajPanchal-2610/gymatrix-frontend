import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconClassName?: string;
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconClassName,
  loading = false,
}: StatCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 animate-slide-up">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-[100px]" />
                <Skeleton className="h-4 w-[140px]" />
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold tracking-tight">{value}</p>
                {change && (
                  <p
                    className={cn(
                      "text-sm font-medium",
                      changeType === "positive" && "text-success",
                      changeType === "negative" && "text-destructive",
                      changeType === "neutral" && "text-muted-foreground"
                    )}
                  >
                    {change}
                  </p>
                )}
              </>
            )}
          </div>
          <div
            className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
              iconClassName || "bg-primary/10"
            )}
          >
            <Icon className={cn("h-6 w-6", iconClassName ? "text-white" : "text-primary")} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
