import { useState } from "react";
import { Users, CreditCard, Activity, UserCog, IndianRupee, Wrench, Package, Clock } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { MembershipChart } from "@/components/dashboard/MembershipChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { TodayAttendance } from "@/components/dashboard/TodayAttendance";
import { PendingPayments } from "@/components/dashboard/PendingPayments";
import { MembershipAlerts } from "@/components/dashboard/MembershipAlerts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function GymDashboard2() {
    const [activeDashboard, setActiveDashboard] = useState<"general" | "trainer">("general");

    // Static stats for Gym Overview (General)
    const stats = {
        activeMembers: 148,
        monthlyRevenue: 185000,
        totalStaff: 12,
        pendingDues: 24500,
        pendingMaintenance: 2,
        activeInventory: 45,
        upcomingExpirations: 8
    };

    // Static stats for My Workspace (Trainer)
    const trainerStats = {
        activeClients: 15,
        monthlyPtRevenue: 45000,
        outstandingPtDues: 8400,
        expiringPtCount: 2
    };

    // Revenue Chart Data (past 6 months)
    const revenueData = [
        { name: "Jan", revenue: 120000 },
        { name: "Feb", revenue: 135000 },
        { name: "Mar", revenue: 140000 },
        { name: "Apr", revenue: 155000 },
        { name: "May", revenue: 170000 },
        { name: "Jun", revenue: 185000 }
    ];

    // Membership Chart Data
    const membershipData = [
        { name: 'Active', value: 118, color: 'hsl(var(--success))' },
        { name: 'Expiring Soon', value: 8, color: 'hsl(var(--warning))' },
        { name: 'Expired', value: 22, color: 'hsl(var(--destructive))' }
    ];

    // Unpaid Invoices (General)
    const unpaidInvoices = [
        { id: "inv-1", memberName: "Aarav Patel", amountDue: 5000, billingDate: "Jun 15, 2026" },
        { id: "inv-2", memberName: "Ananya Joshi", amountDue: 3500, billingDate: "Jun 18, 2026" },
        { id: "inv-3", memberName: "Rohan Gupta", amountDue: 4200, billingDate: "Jun 20, 2026" },
        { id: "inv-4", memberName: "Ishaan Verma", amountDue: 6000, billingDate: "Jun 21, 2026" },
        { id: "inv-5", memberName: "Diya Malhotra", amountDue: 5800, billingDate: "Jun 22, 2026" }
    ];

    // Membership Alerts (General)
    const membershipAtRisk = [
        { id: "risk-1", name: "Kiara Sen", expiryDate: "Jun 21, 2026", daysRemaining: -3, status: 'expired' as const },
        { id: "risk-2", name: "Vihaan Sharma", expiryDate: "Jun 26, 2026", daysRemaining: 2, status: 'active' as const },
        { id: "risk-3", name: "Aditya Iyer", expiryDate: "Jun 28, 2026", daysRemaining: 4, status: 'active' as const },
        { id: "risk-4", name: "Arjun Nair", expiryDate: "Jun 29, 2026", daysRemaining: 5, status: 'active' as const },
        { id: "risk-5", name: "Sai Reddy", expiryDate: "Jun 30, 2026", daysRemaining: 6, status: 'active' as const }
    ];

    // Today's Check-ins (Staff/Members)
    const todayCheckIns = [
        { id: "check-1", name: "Amit Deshmukh", time: "06:30 AM", avatar: "AD" },
        { id: "check-2", name: "Priya Patil", time: "07:15 AM", avatar: "PP" },
        { id: "check-3", name: "Rajesh Kumar", time: "08:00 AM", avatar: "RK" },
        { id: "check-4", name: "Sunita Singh", time: "08:30 AM", avatar: "SS" },
        { id: "check-5", name: "Rahul Patel", time: "09:00 AM", avatar: "RP" }
    ];

    // Recent Activities (General)
    const recentActivities = [
        { id: "act-1", user: "Kabir Chawla", action: "Payment of ₹15,000", time: "Jun 24, 09:30 AM", type: "payment", avatar: "KC" },
        { id: "act-2", user: "Prisha Bose", action: "Joined the gym", time: "Jun 24, 08:45 AM", type: "new-member", avatar: "PB" },
        { id: "act-3", user: "Reyansh Rao", action: "Payment of ₹7,500", time: "Jun 23, 05:15 PM", type: "payment", avatar: "RR" },
        { id: "act-4", user: "Kavya Pillai", action: "Joined the gym", time: "Jun 23, 04:30 PM", type: "new-member", avatar: "KP" },
        { id: "act-5", user: "Vivaan Kapoor", action: "Payment of ₹10,000", time: "Jun 23, 11:15 AM", type: "payment", avatar: "VK" }
    ];

    // Trainer Workspace Alerts
    const ptAlerts = [
        { id: "pt-risk-1", name: "Amit Deshmukh", expiryDate: "Jun 28, 2026", daysRemaining: 4, status: 'active' as const },
        { id: "pt-risk-2", name: "Priya Patil", expiryDate: "Jun 30, 2026", daysRemaining: 6, status: 'active' as const }
    ];

    // Trainer Workspace Unpaid Invoices
    const ptInvoices = [
        { id: "pt-inv-1", memberName: "Rahul Patel", amountDue: 4500, billingDate: "Jun 18, 2026" },
        { id: "pt-inv-2", memberName: "Sunita Singh", amountDue: 3900, billingDate: "Jun 20, 2026" }
    ];

    // Trainer Workspace Client List
    const ptClientsList = [
        { id: "client-1", name: "Amit Deshmukh", expiryDate: "28 Jun 2026", ptExpiryDate: "28 Jun 2026", ptFee: 15000, ptStatus: "active" },
        { id: "client-2", name: "Priya Patil", expiryDate: "30 Jun 2026", ptExpiryDate: "30 Jun 2026", ptFee: 15000, ptStatus: "active" },
        { id: "client-3", name: "Rahul Patel", expiryDate: "18 Jun 2026", ptExpiryDate: "18 Jun 2026", ptFee: 15000, ptStatus: "expired" },
        { id: "client-4", name: "Sunita Singh", expiryDate: "20 Jun 2026", ptExpiryDate: "20 Jun 2026", ptFee: 15000, ptStatus: "expired" }
    ];

    return (
        <div className="space-y-6">
            {/* Dashboard Selector Tabs */}
            <div className="flex items-center justify-between border-b pb-4 mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Mock Dashboard (Dashboard 2)</h1>
                <div className="flex bg-muted p-1 rounded-xl shadow-sm border">
                    <Button
                        variant={activeDashboard === "general" ? "default" : "ghost"}
                        className={cn(
                            "h-9 rounded-lg px-4 text-xs font-bold transition-all duration-200",
                            activeDashboard === "general" ? "shadow-sm bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setActiveDashboard("general")}
                    >
                        <Activity className="h-3.5 w-3.5 mr-2" />
                        Gym Overview
                    </Button>
                    <Button
                        variant={activeDashboard === "trainer" ? "default" : "ghost"}
                        className={cn(
                            "h-9 rounded-lg px-4 text-xs font-bold transition-all duration-200",
                            activeDashboard === "trainer" ? "shadow-sm bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setActiveDashboard("trainer")}
                    >
                        <Users className="h-3.5 w-3.5 mr-2" />
                        My Workspace
                    </Button>
                </div>
            </div>

            {activeDashboard === "trainer" ? (
                <>
                    {/* Trainer Stats Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <StatCard
                            title="My Active Clients"
                            value={trainerStats.activeClients}
                            change="Assigned PT clients"
                            changeType="neutral"
                            icon={Users}
                            iconClassName="gradient-primary"
                            loading={false}
                        />
                        <StatCard
                            title="My PT Collections"
                            value={`₹${trainerStats.monthlyPtRevenue.toLocaleString()}`}
                            change="Current month"
                            changeType="neutral"
                            icon={CreditCard}
                            iconClassName="bg-success"
                            loading={false}
                        />
                        <StatCard
                            title="Outstanding PT Dues"
                            value={`₹${trainerStats.outstandingPtDues.toLocaleString()}`}
                            change="Unpaid PT bills"
                            changeType="negative"
                            icon={IndianRupee}
                            iconClassName="bg-red-500"
                            loading={false}
                        />
                        <StatCard
                            title="Expiring PT Plans"
                            value={trainerStats.expiringPtCount}
                            change="Within 7 days"
                            changeType={trainerStats.expiringPtCount > 0 ? "negative" : "neutral"}
                            icon={Clock}
                            iconClassName="bg-yellow-500"
                            loading={false}
                        />
                    </div>

                    {/* Trainer Management Alerts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <PendingPayments
                            invoices={ptInvoices}
                            loading={false}
                            totalAmount={trainerStats.outstandingPtDues}
                        />
                        <MembershipAlerts members={ptAlerts} loading={false} />
                    </div>

                    {/* Trainer Client Directory */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                My Personal Training Clients
                            </CardTitle>
                            <CardDescription>All members currently assigned to you for personal training</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-xl overflow-hidden shadow-sm">
                                <div className="overflow-auto max-h-[400px] scrollbar-thin scrollbar-thumb-muted-foreground/20 cursor-default">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                                            <tr>
                                                <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Client Name</th>
                                                <th className="py-3 px-4 text-left font-semibold text-muted-foreground">General Expiry</th>
                                                <th className="py-3 px-4 text-left font-semibold text-muted-foreground">PT Expiry</th>
                                                <th className="py-3 px-4 text-left font-semibold text-muted-foreground">PT Rate</th>
                                                <th className="py-3 px-4 text-left font-semibold text-muted-foreground">PT Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-muted">
                                            {ptClientsList.map((client) => (
                                                <tr key={client.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="py-4 px-4 font-semibold text-foreground">{client.name}</td>
                                                    <td className="py-4 px-4 whitespace-nowrap text-muted-foreground">{client.expiryDate}</td>
                                                    <td className="py-4 px-4 whitespace-nowrap text-muted-foreground">{client.ptExpiryDate}</td>
                                                    <td className="py-4 px-4 font-semibold">₹{client.ptFee.toLocaleString()}</td>
                                                    <td className="py-4 px-4">
                                                        <Badge variant={client.ptStatus === 'active' ? 'default' : 'destructive'} className={cn("px-2 py-0.5 text-[10px] font-bold uppercase", client.ptStatus === 'active' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "")}>
                                                            {client.ptStatus}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <>
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <StatCard
                            title="Active Members"
                            value={stats.activeMembers}
                            change="Current active"
                            changeType="neutral"
                            icon={Users}
                            iconClassName="gradient-primary"
                            loading={false}
                        />
                        <StatCard
                            title="Monthly Revenue"
                            value={`₹${stats.monthlyRevenue.toLocaleString()}`}
                            change="Current month"
                            changeType="neutral"
                            icon={CreditCard}
                            iconClassName="bg-success"
                            loading={false}
                        />
                        <StatCard
                            title="Today's Check-ins"
                            value={todayCheckIns.length}
                            change="Staff arrivals today"
                            changeType="neutral"
                            icon={Activity}
                            iconClassName="gradient-accent"
                            loading={false}
                        />
                        <StatCard
                            title="Total Staff"
                            value={stats.totalStaff}
                            change="Active staff"
                            changeType="neutral"
                            icon={UserCog}
                            iconClassName="bg-warning"
                            loading={false}
                        />
                        <StatCard
                            title="Pending Dues"
                            value={`₹${stats.pendingDues.toLocaleString()}`}
                            change="Outstanding payments"
                            changeType="negative"
                            icon={IndianRupee}
                            iconClassName="bg-red-500"
                            loading={false}
                        />
                        <StatCard
                            title="Needs Maintenance"
                            value={stats.pendingMaintenance}
                            change="Pending repairs"
                            changeType={stats.pendingMaintenance > 0 ? "negative" : "neutral"}
                            icon={Wrench}
                            iconClassName="bg-orange-500"
                            loading={false}
                        />
                        <StatCard
                            title="Active Inventory"
                            value={stats.activeInventory}
                            change="Total items"
                            changeType="neutral"
                            icon={Package}
                            iconClassName="bg-indigo-500"
                            loading={false}
                        />
                        <StatCard
                            title="Expiring Soon"
                            value={stats.upcomingExpirations}
                            change="Within 7 days"
                            changeType={stats.upcomingExpirations > 0 ? "negative" : "neutral"}
                            icon={Clock}
                            iconClassName="bg-yellow-500"
                            loading={false}
                        />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <div className="lg:col-span-2">
                            <RevenueChart data={revenueData} loading={false} />
                        </div>
                        <div>
                            <MembershipChart data={membershipData} loading={false} />
                        </div>
                    </div>

                    {/* Management & Alert Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <PendingPayments
                            invoices={unpaidInvoices}
                            loading={false}
                            totalAmount={stats.pendingDues}
                        />
                        <MembershipAlerts members={membershipAtRisk} loading={false} />
                        <TodayAttendance checkIns={todayCheckIns} loading={false} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                        <RecentActivity activities={recentActivities} loading={false} />
                    </div>
                </>
            )}
        </div>
    );
}
