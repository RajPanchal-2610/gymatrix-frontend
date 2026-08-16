import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Search, 
  Users, 
  CreditCard, 
  Calendar, 
  IndianRupee, 
  Package, 
  UserCog, 
  Apple, 
  Shield, 
  BarChart3, 
  Settings, 
  Trophy, 
  Bell, 
  ArrowRight,
  Sparkles,
  Dumbbell
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useGym } from "@/hooks/useGym";
import { useSubscription } from "@/hooks/useSubscription";
import { usePermissions } from "@/contexts/PermissionsContext";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";

interface NavModule {
  title: string;
  url: string;
  description: string;
  icon: any;
  feature?: string;
  permission?: string;
  hideForSuperAdmin?: boolean;
}

const navModules: NavModule[] = [
  { title: "Dashboard", url: "/dashboard", description: "View your gym's summary statistics, revenue trends, and check-ins.", icon: Sparkles },
  { title: "Notifications", url: "/notifications", description: "View system alerts, automated reminders, and activity logs.", icon: Bell },
  { title: "Members", url: "/members", description: "Manage members, subscriptions, check-ins, and history.", feature: "Member Management", permission: "view_members", icon: Users },
  { title: "Membership Plans", url: "/plans", description: "Configure membership durations, pricing, and trainers.", feature: "Membership Plans", permission: "view_membership_plans", icon: CreditCard },
  { title: "Pricing", url: "/pricing", description: "Upgrade or modify the subscription plan for Gymatrix.", icon: IndianRupee, hideForSuperAdmin: true },
  { title: "Attendance", url: "/attendance", description: "Monitor active check-ins and check-in logs.", feature: "Access Control", icon: Calendar, hideForSuperAdmin: true },
  { title: "Payments", url: "/payments", description: "Record payments, track outstanding dues, and view receipts.", feature: "Payments & Billing", permission: "view_payments", icon: IndianRupee },
  { title: "Inventory", url: "/inventory", description: "Track equipment, stocks, purchases, and maintenance logs.", feature: "Inventory Control", icon: Package, hideForSuperAdmin: true },
  { title: "Staff & Trainers", url: "/staff", description: "Add trainers and gym managers, assign roles, and set payroll.", feature: "Staff & HR", permission: "view_staff", icon: UserCog, hideForSuperAdmin: true },
  { title: "Diet & Workout", url: "/diet-workout", description: "Create customized meal programs and workout routines.", feature: "Diet & Workout Plans", permission: "view_diet_workout_plans", icon: Apple, hideForSuperAdmin: true },
  { title: "Roles", url: "/roles", description: "Create custom permissions and access roles.", feature: "Access Control", permission: "view_roles", icon: Shield, hideForSuperAdmin: true },
  { title: "Reports", url: "/reports", description: "Analyze revenue collection and membership lifecycle trends.", feature: "Reports & Analytics", permission: "view_reports", icon: BarChart3 },
  { title: "Settings", url: "/settings", description: "Update gym info, working hours, and billing defaults.", feature: "Gym Settings", permission: "view_gym_settings", icon: Settings },
  { title: "Tournaments", url: "/tournaments", description: "Create tournaments, track scores, and manage leaderboards.", feature: "Tournament", permission: "view_tournaments", icon: Trophy, hideForSuperAdmin: true },
  { title: "Trainer Leads", url: "/trainer-leads", description: "Onboard incoming instructors and manage leads.", icon: Users, hideForSuperAdmin: true },
  { title: "My Attendance & Payroll", url: "/my-attendance-payroll", description: "View shifts, check-ins, and payroll slips.", icon: Calendar, hideForSuperAdmin: true }
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = location.pathname.startsWith("/admin");
  const { gymId } = useGym();
  const { hasFeature, loading: subscriptionLoading } = useSubscription();
  const { hasPermission, role } = usePermissions();

  const [results, setResults] = useState<{
    members: any[];
    staff: any[];
    plans: any[];
    inventory: any[];
    tournaments: any[];
    dietPlans: any[];
    workoutPlans: any[];
    payments: any[];
  }>({
    members: [],
    staff: [],
    plans: [],
    inventory: [],
    tournaments: [],
    dietPlans: [],
    workoutPlans: [],
    payments: [],
  });

  // Keybindings
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "/" && document.activeElement === document.body) {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Clear query on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults({
        members: [],
        staff: [],
        plans: [],
        inventory: [],
        tournaments: [],
        dietPlans: [],
        workoutPlans: [],
        payments: [],
      });
    }
  }, [open]);

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query.trim());
      } else {
        setResults({
          members: [],
          staff: [],
          plans: [],
          inventory: [],
          tournaments: [],
          dietPlans: [],
          workoutPlans: [],
          payments: [],
        });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  const performSearch = async (searchTerm: string) => {
    if (!gymId) return;
    setLoading(true);
    try {
      // 1. Determine allowed searches based on permissions and subscription features
      const canSearchMembers = isAdmin || (hasPermission("view_members") && hasFeature("Member Management"));
      const canSearchStaff = isAdmin || (hasPermission("view_staff") && hasFeature("Staff & HR"));
      const canSearchPlans = isAdmin || (hasPermission("view_membership_plans") && hasFeature("Membership Plans"));
      const canSearchInventory = isAdmin || (hasPermission("view_inventory") && hasFeature("Inventory Control"));
      const canSearchTournaments = isAdmin || (hasPermission("view_tournaments") && hasFeature("Tournament"));
      const canSearchDietWorkout = isAdmin || (hasPermission("view_diet_workout_plans") && hasFeature("Diet & Workout Plans"));
      const canSearchPayments = isAdmin || (hasPermission("view_payments") && hasFeature("Payments & Billing"));

      // 2. Step 1: Query members, staff, plans, inventory, tournaments in parallel
      const [membersRes, staffRes, plansRes, inventoryRes, tournamentsRes] = await Promise.all([
        // Members search
        canSearchMembers
          ? supabase
              .from("gym_members")
              .select("id, full_name, email, phone")
              .eq("gym_id", gymId)
              .eq("is_deleted", false)
              .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
              .limit(5)
          : Promise.resolve({ data: [] }),

        // Staff search
        canSearchStaff
          ? supabase
              .from("gym_staff")
              .select("id, full_name, email, role_id, gym_roles(name)")
              .eq("gym_id", gymId)
              .eq("is_deleted", false)
              .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
              .limit(5)
          : Promise.resolve({ data: [] }),

        // Plans search
        canSearchPlans
          ? supabase
              .from("gym_membership_plans")
              .select("id, name, price")
              .eq("gym_id", gymId)
              .eq("is_deleted", false)
              .ilike("name", `%${searchTerm}%`)
              .limit(5)
          : Promise.resolve({ data: [] }),

        // Inventory search
        canSearchInventory
          ? supabase
              .from("gym_inventory_items")
              .select("id, name, brand, model")
              .eq("gym_id", gymId)
              .or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`)
              .limit(5)
          : Promise.resolve({ data: [] }),

        // Tournaments search
        canSearchTournaments
          ? supabase
              .from("gym_tournaments")
              .select("id, name, status")
              .eq("gym_id", gymId)
              .ilike("name", `%${searchTerm}%`)
              .limit(5)
          : Promise.resolve({ data: [] }),
      ]);

      const matchedMembers = membersRes.data || [];
      const memberIds = matchedMembers.map(m => m.id);

      // 3. Step 2: Query associated diet plans, workout plans, and payments using matched member IDs
      let dietPlans: any[] = [];
      let workoutPlans: any[] = [];
      let payments: any[] = [];

      if (canSearchDietWorkout || canSearchPayments) {
        const memberFilterStr = memberIds.length > 0 ? `member_id.in.(${memberIds.join(",")})` : "";

        const [dietRes, workoutRes, paymentsRes] = await Promise.all([
          canSearchDietWorkout
            ? supabase
                .from("gym_diet_plans")
                .select("id, title, gym_members(id, full_name)")
                .eq("gym_id", gymId)
                .eq("is_deleted", false)
                .or(memberFilterStr ? `title.ilike.%${searchTerm}%,${memberFilterStr}` : `title.ilike.%${searchTerm}%`)
                .limit(5)
            : Promise.resolve({ data: [] }),

          canSearchDietWorkout
            ? supabase
                .from("gym_workout_plans")
                .select("id, title, gym_members(id, full_name)")
                .eq("gym_id", gymId)
                .eq("is_deleted", false)
                .or(memberFilterStr ? `title.ilike.%${searchTerm}%,${memberFilterStr}` : `title.ilike.%${searchTerm}%`)
                .limit(5)
            : Promise.resolve({ data: [] }),

          canSearchPayments
            ? supabase
                .from("gym_membership_payments")
                .select("id, paid_amount, payment_status, created_at, remarks, gym_members(id, full_name, assigned_staff_id)")
                .eq("gym_id", gymId)
                .or(memberFilterStr ? `remarks.ilike.%${searchTerm}%,${memberFilterStr}` : `remarks.ilike.%${searchTerm}%`)
                .limit(5)
            : Promise.resolve({ data: [] }),
        ]);

        dietPlans = dietRes.data || [];
        workoutPlans = workoutRes.data || [];
        
        const rawPayments = paymentsRes.data || [];
        payments = rawPayments.filter((p: any) => {
          if (p.remarks === "Personal Training Fee") {
            const assignedStaffId = p.gym_members?.assigned_staff_id?.toString();
            const currentStaffId = role?.staff_id?.toString();
            return assignedStaffId && currentStaffId && assignedStaffId === currentStaffId;
          }
          return true;
        });
      }

      console.log("Global Search results for '" + searchTerm + "':", {
        members: matchedMembers,
        staff: staffRes.data,
        plans: plansRes.data,
        inventory: inventoryRes.data,
        tournaments: tournamentsRes.data,
        dietPlans,
        workoutPlans,
        payments
      });

      setResults({
        members: matchedMembers,
        staff: staffRes.data || [],
        plans: plansRes.data || [],
        inventory: inventoryRes.data || [],
        tournaments: tournamentsRes.data || [],
        dietPlans,
        workoutPlans,
        payments
      });
    } catch (err) {
      console.error("Search query execution error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter modules based on query and active user permissions
  const getFilteredModules = () => {
    return navModules.filter((item) => {
      // 1. Base permission checks (identical to AppSidebar)
      if (isAdmin && item.hideForSuperAdmin) return false;
      if (!isAdmin && item.title === "Trainer Leads" && role?.name?.toLowerCase() !== "trainer") return false;
      if (!isAdmin && item.title === "My Attendance & Payroll" && (role?.isOwner || role?.name === "SUPER_ADMIN" || role?.name?.toLowerCase() === "owner")) return false;

      if (!isAdmin) {
        if (subscriptionLoading) return false;
        if (item.feature && !hasFeature(item.feature)) return false;
        if (item.permission && !hasPermission(item.permission)) return false;
      }

      // 2. Query check (if query is present)
      if (query.trim().length > 0) {
        const term = query.toLowerCase();
        return (
          item.title.toLowerCase().includes(term) ||
          item.description.toLowerCase().includes(term)
        );
      }

      // If query is empty, show all allowed modules as quick links
      return true;
    });
  };

  const filteredModules = getFilteredModules();
  const hasDbResults =
    results.members.length > 0 ||
    results.staff.length > 0 ||
    results.plans.length > 0 ||
    results.inventory.length > 0 ||
    results.tournaments.length > 0 ||
    results.dietPlans.length > 0 ||
    results.workoutPlans.length > 0 ||
    results.payments.length > 0;

  const handleSelectModule = (url: string) => {
    let finalUrl = url;
    if (isAdmin) {
      if (finalUrl === "/") finalUrl = "/admin/dashboard";
      else finalUrl = `/admin${finalUrl}`;
    }
    navigate(finalUrl);
    setOpen(false);
  };

  return (
    <>
      {/* Search Input Trigger in Header */}
      <div 
        onClick={() => setOpen(true)}
        className="hidden md:flex relative items-center cursor-pointer group"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        <Input
          placeholder="Search members, plans, pages..."
          className="w-64 pl-9 pr-12 bg-secondary/50 border-0 focus-visible:ring-1 cursor-pointer select-none"
          readOnly
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-80 hidden sm:flex">
          <span className="text-[10px]">Ctrl</span>K
        </kbd>
      </div>

      {/* Command Palette Modal */}
      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Type to search members, plans, pages..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[450px]">
          {loading && (
            <div className="p-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Searching...
            </div>
          )}

          {!loading && query && !hasDbResults && filteredModules.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {/* 1. Modules / Navigation Links */}
          {filteredModules.length > 0 && (
            <CommandGroup heading={query ? "Navigation Pages" : "Quick Navigation"}>
              {filteredModules.slice(0, 8).map((module) => {
                const IconComp = module.icon;
                return (
                  <CommandItem
                    key={module.url}
                    onSelect={() => handleSelectModule(module.url)}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md hover:bg-accent group text-foreground"
                  >
                    <IconComp className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium text-sm text-foreground">{module.title}</span>
                      <span className="text-xs text-muted-foreground truncate">{module.description}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-data-[selected='true']:opacity-100 text-muted-foreground shrink-0 transition-opacity" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* 2. Members Results */}
          {results.members.length > 0 && (
            <CommandGroup heading="Members">
              {results.members.map((member) => (
                <CommandItem
                  key={member.id}
                  onSelect={() => {
                    navigate(`/members/${member.id}`);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md hover:bg-accent group text-foreground"
                >
                  <Users className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium text-sm text-foreground">{member.full_name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {[member.email, member.phone].filter(Boolean).join(" • ")}
                    </span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 group-data-[selected='true']:opacity-100 text-muted-foreground shrink-0 transition-opacity" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* 3. Staff Results */}
          {results.staff.length > 0 && (
            <CommandGroup heading="Staff & Instructors">
              {results.staff.map((staffMember) => {
                const roleName = staffMember.gym_roles?.name?.replace(/_/g, " ") || "Staff";
                return (
                  <CommandItem
                    key={staffMember.id}
                    onSelect={() => {
                      navigate(`/staff`);
                      setOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md hover:bg-accent group text-foreground"
                  >
                    <UserCog className="h-4 w-4 text-blue-500 shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium text-sm text-foreground">
                        {staffMember.full_name}
                        <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded ml-2 font-normal">
                          {roleName.charAt(0).toUpperCase() + roleName.slice(1)}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground truncate">{staffMember.email}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-data-[selected='true']:opacity-100 text-muted-foreground shrink-0 transition-opacity" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* 4. Membership Plans Results */}
          {results.plans.length > 0 && (
            <CommandGroup heading="Membership Plans">
              {results.plans.map((plan) => (
                <CommandItem
                  key={plan.id}
                  onSelect={() => {
                    navigate(`/plans`);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md hover:bg-accent group text-foreground"
                >
                  <CreditCard className="h-4 w-4 text-amber-500 shrink-0" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium text-sm text-foreground">{plan.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Price: ₹{plan.price}
                    </span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 group-data-[selected='true']:opacity-100 text-muted-foreground shrink-0 transition-opacity" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* 5. Inventory Results */}
          {results.inventory.length > 0 && (
            <CommandGroup heading="Inventory">
              {results.inventory.map((item) => {
                const details = [item.brand, item.model].filter(Boolean).join(" • ");
                return (
                  <CommandItem
                    key={item.id}
                    onSelect={() => {
                      navigate(`/inventory`);
                      setOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md hover:bg-accent group text-foreground"
                  >
                    <Package className="h-4 w-4 text-purple-500 shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium text-sm text-foreground">{item.name}</span>
                      {details && (
                        <span className="text-xs text-muted-foreground">{details}</span>
                      )}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-data-[selected='true']:opacity-100 text-muted-foreground shrink-0 transition-opacity" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* 6. Tournaments Results */}
          {results.tournaments.length > 0 && (
            <CommandGroup heading="Tournaments">
              {results.tournaments.map((tournament) => (
                <CommandItem
                  key={tournament.id}
                  onSelect={() => {
                    navigate(`/tournaments/${tournament.id}`);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md hover:bg-accent group text-foreground"
                >
                  <Trophy className="h-4 w-4 text-yellow-500 shrink-0" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium text-sm text-foreground">{tournament.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Status: {tournament.status}
                    </span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 group-data-[selected='true']:opacity-100 text-muted-foreground shrink-0 transition-opacity" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* 7. Diet Plans Results */}
          {results.dietPlans.length > 0 && (
            <CommandGroup heading="Diet Plans">
              {results.dietPlans.map((plan) => (
                <CommandItem
                  key={plan.id}
                  onSelect={() => {
                    navigate(`/diet-workout`);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md hover:bg-accent group text-foreground"
                >
                  <Apple className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium text-sm text-foreground">{plan.title}</span>
                    {plan.gym_members && (
                      <span className="text-xs text-muted-foreground truncate">
                        Assigned to: {plan.gym_members.full_name}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 group-data-[selected='true']:opacity-100 text-muted-foreground shrink-0 transition-opacity" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* 8. Workout Plans Results */}
          {results.workoutPlans.length > 0 && (
            <CommandGroup heading="Workout Plans">
              {results.workoutPlans.map((plan) => (
                <CommandItem
                  key={plan.id}
                  onSelect={() => {
                    navigate(`/diet-workout`);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md hover:bg-accent group text-foreground"
                >
                  <Dumbbell className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium text-sm text-foreground">{plan.title}</span>
                    {plan.gym_members && (
                      <span className="text-xs text-muted-foreground truncate">
                        Assigned to: {plan.gym_members.full_name}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 group-data-[selected='true']:opacity-100 text-muted-foreground shrink-0 transition-opacity" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* 9. Member Payments Results */}
          {results.payments.length > 0 && (
            <CommandGroup heading="Member Payments">
              {results.payments.map((payment) => {
                const memberName = payment.gym_members?.full_name || "Unknown Member";
                const dateStr = new Date(payment.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                });
                return (
                  <CommandItem
                    key={payment.id}
                    onSelect={() => {
                      navigate(`/payments`);
                      setOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md hover:bg-accent group text-foreground"
                  >
                    <IndianRupee className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium text-sm text-foreground">
                        ₹{payment.paid_amount} - {memberName}
                        <span className={`text-[10px] px-2 py-0.5 rounded ml-2 font-normal ${
                          payment.payment_status === "paid" 
                            ? "bg-emerald-500/10 text-emerald-500" 
                            : "bg-amber-500/10 text-amber-500"
                        }`}>
                          {payment.payment_status?.toUpperCase()}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {dateStr} {payment.remarks ? `• ${payment.remarks}` : ""}
                      </span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-data-[selected='true']:opacity-100 text-muted-foreground shrink-0 transition-opacity" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
