import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MembershipChartProps {
  data: { name: string; value: number; color: string }[];
  loading?: boolean;
}

export function MembershipChart({ data = [], loading = false }: MembershipChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.value > 0);
  const pieData = hasData
    ? data
    : [{ name: "No Data", value: 1, color: "hsl(var(--muted)/0.2)" }];

  return (
    <Card className="animate-slide-up">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Membership Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {loading ? (
            <div className="h-full w-full flex flex-col items-center justify-center space-y-4">
              <Skeleton className="h-[180px] w-[180px] rounded-full" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={hasData ? 5 : 0}
                  dataKey="value"
                  stroke="none"
                >
                  {hasData ? (
                    data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))
                  ) : (
                    <Cell fill="hsl(var(--muted)/0.2)" />
                  )}
                </Pie>
                {hasData && (
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                )}
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => (
                    <span className="text-sm text-muted-foreground">{value}</span>
                  )}
                  payload={data.map((item) => ({
                    value: item.name,
                    type: "circle",
                    id: item.name,
                    color: item.color,
                  }))}
                />
                {!hasData && (
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-muted-foreground text-sm font-medium"
                  >
                    No Data
                  </text>
                )}
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
