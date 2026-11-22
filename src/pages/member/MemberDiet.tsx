import { Apple } from "lucide-react";
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

export default function MemberDiet() {
  const { dashboardData } = useMemberPortal();
  const dietPlan = dashboardData?.dietPlan;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Diet & Nutrition Plan</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Your daily nutritional breakdown, meal timings, and macronutrient targets
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg">
                {dietPlan ? (dietPlan.title || dietPlan.name) : "Assigned Nutrition Plan"}
              </CardTitle>
              <CardDescription>
                {dietPlan?.notes || "Daily macronutrient goals and customized meal plan"}
              </CardDescription>
              {dietPlan?.start_date && dietPlan?.end_date && (
                <p className="text-xs text-muted-foreground mt-1">
                  Active Period: {dietPlan.start_date} → {dietPlan.end_date}
                  {dietPlan.gym_staff?.full_name && ` • Prepared by: ${dietPlan.gym_staff.full_name}`}
                </p>
              )}
            </div>
            {dietPlan && (
              <Badge className="gradient-primary text-white font-bold w-fit">Active Diet</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!dietPlan?.gym_diet_plan_items?.length ? (
            <div className="text-center py-12 space-y-2">
              <Apple className="h-10 w-10 mx-auto text-muted-foreground/60" />
              <p className="text-sm font-semibold">No diet plan assigned yet</p>
              <p className="text-xs text-muted-foreground">
                Contact your gym nutritionist or trainer to receive your customized meal schedule.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Macronutrients Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border bg-orange-500/10 border-orange-500/20 text-center">
                  <p className="text-xs text-muted-foreground font-medium">Daily Calories</p>
                  <p className="text-xl font-bold text-orange-500 mt-0.5">
                    🔥 {dietPlan.daily_calorie_target || dietPlan.totalCalories || 0} kcal
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border bg-rose-500/10 border-rose-500/20 text-center">
                  <p className="text-xs text-muted-foreground font-medium">Protein</p>
                  <p className="text-xl font-bold text-rose-500 mt-0.5">
                    🥩 {dietPlan.totalProtein || 0}g
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/20 text-center">
                  <p className="text-xs text-muted-foreground font-medium">Carbohydrates</p>
                  <p className="text-xl font-bold text-amber-500 mt-0.5">
                    🍚 {dietPlan.totalCarbs || 0}g
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-center">
                  <p className="text-xs text-muted-foreground font-medium">Healthy Fats</p>
                  <p className="text-xl font-bold text-emerald-500 mt-0.5">
                    🥑 {dietPlan.totalFat || 0}g
                  </p>
                </div>
              </div>

              {/* Meals List */}
              <div className="space-y-3">
                {dietPlan.gym_diet_plan_items.map((meal: any) => (
                  <div
                    key={meal.id}
                    className="p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize text-xs font-semibold">
                          {meal.meal_type ? String(meal.meal_type).replace(/_/g, " ") : "Meal"}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          • {DAY_NAMES[meal.day_of_week] || "Daily"}
                        </span>
                        {meal.quantity && (
                          <span className="text-xs text-muted-foreground">
                            • Qty: {meal.quantity}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-sm sm:text-base">
                        {meal.food_item || meal.food_items || "Healthy Food Item"}
                      </p>
                      {meal.notes && (
                        <p className="text-xs text-muted-foreground italic">{meal.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground flex-shrink-0">
                      {Number(meal.calories) > 0 && <span>🔥 {meal.calories} kcal</span>}
                      {Number(meal.protein) > 0 && <span>🥩 {meal.protein}g P</span>}
                      {Number(meal.carbs) > 0 && <span>🍚 {meal.carbs}g C</span>}
                      {Number(meal.fat) > 0 && <span>🥑 {meal.fat}g F</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
