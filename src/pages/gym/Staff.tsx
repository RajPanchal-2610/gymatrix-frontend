import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StaffList } from "@/components/staff/StaffList";
import { AttendanceView } from "@/components/staff/AttendanceView";
import { PayrollView } from "@/components/staff/PayrollView";


export default function Staff() {
  return (
    <DashboardLayout title="Staff Management">
      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
          <TabsTrigger value="staff">Staff List</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-6 animate-fade-in">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Staff Members</h2>
            <p className="text-muted-foreground">
              Manage your gym staff, trainers, and other employees.
            </p>
          </div>
          <StaffList />
        </TabsContent>



        <TabsContent value="attendance" className="space-y-6 animate-fade-in">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Attendance</h2>
            <p className="text-muted-foreground">
              Track daily attendance for your staff.
            </p>
          </div>
          <AttendanceView />
        </TabsContent>

        <TabsContent value="payroll" className="space-y-6 animate-fade-in">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Payroll</h2>
            <p className="text-muted-foreground">
              Manage salaries and payments.
            </p>
          </div>
          <PayrollView />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
