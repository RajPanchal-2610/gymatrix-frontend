import { Users, UserCheck, DollarSign, AlertCircle, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { MembershipChart } from "@/components/dashboard/MembershipChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { TodayAttendance } from "@/components/dashboard/TodayAttendance";

export default function Dashboard() {
  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Members"
          value="550"
          change="+12% from last month"
          changeType="positive"
          icon={Users}
          iconClassName="gradient-primary"
        />
        <StatCard
          title="Today's Attendance"
          value="127"
          change="23% check-in rate"
          changeType="neutral"
          icon={UserCheck}
          iconClassName="bg-success"
        />
        <StatCard
          title="Monthly Revenue"
          value="$45,230"
          change="+8% from last month"
          changeType="positive"
          icon={DollarSign}
          iconClassName="gradient-accent"
        />
        <StatCard
          title="Pending Dues"
          value="$3,450"
          change="15 members"
          changeType="negative"
          icon={AlertCircle}
          iconClassName="bg-destructive"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RevenueChart data={[]} />
        <MembershipChart data={[]} />
      </div>

      {/* Activity and Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity activities={[]} />
        <TodayAttendance checkIns={[]} />
      </div>
    </>
  );
}
