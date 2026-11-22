import { Link } from "react-router-dom";
import {
  QrCode,
  Flame,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useMemberPortal } from "./MemberLayout";

const DAY_NAMES: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export default function MemberOverview() {
  const { member, dashboardData, daysLeft } = useMemberPortal();
  const memberInfo = dashboardData?.member;
  const attendanceList = dashboardData?.attendance || [];
  const workoutPlan = dashboardData?.workoutPlan;
  const dietPlan = dashboardData?.dietPlan;

  // Calculate stats
  const currentMonthCheckins = attendanceList.filter((a: any) => {
    if (!a.date) return false;
    const itemDate = new Date(a.date);
    const now = new Date();
    return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Digital Pass Banner */}
      <div className="relative rounded-2xl overflow-hidden p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-zinc-900 to-black text-white border border-white/10 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/20 text-primary border border-primary/30 text-xs px-2.5 py-0.5 font-bold uppercase tracking-wider">
                Active Member Pass
              </Badge>
              <span className="text-xs text-white/60 font-mono">
                #{String(memberInfo?.id || 1).padStart(6, "0")}
              </span>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {memberInfo?.full_name || "Fitness Enthusiast"}
              </h2>
              <p className="text-white/70 text-xs sm:text-sm mt-1">
                {member?.gym_name} • Member since {memberInfo?.join_date || "2024"}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs pt-1">
              <div>
                <p className="text-white/50 uppercase font-mono text-[10px]">Plan</p>
                <p className="font-bold text-white mt-0.5">
                  {memberInfo?.gym_membership_plans?.name || memberInfo?.plan_name || "Fitness Pass"}
                </p>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div>
                <p className="text-white/50 uppercase font-mono text-[10px]">Validity</p>
                <p className="font-bold text-white mt-0.5">
                  {memberInfo?.expiry_date || "Ongoing"}
                </p>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div>
                <p className="text-white/50 uppercase font-mono text-[10px]">Days Remaining</p>
                <p className="font-bold text-primary mt-0.5">
                  {daysLeft > 0 ? `${daysLeft} Days` : "Renew Needed"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <Link
              to="/member/pass"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-glow hover:bg-primary/90 transition-all cursor-pointer"
            >
              <QrCode className="h-4 w-4" />
              View Full Pass & QR
            </Link>
            <Link
              to="/member/workouts"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/10 transition-colors"
            >
              Today's Routine
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Active Plan */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Active Plan</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight truncate max-w-[130px]">
                {memberInfo?.gym_membership_plans?.name || "Active"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                Valid until {memberInfo?.expiry_date || "Ongoing"}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Membership Status */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Status</p>
              <p className="text-lg sm:text-2xl font-bold tracking-tight capitalize text-emerald-500">
                {memberInfo?.status || "Active"}
              </p>
              <p className="text-[11px] text-muted-foreground">Gym turnstile verified</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Days Left */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Days Remaining</p>
              <p className="text-lg sm:text-2xl font-bold tracking-tight text-primary">
                {daysLeft} Days
              </p>
              <p className="text-[11px] text-muted-foreground">
                {daysLeft <= 7 ? "Expires soon" : "Healthy standing"}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Check-ins This Month */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Check-ins This Month</p>
              <p className="text-lg sm:text-2xl font-bold tracking-tight text-orange-500">
                {currentMonthCheckins} Visits
              </p>
              <p className="text-[11px] text-muted-foreground">Attendance streak</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Flame className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Recent Attendance & Today's Workout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold">Recent Check-ins</CardTitle>
              <CardDescription>Your last workout sessions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs gap-1 text-primary">
              <Link to="/member/attendance">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {attendanceList.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No check-in history logged yet.
              </p>
            ) : (
              attendanceList.slice(0, 4).map((item: any, idx: number) => (
                <div
                  key={item.id || idx}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <div>
                      <p className="font-semibold text-foreground">{item.date}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.check_in_time || "Turnstile Verified"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px]">
                    Present
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Workout Plan Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold">Today's Workout Routine</CardTitle>
              <CardDescription>
                {workoutPlan?.name || "Assigned by trainer"}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs gap-1 text-primary">
              <Link to="/member/workouts">
                Full Plan <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {!workoutPlan?.gym_workout_plan_items?.length ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No workout routine assigned yet.
              </p>
            ) : (
              workoutPlan.gym_workout_plan_items.slice(0, 3).map((ex: any) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 text-xs"
                >
                  <div>
                    <p className="font-semibold">{ex.exercise_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {DAY_NAMES[ex.day_of_week] || ex.day_of_week || "Daily"} • {ex.muscle_group ? `${ex.muscle_group} • ` : ""}Rest: {ex.rest_period || ex.rest_seconds || 60}s
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {ex.sets} Sets × {ex.reps} Reps
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Nutrition Plan Quick Banner (if assigned) */}
      {dietPlan && (
        <Card className="bg-gradient-to-r from-emerald-500/10 via-card to-card border-emerald-500/20">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                <span className="font-bold text-sm text-foreground">
                  Personalized Nutrition: {dietPlan.title || dietPlan.name}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Target: {dietPlan.daily_calorie_target || dietPlan.totalCalories || 0} kcal/day • {dietPlan.gym_diet_plan_items?.length || 0} custom meals configured
              </p>
            </div>
            <Button size="sm" asChild className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link to="/member/diet">View Full Nutrition Plan</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
