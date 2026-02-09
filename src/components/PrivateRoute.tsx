
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export const PrivateRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [redirectPath, setRedirectPath] = useState("/auth");

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    setHasAccess(false);
                    setRedirectPath("/admin/login"); // Or dynamic depending on route logic
                    setLoading(false);
                    return;
                }

                // If no specific role required, just logged in is enough
                if (!allowedRoles || allowedRoles.length === 0) {
                    setHasAccess(true);
                    setLoading(false);
                    return;
                }

                // Check Super Admin roles
                const { data: userRoles, error: userRolesError } = await supabase
                    .from('user_roles')
                    .select('roles:roles(name)')
                    .eq('user_id', session.user.id);

                // Check Gym Owner (Implicit GYM_ADMIN)
                const { data: gymOwner, error: gymOwnerError } = await supabase
                    .from('gyms')
                    .select('id')
                    .eq('owner_id', session.user.id)
                    .limit(1)
                    .maybeSingle();

                if (userRolesError && gymOwnerError) {
                    console.error("Auth check error:", userRolesError, gymOwnerError);
                    setHasAccess(false);
                    setLoading(false);
                    return;
                }

                const roles1 = userRoles?.map((ur: any) => ur.roles?.name) || [];
                const roles2 = gymOwner ? ['GYM_ADMIN'] : [];

                const allUserRoleNames = [...roles1, ...roles2];
                const hasRequiredRole = allowedRoles.some(role => allUserRoleNames.includes(role));

                setHasAccess(hasRequiredRole);

                // Check Subscription for Gym Admin
                if (hasRequiredRole && allowedRoles.includes('GYM_ADMIN')) {
                    const { data: sub } = await supabase
                        .from('subscriptions')
                        .select('status, end_date')
                        .eq('user_id', session.user.id)
                        .maybeSingle();

                    let isExpired = false;
                    if (!sub) isExpired = true;
                    else {
                        const isActive = sub.status === 'active';
                        const isTrial = sub.status === 'trial';
                        if (!isActive) {
                            if (isTrial && sub.end_date) {
                                const endDate = new Date(sub.end_date);
                                if (endDate < new Date()) isExpired = true;
                            } else {
                                isExpired = true;
                            }
                        }
                    }

                    if (isExpired && location.pathname !== '/pricing') {
                        setRedirectPath("/pricing");
                        setHasAccess(false);
                    }
                }

                // Decide redirect based on what role they MIGHT have if not the correct one?
                // simple fallback
                if (!hasRequiredRole) {
                    setRedirectPath("/auth");
                }

            } catch (err) {
                console.error("Auth check exception", err);
                setHasAccess(false);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [allowedRoles, location.pathname]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return hasAccess ? <Outlet /> : <Navigate to={redirectPath} replace />;
};
