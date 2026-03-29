import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffList } from "@/components/staff/StaffList";
import { AttendanceView } from "@/components/staff/AttendanceView";
import { PayrollView } from "@/components/staff/PayrollView";
import { usePermissions } from "@/contexts/PermissionsContext";
import { cn } from "@/lib/utils";


export default function Staff() {
  const { hasPermission } = usePermissions();

  return (
    <>
      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList className={cn("grid w-full max-w-[400px]", 
          (hasPermission('view_staff_attendance') && hasPermission('view_payroll')) ? "grid-cols-3" : 
          (hasPermission('view_staff_attendance') || hasPermission('view_payroll')) ? "grid-cols-2" : "grid-cols-1"
        )}>
          <TabsTrigger value="staff">Staff List</TabsTrigger>
          {hasPermission('view_staff_attendance') && <TabsTrigger value="attendance">Attendance</TabsTrigger>}
          {hasPermission('view_payroll') && <TabsTrigger value="payroll">Payroll</TabsTrigger>}
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



        {hasPermission('view_staff_attendance') && (
          <TabsContent value="attendance" className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold tracking-tight">Attendance</h2>
              <p className="text-muted-foreground">
                Track daily attendance for your staff.
              </p>
            </div>
            <AttendanceView />
          </TabsContent>
        )}

        {hasPermission('view_payroll') && (
          <TabsContent value="payroll" className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold tracking-tight">Payroll</h2>
              <p className="text-muted-foreground">
                Manage salaries and payments.
              </p>
            </div>
            <PayrollView />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
