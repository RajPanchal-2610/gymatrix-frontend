
import { Users, CreditCard, Activity, CalendarCheck } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";

export default function GymDashboard() {
    return (
        <DashboardLayout title="Gym Dashboard">
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
                    title="Pending Tasks"
                    value="5"
                    change="Requires attention"
                    changeType="negative"
                    icon={CalendarCheck}
                    iconClassName="bg-warning"
                />
            </div>
            <div className="bg-muted/10 rounded-lg p-8 text-center border-2 border-dashed border-muted h-64 flex items-center justify-center">
                <div>
                    <h3 className="text-lg font-medium mb-1">Your Gym Overview</h3>
                    <p className="text-muted-foreground">Manage your members, trainers, and plans here.</p>
                </div>
            </div>
        </DashboardLayout>
    );
}
