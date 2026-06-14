import { useState, useEffect } from "react";
import { format } from "date-fns";
import { DollarSign, Save, FileText, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useGym } from "@/hooks/useGym";
import { staffService } from "@/services/staffService";
import { GymStaff, GymStaffPayroll } from "@/types/gym";
import { useToast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { usePermissions } from "@/contexts/PermissionsContext";

export function PayrollView() {
    const { gymId } = useGym();
    const { toast } = useToast();
    const { hasPermission } = usePermissions();

    const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
    const [year, setYear] = useState<number>(new Date().getFullYear());

    const [staff, setStaff] = useState<GymStaff[]>([]);
    const [payrollMap, setPayrollMap] = useState<Record<number, GymStaffPayroll>>({});
    const [calculatedNetSalaries, setCalculatedNetSalaries] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);

    // Edit/Create Dialog State
    const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
    const [editPayroll, setEditPayroll] = useState<Partial<GymStaffPayroll>>({});
    const [breakdown, setBreakdown] = useState({ present: 0, absent: 0, halfDay: 0, leave: 0, payableDays: 0 });
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        if (gymId) {
            loadData();
        }
    }, [gymId, month, year]);

    const loadData = async () => {
        if (!gymId) return;
        setLoading(true);
        try {
            const start = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
            const end = format(new Date(year, month, 0), 'yyyy-MM-dd');

            const [staffData, payrollData, attendanceData] = await Promise.all([
                staffService.getStaff(gymId),
                staffService.getPayroll(gymId, month, year),
                staffService.getAttendance(gymId, undefined, undefined, start, end)
            ]);

            setStaff(staffData);

            const map: Record<number, GymStaffPayroll> = {};
            payrollData.forEach(record => {
                map[record.staff_id] = record;
            });
            setPayrollMap(map);

            // Calculate live salaries
            const calculated: Record<number, number> = {};
            const totalDaysInMonth = new Date(year, month, 0).getDate();
            let workingDaysInMonth = 0;
            for (let d = 1; d <= totalDaysInMonth; d++) {
                const date = new Date(year, month - 1, d);
                if (date.getDay() !== 0) workingDaysInMonth++;
            }

            staffData.forEach(member => {
                const memberAttendance = attendanceData.filter(a => a.staff_id === member.id);

                let presentCount = 0;
                let halfDayCount = 0;

                memberAttendance.forEach(record => {
                    if (record.status === 'PRESENT') presentCount++;
                    else if (record.status === 'HALF_DAY') halfDayCount++;
                });

                const effectivePresentDays = presentCount + (halfDayCount * 0.5);

                const existingRecord = map[member.id];
                const baseSalary = existingRecord ? existingRecord.base_salary : (member.salary || 0);
                const perDaySalary = workingDaysInMonth > 0 ? (baseSalary / workingDaysInMonth) : 0;
                const earnedSalary = Math.round(effectivePresentDays * perDaySalary);
                const overtime = existingRecord ? (existingRecord.overtime_amount || 0) : 0;
                const deduction = Math.max(0, baseSalary - earnedSalary);

                calculated[member.id] = baseSalary + overtime - deduction;
            });

            setCalculatedNetSalaries(calculated);

        } catch (error) {
            console.error("Error loading payroll data:", error);
            toast({
                title: "Error",
                description: "Failed to load payroll data",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPayroll = async (staffId: number) => {
        if (!hasPermission('add_payroll') && !hasPermission('edit_payroll')) {
            toast({ 
                title: "Permission Denied", 
                description: "You don't have permission to manage payroll.", 
                variant: "destructive" 
            });
            return;
        }

        const existing = payrollMap[staffId];
        const staffMember = staff.find(s => s.id === staffId);

        // ALWAYS fetch attendance to calculate breakdown stats live
        const start = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
        const end = format(new Date(year, month, 0), 'yyyy-MM-dd');

        // Stats
        let presentCount = 0;
        let absentCount = 0;
        let halfDayCount = 0;
        let leaveCount = 0;
        let effectivePresentDays = 0;
        let totalAttendanceRecords = 0;

        try {
            const attendance = await staffService.getAttendance(gymId!, undefined, staffId, start, end);
            totalAttendanceRecords = attendance.length;

            attendance.forEach(record => {
                if (record.status === 'PRESENT') presentCount++;
                else if (record.status === 'ABSENT') absentCount++;
                else if (record.status === 'HALF_DAY') halfDayCount++;
                else if (record.status === 'LEAVE') leaveCount++;
            });

            effectivePresentDays = presentCount + (halfDayCount * 0.5);

            setBreakdown({
                present: presentCount,
                absent: absentCount,
                halfDay: halfDayCount,
                leave: leaveCount,
                payableDays: effectivePresentDays
            });

        } catch (err) {
            console.error("Error fetching attendance for payroll", err);
        }

        // Calculate Common Values for both New and Existing
        // Use existing base salary if editing, otherwise use current staff salary
        const baseSalary = existing ? existing.base_salary : (staffMember?.salary || 0);
        // Calculate Working Days (Excluding Sundays)
        const totalDaysInMonth = new Date(year, month, 0).getDate();
        let workingDaysInMonth = 0;
        for (let d = 1; d <= totalDaysInMonth; d++) {
            const date = new Date(year, month - 1, d);
            if (date.getDay() !== 0) { // Exclude Sundays (0)
                workingDaysInMonth++;
            }
        }

        const perDaySalary = workingDaysInMonth > 0 ? (baseSalary / workingDaysInMonth) : 0;

        // Calculate Strictly based on work done
        // Net = Earned
        // Deductions = Base - Earned
        const earnedSalary = Math.round(effectivePresentDays * perDaySalary);
        const calculatedDeductions = Math.max(0, baseSalary - earnedSalary);

        let initialData: Partial<GymStaffPayroll> = {};

        if (existing) {
            // Update existing record with LATEST attendance data
            // Use existing Overtime, but recalculate Base, Deductions, and Net
            const existingOvertime = existing.overtime_amount || 0;

            initialData = {
                ...existing,
                base_salary: baseSalary,
                total_working_days: totalAttendanceRecords,
                present_days: Math.ceil(effectivePresentDays),
                absent_days: absentCount,
                deductions: calculatedDeductions,
                net_salary: earnedSalary + existingOvertime, // Re-add existing overtime to new earned
                // payment_status: existing.payment_status // Kept from spread
            };
        } else {
            initialData = {
                staff_id: staffId,
                gym_id: gymId!,
                payroll_month: month,
                payroll_year: year,
                base_salary: baseSalary,
                total_working_days: totalAttendanceRecords,
                // Rounding present_days to satisfy likely Integer column in DB.
                // Using ceil to avoid confusion, but Net Salary is exact.
                present_days: Math.ceil(effectivePresentDays),
                absent_days: absentCount,
                overtime_amount: 0,
                deductions: calculatedDeductions,
                net_salary: earnedSalary,
                payment_status: 'PENDING'
            };
        }

        setEditPayroll(initialData);
        setSelectedStaffId(staffId);
        setDialogOpen(true);
    };

    const calculateNetSalary = (currentData: Partial<GymStaffPayroll>) => {
        const base = Number(currentData.base_salary) || 0;
        const ot = Number(currentData.overtime_amount) || 0;
        const ded = Number(currentData.deductions) || 0;
        return base + ot - ded;
    };

    const handleSave = async () => {
        if (!editPayroll.staff_id) return;

        try {
            const payload = {
                ...editPayroll,
                net_salary: calculateNetSalary(editPayroll)
            };

            await staffService.createPayroll(payload);

            toast({ title: "Success", description: "Payroll saved." });
            setDialogOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save payroll.", variant: "destructive" });
        }
    };

    if (loading) {
        return (
            <div className="flex h-[30vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex gap-4 items-center">
                <Select value={month.toString()} onValueChange={(v) => setMonth(Number(v))}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <SelectItem key={m} value={m.toString()}>{format(new Date(2024, m - 1, 1), 'MMMM')}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
                    <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {[2024, 2025, 2026].map(y => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted">
                                <TableHead>Staff Name</TableHead>
                                <TableHead>Base Salary</TableHead>
                                <TableHead>Present / Total Days</TableHead>
                                <TableHead>Net Salary</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staff.map((member) => {
                                const record = payrollMap[member.id];
                                return (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium">{member.full_name}</TableCell>
                                        <TableCell>₹{record ? record.base_salary : (member.salary || 0)}</TableCell>
                                        <TableCell>
                                            {record ? `${record.present_days} / ${record.total_working_days}` : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {record ? `₹${record.net_salary}` : '-'}
                                                {record && calculatedNetSalaries[member.id] !== undefined && record.net_salary !== calculatedNetSalaries[member.id] && record.payment_status !== 'PAID' && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Data updated! New calculated salary: ₹{calculatedNetSalaries[member.id]}</p>
                                                                <p>Click "Manage" to update.</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {record ? (
                                                <span className={cn(
                                                    "px-2 py-1 rounded-full text-xs font-semibold",
                                                    record.payment_status === 'PAID' ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                                )}>
                                                    {record.payment_status}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">Not Generated</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {(hasPermission('add_payroll') || hasPermission('edit_payroll')) && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleOpenPayroll(member.id)}
                                                >
                                                    <FileText className="h-4 w-4 mr-2" />
                                                    {record ? "Manage" : "Create"}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Edit/Create Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>manage Payroll</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Base Salary</Label>
                                <div className="text-lg font-semibold">₹{editPayroll.base_salary}</div>
                            </div>
                            <div className="space-y-2">
                                <Label>Net Salary (Calculated)</Label>
                                <div className="text-xl font-bold text-primary">₹{calculateNetSalary(editPayroll)}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-5 gap-2 border p-3 rounded-md bg-muted/50 text-center">
                            <div className="space-y-1">
                                <Label className="text-muted-foreground text-[10px] uppercase">Present</Label>
                                <div className="text-md font-semibold text-green-600">{breakdown.present}</div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-muted-foreground text-[10px] uppercase">Leave</Label>
                                <div className="text-md font-semibold text-blue-600">{breakdown.leave}</div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-muted-foreground text-[10px] uppercase">Half Day</Label>
                                <div className="text-md font-semibold text-orange-600">{breakdown.halfDay}</div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-muted-foreground text-[10px] uppercase">Absent</Label>
                                <div className="text-md font-semibold text-red-600">{breakdown.absent}</div>
                            </div>
                            <div className="space-y-1 border-l pl-2">
                                <Label className="text-muted-foreground text-[10px] uppercase font-bold">Payable Days</Label>
                                <div className="text-lg font-bold">{breakdown.payableDays}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Overtime Amount</Label>
                                <Input
                                    type="number"
                                    value={editPayroll.overtime_amount}
                                    onChange={(e) => setEditPayroll({ ...editPayroll, overtime_amount: Number(e.target.value) })}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Calculated Deductions</Label>
                                <div className="text-lg font-medium text-destructive">-₹{editPayroll.deductions}</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Payment Status</Label>
                            <Select
                                value={editPayroll.payment_status}
                                onValueChange={(val: any) => setEditPayroll({ ...editPayroll, payment_status: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="HOLD">Hold</SelectItem>
                                    <SelectItem value="PAID">Paid</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save Payroll</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
