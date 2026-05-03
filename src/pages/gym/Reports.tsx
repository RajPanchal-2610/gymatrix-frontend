import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Filter, TrendingUp, Users, CreditCard, ChevronRight, BarChart3, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const GymReports = () => {
  const navigate = useNavigate();

  const { data: overview, isLoading } = useQuery({
    queryKey: ['reportsOverview'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/overview`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    }
  });

  // Quick stats for the overview
  const stats = [
    { 
      title: 'Total Collection', 
      value: isLoading ? '...' : `₹${Number(overview?.totalCollection || 0).toLocaleString()}`, 
      icon: CreditCard, 
      trend: overview?.collectionTrend >= 0 ? `+${overview?.collectionTrend}%` : `${overview?.collectionTrend}%`, 
      color: 'text-primary' 
    },
    { 
      title: 'Active Members', 
      value: isLoading ? '...' : (overview?.activeMembers || 0).toString(), 
      icon: Users, 
      trend: overview?.growth >= 0 ? `+${overview?.growth}%` : `${overview?.growth}%`, 
      color: 'text-purple-500' 
    },
    { 
      title: 'Retention Rate', 
      value: isLoading ? '...' : `${overview?.retention || 0}%`, 
      icon: TrendingUp, 
      trend: '+0%', // Can be enhanced later with MoM retention trend
      color: 'text-emerald-500' 
    },
  ];

  const reportCards = [
    {
      title: 'Revenue & Collection',
      description: 'Analyze your revenue trends over any time period.',
      icon: BarChart3,
      path: '/reports/collection',
      color: 'bg-blue-500/10 text-blue-500'
    },
    {
      title: 'Plan-wise Revenue',
      description: 'See which membership plans are driving your business.',
      icon: PieChartIcon,
      path: '/reports/plans',
      color: 'bg-purple-500/10 text-purple-500'
    },
    {
      title: 'Membership Lifecycle',
      description: 'Track admissions, renewals, and member churn.',
      icon: Activity,
      path: '/reports/lifecycle',
      color: 'bg-emerald-500/10 text-emerald-500'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gym Analytics & Reports</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights into your gym's financial and operational performance.
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <Card key={idx} className="bg-sidebar/30 backdrop-blur-sm border-sidebar-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <h3 className="text-3xl font-bold mt-1">{stat.value}</h3>
                </div>
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center bg-white/5 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-4">
                <span className="text-xs font-medium text-emerald-500">{stat.trend}</span>
                <span className="text-xs text-muted-foreground">from last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Report Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportCards.map((card, idx) => (
          <Card 
            key={idx} 
            className="bg-sidebar/30 backdrop-blur-sm border-sidebar-border/50 hover:border-primary/50 transition-all cursor-pointer group"
            onClick={() => navigate(card.path)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col h-full justify-between gap-6">
                <div className="space-y-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${card.color}`}>
                    <card.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{card.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                  </div>
                </div>
                <div className="flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all">
                  View Detailed Report
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GymReports;
