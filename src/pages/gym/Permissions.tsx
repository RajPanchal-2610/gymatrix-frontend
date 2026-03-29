import { PermissionsView } from "@/components/staff/PermissionsView";

export default function Permissions() {
    return (
        <>
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold tracking-tight">Permissions Master</h2>
                    <p className="text-muted-foreground">
                        Define root-level system permissions that can be assigned to roles. (Super Admin)
                    </p>
                </div>
                <PermissionsView />
            </div>
        </>
    );
}
