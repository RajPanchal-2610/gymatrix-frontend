import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Loader2 } from "lucide-react";

interface PermissionGuardProps {
    permission: string;
    children: ReactNode;
    redirectTo?: string;
}

export const PermissionGuard = ({ permission, children, redirectTo = "/dashboard" }: PermissionGuardProps) => {
    const { hasPermission, loading } = usePermissions();

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!hasPermission(permission)) {
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
};
