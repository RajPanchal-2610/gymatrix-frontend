import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Calendar,
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
  TicketPercent
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

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Members", url: "/members", icon: Users },
  { title: "Membership Plans", url: "/plans", icon: CreditCard },
  { title: "Features", url: "/features", icon: List },
  { title: "Pricing", url: "/pricing", icon: Wallet },
  { title: "Attendance", url: "/attendance", icon: Calendar },
  { title: "Payments", url: "/payments", icon: Receipt },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Staff & Trainers", url: "/staff", icon: UserCog },
  { title: "Diet & Workout", url: "/diet-workout", icon: Apple },
  { title: "Roles", url: "/roles", icon: Users },
  { title: "Permissions", url: "/permissions", icon: Shield },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Contact Messages", url: "/contact-messages", icon: Mail },
  { title: "Coupons", url: "/coupons", icon: TicketPercent },
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
  const { hasPermission } = usePermissions();
  const { gyms, gymId, switchGym, refreshGyms } = useGym();
  const [createGymOpen, setCreateGymOpen] = useState(false);
  const [editingGym, setEditingGym] = useState<{ id: number; name: string } | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null; email: string } | null>(null);

  useEffect(() => {
    const getUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();

        setUserProfile({
          full_name: profile?.full_name || user.email?.split('@')[0] || "User",
          avatar_url: null,
          email: user.email || ""
        });
      }
    };

    getUserProfile();
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
    // Hide Attendance, Staff, Pricing, Roles, Permissions, and Inventory for Super Admin (Platform Admin)
    if (isAdmin && (item.url === "/attendance" || item.url === "/staff" || item.url === "/pricing" || item.url === "/roles" || item.url === "/permissions" || item.title === "Inventory")) {
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
      if (item.title === "Permissions" && !hasFeature("Access Control")) return null;
      if (item.title === "Settings" && !hasFeature("Gym Settings")) return null;

      // 2. Permission checks (Secondary layer)
      if (item.title === "Members" && !hasPermission('view_members')) return null;
      if (item.title === "Membership Plans" && !hasPermission('view_membership_plans')) return null;
      if (item.title === "Attendance" && !hasPermission('view_attendance')) return null;
      if (item.title === "Payments" && !hasPermission('view_payments')) return null;
      if (item.title === "Staff & Trainers" && !hasPermission('view_staff')) return null;
      if (item.title === "Roles" && !hasPermission('view_roles')) return null;
      if (item.title === "Permissions" && !hasPermission('view_permissions')) return null;
      if (item.title === "Reports" && !hasPermission('view_reports')) return null;
      if (item.title === "Diet & Workout" && !hasPermission('view_diet_workout_plans')) return null;
      if (item.title === "Settings" && !hasPermission('view_gym_settings')) return null;
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

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {/* ... Logo content ... */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
            <Dumbbell className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg text-foreground">
              Fit<span className="gradient-text">Flow</span>
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onCollapsedChange(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Gym Selector */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-sidebar-border">
          {isAdmin ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-sidebar-accent">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Platform Admin</p>
                <p className="text-xs text-muted-foreground">Super Admin</p>
              </div>
            </div>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full flex items-center justify-between p-2 h-auto hover:bg-sidebar-accent mb-1 border border-transparent hover:border-sidebar-border">
                    <div className="flex items-center gap-2 min-w-0 text-left">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{currentGym?.name || "Select Gym"}</p>
                        <p className="text-xs text-muted-foreground">Gym Admin</p>
                      </div>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">My Gyms</DropdownMenuLabel>
                  {gyms.map(gym => (
                    <DropdownMenuItem
                      key={gym.id}
                      className="cursor-pointer flex items-center justify-between group/item"
                      onClick={() => switchGym(gym.id)}
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <span className="truncate">{gym.name}</span>
                        {gym.id === gymId && <Check className="h-4 w-4 ml-2 opacity-100 text-primary flex-shrink-0" />}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover/item:opacity-100 hover:bg-primary/10 hover:text-primary transition-all ml-2"
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
                  <DropdownMenuItem onClick={() => setCreateGymOpen(true)} className="cursor-pointer text-primary focus:text-primary">
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
      )}

      {/* Navigation */}
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
          {!collapsed && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={handleLogout}
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
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
