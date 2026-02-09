import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RolesView } from "@/components/staff/RolesView";

export default function Roles() {
    return (
        <DashboardLayout title="Role Management">
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold tracking-tight">Roles</h2>
                    <p className="text-muted-foreground">
                        Define and manage staff roles and permissions.
                    </p>
                </div>
                <RolesView />
            </div>
        </DashboardLayout>
    );
}
