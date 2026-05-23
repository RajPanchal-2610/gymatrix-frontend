import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Download, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth, subDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGym } from "@/hooks/useGym";
import { pdfExportService } from '@/services/pdfExportService';
import { toast } from 'sonner';

const COLORS = [
  '#0ea5e9', // Vibrant Electric Blue
  '#8b5cf6', // Bright Purple
  '#ec4899', // Pink
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#facc15'  // Yellow
];

const PlanAnalysisReport = () => {
  const navigate = useNavigate();
  const { gymId, gyms } = useGym();
  const currentGym = gyms.find(g => g.id === gymId);
  const gymName = currentGym?.name || "Gymatrix Gym";

  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(subDays(new Date(), 365)),
    to: endOfMonth(new Date()),
  });
  const [groupBy, setGroupBy] = useState<'none' | 'month' | 'year'>('none');

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['planRevenue', date?.from, date?.to, groupBy],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      if (date?.from) params.append('startDate', date.from.toISOString());
      if (date?.to) params.append('endDate', date.to.toISOString());
      params.append('groupBy', groupBy);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/plan-revenue?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    }
  });

  const handleExport = () => {
    if (!reportData?.details?.length) return;
    
    const headers = ["Date", "Member", "Plan", "Amount"];
    const csvRows = reportData.details.map((tx: any) => {
      const memberData = tx.gym_membership_payments?.gym_members;
      const memberName = (Array.isArray(memberData) ? memberData[0]?.full_name : memberData?.full_name) || 'Walking Member';
      const planName = tx.gym_membership_payments?.gym_membership_history?.gym_membership_plans?.name || 'Others';
      return [
        new Date(tx.paid_at).toLocaleDateString('en-IN'),
        `"${memberName}"`,
        `"${planName}"`,
        tx.amount
      ].join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `plan_revenue_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    if (!reportData?.details?.length) return;

    try {
      toast.loading("Generating PDF...", { id: "export-pdf" });
      
      const summaryRows = (reportData.summary || []).map((plan: any) => [
        plan.name || plan.label,
        `INR ${(plan.value || plan.amount || 0).toLocaleString()}`
      ]);

      const detailsRows = (reportData.details || []).map((tx: any) => {
        const memberData = tx.gym_membership_payments?.gym_members;
        const memberName = (Array.isArray(memberData) ? memberData[0]?.full_name : memberData?.full_name) || 'Walking Member';
        const planName = tx.gym_membership_payments?.gym_membership_history?.gym_membership_plans?.name || 'Manual Payment';
        return [
          new Date(tx.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          memberName,
          planName,
          `INR ${tx.amount.toLocaleString()}`
        ];
      });

      await pdfExportService.exportReport({
        title: "Plan Analysis Report",
        subtitle: `Period: ${date?.from ? new Date(date.from).toLocaleDateString('en-IN') : 'N/A'} - ${date?.to ? new Date(date.to).toLocaleDateString('en-IN') : 'N/A'}`,
        summary: {
          title: "Plan Breakdown Summary",
          headers: ["Plan Name", "Total Revenue"],
          rows: summaryRows
        },
        details: {
          title: "Detailed Plan Transactions",
          headers: ["Date", "Member", "Plan", "Amount"],
          rows: detailsRows
        }
      }, gymName);

      toast.success("PDF exported successfully", { id: "export-pdf" });
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("Failed to export PDF", { id: "export-pdf" });
    }
  };

  // Calculate totals for the summary section
  const getTotals = () => reportData?.summary || [];

  const planTotals = getTotals();
  const totalRevenue = planTotals.reduce((acc: number, curr: any) => acc + curr.value, 0) || 0;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Plan Analysis Report</h1>
            <p className="text-muted-foreground mt-1">Analysis of income contribution from each membership plan.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
            <SelectTrigger className="w-[140px] bg-white border border-primary/50 hover:border-primary transition-all shadow-sm text-slate-900 font-medium h-10 px-4 rounded-lg">
              <SelectValue placeholder="Group By" />
            </SelectTrigger>
            <SelectContent className="bg-white border-primary/20 text-slate-900">
              <SelectItem value="none">Total Summary</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="year">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <DateRangePicker date={date} setDate={setDate} />
          <Button 
            className="gradient-primary shadow-glow h-10"
            onClick={handleExportPDF}
            disabled={!reportData?.details?.length}
          >
            <Download className="h-4 w-4 mr-2" />
            PDF Report
          </Button>
          <Button 
            className="gradient-primary shadow-glow h-10"
            onClick={handleExport}
            disabled={!reportData?.details?.length}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-sidebar/30 backdrop-blur-sm border-sidebar-border/50 overflow-hidden">
          <CardHeader>
            <CardTitle>
              {groupBy === 'none' ? 'Revenue Distribution' : `Revenue Trend (${groupBy === 'month' ? 'Monthly' : 'Yearly'})`}
            </CardTitle>
            <CardDescription>
              {groupBy === 'none'
                ? 'Total collection breakdown by plan type'
                : `Plan-wise revenue performance over ${groupBy === 'month' ? 'months' : 'years'}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[450px] w-full">
              {isLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (groupBy === 'none' ? (
                // Simple Totals View
                reportData?.summary?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData?.summary || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                        tickFormatter={(v) => `₹${(v / 1000)}k`}
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
                        formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Total Revenue']}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={80}>
                        {(reportData?.summary || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
                    <p className="text-lg font-medium">No revenue data available</p>
                    <p className="text-sm">Try selecting a different date range.</p>
                  </div>
                )
              ) : (
                // Trend View (Stacked Bar Chart)
                reportData?.trend?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData?.trend || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="period"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#888888', fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#888888', fontSize: 12 }}
                        tickFormatter={(v) => `₹${(v / 1000)}k`}
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
                        formatter={(value, name) => [`₹${Number(value).toLocaleString()}`, name]}
                      />
                      <Legend />
                      {reportData.plans.map((plan: string, index: number) => (
                        <Bar
                          key={plan}
                          dataKey={plan}
                          stackId="a"
                          fill={COLORS[index % COLORS.length]}
                          barSize={60}
                          radius={index === reportData.plans.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
                    <p className="text-lg font-medium">No trend data found</p>
                    <p className="text-sm">No revenue recorded for the selected grouping.</p>
                  </div>
                )
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-sidebar/30 backdrop-blur-sm border-sidebar-border/50">
          <CardHeader>
            <CardTitle>Plan Breakdown Summary</CardTitle>
            <CardDescription>Consolidated totals for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 mt-4">
              <div className="space-y-6">
                {(planTotals || []).map((plan: any, idx: number) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        <span className="font-medium">{plan.name || plan.label}</span>
                      </div>
                      <span className="font-bold">₹{(plan.value || plan.amount || 0).toLocaleString()}</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${totalRevenue > 0 ? ((plan.value || plan.amount || 0) / totalRevenue) * 100 : 0}%`,
                          backgroundColor: COLORS[idx % COLORS.length]
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col justify-center items-center bg-white/5 rounded-2xl p-8 border border-white/10">
                <p className="text-sm font-medium text-muted-foreground mb-2">Total Revenue</p>
                <h3 className="text-4xl font-extrabold text-primary">₹{totalRevenue.toLocaleString()}</h3>
                <div className="flex items-center gap-2 mt-4 text-xs text-emerald-500 font-medium bg-emerald-500/10 px-3 py-1 rounded-full">
                  <span>Period Total</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Detailed Records Section */}
        <Card className="bg-sidebar/30 backdrop-blur-sm border-sidebar-border/50">
          <CardHeader>
            <CardTitle>Detailed Plan Transactions</CardTitle>
            <CardDescription>Individual plan purchases for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b border-white/10">
                  <tr className="border-b transition-colors hover:bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Member</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Plan</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
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
                          <td className="p-4 align-middle text-right font-bold text-primary">₹{tx.amount.toLocaleString()}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
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

export default PlanAnalysisReport;
