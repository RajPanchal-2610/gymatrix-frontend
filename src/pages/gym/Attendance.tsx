import { useState } from "react";
import { Calendar, Clock, UserCheck, Search, Filter } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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

const attendanceRecords = [
  { id: 1, name: "Mike Johnson", checkIn: "6:30 AM", checkOut: "8:15 AM", duration: "1h 45m", avatar: "MJ" },
  { id: 2, name: "Sarah Wilson", checkIn: "7:15 AM", checkOut: "9:00 AM", duration: "1h 45m", avatar: "SW" },
  { id: 3, name: "Emily Brown", checkIn: "8:00 AM", checkOut: null, duration: null, avatar: "EB" },
  { id: 4, name: "David Lee", checkIn: "8:45 AM", checkOut: "10:30 AM", duration: "1h 45m", avatar: "DL" },
  { id: 5, name: "Anna Chen", checkIn: "9:30 AM", checkOut: null, duration: null, avatar: "AC" },
  { id: 6, name: "James Wilson", checkIn: "10:00 AM", checkOut: "11:45 AM", duration: "1h 45m", avatar: "JW" },
  { id: 7, name: "Lisa Park", checkIn: "10:30 AM", checkOut: null, duration: null, avatar: "LP" },
  { id: 8, name: "Tom Brown", checkIn: "11:00 AM", checkOut: "12:30 PM", duration: "1h 30m", avatar: "TB" },
];

export default function Attendance() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("today");

  const currentlyIn = attendanceRecords.filter((r) => !r.checkOut).length;

  return (
    <DashboardLayout title="Attendance">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Check-ins Today"
          value={attendanceRecords.length}
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
          value="1h 38m"
          change="+5 min from yesterday"
          changeType="positive"
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
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Export
        </Button>
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
                {attendanceRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src="/placeholder.svg" />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {record.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{record.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3.5 w-3.5 text-success" />
                        {record.checkIn}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {record.checkOut ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {record.checkOut}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {record.duration || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {record.checkOut ? (
                        <Badge variant="secondary">Completed</Badge>
                      ) : (
                        <Badge className="bg-success/10 text-success hover:bg-success/20">
                          In Gym
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
