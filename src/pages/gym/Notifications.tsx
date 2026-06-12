import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Bell, 
  BellOff, 
  Trash2, 
  CheckCheck, 
  UserPlus, 
  IndianRupee, 
  CircleAlert, 
  ShieldAlert, 
  Search,
  CheckCircle2,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGym } from "@/hooks/useGym";
import { useNotifications } from "@/hooks/useNotifications";
import { usePermissions } from "@/contexts/PermissionsContext";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";

export default function Notifications() {
  const navigate = useNavigate();
  const { gymId } = useGym();
  const { hasPermission } = usePermissions();
  const canViewFinance = hasPermission('view_payments');

  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications(gymId, canViewFinance);

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Helper to resolve notification icons
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_member':
        return (
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 dark:bg-blue-500/15">
            <UserPlus className="h-5 w-5" />
          </div>
        );
      case 'payment_received':
        return (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/15">
            <IndianRupee className="h-5 w-5" />
          </div>
        );
      case 'membership_expiring':
      case 'overdue_payment':
        return (
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 dark:bg-amber-500/15">
            <CircleAlert className="h-5 w-5" />
          </div>
        );
      case 'system':
      default:
        return (
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 dark:bg-purple-500/15">
            <ShieldAlert className="h-5 w-5" />
          </div>
        );
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    
    // Navigate to respective dashboard sections
    if (notif.type === 'new_member' || notif.type === 'membership_expiring') {
      navigate('/members');
    } else if (notif.type === 'payment_received' || notif.type === 'overdue_payment') {
      navigate('/payments');
    }
  };

  // Filter logic
  const filteredNotifications = notifications.filter(notif => {
    const matchesSearch = 
      notif.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      notif.message.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === "unread") return !notif.is_read;
    if (activeTab === "read") return notif.is_read;
    if (activeTab === "members") return notif.type === "new_member" || notif.type === "membership_expiring";
    if (activeTab === "payments") return notif.type === "payment_received" || notif.type === "overdue_payment";
    if (activeTab === "system") return notif.type === "system";

    return true;
  });

  // Group notifications by Date (Today, Yesterday, Older)
  const groupNotificationsByDate = (notifs: typeof notifications) => {
    const groups: { [key: string]: typeof notifications } = {
      Today: [],
      Yesterday: [],
      Older: []
    };

    notifs.forEach(n => {
      const date = new Date(n.created_at);
      if (isToday(date)) {
        groups.Today.push(n);
      } else if (isYesterday(date)) {
        groups.Yesterday.push(n);
      } else {
        groups.Older.push(n);
      }
    });

    return groups;
  };

  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  return (
    <div className="space-y-6 w-full">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <Bell className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Notification Center</h1>
            <p className="text-sm text-muted-foreground">Manage and review your real-time dashboard logs</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={markAllAsRead}
              className="border-primary/20 text-primary hover:bg-primary/5 h-9"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Tabs and Content Grid */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <TabsList className="bg-muted/80 p-1 h-auto flex-wrap gap-1 justify-start">
            <TabsTrigger value="all" className="px-4 py-1.5 text-xs font-medium rounded-lg">
              All
              {notifications.length > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-[10px] bg-secondary-foreground/10">
                  {notifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" className="px-4 py-1.5 text-xs font-medium rounded-lg">
              Unread
              {unreadCount > 0 && (
                <Badge className="ml-2 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground shadow-glow border-none">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="read" className="px-4 py-1.5 text-xs font-medium rounded-lg">Read</TabsTrigger>
            <TabsTrigger value="members" className="px-4 py-1.5 text-xs font-medium rounded-lg">Members</TabsTrigger>
            {canViewFinance && (
              <TabsTrigger value="payments" className="px-4 py-1.5 text-xs font-medium rounded-lg">Payments</TabsTrigger>
            )}
            <TabsTrigger value="system" className="px-4 py-1.5 text-xs font-medium rounded-lg">System</TabsTrigger>
          </TabsList>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-secondary/30 border-border/80 focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Dynamic List */}
        <Card className="border-border/60 bg-card/30 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <span className="h-8 w-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <p className="text-xs text-muted-foreground">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="p-4 bg-muted/50 text-muted-foreground rounded-full mb-4">
                  <BellOff className="h-10 w-10 opacity-70" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">All caught up!</h3>
                <p className="text-sm text-muted-foreground max-w-xs mt-1">
                  {searchQuery ? "No notifications match your search query." : "You have no notifications in this category."}
                </p>
                {searchQuery && (
                  <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="mt-4">
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {Object.keys(groupedNotifications).map((groupName) => {
                  const items = groupedNotifications[groupName];
                  if (items.length === 0) return null;

                  return (
                    <div key={groupName} className="p-1 sm:p-2">
                      <div className="px-4 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase bg-muted/15 rounded-lg mb-1">
                        {groupName}
                      </div>
                      
                      <div className="space-y-1">
                        {items.map((notif) => (
                          <div
                            key={notif.id}
                            className={`group flex items-start gap-4 p-4 rounded-xl transition-all duration-200 hover:bg-muted/40 ${
                              !notif.is_read ? 'bg-primary/5 dark:bg-primary/10 border-l-2 border-primary' : 'border-l-2 border-transparent'
                            }`}
                          >
                            <div className="flex-shrink-0">
                              {getNotificationIcon(notif.type)}
                            </div>
                            
                            <div 
                              onClick={() => handleNotificationClick(notif)}
                              className="flex-1 min-w-0 cursor-pointer flex flex-col gap-0.5"
                            >
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold text-foreground ${!notif.is_read ? 'font-bold' : ''}`}>
                                  {notif.title}
                                </span>
                                {!notif.is_read && (
                                  <Badge className="h-1.5 w-1.5 p-0 bg-primary rounded-full" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed pr-4">
                                {notif.message}
                              </p>
                              <span className="text-[10px] text-muted-foreground/75 mt-1 font-medium">
                                {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              {!notif.is_read && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => markAsRead(notif.id)}
                                  className="h-8 w-8 text-muted-foreground hover:text-success hover:bg-success/10 rounded-lg"
                                  title="Mark as read"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteNotification(notif.id)}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                  title="Delete alert"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
