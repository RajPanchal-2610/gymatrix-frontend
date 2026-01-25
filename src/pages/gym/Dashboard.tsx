import { useState, useEffect } from "react";
import { Users, CreditCard, Activity, CalendarCheck, UserCog, AlertCircle, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { MembershipChart } from "@/components/dashboard/MembershipChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { TodayAttendance } from "@/components/dashboard/TodayAttendance";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { differenceInDays, parseISO } from "date-fns";

interface Subscription {
    status: string;
    end_date: string;
    plans: {
        name: string;
    };
}

export default function GymDashboard() {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

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
                    .in('status', ['trial', 'active'])
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

    const getDaysRemaining = () => {
        if (!subscription?.end_date) return 0;
        const today = new Date();
        const end = parseISO(subscription.end_date);
        return Math.max(0, differenceInDays(end, today));
    };

    return (
        <DashboardLayout title="Gym Dashboard">

            {/* Subscription Banner */}
            {!loading && subscription && subscription.status === 'trial' && (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Active Members"
                    value="142"
                    change="+8 this month"
                    changeType="positive"
                    icon={Users}
                    iconClassName="gradient-primary"
                />
                <StatCard
                    title="Monthly Revenue"
                    value="$5,240"
                    change="+12% vs last month"
                    changeType="positive"
                    icon={CreditCard}
                    iconClassName="bg-success"
                />
                <StatCard
                    title="Today's Check-ins"
                    value="34"
                    change="Average for Tuesday"
                    changeType="neutral"
                    icon={Activity}
                    iconClassName="gradient-accent"
                />
                <StatCard
                    title="Total Staff"
                    value="12"
                    change="2 on leave today"
                    changeType="neutral"
                    icon={UserCog}
                    iconClassName="bg-warning"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2">
                    <RevenueChart />
                </div>
                <div>
                    <MembershipChart />
                </div>
            </div>

            {/* Activity & Attendance Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TodayAttendance />
                <RecentActivity />
            </div>
        </DashboardLayout>
    );
}
