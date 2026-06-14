import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, parseISO } from "date-fns";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  IndianRupee, 
  CalendarCheck, 
  Wallet, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Clock 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useGym } from "@/hooks/useGym";
import { supabase } from "@/lib/supabase";
import { GymStaffAttendance, GymStaffPayroll } from "@/types/gym";

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
  ABSENT: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20",
  HALF_DAY: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
  LEAVE: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function MyAttendancePayroll() {
  const { gymId } = useGym();
  const { role } = usePermissions();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  const [attendance, setAttendance] = useState<GymStaffAttendance[]>([]);
  const [payroll, setPayroll] = useState<GymStaffPayroll[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const staffId = role?.staff_id;

  useEffect(() => {
    if (gymId && staffId) {
      fetchPersonalRecords();
    } else if (!staffId && !role?.isOwner) {
      setErrorMsg("No active staff record found for your user account.");
      setLoading(false);
    }
  }, [gymId, staffId, currentMonth]);

  const fetchPersonalRecords = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      // 1. Fetch personal attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("gym_staff_attendance")
        .select("*")
        .eq("staff_id", staffId)
        .gte("attendance_date", start)
        .lte("attendance_date", end);

      if (attendanceError) throw attendanceError;

      // 2. Fetch personal payroll history for the selected month/year
      const selectedMonthNum = currentMonth.getMonth() + 1;
      const selectedYearNum = currentMonth.getFullYear();

      const { data: payrollData, error: payrollError } = await supabase
        .from("gym_staff_payroll")
        .select("*")
        .eq("staff_id", staffId)
        .eq("payroll_month", selectedMonthNum)
        .eq("payroll_year", selectedYearNum);

      if (payrollError) throw payrollError;

      setAttendance(attendanceData || []);
      setPayroll(payrollData || []);
    } catch (err: any) {
      console.error("Error loading personal logs:", err);
      setErrorMsg(err.message || "Failed to load workspace data.");
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));

  // Calendar calculations
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });
  const startDay = startOfMonth(currentMonth).getDay();
  const emptyDays = Array(startDay).fill(null);

  // Stats for the month
  const presentDays = attendance.filter(r => r.status === "PRESENT").length;
  const halfDays = attendance.filter(r => r.status === "HALF_DAY").length;
  const leaveDays = attendance.filter(r => r.status === "LEAVE").length;
  const absentDays = attendance.filter(r => r.status === "ABSENT").length;

  if (loading && attendance.length === 0 && payroll.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm font-medium">Loading workspace history...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30 bg-destructive/5 max-w-lg mx-auto mt-12">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Access Error
            </CardTitle>
            <CardDescription>{errorMsg}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Workspace</h1>
        <p className="text-muted-foreground">
          View your clock-in calendars, attendance summaries, and salary payout slips in one place.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border bg-card/40 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monthly Attendance</CardTitle>
            <CalendarCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{presentDays + halfDays} Days Active</div>
            <p className="text-xs text-muted-foreground mt-1">
              {presentDays} full days, {halfDays} half days
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/40 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Time Off / Leaves</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaveDays} Days Leave</div>
            <p className="text-xs text-muted-foreground mt-1">
              Approved leaves for this cycle
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/40 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Net Salary</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payroll.length > 0 ? `₹${payroll[0].net_salary.toLocaleString()}` : "₹0"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {payroll.length > 0 ? `${MONTHS[payroll[0].payroll_month - 1]} ${payroll[0].payroll_year}` : "No payouts logged"}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/40 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Salary Payout Status</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {payroll.length > 0 ? payroll[0].payment_status.toLowerCase() : "No record"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Latest payroll processing status
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Attendance Calendar Card */}
        <Card className="lg:col-span-2 border border-border bg-card/40 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Attendance Calendar
              </CardTitle>
              <CardDescription>Your check-ins for the selected month</CardDescription>
            </div>

            {/* Calendar Controls */}
            <div className="flex items-center gap-2 border rounded-xl p-1 bg-muted/30">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-xs sm:text-sm min-w-[100px] text-center">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground pb-2 border-b">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="py-1">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2 pt-2">
              {emptyDays.map((_, i) => (
                <div key={`empty-${i}`} className="h-16 bg-muted/10 border border-transparent rounded-lg opacity-40" />
              ))}

              {daysInMonth.map(date => {
                const dateStr = format(date, "yyyy-MM-dd");
                const record = attendance.find(r => r.attendance_date === dateStr);
                const isTodayDate = isToday(date);

                return (
                  <div
                    key={dateStr}
                    className={cn(
                      "h-16 border rounded-lg p-1.5 flex flex-col justify-between transition-all select-none",
                      isTodayDate && "ring-2 ring-primary ring-offset-1",
                      record ? STATUS_COLORS[record.status] : "bg-card border-border/40 hover:bg-muted/10"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-semibold h-5 w-5 flex items-center justify-center rounded-full",
                      isTodayDate && "bg-primary text-primary-foreground font-bold"
                    )}>
                      {date.getDate()}
                    </span>

                    {record ? (
                      <span className="text-[9px] font-bold tracking-wide uppercase truncate">
                        {record.status.replace("_", " ")}
                      </span>
                    ) : (
                      <span className="text-[9px] text-muted-foreground/30 font-medium">
                        —
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Attendance Legend */}
            <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t text-[11px] font-semibold text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Present
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Half Day
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Approved Leave
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Absent
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payroll History Card */}
        <Card className="border border-border bg-card/40 backdrop-blur-xl h-fit">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Payroll & Payouts
            </CardTitle>
            <CardDescription>Your personal payslip log history</CardDescription>
          </CardHeader>
          <CardContent>
            {payroll.length > 0 ? (
              <div className="space-y-4 max-h-[420px] overflow-auto scrollbar-thin">
                {payroll.map((slip) => (
                  <div key={slip.id} className="border border-border/60 hover:border-primary/30 rounded-xl p-4 transition-all duration-200 bg-card/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm text-foreground">
                          {MONTHS[slip.payroll_month - 1]} {slip.payroll_year}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Paid on: {slip.payment_date ? format(parseISO(slip.payment_date), "dd MMM yyyy") : "Pending"}
                        </p>
                      </div>
                      <Badge variant={slip.payment_status === "PAID" ? "default" : "destructive"} className={cn("text-[10px] uppercase font-bold", slip.payment_status === "PAID" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "")}>
                        {slip.payment_status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-dashed text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase tracking-wide">Base</span>
                        <span className="font-semibold text-foreground flex items-center"><IndianRupee className="h-3 w-3" /> {slip.base_salary.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase tracking-wide">Overtime</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center"><IndianRupee className="h-3 w-3" /> {(slip.overtime_amount || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase tracking-wide">Deductions</span>
                        <span className="font-semibold text-destructive flex items-center"><IndianRupee className="h-3 w-3" /> {(slip.deductions || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t flex items-center justify-between bg-muted/10 -mx-4 -mb-4 px-4 pb-4 rounded-b-xl">
                      <span className="text-xs font-bold text-muted-foreground">Net Salary Payout</span>
                      <span className="text-sm font-extrabold text-foreground flex items-center"><IndianRupee className="h-3.5 w-3.5 text-primary" /> {slip.net_salary.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
                <Wallet className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium text-sm">No payroll processed for this month</p>
                <p className="text-xs opacity-60">Slips will show here once payroll is processed by admin</p>
              </div>
            )}
          </CardContent>
        </Card>
        
      </div>
    </div>
  );
}
