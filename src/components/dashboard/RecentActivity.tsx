import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const activities = [
  {
    id: 1,
    user: "Sarah Wilson",
    action: "Joined Premium Plan",
    time: "2 min ago",
    type: "new-member",
    avatar: "SW",
  },
  {
    id: 2,
    user: "Mike Johnson",
    action: "Checked in",
    time: "15 min ago",
    type: "check-in",
    avatar: "MJ",
  },
  {
    id: 3,
    user: "Emily Brown",
    action: "Payment of $120",
    time: "1 hour ago",
    type: "payment",
    avatar: "EB",
  },
  {
    id: 4,
    user: "David Lee",
    action: "Membership renewed",
    time: "2 hours ago",
    type: "renewal",
    avatar: "DL",
  },
  {
    id: 5,
    user: "Anna Chen",
    action: "Registered for yoga class",
    time: "3 hours ago",
    type: "class",
    avatar: "AC",
  },
];

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

export function RecentActivity() {
  return (
    <Card className="animate-slide-up">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {activities.map((activity) => (
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
