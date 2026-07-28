import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, Sun, Moon, Menu, LogOut, User as UserIcon, Dumbbell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { useNotifications } from "@/hooks/useNotifications";
import { usePermissions } from "@/contexts/PermissionsContext";
import { formatDistanceToNow } from "date-fns";
import { ShieldAlert, CircleAlert, UserPlus, IndianRupee, CheckCheck } from "lucide-react";

interface TopBarProps {
  onMenuClick?: () => void;
  title?: string;
  hideMenuButton?: boolean;
}

export function TopBar({ onMenuClick, title = "Dashboard", hideMenuButton }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { gymId } = useGym();
  const { hasPermission, role, refreshPermissions } = usePermissions();
  const canViewFinance = hasPermission('view_payments');

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  } = useNotifications(gymId, canViewFinance);

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

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Logged out successfully");
        const isAdmin = window.location.pathname.startsWith("/admin");
        navigate(isAdmin ? "/admin/login" : "/auth");
      }
    } catch (error) {
      console.error("Logout error", error);
      toast.error("Failed to log out");
    }
  };

  const handleSwitchToStaff = async () => {
    localStorage.setItem('activeRole', 'staff');
    toast.success(`Switched to ${role?.staffRoleName || 'Staff'} view`);
    await refreshPermissions();
    navigate('/');
  };

  const handleSwitchToOwner = async () => {
    localStorage.setItem('activeRole', 'owner');
    toast.success("Switched to Owner view");
    await refreshPermissions();
    navigate('/');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_member':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'payment_received':
        return <IndianRupee className="h-4 w-4 text-emerald-500" />;
      case 'membership_expiring':
      case 'overdue_payment':
        return <CircleAlert className="h-4 w-4 text-amber-500" />;
      case 'system':
      default:
        return <ShieldAlert className="h-4 w-4 text-purple-500" />;
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    
    // Redirect based on type
    if (notif.type === 'new_member' || notif.type === 'membership_expiring') {
      navigate('/members');
    } else if (notif.type === 'payment_received' || notif.type === 'overdue_payment') {
      navigate('/payments');
    } else {
      navigate('/notifications');
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4">
        {!hideMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members, plans..."
            className="w-64 pl-9 bg-secondary/50 border-0 focus-visible:ring-1"
          />
        </div>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-accent text-accent-foreground animate-pulse shadow-glow">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
              <DropdownMenuLabel className="p-0 font-semibold text-sm">Notifications</DropdownMenuLabel>
              {unreadCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllAsRead();
                  }}
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all as read
                </button>
              )}
            </div>
            
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                notifications.slice(0, 5).map((notif) => (
                  <DropdownMenuItem
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors ${
                      !notif.is_read ? 'bg-primary/5 font-medium' : ''
                    }`}
                  >
                    <div className="mt-0.5 p-1 rounded-md bg-secondary flex-shrink-0">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <span className="text-sm text-foreground truncate">{notif.title}</span>
                      <span className="text-xs text-muted-foreground line-clamp-2 font-normal leading-relaxed">{notif.message}</span>
                      <span className="text-[10px] text-muted-foreground/80 font-normal">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {!notif.is_read && (
                      <span className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))
              )}
            </div>
            
            <div className="border-t border-border bg-muted/10">
              <button
                onClick={() => navigate('/notifications')}
                className="w-full text-center py-2.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors hover:bg-muted/30"
              >
                View all notifications
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full border border-primary/20 p-0 flex items-center justify-center">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                  {userProfile?.full_name ? userProfile.full_name.substring(0, 2).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none text-foreground">{userProfile?.full_name || "User"}</p>
                <p className="text-xs leading-none text-muted-foreground truncate">{userProfile?.email || "user@example.com"}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>My Profile</span>
            </DropdownMenuItem>
            {role?.isOwner && role?.hasStaffRecord && (
              <>
                <DropdownMenuSeparator />
                {role.name === 'Owner' ? (
                  <DropdownMenuItem onClick={handleSwitchToStaff} className="cursor-pointer text-primary font-medium focus:text-primary">
                    <Dumbbell className="mr-2 h-4 w-4" />
                    <span>Switch to {role.staffRoleName || 'Staff'} View</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleSwitchToOwner} className="cursor-pointer text-primary font-medium focus:text-primary">
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Switch to Owner View</span>
                  </DropdownMenuItem>
                )}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowLogoutConfirm(true)} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
    </header>
  );
}
