import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { DateRange } from "react-day-picker";
import { subDays, startOfMonth, endOfMonth } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RevenueCollectionReport = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(subDays(new Date(), 365)),
    to: endOfMonth(new Date()),
  });
  const [groupBy, setGroupBy] = useState<'month' | 'year'>('month');

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['collectionReport', date?.from, date?.to, groupBy],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      if (date?.from) params.append('startDate', date.from.toISOString());
      if (date?.to) params.append('endDate', date.to.toISOString());
      params.append('groupBy', groupBy);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/collection?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    },
    enabled: !!date?.from
  });

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Revenue & Collection Report</h1>
            <p className="text-muted-foreground mt-1">Detailed breakdown of revenue trends for the selected period.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
            <SelectTrigger className="w-[130px] bg-white border border-primary/50 hover:border-primary transition-all shadow-sm text-slate-900 font-medium h-10 px-4 rounded-lg">
              <SelectValue placeholder="Group By" />
            </SelectTrigger>
            <SelectContent className="bg-white border-primary/20 text-slate-900">
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="year">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <DateRangePicker date={date} setDate={setDate} />
          <Button className="gradient-primary shadow-glow h-10">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-sidebar/30 backdrop-blur-sm border-sidebar-border/50 overflow-hidden">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>
              Collection grouped by {groupBy === 'month' ? 'month' : 'year'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[400px] w-full">
              {isLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : reportData?.summary?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData?.summary || []}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity={1} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#888888', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#888888', fontSize: 12 }}
                      tickFormatter={(value) => `₹${value.toLocaleString()}`}
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
                      itemStyle={{ color: '#0ea5e9' }}
                      formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Amount']}
                    />
                    <Bar
                      dataKey="amount"
                      radius={[6, 6, 0, 0]}
                      fill="url(#barGradient)"
                      barSize={80}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
                  <p className="text-lg font-medium">No collection data found</p>
                  <p className="text-sm">Try selecting a different date range or grouping.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-sidebar/30 backdrop-blur-sm border-sidebar-border/50">
          <CardHeader>
            <CardTitle>Collection Summary</CardTitle>
            <CardDescription>Breakdown for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b border-white/10">
                  <tr className="border-b transition-colors hover:bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Period</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Total Collection</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {reportData?.summary?.length > 0 ? (
                    reportData.summary.map((row: any, idx: number) => (
                      <tr key={idx} className="border-b transition-colors hover:bg-white/5">
                        <td className="p-4 align-middle font-medium">{row.label}</td>
                        <td className="p-4 align-middle text-right font-bold text-primary">₹{row.amount.toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="p-8 text-center text-muted-foreground">
                        No transactions found for the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Records Section */}
        <Card className="bg-sidebar/30 backdrop-blur-sm border-sidebar-border/50">
          <CardHeader>
            <CardTitle>Detailed Transaction Records</CardTitle>
            <CardDescription>Individual collection entries for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b border-white/10">
                  <tr className="border-b transition-colors hover:bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Member</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Plan</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Amount</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {reportData?.details?.length > 0 ? (
                    reportData.details.map((tx: any, idx: number) => {
                      const memberData = tx.gym_membership_payments?.gym_members;
                      const memberName = (Array.isArray(memberData) ? memberData[0]?.full_name : memberData?.full_name) || 'Walking Member';
                      const planName = tx.gym_membership_payments?.gym_membership_history?.gym_membership_plans?.name || 'Manual Payment';
                      
                      return (
                        <tr key={idx} className="border-b transition-colors hover:bg-white/5">
                          <td className="p-4 align-middle text-xs text-muted-foreground">
                            {new Date(tx.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </td>
                          <td className="p-4 align-middle font-medium">{memberName}</td>
                          <td className="p-4 align-middle text-xs text-muted-foreground">{planName}</td>
                          <td className="p-4 align-middle font-bold text-primary">₹{tx.amount.toLocaleString()}</td>
                          <td className="p-4 align-middle text-right">
                            <span className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider">Received</span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No individual records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RevenueCollectionReport;
