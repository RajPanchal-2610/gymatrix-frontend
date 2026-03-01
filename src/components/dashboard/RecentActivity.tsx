import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export interface ActivityItem {
  id: string | number;
  user: string;
  action: string;
  time: string;
  type: string;
  avatar: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  loading?: boolean;
}

const getTypeBadge = (type: string) => {
  switch (type) {
    case "new-member":
      return <Badge className="bg-primary/10 text-primary hover:bg-primary/20">New</Badge>;
    case "check-in":
      return <Badge className="bg-success/10 text-success hover:bg-success/20">Check-in</Badge>;
    case "payment":
      return <Badge className="bg-accent/10 text-accent hover:bg-accent/20">Payment</Badge>;
    case "renewal":
      return <Badge className="bg-primary/10 text-primary hover:bg-primary/20">Renewal</Badge>;
    default:
      return <Badge variant="secondary">Activity</Badge>;
  }
};

export function RecentActivity({ activities = [], loading = false }: RecentActivityProps) {
  return (
    <Card className="animate-slide-up">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))
          ) : activities.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No recent activity found.
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {activity.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{activity.user}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {activity.action}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getTypeBadge(activity.type)}
                  <span className="text-xs text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
