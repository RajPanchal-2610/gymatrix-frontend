import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { staffService } from '@/services/staffService';
import { supabase } from '@/lib/supabase';

interface PermissionsContextType {
    permissions: string[];
    role: { 
        name: string; 
        isOwner?: boolean; 
        staff_id?: number | null;
        hasStaffRecord?: boolean;
        staffRoleName?: string | null;
    } | null;
    loading: boolean;
    hasPermission: (action: string) => boolean;
    refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
    const [permissions, setPermissions] = useState<string[]>([]);
    const [role, setRole] = useState<{ 
        name: string; 
        isOwner?: boolean; 
        staff_id?: number | null;
        hasStaffRecord?: boolean;
        staffRoleName?: string | null;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchPermissions = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setPermissions([]);
                setRole(null);
                setLoading(false);
                return;
            }

            const [permsData, roleData] = await Promise.all([
                staffService.getMyPermissions(),
                staffService.getMyRole()
            ]);

            setPermissions(permsData.permissions || []);
            setRole(roleData);
        } catch (error) {
            console.error("Error fetching permissions:", error);
            setPermissions([]);
            setRole(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPermissions();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                fetchPermissions();
            } else if (event === 'SIGNED_OUT') {
                setPermissions([]);
                setRole(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const hasPermission = (action: string) => {
        if (permissions.includes('*')) return true; // Owner/Super Admin
        return permissions.includes(action);
    };

    return (
        <PermissionsContext.Provider value={{ 
            permissions, 
            role, 
            loading, 
            hasPermission, 
            refreshPermissions: fetchPermissions 
        }}>
            {children}
        </PermissionsContext.Provider>
    );
}

export function usePermissions() {
    const context = useContext(PermissionsContext);
    if (context === undefined) {
        throw new Error('usePermissions must be used within a PermissionsProvider');
    }
    return context;
}
