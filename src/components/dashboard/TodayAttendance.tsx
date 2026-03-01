import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface CheckInItem {
  id: string | number;
  name: string;
  time: string;
  avatar: string;
}

interface TodayAttendanceProps {
  checkIns: CheckInItem[];
  loading?: boolean;
}

export function TodayAttendance({ checkIns = [], loading = false }: TodayAttendanceProps) {
  return (
    <Card className="animate-slide-up">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Today's Check-ins</CardTitle>
        <span className="text-sm text-muted-foreground">
          {loading ? <Skeleton className="h-4 w-12" /> : `${checkIns.length} check-ins`}
        </span>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[300px] overflow-y-auto divide-y divide-border flex flex-col">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))
          ) : checkIns.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No check-ins today yet.
            </div>
          ) : (
            checkIns.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {member.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{member.name}</p>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs">{member.time}</span>
                </div>
              </div>
            )))}
        </div>
      </CardContent>
    </Card>
  );
}
