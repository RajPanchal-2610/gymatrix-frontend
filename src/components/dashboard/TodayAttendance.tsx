import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock } from "lucide-react";

const todayCheckIns = [
  { id: 1, name: "Mike Johnson", time: "6:30 AM", avatar: "MJ" },
  { id: 2, name: "Sarah Wilson", time: "7:15 AM", avatar: "SW" },
  { id: 3, name: "Emily Brown", time: "8:00 AM", avatar: "EB" },
  { id: 4, name: "David Lee", time: "8:45 AM", avatar: "DL" },
  { id: 5, name: "Anna Chen", time: "9:30 AM", avatar: "AC" },
  { id: 6, name: "James Wilson", time: "10:00 AM", avatar: "JW" },
];

export function TodayAttendance() {
  return (
    <Card className="animate-slide-up">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Today's Check-ins</CardTitle>
        <span className="text-sm text-muted-foreground">
          {todayCheckIns.length} members
        </span>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
          {todayCheckIns.map((member) => (
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
