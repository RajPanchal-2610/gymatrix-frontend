import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Download, UserPlus, UserMinus, RefreshCcw, ArrowLeft } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth } from "date-fns";

const COLORS = [
  '#0ea5e9', // Vibrant Electric Blue
  '#8b5cf6', // Bright Purple
  '#ec4899', // Pink
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#facc15'  // Yellow
];

const MembershipLifecycleReport = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const { data: lifecycleData, isLoading } = useQuery({
    queryKey: ['membershipLifecycle', date?.from, date?.to],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      if (date?.from) params.append('startDate', date.from.toISOString());
      if (date?.to) params.append('endDate', date.to.toISOString());

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/membership-lifecycle?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    }
  });

  const getCount = (name: string) => lifecycleData?.summary?.find((d: any) => d.name === name)?.count || 0;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Membership Lifecycle</h1>
            <p className="text-muted-foreground mt-1">Tracking member acquisition, retention, and churn.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker date={date} setDate={setDate} />
          <Button className="gradient-primary shadow-glow h-10">
            <Download className="h-4 w-4 mr-2" />
            PDF Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-sidebar/30 backdrop-blur-sm border-sidebar-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">New Admissions</p>
                <p className="text-3xl font-bold">{getCount('New Admissions')}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-sidebar/30 backdrop-blur-sm border-sidebar-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Renewals</p>
                <p className="text-3xl font-bold">{getCount('Renewals')}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <RefreshCcw className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-sidebar/30 backdrop-blur-sm border-sidebar-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Expiries</p>
                <p className="text-3xl font-bold">{getCount('Expiries')}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center">
                <UserMinus className="h-6 w-6 text-rose-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-sidebar/30 backdrop-blur-sm border-sidebar-border/50 overflow-hidden">
        <CardHeader>
          <CardTitle>Member Movement</CardTitle>
          <CardDescription>Comparison of admissions vs expiries for selected period</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[400px] w-full">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : lifecycleData?.summary?.some((d: any) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lifecycleData?.summary || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#888888', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#888888', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '4px' }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[6, 6, 0, 0]}
                    barSize={80}
                  >
                    {(lifecycleData?.summary || []).map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
                <p className="text-lg font-medium">No movement data found</p>
                <p className="text-sm">No admissions, renewals, or expiries in this period.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Events Section */}
      <Card className="bg-sidebar/30 backdrop-blur-sm border-sidebar-border/50">
        <CardHeader>
          <CardTitle>Detailed Lifecycle Events</CardTitle>
          <CardDescription>Member Admissions, Renewals, and Expiries for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b border-white/10">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Member</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Event Type</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {lifecycleData?.details?.length > 0 ? (
                  lifecycleData.details.map((event: any, idx: number) => (
                    <tr key={idx} className="border-b transition-colors hover:bg-white/5">
                      <td className="p-4 align-middle text-xs text-muted-foreground">
                        {new Date(event.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="p-4 align-middle font-medium">{event.member}</td>
                      <td className="p-4 align-middle text-right">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider",
                          event.type === 'New Admission' ? "bg-emerald-500/10 text-emerald-500" :
                          event.type === 'Renewal' ? "bg-blue-500/10 text-blue-500" :
                          "bg-rose-500/10 text-rose-500"
                        )}>
                          {event.type}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-muted-foreground">
                      No lifecycle events found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MembershipLifecycleReport;
