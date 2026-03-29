import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { Calendar as CalendarIcon, Save, ChevronLeft, ChevronRight } from "lucide-react";
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useGym } from "@/hooks/useGym";
import { staffService } from "@/services/staffService";
import { GymStaff, GymStaffAttendance } from "@/types/gym";
import { useToast } from "@/components/ui/use-toast";
import { usePermissions } from "@/contexts/PermissionsContext";

const STATUS_COLORS: Record<string, string> = {
    PRESENT: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
    Present: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
    ABSENT: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
    HALF_DAY: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200",
    LEAVE: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200",
};

export function AttendanceView() {
    const { gymId } = useGym();
    const { toast } = useToast();
    const { hasPermission } = usePermissions();
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [staff, setStaff] = useState<GymStaff[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState<string>("");
    const [attendanceData, setAttendanceData] = useState<GymStaffAttendance[]>([]);
    const [loading, setLoading] = useState(false);

    // Dialog state for marking attendance
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [editRecord, setEditRecord] = useState<Partial<GymStaffAttendance>>({
        status: 'PRESENT',
        remarks: ''
    });

    useEffect(() => {
        if (gymId) {
            loadStaff();
        }
    }, [gymId]);

    useEffect(() => {
        if (gymId && selectedStaffId) {
            loadAttendance();
        } else {
            setAttendanceData([]);
        }
    }, [gymId, selectedStaffId, currentMonth]);

    const loadStaff = async () => {
        if (!gymId) return;
        try {
            const data = await staffService.getStaff(gymId);
            setStaff(data);
            if (data.length > 0 && !selectedStaffId) {
                // Optionally select the first staff member
                // setSelectedStaffId(data[0].id.toString());
            }
        } catch (error) {
            console.error("Error loading staff:", error);
        }
    };

    const loadAttendance = async () => {
        if (!gymId || !selectedStaffId) return;
        setLoading(true);
        try {
            const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
            const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

            const data = await staffService.getAttendance(
                gymId,
                undefined,
                parseInt(selectedStaffId),
                start,
                end
            );
            setAttendanceData(data);
        } catch (error) {
            console.error("Error loading attendance:", error);
            toast({ title: "Error", description: "Failed to load attendance records.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    // Padding days for grid alignment
    const startDay = startOfMonth(currentMonth).getDay(); // 0 = Sunday
    const emptyDays = Array(startDay).fill(null);

    const handleDateClick = (date: Date) => {
        if (!hasPermission('manage_staff_attendance')) {
            toast({ 
                title: "Permission Denied", 
                description: "You don't have permission to mark attendance.", 
                variant: "destructive" 
            });
            return;
        }

        if (!selectedStaffId) {
            toast({ title: "Select Staff", description: "Please select a staff member first.", variant: "destructive" });
            return;
        }

        const member = staff.find(s => s.id.toString() === selectedStaffId);
        const dateStr = format(date, 'yyyy-MM-dd');

        if (member?.join_date && dateStr < member.join_date) {
            toast({
                title: "Invalid Date",
                description: `Cannot mark attendance before join date (${format(new Date(member.join_date), 'PPP')}).`,
                variant: "destructive"
            });
            return;
        }

        const existing = attendanceData.find(r => r.attendance_date === dateStr);

        setSelectedDate(date);
        setEditRecord(existing ? { ...existing } : {
            status: 'PRESENT',
            remarks: '',
            attendance_date: dateStr,
            staff_id: parseInt(selectedStaffId),
            gym_id: gymId
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!gymId || !selectedStaffId || !selectedDate) return;

        try {
            await staffService.markAttendance({
                ...editRecord,
                attendance_date: format(selectedDate, 'yyyy-MM-dd'),
                staff_id: parseInt(selectedStaffId),
                gym_id: gymId
            });
            toast({ title: "Saved", description: "Attendance updated." });
            setDialogOpen(false);
            loadAttendance();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save attendance.", variant: "destructive" });
        }
    };

    const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Select Staff Member" />
                        </SelectTrigger>
                        <SelectContent>
                            {staff.map(s => (
                                <SelectItem key={s.id} value={s.id.toString()}>{s.full_name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2 border rounded-md p-1">
                        <Button variant="ghost" size="icon" onClick={prevMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="font-medium min-w-[120px] text-center">
                            {format(currentMonth, 'MMMM yyyy')}
                        </span>
                        <Button variant="ghost" size="icon" onClick={nextMonth}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {!selectedStaffId ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    Select a staff member to view and manage attendance.
                </div>
            ) : (
                <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center font-medium text-muted-foreground text-sm py-2">
                            {day}
                        </div>
                    ))}

                    {emptyDays.map((_, i) => (
                        <div key={`empty-${i}`} className="h-32 bg-muted/20 rounded-md" />
                    ))}

                    {daysInMonth.map(date => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const record = attendanceData.find(r => r.attendance_date === dateStr);
                        const isTodayDate = isToday(date);

                        // Check validation for visual feedback
                        const member = staff.find(s => s.id.toString() === selectedStaffId);
                        const isBeforeJoinDate = member?.join_date && dateStr < member.join_date;

                        return (
                            <div
                                key={dateStr}
                                onClick={() => handleDateClick(date)}
                                className={cn(
                                    "h-32 border rounded-md p-2 flex flex-col justify-between transition-all",
                                    isBeforeJoinDate
                                        ? "opacity-40 cursor-not-allowed bg-muted/50"
                                        : "cursor-pointer hover:shadow-md hover:border-primary/50",
                                    isTodayDate && "ring-2 ring-primary ring-offset-2",
                                    !isBeforeJoinDate && record ? STATUS_COLORS[record.status] : (!isBeforeJoinDate && "bg-card hover:bg-accent/50")
                                )}
                            >
                                <span className={cn("text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full", isTodayDate && "bg-primary text-primary-foreground")}>
                                    {date.getDate()}
                                </span>

                                {record && !isBeforeJoinDate ? (
                                    <div className="text-xs space-y-1">
                                        <div className="font-bold">{record.status.replace('_', ' ')}</div>
                                        {record.remarks && <div className="truncate opacity-80" title={record.remarks}>{record.remarks}</div>}
                                    </div>
                                ) : (
                                    !isBeforeJoinDate && (
                                        <div className="text-xs text-muted-foreground opacity-0 hover:opacity-100 transition-opacity self-center">
                                            Click to mark
                                        </div>
                                    )
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Mark Attendance - {selectedDate && format(selectedDate, 'PPP')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={editRecord.status}
                                onValueChange={(val: any) => setEditRecord({ ...editRecord, status: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PRESENT">Present</SelectItem>
                                    <SelectItem value="ABSENT">Absent</SelectItem>
                                    <SelectItem value="HALF_DAY">Half Day</SelectItem>
                                    <SelectItem value="LEAVE">Leave</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Remarks</Label>
                            <Input
                                value={editRecord.remarks || ''}
                                onChange={(e) => setEditRecord({ ...editRecord, remarks: e.target.value })}
                                placeholder="Optional remarks..."
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
