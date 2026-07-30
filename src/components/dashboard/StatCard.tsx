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
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate" title={title}>{title}</p>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-7 w-[80px]" />
                <Skeleton className="h-3 w-[100px]" />
              </div>
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight truncate" title={String(value)}>{value}</p>
                {change && (
                  <p
                    className={cn(
                      "text-xs sm:text-sm font-medium truncate hidden sm:block",
                      changeType === "positive" && "text-success",
                      changeType === "negative" && "text-destructive",
                      changeType === "neutral" && "text-muted-foreground"
                    )}
                    title={change}
                  >
                    {change}
                  </p>
                )}
              </>
            )}
          </div>
          <div
            className={cn(
              "h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0",
              iconClassName || "bg-primary/10"
            )}
          >
            <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", iconClassName ? "text-white" : "text-primary")} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
