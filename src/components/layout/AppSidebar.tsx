import { useState } from "react";
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
  Check,
  PlusCircle,
  ChevronsUpDown
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
import { CreateGymDialog } from "@/components/gym/CreateGymDialog";
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
  { title: "Reports", url: "/reports", icon: BarChart3 },
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
  const { gyms, gymId, switchGym, refreshGyms } = useGym();
  const [createGymOpen, setCreateGymOpen] = useState(false);

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
    // Hide Attendance, Staff, Pricing, and Inventory for Super Admin (Platform Admin)
    if (isAdmin && (item.url === "/attendance" || item.url === "/staff" || item.url === "/pricing" || item.title === "Inventory")) {
      return null;
    }

    // Hide Features for Gym Admin
    if (!isAdmin && item.title === "Features") {
      return null;
    }

    // Feature checks for Gym Admins (non-super-admin)
    if (!isAdmin) {
      // Inventory module check
      if (item.title === "Inventory") {
        // If loading, we could show a skeleton, but for now let's hide to prevent flashing unauthorized content
        if (subscriptionLoading) return null;
        if (!hasFeature("Inventory")) return null;
      }
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
            <span className="font-bold text-lg text-foreground">GymFlow</span>
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
                    <DropdownMenuItem key={gym.id} onClick={() => switchGym(gym.id)} className="cursor-pointer">
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate">{gym.name}</span>
                        {gym.id === gymId && <Check className="h-4 w-4 ml-2 opacity-100 text-primary" />}
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCreateGymOpen(true)} className="cursor-pointer text-primary focus:text-primary">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create New Gym
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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
          "flex items-center gap-3 p-2 rounded-lg mt-2",
          collapsed ? "justify-center" : ""
        )}>
          <Avatar className="h-9 w-9">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">JD</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">John Doe</p>
              <p className="text-xs text-muted-foreground">john@gymflow.com</p>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
