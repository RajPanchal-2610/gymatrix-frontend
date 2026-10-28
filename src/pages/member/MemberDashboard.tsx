import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  QrCode,
  CalendarCheck,
  Dumbbell,
  Apple,
  Receipt,
  Lock,
  Menu,
  Sun,
  Moon,
  LogOut,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Flame,
  Award,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  MapPin,
  Loader2,
  ShieldCheck,
  Utensils,
  CreditCard,
  User,
  ArrowRight,
  FileText,
  Printer,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { memberAuthService, MemberSessionData } from "@/services/memberAuthService";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type MenuSection = "overview" | "digital-pass" | "attendance" | "workout" | "diet" | "payments" | "security";

interface NavItem {
  id: MenuSection;
  title: string;
  icon: any;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: "overview", title: "Dashboard", icon: LayoutDashboard },
  { id: "digital-pass", title: "Digital Pass & QR", icon: QrCode },
  { id: "attendance", title: "Attendance History", icon: CalendarCheck },
  { id: "workout", title: "Workout Routine", icon: Dumbbell },
  { id: "diet", title: "Diet & Nutrition", icon: Apple },
  { id: "payments", title: "Payments & Invoices", icon: Receipt },
  { id: "security", title: "Security & Profile", icon: Lock },
];

const DAY_NAMES: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export default function MemberDashboard() {
  const [member, setMember] = useState<MemberSessionData | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<MenuSection>("overview");

  // Layout states (matching Gym Dashboard)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Theme support
  const { theme, toggleTheme } = useTheme();

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const navigate = useNavigate();

  const loadData = async () => {
    try {
      const data = await memberAuthService.getDashboardData();
      setDashboardData(data);
      if (data.member) {
        setMember({
          id: data.member.id,
          full_name: data.member.full_name,
          phone: data.member.phone,
          email: data.member.email,
          image_url: data.member.image_url,
          gym_id: data.member.gym_id,
          gym_name: data.member.gyms?.name || "Gymatrix Partner Gym",
          gym_logo: data.member.gyms?.logo_url,
          gym_phone: data.member.gyms?.phone,
          gym_address: data.member.gyms?.address,
          status: data.member.status,
          expiry_date: data.member.expiry_date,
          plan_name: data.member.gym_membership_plans?.name || "Standard Membership",
        });
      }
    } catch (err: any) {
      console.error("Dashboard error:", err);
      toast.error(err.message || "Failed to load dashboard");
      if (!memberAuthService.isLoggedIn()) {
        navigate("/member/login");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!memberAuthService.isLoggedIn()) {
      navigate("/member/login");
      return;
    }
    setMember(memberAuthService.getStoredMember());
    loadData();
  }, [navigate]);

  const handleLogout = () => {
    memberAuthService.logout();
    toast.info("Logged out successfully");
    navigate("/member/login");
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword) {
      toast.error("Please fill in current and new password");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      await memberAuthService.changePassword(currentPassword, newPassword);
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse font-medium">
          Loading Member Portal...
        </p>
      </div>
    );
  }

  const memberInfo = dashboardData?.member || member;
  const daysLeft = dashboardData?.daysRemaining ?? 0;
  const isExpiringSoon = daysLeft <= 7 && daysLeft > 0;
  const isExpired = daysLeft <= 0 && memberInfo?.status === "expired";
  const attendanceList = dashboardData?.attendance || [];
  const workoutPlan = dashboardData?.workoutPlan;
  const dietPlan = dashboardData?.dietPlan;
  const paymentsList = dashboardData?.payments || [];

  const getActiveTitle = () => {
    const item = navItems.find((n) => n.id === activeSection);
    return item ? item.title : "Member Dashboard";
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Matching Gym Dashboard AppSidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 bg-card border-r border-border flex flex-col transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand / Gym Header */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-border">
          <div
            className={cn(
              "flex items-center gap-3 overflow-hidden transition-all duration-200 cursor-pointer",
              sidebarCollapsed ? "justify-center w-full" : "flex-1"
            )}
            onClick={() => setActiveSection("overview")}
          >
            <div className="h-10 w-10 rounded-lg bg-white p-1 border border-border flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
              <img
                src={member?.gym_logo || "/logo.png"}
                alt="Gymatrix Logo"
                className="h-full w-full object-contain"
              />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm leading-tight truncate text-foreground">
                  {member?.gym_name || "GYMATRIX"}
                </span>
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                  Member Portal
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          {!sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="h-7 w-7 text-muted-foreground hover:bg-muted hidden lg:flex"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Collapsed expand button */}
        {sidebarCollapsed && (
          <div className="hidden lg:flex justify-center py-2 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(false)}
              className="h-7 w-7 text-muted-foreground hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          <TooltipProvider delayDuration={0}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              const buttonContent = (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-glow font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-105",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {!sidebarCollapsed && (
                    <span className="truncate flex-1 text-left">{item.title}</span>
                  )}
                  {!sidebarCollapsed && item.id === "attendance" && attendanceList.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-auto text-[10px] px-1.5 py-0 h-4 bg-muted/60"
                    >
                      {attendanceList.length}
                    </Badge>
                  )}
                </button>
              );

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return buttonContent;
            })}
          </TooltipProvider>
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-border bg-card/60">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors text-left",
                  sidebarCollapsed ? "justify-center" : ""
                )}
              >
                <Avatar className="h-9 w-9 border border-primary/20 flex-shrink-0">
                  <AvatarImage src={memberInfo?.image_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs uppercase">
                    {memberInfo?.full_name ? memberInfo.full_name.substring(0, 2) : "M"}
                  </AvatarFallback>
                </Avatar>
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate leading-tight">
                      {memberInfo?.full_name || "Gym Member"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {memberInfo?.phone || "Active"}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56 mb-2">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setActiveSection("digital-pass")}>
                <QrCode className="h-4 w-4 mr-2" />
                Digital Pass
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveSection("security")}>
                <Lock className="h-4 w-4 mr-2" />
                Security Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowLogoutConfirm(true)}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={cn(
          "flex-1 min-h-screen flex flex-col transition-all duration-300",
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        {/* TopBar - Matching Gym TopBar */}
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-muted-foreground"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold tracking-tight capitalize">{getActiveTitle()}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Welcome to your member portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Gym Info Pill */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 border border-border text-xs font-medium">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="truncate max-w-[150px]">{member?.gym_name}</span>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-9 gap-1.5 text-xs"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {/* Theme Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 text-muted-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Logout Header Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLogoutConfirm(true)}
              className="h-9 text-xs text-muted-foreground hover:text-destructive gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
          {/* Expiry Warning Banner */}
          {isExpiringSoon && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div className="text-xs sm:text-sm">
                  <span className="font-bold">Membership Expiring Soon!</span> You have{" "}
                  <strong className="underline">{daysLeft} days remaining</strong>. Please contact your front desk to renew.
                </div>
              </div>
              {member?.gym_phone && (
                <a
                  href={`tel:${member.gym_phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors flex-shrink-0"
                >
                  <Phone className="h-3.5 w-3.5" /> Call Front Desk
                </a>
              )}
            </div>
          )}

          {/* SECTION: Overview (Dashboard) */}
          {activeSection === "overview" && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Digital Pass Banner */}
              <div className="relative rounded-2xl overflow-hidden p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-zinc-900 to-black text-white border border-white/10 shadow-xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-primary text-white hover:bg-primary border-none px-3 py-1 font-semibold text-xs tracking-wider uppercase">
                        {memberInfo?.gym_membership_plans?.name || memberInfo?.plan_name || "Fitness Pass"}
                      </Badge>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold",
                          memberInfo?.status === "active"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                        {memberInfo?.status?.toUpperCase() || "ACTIVE"}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs text-white/60 uppercase tracking-widest font-mono">Member Name</p>
                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
                        {memberInfo?.full_name || "Gym Member"}
                      </h2>
                      <p className="text-xs text-white/70 font-mono mt-1">
                        Member #{String(memberInfo?.id || 1).padStart(5, "0")} • {memberInfo?.phone}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-white/10 text-xs">
                      <div>
                        <p className="text-white/50 uppercase font-mono text-[10px]">Joined Date</p>
                        <p className="font-semibold text-white/90 mt-0.5">{memberInfo?.join_date || "Active"}</p>
                      </div>
                      <div>
                        <p className="text-white/50 uppercase font-mono text-[10px]">Valid Until</p>
                        <p className="font-semibold text-white/90 mt-0.5">{memberInfo?.expiry_date || "Ongoing"}</p>
                      </div>
                      <div>
                        <p className="text-white/50 uppercase font-mono text-[10px]">Days Remaining</p>
                        <p className="font-bold text-primary mt-0.5">
                          {daysLeft > 0 ? `${daysLeft} Days` : "Renew Needed"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* QR Entry Pass Box */}
                  <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md text-center">
                    <div className="p-3 bg-white rounded-lg shadow-inner">
                      <QrCode className="h-24 w-24 text-slate-900" />
                    </div>
                    <p className="text-[11px] font-semibold text-white/90 mt-2">Touchless Entry QR</p>
                    <p className="text-[9px] text-white/50">Scan at gym turnstile/reception</p>
                  </div>
                </div>
              </div>

              {/* Gym Dashboard Stat Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Workouts (30 Days)</p>
                      <p className="text-2xl font-bold tracking-tight">{attendanceList.length}</p>
                      <p className="text-xs text-emerald-500 font-medium">Checked-in sessions</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center flex-shrink-0">
                      <Flame className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Active Plan</p>
                      <p className="text-xl font-bold tracking-tight truncate max-w-[130px]">
                        {memberInfo?.gym_membership_plans?.name || "Active"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        Exp: {memberInfo?.expiry_date || "N/A"}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Award className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Membership Status</p>
                      <p className="text-2xl font-bold tracking-tight capitalize text-emerald-500">
                        {memberInfo?.status || "Active"}
                      </p>
                      <p className="text-xs text-muted-foreground">Verified Member</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Time Remaining</p>
                      <p className="text-2xl font-bold tracking-tight text-primary">
                        {daysLeft > 0 ? `${daysLeft} Days` : "Expired"}
                      </p>
                      <p className="text-xs text-muted-foreground">Valid access pass</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Split Preview: Recent Attendance & Routine */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Check-ins */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-base font-bold">Recent Check-ins</CardTitle>
                      <CardDescription>Your last workout sessions</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveSection("attendance")}
                      className="text-xs gap-1 text-primary"
                    >
                      View All <ArrowRight className="h-3 w-3" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {attendanceList.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-6 text-center">
                        No check-in history logged yet.
                      </p>
                    ) : (
                      attendanceList.slice(0, 4).map((item: any, idx: number) => (
                        <div
                          key={item.id || idx}
                          className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            <div>
                              <p className="font-semibold text-foreground">{item.date}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {item.check_in_time || "Turnstile Verified"}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px]">
                            Present
                          </Badge>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Workout Plan Preview */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-base font-bold">Today's Workout Routine</CardTitle>
                      <CardDescription>
                        {workoutPlan?.name || "Assigned by trainer"}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveSection("workout")}
                      className="text-xs gap-1 text-primary"
                    >
                      Full Plan <ArrowRight className="h-3 w-3" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {!workoutPlan?.gym_workout_plan_items?.length ? (
                      <p className="text-xs text-muted-foreground py-6 text-center">
                        No workout routine assigned yet.
                      </p>
                    ) : (
                      workoutPlan.gym_workout_plan_items.slice(0, 3).map((ex: any) => (
                        <div
                          key={ex.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 text-xs"
                        >
                          <div>
                            <p className="font-semibold">{ex.exercise_name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {DAY_NAMES[ex.day_of_week] || ex.day_of_week || "Daily"} • {ex.muscle_group ? `${ex.muscle_group} • ` : ""}Rest: {ex.rest_period || ex.rest_seconds || 60}s
                            </p>
                          </div>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                            {ex.sets} Sets × {ex.reps} Reps
                          </span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* SECTION: Digital ID Pass */}
          {activeSection === "digital-pass" && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
              <Card className="overflow-hidden border border-border shadow-2xl bg-card">
                <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-6 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={member?.gym_logo || "/logo.png"} alt="Gym" className="h-12 w-12 rounded-lg bg-white p-1 border object-contain" />
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{member?.gym_name}</h3>
                      <p className="text-xs text-muted-foreground">Official Member Identity Pass</p>
                    </div>
                  </div>
                  <Badge className="gradient-primary text-white font-bold">
                    {memberInfo?.gym_membership_plans?.name || "Active"}
                  </Badge>
                </div>
                <CardContent className="p-8 text-center space-y-6">
                  <div className="mx-auto w-48 h-48 bg-white p-4 rounded-2xl shadow-xl flex items-center justify-center border-4 border-primary/20">
                    <QrCode className="w-full h-full text-slate-900" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{memberInfo?.full_name}</h2>
                    <p className="text-sm text-muted-foreground font-mono mt-1">
                      ID: #{String(memberInfo?.id || 1).padStart(6, "0")} • {memberInfo?.phone}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border text-xs">
                    <div>
                      <p className="text-muted-foreground font-mono">STATUS</p>
                      <p className="font-bold text-emerald-500 mt-1 uppercase">{memberInfo?.status || "Active"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-mono">JOIN DATE</p>
                      <p className="font-bold mt-1">{memberInfo?.join_date || "Recent"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-mono">EXPIRY DATE</p>
                      <p className="font-bold text-primary mt-1">{memberInfo?.expiry_date || "Ongoing"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* SECTION: Attendance History */}
          {activeSection === "attendance" && (
            <Card className="animate-in fade-in-50 duration-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Workout Check-in History</CardTitle>
                    <CardDescription>
                      Full attendance records tracked at the gym turnstile and front desk
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold">
                    Total: {attendanceList.length} Sessions
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {attendanceList.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <CalendarCheck className="h-10 w-10 mx-auto text-muted-foreground/60" />
                    <p className="text-sm font-semibold">No attendance records found</p>
                    <p className="text-xs text-muted-foreground">
                      Scan your QR pass at the gym entrance to log attendance.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attendanceList.map((log: any, idx: number) => (
                      <div
                        key={log.id || idx}
                        className="flex items-center justify-between p-3.5 rounded-lg border border-border hover:bg-muted/30 transition-colors text-xs sm:text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                            ✓
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{log.date}</p>
                            <p className="text-xs text-muted-foreground">
                              {log.check_in_time ? `Checked in: ${log.check_in_time}` : "Front Desk Access"}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                          Present
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* SECTION: Workout Routine */}
          {activeSection === "workout" && (
            <Card className="animate-in fade-in-50 duration-200">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">
                      {workoutPlan ? (workoutPlan.title || workoutPlan.name) : "Assigned Workout Routine"}
                    </CardTitle>
                    <CardDescription>
                      {workoutPlan?.notes || workoutPlan?.description || "Personalized exercise schedule prescribed by your gym trainer"}
                    </CardDescription>
                    {workoutPlan?.start_date && workoutPlan?.end_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Active Period: {workoutPlan.start_date} → {workoutPlan.end_date}
                        {workoutPlan.gym_staff?.full_name && ` • Trainer: ${workoutPlan.gym_staff.full_name}`}
                      </p>
                    )}
                  </div>
                  {workoutPlan && <Badge className="gradient-primary text-white font-bold">Active Routine</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                {!workoutPlan?.gym_workout_plan_items?.length ? (
                  <div className="text-center py-12 space-y-2">
                    <Dumbbell className="h-10 w-10 mx-auto text-muted-foreground/60" />
                    <p className="text-sm font-semibold">No workout routine assigned yet</p>
                    <p className="text-xs text-muted-foreground">
                      Ask your gym trainer to assign your personal workout plan.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workoutPlan.gym_workout_plan_items.map((item: any) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl border border-border bg-card/60 space-y-2 hover:border-primary/40 transition-colors shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                            {DAY_NAMES[item.day_of_week] || item.day_of_week || "Daily"}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {item.rest_period || item.rest_seconds || 60}s rest
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-sm sm:text-base text-foreground">{item.exercise_name}</p>
                          {item.muscle_group && (
                            <p className="text-xs text-muted-foreground">{item.muscle_group}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono pt-1 border-t border-border/50">
                          <span>Sets: <strong className="text-foreground">{item.sets}</strong></span>
                          <span>Reps: <strong className="text-foreground">{item.reps}</strong></span>
                          {item.weight && (
                            <span>Wt: <strong className="text-foreground">{item.weight}kg</strong></span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-[11px] text-muted-foreground italic">
                            Note: {item.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* SECTION: Diet & Nutrition */}
          {activeSection === "diet" && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">
                        {dietPlan ? (dietPlan.title || dietPlan.name) : "Assigned Nutrition Plan"}
                      </CardTitle>
                      <CardDescription>
                        {dietPlan?.notes || "Daily macronutrient goals and customized meal plan"}
                      </CardDescription>
                      {dietPlan?.start_date && dietPlan?.end_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Period: {dietPlan.start_date} → {dietPlan.end_date}
                          {dietPlan.gym_staff?.full_name && ` • Prepared by: ${dietPlan.gym_staff.full_name}`}
                        </p>
                      )}
                    </div>
                    {dietPlan && (
                      <Badge className="gradient-primary text-white font-bold">Active Diet</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!dietPlan?.gym_diet_plan_items?.length ? (
                    <div className="text-center py-12 space-y-2">
                      <Apple className="h-10 w-10 mx-auto text-muted-foreground/60" />
                      <p className="text-sm font-semibold">No diet plan assigned yet</p>
                      <p className="text-xs text-muted-foreground">
                        Contact your gym nutritionist or trainer to receive your customized diet plan.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Macronutrients Summary Bar */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-xl border bg-orange-500/10 border-orange-500/20 text-center">
                          <p className="text-xs text-muted-foreground font-medium">Daily Calories</p>
                          <p className="text-xl font-bold text-orange-500 mt-0.5">
                            🔥 {dietPlan.daily_calorie_target || dietPlan.totalCalories || 0} kcal
                          </p>
                        </div>
                        <div className="p-3.5 rounded-xl border bg-rose-500/10 border-rose-500/20 text-center">
                          <p className="text-xs text-muted-foreground font-medium">Protein</p>
                          <p className="text-xl font-bold text-rose-500 mt-0.5">
                            🥩 {dietPlan.totalProtein || 0}g
                          </p>
                        </div>
                        <div className="p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/20 text-center">
                          <p className="text-xs text-muted-foreground font-medium">Carbohydrates</p>
                          <p className="text-xl font-bold text-amber-500 mt-0.5">
                            🍚 {dietPlan.totalCarbs || 0}g
                          </p>
                        </div>
                        <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-center">
                          <p className="text-xs text-muted-foreground font-medium">Healthy Fats</p>
                          <p className="text-xl font-bold text-emerald-500 mt-0.5">
                            🥑 {dietPlan.totalFat || 0}g
                          </p>
                        </div>
                      </div>

                      {/* Meals List */}
                      <div className="space-y-3">
                        {dietPlan.gym_diet_plan_items.map((meal: any) => (
                          <div
                            key={meal.id}
                            className="p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="capitalize text-xs font-semibold">
                                  {meal.meal_type ? String(meal.meal_type).replace(/_/g, " ") : "Meal"}
                                </Badge>
                                <span className="text-xs text-muted-foreground font-mono">
                                  • {DAY_NAMES[meal.day_of_week] || "Daily"}
                                </span>
                                {meal.quantity && (
                                  <span className="text-xs text-muted-foreground">
                                    • Qty: {meal.quantity}
                                  </span>
                                )}
                              </div>
                              <p className="font-semibold text-sm sm:text-base">
                                {meal.food_item || meal.food_items || "Healthy Food Item"}
                              </p>
                              {meal.notes && (
                                <p className="text-xs text-muted-foreground italic">{meal.notes}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground flex-shrink-0">
                              {Number(meal.calories) > 0 && <span>🔥 {meal.calories} kcal</span>}
                              {Number(meal.protein) > 0 && <span>🥩 {meal.protein}g P</span>}
                              {Number(meal.carbs) > 0 && <span>🍚 {meal.carbs}g C</span>}
                              {Number(meal.fat) > 0 && <span>🥑 {meal.fat}g F</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* SECTION: Payments & Invoices */}
          {activeSection === "payments" && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Payment Summary Header Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Total Billed</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">
                        ₹{paymentsList.reduce((acc: number, p: any) => acc + (Number(p.total_amount) || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Receipt className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Total Paid</p>
                      <p className="text-xl sm:text-2xl font-bold text-emerald-500 mt-1">
                        ₹{paymentsList.reduce((acc: number, p: any) => acc + (Number(p.paid_amount) || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <CreditCard className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Outstanding Dues</p>
                      <p className="text-xl sm:text-2xl font-bold text-amber-500 mt-1">
                        ₹{paymentsList.reduce((acc: number, p: any) => acc + (Number(p.due_amount) || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <Clock className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Invoices List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Membership Invoices & Receipts</CardTitle>
                      <CardDescription>
                        Detailed breakdown of all subscription fees and recorded transactions
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {paymentsList.length} Invoices
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {paymentsList.length === 0 ? (
                    <div className="text-center py-12 space-y-2">
                      <Receipt className="h-10 w-10 mx-auto text-muted-foreground/60" />
                      <p className="text-sm font-semibold">No payment invoices found</p>
                      <p className="text-xs text-muted-foreground">
                        Invoices generated by your gym will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {paymentsList.map((pay: any) => {
                        const planName =
                          pay.gym_membership_history?.gym_membership_plans?.name ||
                          pay.remarks ||
                          "Gym Membership";
                        const invoiceDate = pay.billing_date
                          ? new Date(pay.billing_date).toLocaleDateString()
                          : new Date(pay.created_at).toLocaleDateString();
                        const isFullyPaid =
                          pay.payment_status === "paid" || Number(pay.due_amount || 0) <= 0;

                        return (
                          <div
                            key={pay.id}
                            className="p-4 sm:p-5 rounded-xl border border-border/80 bg-card/60 hover:border-primary/40 transition-all space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                  #{pay.id}
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm sm:text-base text-foreground">
                                    {planName}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    Invoice Date: {invoiceDate} • ID: INV-{String(pay.id).padStart(5, "0")}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "capitalize text-xs font-semibold px-2.5 py-0.5",
                                    isFullyPaid
                                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                      : pay.payment_status === "partial"
                                        ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                        : "bg-destructive/10 text-destructive border-destructive/30"
                                  )}
                                >
                                  {pay.payment_status?.toUpperCase() || (isFullyPaid ? "PAID" : "UNPAID")}
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedInvoice(pay)}
                                  className="h-8 text-xs gap-1.5"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  View Receipt
                                </Button>
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div>
                                <p className="text-muted-foreground">Total Fee</p>
                                <p className="font-bold text-sm text-foreground mt-0.5">
                                  ₹{Number(pay.total_amount || 0).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Amount Paid</p>
                                <p className="font-bold text-sm text-emerald-500 mt-0.5">
                                  ₹{Number(pay.paid_amount || 0).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Due Balance</p>
                                <p
                                  className={cn(
                                    "font-bold text-sm mt-0.5",
                                    Number(pay.due_amount || 0) > 0 ? "text-amber-500" : "text-muted-foreground"
                                  )}
                                >
                                  ₹{Number(pay.due_amount || 0).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Plan Duration</p>
                                <p className="font-medium text-foreground mt-0.5 truncate">
                                  {pay.gym_membership_history?.start_date && pay.gym_membership_history?.end_date
                                    ? `${pay.gym_membership_history.start_date} → ${pay.gym_membership_history.end_date}`
                                    : "Active Duration"}
                                </p>
                              </div>
                            </div>

                            {/* Payment Transactions Sub-list */}
                            {pay.gym_payment_transactions && pay.gym_payment_transactions.length > 0 && (
                              <div className="pt-2 border-t border-border/40 text-xs space-y-1.5">
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  Payment Transactions:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {pay.gym_payment_transactions.map((txn: any) => (
                                    <div
                                      key={txn.id}
                                      className="px-2.5 py-1 rounded-md bg-muted/50 border border-border flex items-center gap-2 text-[11px]"
                                    >
                                      <span className="font-bold text-emerald-500">
                                        ₹{Number(txn.amount || 0).toLocaleString()}
                                      </span>
                                      <span className="text-muted-foreground">via {txn.payment_mode || "Direct"}</span>
                                      {txn.paid_at && (
                                        <span className="text-muted-foreground font-mono">
                                          ({new Date(txn.paid_at).toLocaleDateString()})
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* SECTION: Security & Profile */}
          {activeSection === "security" && (
            <div className="space-y-6 max-w-2xl animate-in fade-in-50 duration-200">
              {/* Member Profile Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Profile Details</CardTitle>
                  <CardDescription>Your registered member profile at {member?.gym_name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary/20">
                      <AvatarImage src={memberInfo?.image_url} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold uppercase">
                        {memberInfo?.full_name ? memberInfo.full_name.substring(0, 2) : "M"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-lg">{memberInfo?.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{memberInfo?.phone}</p>
                      {memberInfo?.email && <p className="text-xs text-muted-foreground">{memberInfo.email}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Change Password Form */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Change Portal Password</CardTitle>
                      <CardDescription>Ensure your account remains secure with a private password</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currPass">Current Password</Label>
                      <Input
                        id="currPass"
                        type="password"
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={savingPassword}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="newPass">New Password</Label>
                        <Input
                          id="newPass"
                          type="password"
                          placeholder="Min. 6 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={savingPassword}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confPass">Confirm New Password</Label>
                        <Input
                          id="confPass"
                          type="password"
                          placeholder="Re-enter new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={savingPassword}
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                      className="gradient-primary text-white"
                    >
                      {savingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating Password...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Invoice Receipt Modal Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-card border border-border">
          {selectedInvoice && (
            <div className="p-6 space-y-6">
              {/* Receipt Header */}
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white p-1 border border-border flex items-center justify-center shadow-sm">
                    <img
                      src={member?.gym_logo || "/logo.png"}
                      alt="Gym"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-tight">{member?.gym_name}</h3>
                    <p className="text-xs text-muted-foreground">{member?.gym_address || "Fitness Center"}</p>
                    {member?.gym_phone && (
                      <p className="text-[11px] text-muted-foreground">Tel: {member.gym_phone}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="font-mono text-xs">
                    INV-{String(selectedInvoice.id).padStart(5, "0")}
                  </Badge>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {selectedInvoice.billing_date || new Date(selectedInvoice.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Billed To Member */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground uppercase font-mono text-[10px]">Billed To</span>
                  <p className="font-bold text-sm text-foreground mt-0.5">{memberInfo?.full_name}</p>
                  <p className="text-muted-foreground">{memberInfo?.phone}</p>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground uppercase font-mono text-[10px]">Payment Status</span>
                  <div className="mt-1">
                    <Badge
                      className={cn(
                        "text-xs font-bold uppercase",
                        selectedInvoice.payment_status === "paid" || Number(selectedInvoice.due_amount || 0) <= 0
                          ? "bg-emerald-500 text-white"
                          : selectedInvoice.payment_status === "partial"
                            ? "bg-amber-500 text-white"
                            : "bg-destructive text-white"
                      )}
                    >
                      {selectedInvoice.payment_status || "PAID"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="border rounded-lg overflow-hidden text-xs">
                <div className="bg-muted px-4 py-2 font-bold text-muted-foreground flex justify-between">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between font-semibold text-sm">
                    <span>
                      {selectedInvoice.gym_membership_history?.gym_membership_plans?.name ||
                        selectedInvoice.remarks ||
                        "Gym Membership Plan"}
                    </span>
                    <span>₹{Number(selectedInvoice.total_amount || 0).toLocaleString()}</span>
                  </div>
                  {selectedInvoice.gym_membership_history?.start_date && (
                    <p className="text-muted-foreground text-[11px]">
                      Validity: {selectedInvoice.gym_membership_history.start_date} to{" "}
                      {selectedInvoice.gym_membership_history.end_date}
                    </p>
                  )}
                </div>
                <div className="bg-muted/30 px-4 py-3 border-t border-border space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Amount Billed</span>
                    <span>₹{Number(selectedInvoice.total_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-500">
                    <span>Amount Received</span>
                    <span>- ₹{Number(selectedInvoice.paid_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-border">
                    <span>Balance Due</span>
                    <span className={Number(selectedInvoice.due_amount || 0) > 0 ? "text-amber-500" : "text-muted-foreground"}>
                      ₹{Number(selectedInvoice.due_amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              {selectedInvoice.gym_payment_transactions?.length > 0 && (
                <div className="space-y-1.5 text-xs">
                  <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    Recorded Payment Transactions:
                  </p>
                  <div className="space-y-1 border rounded-lg p-2.5 bg-muted/20">
                    {selectedInvoice.gym_payment_transactions.map((txn: any) => (
                      <div key={txn.id} className="flex justify-between text-[11px]">
                        <span>
                          ₹{Number(txn.amount || 0).toLocaleString()} via{" "}
                          <strong className="text-foreground">{txn.payment_mode || "Cash"}</strong>
                          {txn.transaction_reference && ` (Ref: ${txn.transaction_reference})`}
                        </span>
                        <span className="text-muted-foreground font-mono">
                          {txn.paid_at ? new Date(txn.paid_at).toLocaleDateString() : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-1.5 text-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Receipt
                </Button>
                <Button
                  size="sm"
                  onClick={() => setSelectedInvoice(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of your Member Portal session and returned to the login screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
