import { useState, useEffect } from "react";
import { Calendar, Clock, UserCheck, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/dashboard/StatCard";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useGym } from "@/hooks/useGym";
import { attendanceService } from "@/services/attendanceService";
import { toast } from "sonner";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { Loader2 } from "lucide-react";
export default function Attendance() {
  const { hasPermission } = usePermissions();
  const { gymId } = useGym();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("today");
  
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gymId) fetchAttendance();
  }, [gymId, selectedDate]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const today = new Date();
      let date: string | undefined = undefined;
      let startDate: string | undefined = undefined;
      let endDate: string | undefined = undefined;

      if (selectedDate === "today") {
        date = format(today, "yyyy-MM-dd");
      } else if (selectedDate === "yesterday") {
        date = format(subDays(today, 1), "yyyy-MM-dd");
      } else if (selectedDate === "week") {
        startDate = format(startOfWeek(today), "yyyy-MM-dd");
        endDate = format(endOfWeek(today), "yyyy-MM-dd");
      } else if (selectedDate === "month") {
        startDate = format(startOfMonth(today), "yyyy-MM-dd");
        endDate = format(endOfMonth(today), "yyyy-MM-dd");
      }

      const data = await attendanceService.getMemberAttendance(date, startDate, endDate);
      setRecords(data || []);
    } catch (error: any) {
      toast.error("Failed to load attendance: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(r => 
    r.member?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentlyIn = records.filter((r) => !r.check_out_time).length;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title={`Total Check-ins ${selectedDate.charAt(0).toUpperCase() + selectedDate.slice(1)}`}
          value={records.length}
          icon={UserCheck}
          iconClassName="gradient-primary"
        />
        <StatCard
          title="Currently In Gym"
          value={currentlyIn}
          change="Active right now"
          changeType="neutral"
          icon={Clock}
          iconClassName="bg-success"
        />
        <StatCard
          title="Average Session"
          value="1h 15m"
          change="Estimate"
          changeType="neutral"
          icon={Calendar}
          iconClassName="bg-primary"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedDate} onValueChange={setSelectedDate}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
        {hasPermission('manage_attendance') && (
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Check-in Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Member</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Check-in</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Check-out</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Duration</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={record.member?.image_url || "/placeholder.svg"} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                              {record.member?.full_name?.substring(0, 2).toUpperCase() || "M"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{record.member?.full_name || "Unknown"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3.5 w-3.5 text-success" />
                          {record.check_in_time}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {record.check_out_time ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {record.check_out_time}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {record.duration || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {record.check_out_time ? (
                          <Badge variant="secondary">Completed</Badge>
                        ) : (
                          <Badge className="bg-success/10 text-success hover:bg-success/20">
                            In Gym
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
