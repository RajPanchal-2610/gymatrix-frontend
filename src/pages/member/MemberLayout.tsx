import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation, useOutletContext, Link } from "react-router-dom";
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
  AlertCircle,
  Phone,
  Loader2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { memberAuthService, MemberSessionData } from "@/services/memberAuthService";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface MemberPortalContextType {
  member: MemberSessionData | null;
  dashboardData: any;
  loading: boolean;
  refreshing: boolean;
  handleRefresh: () => void;
  daysLeft: number;
  isExpiringSoon: boolean;
}

export function useMemberPortal() {
  return useOutletContext<MemberPortalContextType>();
}

interface NavItem {
  path: string;
  title: string;
  icon: any;
  badge?: string;
}

const navItems: NavItem[] = [
  { path: "/member/dashboard", title: "Dashboard", icon: LayoutDashboard },
  { path: "/member/pass", title: "Digital Pass & QR", icon: QrCode },
  { path: "/member/attendance", title: "Attendance History", icon: CalendarCheck },
  { path: "/member/workouts", title: "Workout Routine", icon: Dumbbell },
  { path: "/member/diet", title: "Diet & Nutrition", icon: Apple },
  { path: "/member/payments", title: "Payments & Invoices", icon: Receipt },
  { path: "/member/profile", title: "Security & Profile", icon: Lock },
];

export default function MemberLayout() {
  const [member, setMember] = useState<MemberSessionData | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Layout states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Theme support
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

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
          upi_settings: data.member.gyms?.notification_settings?.upi_settings,
        });
      }
    } catch (err: any) {
      console.error("Error loading member dashboard data:", err);
      if (err.message && err.message.includes("Session expired")) {
        memberAuthService.logout();
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

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    memberAuthService.logout();
    toast.info("Logged out successfully");
    navigate("/member/login");
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
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

  const memberInfo = dashboardData?.member;
  const daysLeft = memberInfo?.expiry_date
    ? Math.max(
        0,
        Math.ceil(
          (new Date(memberInfo.expiry_date).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const isExpiringSoon = daysLeft > 0 && daysLeft <= 7;

  // Active page title
  const currentNav = navItems.find((n) => location.pathname.startsWith(n.path));
  const activeTitle = currentNav ? currentNav.title : "Member Portal";

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
          <Link
            to="/member/dashboard"
            className={cn(
              "flex items-center gap-3 overflow-hidden transition-all duration-200 cursor-pointer",
              sidebarCollapsed ? "justify-center w-full" : "flex-1"
            )}
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
          </Link>

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
              const isActive =
                item.path === "/member/dashboard"
                  ? location.pathname === "/member/dashboard" || location.pathname === "/member"
                  : location.pathname.startsWith(item.path);

              const buttonContent = (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-glow font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-primary"
                    )}
                  />
                  {!sidebarCollapsed && (
                    <span className="truncate flex-1 text-left">{item.title}</span>
                  )}
                  {!sidebarCollapsed && item.badge && (
                    <span className="ml-auto text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.path}>
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

        {/* Bottom User Profile Section */}
        <div className="p-3 border-t border-border bg-card/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition-colors text-left group",
                  sidebarCollapsed && "justify-center p-1"
                )}
              >
                <Avatar className="h-9 w-9 border border-border flex-shrink-0 ring-1 ring-primary/20">
                  <AvatarImage src={memberInfo?.image_url} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs uppercase">
                    {memberInfo?.full_name ? memberInfo.full_name.substring(0, 2) : "M"}
                  </AvatarFallback>
                </Avatar>
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate leading-tight group-hover:text-primary transition-colors">
                      {memberInfo?.full_name || "Member"}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                      {memberInfo?.phone || ""}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56 mb-2">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/member/pass")}>
                <QrCode className="h-4 w-4 mr-2" />
                Digital Pass
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/member/profile")}>
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
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}
      >
        {/* Top Header Bar */}
        <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar Hamburger Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-muted-foreground"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight text-foreground">
                {activeTitle}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Welcome back, {memberInfo?.full_name || "Member"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Refresh Data Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-9 text-xs gap-1.5"
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

          {/* Child Pages Outlet */}
          <Outlet
            context={{
              member,
              dashboardData,
              loading,
              refreshing,
              handleRefresh,
              daysLeft,
              isExpiringSoon,
            }}
          />
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Log Out of Member Portal?</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out? You will need your mobile number and password to log back in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Log Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
