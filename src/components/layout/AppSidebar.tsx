import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Calendar,
  CalendarCheck,
  Receipt,
  UserCog,
  BarChart3,
  Settings,
  Dumbbell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  Package,
  Wallet,
  List,
  Mail,
  Check,
  PlusCircle,
  ChevronsUpDown,
  Pencil,
  Shield,
  Apple,
  TicketPercent,
  Trophy,
  IndianRupee,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { useGym } from "@/hooks/useGym";
import { usePermissions } from "@/contexts/PermissionsContext";
import { CreateGymDialog } from "@/components/gym/CreateGymDialog";
import { EditGymDialog } from "@/components/gym/EditGymDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "My Attendance & Payroll", url: "/my-attendance-payroll", icon: CalendarCheck },
  { title: "Members", url: "/members", icon: Users },
  { title: "Membership Plans", url: "/plans", icon: CreditCard },
  { title: "Features", url: "/features", icon: List },
  { title: "Pricing", url: "/pricing", icon: Wallet },
  // { title: "Attendance", url: "/attendance", icon: Calendar },
  { title: "Payments", url: "/payments", icon: IndianRupee },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Staff & Trainers", url: "/staff", icon: UserCog },
  { title: "Diet & Workout", url: "/diet-workout", icon: Apple },
  { title: "Roles", url: "/roles", icon: Users },
  { title: "Permissions", url: "/permissions", icon: Shield },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Contact Messages", url: "/contact-messages", icon: Mail },
  { title: "Coupons", url: "/coupons", icon: TicketPercent },
  { title: "Tournaments", url: "/tournaments", icon: Trophy },
];

const bottomItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function AppSidebar({ collapsed, onCollapsedChange }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith("/admin");
  const { hasFeature, loading: subscriptionLoading } = useSubscription();
  const { hasPermission, role } = usePermissions();
  const { gyms, gymId, switchGym, refreshGyms } = useGym();
  const [createGymOpen, setCreateGymOpen] = useState(false);
  const [editingGym, setEditingGym] = useState<{ id: number; name: string } | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null; email: string } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const getUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        setUserProfile({
          full_name: profile?.full_name || user.email?.split('@')[0] || "User",
          avatar_url: null,
          email: user.email || ""
        });
      }
    };

    getUserProfile();

    window.addEventListener("profile-updated", getUserProfile);
    return () => {
      window.removeEventListener("profile-updated", getUserProfile);
    };
  }, []);

  const currentGym = gyms.find(g => g.id === gymId);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Logged out successfully");
        navigate(isAdmin ? "/admin/login" : "/auth");
      }
    } catch (error) {
      console.error("Logout error", error);
      toast.error("Failed to log out");
    }
  };

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const { role } = usePermissions();
    // Hide Attendance, Staff, Pricing, Roles, Diet & Workout, Inventory, and Tournaments for Super Admin (Platform Admin)
    if (isAdmin && (item.url === "/attendance" || item.url === "/staff" || item.url === "/pricing" || item.url === "/roles" || item.url === "/diet-workout" || item.title === "Inventory" || item.title === "Tournaments" || item.title === "My Attendance & Payroll")) {
      return null;
    }

    // Hide Features for Gym Admin
    if (!isAdmin && item.title === "Features") {
      return null;
    }

    // Feature checks for Gym Admins (non-super-admin)
    if (!isAdmin) {
      if (subscriptionLoading) return null;

      // 1. Module Feature Checks
      if (item.title === "Members" && !hasFeature("Member Management")) return null;
      if (item.title === "Membership Plans" && !hasFeature("Membership Plans")) return null;
      if (item.title === "Attendance" && !hasFeature("Access Control")) return null;
      if (item.title === "Payments" && !hasFeature("Payments & Billing")) return null;
      if (item.title === "Inventory" && !hasFeature("Inventory Control")) return null;
      if (item.title === "Staff & Trainers" && !hasFeature("Staff & HR")) return null;
      if (item.title === "Diet & Workout" && !hasFeature("Diet & Workout Plans")) return null;
      if (item.title === "Reports" && !hasFeature("Reports & Analytics")) return null;
      if (item.title === "Roles" && !hasFeature("Access Control")) return null;
      if (item.title === "Permissions") return null;
      if (item.title === "Settings" && !hasFeature("Gym Settings")) return null;
      if (item.title === "Tournaments" && !hasFeature("Tournament")) return null;

      // 2. Permission checks (Secondary layer)
      if (item.title === "Members" && !hasPermission('view_members')) return null;
      if (item.title === "Membership Plans" && !hasPermission('view_membership_plans')) return null;
      if (item.title === "Payments" && !hasPermission('view_payments')) return null;
      if (item.title === "Staff & Trainers" && !hasPermission('view_staff')) return null;
      if (item.title === "Roles" && !hasPermission('view_roles')) return null;
      if (item.title === "Permissions" && role?.name !== "SUPER_ADMIN") return null;
      if (item.title === "Reports" && !hasPermission('view_reports')) return null;
      if (item.title === "Diet & Workout" && !hasPermission('view_diet_workout_plans')) return null;
      if (item.title === "Settings" && !hasPermission('view_gym_settings')) return null;
      if (item.title === "Tournaments" && !hasPermission('view_tournaments')) return null;
      if (item.title === "My Attendance & Payroll" && (role?.isOwner || role?.name === "SUPER_ADMIN" || role?.name?.toLowerCase() === "owner")) return null;
      if (item.title === "Contact Messages" || item.title === "Coupons") return null;
    }

    let url = item.url;
    if (isAdmin) {
      if (url === "/") url = "/admin/dashboard";
      else url = `/admin${url}`;
    }

    const isActive = location.pathname === url;
    const Icon = item.icon;

    const linkContent = (
      <NavLink
        to={url}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
          isActive
            ? "bg-primary text-primary-foreground shadow-glow"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-primary-foreground")} />
        {!collapsed && (
          <span className="font-medium truncate">{item.title}</span>
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.title}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  const logoContent = (
    <div className={cn(
      "flex items-center overflow-hidden transition-all duration-200",
      collapsed ? "justify-center w-full" : "gap-3 text-left flex-1"
    )}>
      {!isAdmin && currentGym?.logo_url ? (
        <img
          src={currentGym.logo_url}
          alt={currentGym.name}
          className="h-14 w-14 rounded-lg object-cover bg-white p-0.5 border border-sidebar-border flex-shrink-0"
        />
      ) : (
        <img
          src="/logo.png"
          alt="Gymatrix Logo"
          className="h-14 w-14 rounded-lg object-contain bg-white p-0.5 border border-sidebar-border flex-shrink-0"
        />
      )}
      {!collapsed && (
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-base lg:text-lg text-foreground truncate leading-snug">
            {!isAdmin && currentGym?.name ? (
              currentGym.name
            ) : (
              <>Gy<span className="gradient-text">matrix</span></>
            )}
          </span>
          <span className="text-xs lg:text-[13px] text-muted-foreground font-medium leading-none mt-1">
            {isAdmin ? "Super Admin" : (role?.name ? role.name.replace(/_/g, ' ') : "Gym Admin")}
          </span>
        </div>
      )}
    </div>
  );

  const gymSwitcherTrigger = (
    <Button
      variant="ghost"
      className={cn(
        "w-full flex items-center transition-all duration-200 rounded-lg h-[72px]",
        collapsed ? "justify-center p-0 hover:bg-sidebar-accent/50" : "justify-between p-2 hover:bg-sidebar-accent/50 border border-transparent hover:border-sidebar-border/30"
      )}
    >
      {logoContent}
      {!collapsed && (
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-60 ml-2" />
      )}
    </Button>
  );

  const switcherWithTooltip = collapsed ? (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        {gymSwitcherTrigger}
      </TooltipTrigger>
      <TooltipContent side="right" className="font-medium">
        Switch Gym ({currentGym?.name || "Select Gym"})
      </TooltipContent>
    </Tooltip>
  ) : (
    gymSwitcherTrigger
  );

  const adminHeader = (
    <div className={cn(
      "w-full flex items-center h-[72px] rounded-lg",
      collapsed ? "justify-center px-0" : "px-2"
    )}>
      {logoContent}
    </div>
  );

  const adminHeaderWithTooltip = collapsed ? (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        {adminHeader}
      </TooltipTrigger>
      <TooltipContent side="right" className="font-medium">
        Platform Admin
      </TooltipContent>
    </Tooltip>
  ) : (
    adminHeader
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <button
        onClick={() => onCollapsedChange(!collapsed)}
        className="absolute -right-3 top-9 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar shadow-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-muted-foreground transition-all focus:outline-none cursor-pointer"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      <div className="h-24 flex items-center px-3 border-b border-sidebar-border relative">
        {isAdmin ? (
          adminHeaderWithTooltip
        ) : (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {switcherWithTooltip}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56"
                align="start"
                side={collapsed ? "right" : "bottom"}
                sideOffset={collapsed ? 12 : 4}
              >
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">My Gyms</DropdownMenuLabel>
                {gyms.map(gym => (
                  <DropdownMenuItem
                    key={gym.id}
                    className="cursor-pointer flex items-center justify-between group/item"
                    onClick={() => switchGym(gym.id)}
                  >
                    <div className="flex items-center min-w-0 flex-1">
                      <span className="truncate text-sm font-medium">{gym.name}</span>
                      {gym.id === gymId && <Check className="h-4 w-4 ml-2 opacity-100 text-primary flex-shrink-0" />}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-primary/10 hover:text-primary transition-all ml-2 text-muted-foreground hover:text-primary opacity-0 group-hover/item:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingGym({ id: gym.id, name: gym.name });
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCreateGymOpen(true)} className="cursor-pointer text-primary focus:text-primary font-medium">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create New Gym
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <EditGymDialog
              open={!!editingGym}
              onOpenChange={(open) => !open && setEditingGym(null)}
              gymId={editingGym?.id ?? null}
              initialName={editingGym?.name ?? ""}
              onSuccess={refreshGyms}
            />

            <CreateGymDialog
              open={createGymOpen}
              onOpenChange={setCreateGymOpen}
              onSuccess={refreshGyms}
            />
          </>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.url} item={item} />
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {bottomItems.map((item) => (
          <NavItem key={item.url} item={item} />
        ))}

        {/* User Profile */}
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-lg mt-2 relative group",
          collapsed ? "justify-center" : "bg-sidebar-accent/30"
        )}>
          <NavLink
            to="/profile"
            className={cn(
              "flex flex-1 items-center gap-3 min-w-0 text-left hover:opacity-85 transition-opacity",
              collapsed && "justify-center"
            )}
          >
            <Avatar className="h-9 w-9 border border-primary/20">
              <AvatarImage src={userProfile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {userProfile?.full_name ? userProfile.full_name.substring(0, 2).toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{userProfile?.full_name || "Loading..."}</p>
                <p className="text-[10px] text-muted-foreground truncate opacity-70 italic font-medium">{userProfile?.email}</p>
              </div>
            )}
          </NavLink>
          {!collapsed && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                  onClick={() => setShowLogoutConfirm(true)}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Logout</TooltipContent>
            </Tooltip>
          )}
          {collapsed && (
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => setShowLogoutConfirm(true)}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign back in to access your account.
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
    </aside>
  );
}
