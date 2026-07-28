
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
                if (location.pathname === "/dashboard-2") {
                    setHasAccess(true);
                    setLoading(false);
                    return;
                }

                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    setHasAccess(false);
                    const isSuperAdminRoute = allowedRoles?.includes('SUPER_ADMIN') || location.pathname.startsWith('/admin');
                    setRedirectPath(isSuperAdminRoute ? "/admin/login" : "/auth");
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

                // Check Gym Staff (Also GYM_ADMIN access level for dashboard)
                const { data: gymStaff, error: staffError } = await supabase
                    .from('gym_staff')
                    .select('gym_id, gyms(owner_id)')
                    .eq('user_id', session.user.id)
                    .ilike('status', 'active')
                    .limit(1)
                    .maybeSingle();

                if (userRolesError && gymOwnerError && staffError) {
                    console.error("Auth check error:", userRolesError, gymOwnerError, staffError);
                    setHasAccess(false);
                    setLoading(false);
                    return;
                }

                const roles1 = userRoles?.map((ur: any) => ur.roles?.name) || [];
                const roles2 = (gymOwner || gymStaff) ? ['GYM_ADMIN'] : [];

                const allUserRoleNames = [...roles1, ...roles2];
                const hasRequiredRole = allowedRoles.some(role => allUserRoleNames.includes(role));

                setHasAccess(hasRequiredRole);

                // Check Subscription for Gym Admin / Staff
                if (hasRequiredRole && allowedRoles.includes('GYM_ADMIN')) {
                    // If staff, we check the owner's subscription
                    const targetUserId = gymStaff ? (gymStaff.gyms as any).owner_id : session.user.id;

                    // 1. Try to find an ACTIVE or TRIAL subscription first
                    let { data: subs, error: subError } = await supabase
                        .from('subscriptions')
                        .select('status, end_date')
                        .eq('user_id', targetUserId)
                        .in('status', ['active', 'trial', 'Active', 'Trial'])
                        .order('created_at', { ascending: false })
                        .limit(1);

                    // 2. Fallback to the latest record if no active/trial found (to check for actual expiration)
                    if (!subs || subs.length === 0) {
                        const { data: fallbackSubs } = await supabase
                            .from('subscriptions')
                            .select('status, end_date')
                            .eq('user_id', targetUserId)
                            .order('created_at', { ascending: false })
                            .limit(1);
                        subs = fallbackSubs;
                    }

                    const sub = subs && subs.length > 0 ? subs[0] : null;

                    let isExpired = false;
                    if (!sub) {
                        isExpired = true; 
                    } else {
                        const statusLower = (sub.status || '').toLowerCase();
                        const isActive = statusLower === 'active';
                        const isTrial = statusLower === 'trial';
                        
                        if (!isActive) {
                            if (isTrial && sub.end_date) {
                                const endDate = new Date(sub.end_date);
                                if (endDate < new Date()) isExpired = true;
                            } else {
                                // If status is 'expired' or anything else that isn't active/trial
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
