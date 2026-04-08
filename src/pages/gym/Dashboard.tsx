import { useState, useEffect } from "react";
import { Users, CreditCard, Activity, CalendarCheck, UserCog, AlertCircle, TrendingUp, IndianRupee, Wrench, Package, Clock } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { MembershipChart } from "@/components/dashboard/MembershipChart";
import { RecentActivity, ActivityItem } from "@/components/dashboard/RecentActivity";
import { TodayAttendance, CheckInItem } from "@/components/dashboard/TodayAttendance";
import { PendingPayments, UnpaidInvoice } from "@/components/dashboard/PendingPayments";
import { MembershipAlerts, AlertMember } from "@/components/dashboard/MembershipAlerts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { differenceInDays, parseISO, subMonths, format, startOfMonth } from "date-fns";
import { useGym } from "@/hooks/useGym";
import { usePermissions } from "@/contexts/PermissionsContext";

interface Subscription {
    status: string;
    end_date: string;
    plans: {
        name: string;
    };
}

export default function GymDashboard() {
    const { gymId } = useGym();
    const { hasPermission } = usePermissions();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        activeMembers: 0,
        monthlyRevenue: 0,
        totalStaff: 0,
        pendingDues: 0,
        pendingMaintenance: 0,
        activeInventory: 0,
        upcomingExpirations: 0
    });
    const [revenueData, setRevenueData] = useState<{ name: string, revenue: number }[]>([]);
    const [membershipData, setMembershipData] = useState<{ name: string, value: number, color: string }[]>([]);
    const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
    const [todayCheckIns, setTodayCheckIns] = useState<CheckInItem[]>([]);
    const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
    const [membershipAtRisk, setMembershipAtRisk] = useState<AlertMember[]>([]);

    useEffect(() => {
        const fetchSubscription = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('subscriptions')
                    .select(`
                        status,
                        end_date,
                        plans (
                            name
                        )
                    `)
                    .eq('user_id', user.id)
                    .in('status', ['trial', 'active', 'Trial', 'Active'])
                    .maybeSingle();

                if (error) console.error("Error fetching subscription:", error);

                // transform data to match interface if needed, supabase returns array for joined tables usually but single object here
                if (data) {
                    setSubscription({
                        status: data.status,
                        end_date: data.end_date,
                        plans: Array.isArray(data.plans) ? data.plans[0] : data.plans
                    } as any);
                }

            } catch (error) {
                console.error("Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubscription();
    }, []);

    useEffect(() => {
        if (!gymId) return;

        // Reset data when gym changes to show skeletons and clear old data
        setStats({
            activeMembers: 0,
            monthlyRevenue: 0,
            totalStaff: 0,
            pendingDues: 0,
            pendingMaintenance: 0,
            activeInventory: 0,
            upcomingExpirations: 0
        });
        setRevenueData([]);
        setMembershipData([]);
        setRecentActivities([]);
        setTodayCheckIns([]);
        setUnpaidInvoices([]);
        setMembershipAtRisk([]);

        const fetchDashboardData = async () => {
            setDashboardLoading(true);
            try {
                // Fetch active members
                const { count: activeMembersCount } = await supabase
                    .from('gym_members')
                    .select('*', { count: 'exact', head: true })
                    .eq('gym_id', gymId)
                    .eq('status', 'active')
                    .eq('is_deleted', false);

                // Fetch total staff
                const { count: totalStaffCount } = await supabase
                    .from('gym_staff')
                    .select('*', { count: 'exact', head: true })
                    .eq('gym_id', gymId)
                    .eq('is_deleted', false);

                // Fetch current month revenue
                const startOfCurrentMonth = startOfMonth(new Date()).toISOString();
                const { data: currentMonthPayments } = await supabase
                    .from('gym_membership_payments')
                    .select('paid_amount')
                    .eq('gym_id', gymId)
                    .gte('created_at', startOfCurrentMonth)
                    .eq('is_deleted', false);

                const monthlyRevenue = currentMonthPayments?.reduce((sum, payment) => sum + Number(payment.paid_amount || 0), 0) || 0;

                // Fetch pending dues
                const { data: unsettledPayments } = await supabase
                    .from('gym_membership_payments')
                    .select('due_amount')
                    .eq('gym_id', gymId)
                    .neq('payment_status', 'paid')
                    .eq('is_deleted', false);
                const pendingDues = unsettledPayments?.reduce((sum, payment) => sum + Number(payment.due_amount || 0), 0) || 0;

                // Fetch pending maintenance
                const { count: pendingMaintenanceCount } = await supabase
                    .from('gym_inventory_maintenance')
                    .select('*', { count: 'exact', head: true })
                    .eq('gym_id', gymId)
                    .eq('status', 'pending');

                // Fetch active inventory items
                const { count: activeInventoryCount } = await supabase
                    .from('gym_inventory_items')
                    .select('*', { count: 'exact', head: true })
                    .eq('gym_id', gymId)
                    .eq('status', 'active');

                // Fetch today's staff check-ins
                const todayStr = format(new Date(), 'yyyy-MM-dd');
                const { data: attendanceData } = await supabase
                    .from('gym_staff_attendance')
                    .select(`
                        id,
                        attendance_date,
                        status,
                        created_at,
                        gym_staff (
                            full_name
                        )
                    `)
                    .eq('gym_id', gymId)
                    .eq('attendance_date', todayStr);

                const formattedCheckIns: CheckInItem[] = [];
                attendanceData?.forEach((record: any) => {
                    if (record.status === 'PRESENT' || record.status === 'HALF_DAY') {
                        formattedCheckIns.push({
                            id: record.id,
                            name: record.gym_staff?.full_name || "Unknown Staff",
                            time: format(new Date(record.created_at || ''), 'h:mm a'),
                            avatar: (record.gym_staff?.full_name || "US").substring(0, 2).toUpperCase()
                        });
                    }
                });
                setTodayCheckIns(formattedCheckIns);

                // Fetch Revenue Chart Data (past 6 months)
                const revChartData = [];
                for (let i = 5; i >= 0; i--) {
                    const monthStartDate = startOfMonth(subMonths(new Date(), i));
                    const monthEndDate = startOfMonth(subMonths(new Date(), i - 1));

                    const { data: monthPayments } = await supabase
                        .from('gym_membership_payments')
                        .select('paid_amount')
                        .eq('gym_id', gymId)
                        .gte('created_at', monthStartDate.toISOString())
                        .lt('created_at', monthEndDate.toISOString())
                        .eq('is_deleted', false);

                    const rev = monthPayments?.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0) || 0;
                    revChartData.push({
                        name: format(monthStartDate, 'MMM'),
                        revenue: rev
                    });
                }
                setRevenueData(revChartData);

                // Fetch Membership Status Data
                const { data: membersByStatus } = await supabase
                    .from('gym_members')
                    .select('status, expiry_date')
                    .eq('gym_id', gymId)
                    .eq('is_deleted', false);

                let active = 0, expiringSoon = 0, expired = 0;

                membersByStatus?.forEach(m => {
                    const today = new Date();
                    const expiryDate = m.expiry_date ? parseISO(m.expiry_date) : null;
                    const daysDiff = expiryDate ? differenceInDays(expiryDate, today) : null;

                    if (m.status === 'expired' || (daysDiff !== null && daysDiff < 0)) {
                        expired++;
                    } else if (m.status === 'active') {
                        if (daysDiff !== null && daysDiff >= 0 && daysDiff <= 7) {
                            expiringSoon++;
                        } else {
                            active++;
                        }
                    }
                });

                setStats({
                    activeMembers: active + expiringSoon,
                    monthlyRevenue: monthlyRevenue,
                    totalStaff: totalStaffCount || 0,
                    pendingDues: pendingDues,
                    pendingMaintenance: pendingMaintenanceCount || 0,
                    activeInventory: activeInventoryCount || 0,
                    upcomingExpirations: expiringSoon
                });

                setMembershipData([
                    { name: 'Active', value: active, color: 'hsl(var(--success))' },
                    { name: 'Expiring Soon', value: expiringSoon, color: 'hsl(var(--warning))' },
                    { name: 'Expired', value: expired, color: 'hsl(var(--destructive))' }
                ]);

                // Fetch Recent Activity
                const activities: ActivityItem[] = [];

                const { data: newMembers } = await supabase
                    .from('gym_members')
                    .select('id, full_name, created_at')
                    .eq('gym_id', gymId)
                    .eq('is_deleted', false)
                    .order('created_at', { ascending: false })
                    .limit(3);

                if (newMembers) {
                    newMembers.forEach(m => {
                        activities.push({
                            id: `mem-${m.id}`,
                            user: m.full_name,
                            action: "Joined the gym",
                            time: format(new Date(m.created_at || ''), 'MMM d, h:mm a'),
                            type: "new-member",
                            avatar: m.full_name.substring(0, 2).toUpperCase()
                        });
                    });
                }

                const { data: newPayments } = await supabase
                    .from('gym_membership_payments')
                    .select('id, paid_amount, created_at, gym_members(full_name)')
                    .eq('gym_id', gymId)
                    .gt('paid_amount', 0)
                    .eq('is_deleted', false)
                    .order('created_at', { ascending: false })
                    .limit(3);

                if (newPayments) {
                    newPayments.forEach((p: any) => {
                        const userName = p.gym_members?.full_name || "Unknown";
                        activities.push({
                            id: `pay-${p.id}`,
                            user: userName,
                            action: `Payment of ₹${p.paid_amount}`,
                            time: format(new Date(p.created_at || ''), 'MMM d, h:mm a'),
                            type: "payment",
                            avatar: userName.substring(0, 2).toUpperCase()
                        });
                    });
                }

                activities.sort((a, b) => {
                    const timeA = newMembers?.find(m => `mem-${m.id}` === a.id)?.created_at || newPayments?.find(p => `pay-${p.id}` === a.id)?.created_at || '';
                    const timeB = newMembers?.find(m => `mem-${m.id}` === b.id)?.created_at || newPayments?.find(p => `pay-${p.id}` === b.id)?.created_at || '';
                    return new Date(timeB).getTime() - new Date(timeA).getTime();
                });

                setRecentActivities(activities.slice(0, 5));

                // Fetch top unpaid invoices for Revenue Leakage
                const { data: unsettledInvoices } = await supabase
                    .from('gym_membership_payments')
                    .select('id, due_amount, billing_date, gym_members(full_name)')
                    .eq('gym_id', gymId)
                    .gt('due_amount', 0)
                    .eq('is_deleted', false)
                    .order('due_amount', { ascending: false })
                    .limit(5);

                const formattedInvoices: UnpaidInvoice[] = unsettledInvoices?.map((inv: any) => ({
                    id: inv.id,
                    memberName: inv.gym_members?.full_name || "Unknown Member",
                    amountDue: Number(inv.due_amount || 0),
                    billingDate: format(new Date(inv.billing_date), 'MMM d, yyyy')
                })) || [];

                setUnpaidInvoices(formattedInvoices);

                // Fetch memberships expiring within 7 days or already expired within the last 30 days
                const today = new Date();
                const sevenDaysFromNow = new Date();
                sevenDaysFromNow.setDate(today.getDate() + 7);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(today.getDate() - 30);

                const { data: atRiskMembers } = await supabase
                    .from('gym_members')
                    .select('id, full_name, expiry_date, status')
                    .eq('gym_id', gymId)
                    .in('status', ['active', 'expired'])
                    .gte('expiry_date', thirtyDaysAgo.toISOString().split('T')[0])
                    .lte('expiry_date', sevenDaysFromNow.toISOString().split('T')[0])
                    .eq('is_deleted', false);

                const formattedAlerts: AlertMember[] = atRiskMembers?.map((m: any) => ({
                    id: m.id,
                    name: m.full_name,
                    expiryDate: format(new Date(m.expiry_date), 'MMM d, yyyy'),
                    daysRemaining: differenceInDays(parseISO(m.expiry_date), today),
                    status: m.status as 'active' | 'expired'
                })) || [];

                // Sort: Expired first, then by days remaining
                formattedAlerts.sort((a, b) => {
                    if (a.status === 'expired' && b.status !== 'expired') return -1;
                    if (a.status !== 'expired' && b.status === 'expired') return 1;
                    return a.daysRemaining - b.daysRemaining;
                });

                setMembershipAtRisk(formattedAlerts);

            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            } finally {
                setDashboardLoading(false);
            }
        };

        fetchDashboardData();
    }, [gymId]);

    const getDaysRemaining = () => {
        if (!subscription?.end_date) return 0;
        const today = new Date();
        const end = parseISO(subscription.end_date);
        return Math.max(0, differenceInDays(end, today));
    };

    return (
        <>
            {/* Subscription Banner */}
            {!loading && subscription && subscription.status.toLowerCase() === 'trial' && (
                <div className="mb-8 animate-fade-in">
                    <Alert className="border-primary/50 bg-primary/5 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                    <AlertCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <AlertTitle className="text-lg font-bold text-foreground">
                                        Free Trial Active - {subscription.plans?.name || "Pro Plan"}
                                    </AlertTitle>
                                    <AlertDescription className="text-muted-foreground mt-1">
                                        You have <span className="font-bold text-primary">{getDaysRemaining()} days</span> remaining in your free trial.
                                        Upgrade now to unlock full access and keep your data.
                                    </AlertDescription>
                                </div>
                            </div>
                            <Button
                                onClick={() => navigate("/pricing")}
                                className="gradient-primary shadow-glow whitespace-nowrap w-full md:w-auto"
                            >
                                <TrendingUp className="mr-2 h-4 w-4" />
                                Upgrade Plan
                            </Button>
                        </div>
                    </Alert>
                </div>
            )}
            {/* Stats Row */}
            {hasPermission('view_dashboard_stats') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {hasPermission('view_members') && (
                        <StatCard
                            title="Active Members"
                            value={stats.activeMembers}
                            change="Current active"
                            changeType="neutral"
                            icon={Users}
                            iconClassName="gradient-primary"
                            loading={dashboardLoading}
                        />
                    )}
                    {hasPermission('view_revenue_summary') && (
                        <StatCard
                            title="Monthly Revenue"
                            value={`₹${stats.monthlyRevenue.toLocaleString()}`}
                            change="Current month"
                            changeType="neutral"
                            icon={CreditCard}
                            iconClassName="bg-success"
                            loading={dashboardLoading}
                        />
                    )}
                    {hasPermission('view_staff_attendance') && (
                        <StatCard
                            title="Today's Check-ins"
                            value={todayCheckIns.length}
                            change="Staff arrivals today"
                            changeType="neutral"
                            icon={Activity}
                            iconClassName="gradient-accent"
                            loading={dashboardLoading}
                        />
                    )}
                    {hasPermission('view_staff') && (
                        <StatCard
                            title="Total Staff"
                            value={stats.totalStaff}
                            change="Active staff"
                            changeType="neutral"
                            icon={UserCog}
                            iconClassName="bg-warning"
                            loading={dashboardLoading}
                        />
                    )}
                    {hasPermission('view_revenue_summary') && (
                        <StatCard
                            title="Pending Dues"
                            value={`₹${stats.pendingDues.toLocaleString()}`}
                            change="Outstanding payments"
                            changeType="negative"
                            icon={IndianRupee}
                            iconClassName="bg-red-500"
                            loading={dashboardLoading}
                        />
                    )}
                    {hasPermission('view_inventory') && (
                        <StatCard
                            title="Needs Maintenance"
                            value={stats.pendingMaintenance}
                            change="Pending repairs"
                            changeType={stats.pendingMaintenance > 0 ? "negative" : "neutral"}
                            icon={Wrench}
                            iconClassName="bg-orange-500"
                            loading={dashboardLoading}
                        />
                    )}
                    {hasPermission('view_inventory') && (
                        <StatCard
                            title="Active Inventory"
                            value={stats.activeInventory}
                            change="Total items"
                            changeType="neutral"
                            icon={Package}
                            iconClassName="bg-indigo-500"
                            loading={dashboardLoading}
                        />
                    )}
                    {hasPermission('view_members') && (
                        <StatCard
                            title="Expiring Soon"
                            value={stats.upcomingExpirations}
                            change="Within 7 days"
                            changeType={stats.upcomingExpirations > 0 ? "negative" : "neutral"}
                            icon={Clock}
                            iconClassName="bg-yellow-500"
                            loading={dashboardLoading}
                        />
                    )}
                </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {hasPermission('view_revenue_summary') && (
                    <div className="lg:col-span-2">
                        <RevenueChart data={revenueData} loading={dashboardLoading} />
                    </div>
                )}
                {hasPermission('view_members') && (
                    <div className={hasPermission('view_revenue_summary') ? "" : "lg:col-span-3"}>
                        <MembershipChart data={membershipData} loading={dashboardLoading} />
                    </div>
                )}
            </div>

            {/* Management & Alert Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {hasPermission('view_revenue_summary') && (
                    <PendingPayments
                        invoices={unpaidInvoices}
                        loading={dashboardLoading}
                        totalAmount={stats.pendingDues}
                    />
                )}
                {hasPermission('view_members') && (
                    <MembershipAlerts members={membershipAtRisk} loading={dashboardLoading} />
                )}
                {hasPermission('view_staff_attendance') && (
                    <TodayAttendance checkIns={todayCheckIns} loading={dashboardLoading} />
                )}
            </div>

            {hasPermission('view_activity_logs') && (
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                    <RecentActivity activities={recentActivities} loading={dashboardLoading} />
                </div>
            )}
        </>
    );
}
