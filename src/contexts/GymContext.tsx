import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export interface Gym {
    id: number;
    name: string;
    created_at: string;
    owner_id: string;
}

interface GymContextType {
    gyms: Gym[];
    gymId: number | null;
    loading: boolean;
    switchGym: (id: number) => void;
    refreshGyms: () => Promise<void>;
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export function GymProvider({ children }: { children: ReactNode }) {
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [gymId, setGymId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchGyms = async (isInitial = false) => {
        try {
            if (isInitial && gyms.length === 0) setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setGyms([]);
                setGymId(null);
                setLoading(false);
                return;
            }

            // 1. Fetch gyms owned by the user
            const { data: ownedGyms, error: ownerError } = await supabase
                .from('gyms')
                .select('id, name, created_at, owner_id')
                .eq('owner_id', user.id);

            // 2. Fetch gyms where user is a staff member
            const { data: staffRecords, error: staffError } = await supabase
                .from('gym_staff')
                .select('gym_id, gyms(id, name, created_at, owner_id)')
                .eq('user_id', user.id)
                .eq('is_deleted', false)
                .eq('status', 'active');

            if (ownerError || staffError) {
                console.error("Error fetching gyms:", ownerError || staffError);
                setLoading(false);
                return;
            }

            // Combine the results
            const combinedGyms: Gym[] = [...(ownedGyms || [])];
            
            // Add gyms from staff records if they aren't already in the list
            staffRecords?.forEach(record => {
                if (record.gyms && !combinedGyms.find(g => g.id === record.gym_id)) {
                    combinedGyms.push(record.gyms as unknown as Gym);
                }
            });

            if (combinedGyms) {
                setGyms(combinedGyms);

                // Handle Gym Selection
                if (combinedGyms.length > 0) {
                    const storedGymId = localStorage.getItem('gymflow_gym_id');
                    const targetGym = storedGymId
                        ? combinedGyms.find(g => g.id.toString() === storedGymId)
                        : null;

                    if (targetGym) {
                        setGymId(targetGym.id);
                    } else {
                        // Default to first gym and save it (or checking if current gymId is valid)
                        if (!gymId || !combinedGyms.find(g => g.id === gymId)) {
                            setGymId(combinedGyms[0].id);
                            localStorage.setItem('gymflow_gym_id', combinedGyms[0].id.toString());
                        }
                    }
                } else {
                    setGymId(null);
                }
            }
        } catch (error) {
            console.error("Error in GymContext:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGyms(true);

        // Listen for auth changes to reset/fetch
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            // Only refetch on sign in to prevent massive refetch on every window focus
            if (event === 'SIGNED_IN') fetchGyms(false);
            if (event === 'SIGNED_OUT') {
                setGyms([]);
                setGymId(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const switchGym = (id: number) => {
        const gym = gyms.find(g => g.id === id);
        if (gym) {
            setGymId(id);
            localStorage.setItem('gymflow_gym_id', id.toString());
        }
    };

    return (
        <GymContext.Provider value={{ gyms, gymId, loading, switchGym, refreshGyms: fetchGyms }}>
            {children}
        </GymContext.Provider>
    );
}

export function useGym() {
    const context = useContext(GymContext);
    if (context === undefined) {
        throw new Error('useGym must be used within a GymProvider');
    }
    return context;
}
