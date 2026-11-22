import { Dumbbell, Clock } from "lucide-react";
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

export default function MemberWorkouts() {
  const { dashboardData } = useMemberPortal();
  const workoutPlan = dashboardData?.workoutPlan;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Workout Routine</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Your personalized fitness regimen designed and updated by your gym trainers
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg">
                {workoutPlan ? (workoutPlan.title || workoutPlan.name) : "Assigned Routine"}
              </CardTitle>
              <CardDescription>
                {workoutPlan?.notes || workoutPlan?.description || "Personalized exercise schedule prescribed by your gym trainer"}
              </CardDescription>
              {workoutPlan?.start_date && workoutPlan?.end_date && (
                <p className="text-xs text-muted-foreground mt-1">
                  Active Period: {workoutPlan.start_date} → {workoutPlan.end_date}
                  {workoutPlan.gym_staff?.full_name && ` • Trainer: ${workoutPlan.gym_staff.full_name}`}
                </p>
              )}
            </div>
            {workoutPlan && <Badge className="gradient-primary text-white font-bold w-fit">Active Routine</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {!workoutPlan?.gym_workout_plan_items?.length ? (
            <div className="text-center py-12 space-y-2">
              <Dumbbell className="h-10 w-10 mx-auto text-muted-foreground/60" />
              <p className="text-sm font-semibold">No workout routine assigned yet</p>
              <p className="text-xs text-muted-foreground">
                Ask your gym trainer to assign your personal workout plan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {workoutPlan.gym_workout_plan_items.map((item: any) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-border bg-card/60 space-y-2 hover:border-primary/40 transition-colors shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {DAY_NAMES[item.day_of_week] || item.day_of_week || "Daily"}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" /> {item.rest_period || item.rest_seconds || 60}s rest
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-sm sm:text-base text-foreground">{item.exercise_name}</p>
                    {item.muscle_group && (
                      <p className="text-xs text-muted-foreground">{item.muscle_group}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono pt-1.5 border-t border-border/50">
                    <span>Sets: <strong className="text-foreground">{item.sets}</strong></span>
                    <span>Reps: <strong className="text-foreground">{item.reps}</strong></span>
                    {item.weight && (
                      <span>Wt: <strong className="text-foreground">{item.weight}kg</strong></span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-[11px] text-muted-foreground italic pt-0.5">
                      Note: {item.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
