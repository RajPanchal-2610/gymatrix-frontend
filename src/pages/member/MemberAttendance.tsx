import { CalendarCheck, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useMemberPortal } from "./MemberLayout";

export default function MemberAttendance() {
  const { dashboardData } = useMemberPortal();
  const attendanceList = dashboardData?.attendance || [];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Attendance History</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Complete log of your gym check-ins, workouts, and attendance streaks
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Check-in Sessions</CardTitle>
              <CardDescription>
                Turnstile and front-desk verified check-ins
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold gap-1 bg-primary/10 text-primary border-primary/20">
                <Flame className="h-3 w-3 text-primary" /> Total: {attendanceList.length} Visits
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {attendanceList.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CalendarCheck className="h-10 w-10 mx-auto text-muted-foreground/60" />
              <p className="text-sm font-semibold">No attendance records logged yet</p>
              <p className="text-xs text-muted-foreground">
                Your check-ins will automatically show here as you scan your pass at the gym entrance.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {attendanceList.map((log: any, idx: number) => (
                <div
                  key={log.id || idx}
                  className="flex items-center justify-between p-3.5 rounded-lg border border-border hover:bg-muted/30 transition-colors text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      ✓
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{log.date}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.check_in_time ? `Checked in: ${log.check_in_time}` : "Front Desk Access"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                    Present
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
