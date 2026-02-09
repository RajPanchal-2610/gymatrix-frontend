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

    const fetchGyms = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('gyms')
                .select(`
                    id,
                    name,
                    created_at,
                    owner_id
                `)
                .eq('owner_id', user.id);

            if (error) {
                console.error("Error fetching gyms:", error);
                return;
            }

            if (data) {
                const userGyms = data as Gym[];
                setGyms(userGyms);

                // Handle Gym Selection
                if (userGyms.length > 0) {
                    const storedGymId = localStorage.getItem('gymflow_gym_id');
                    const targetGym = storedGymId
                        ? userGyms.find(g => g.id.toString() === storedGymId)
                        : null;

                    if (targetGym) {
                        setGymId(targetGym.id);
                    } else {
                        // Default to first gym and save it (or checking if current gymId is valid)
                        if (!gymId || !userGyms.find(g => g.id === gymId)) {
                            setGymId(userGyms[0].id);
                            localStorage.setItem('gymflow_gym_id', userGyms[0].id.toString());
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
        fetchGyms();

        // Listen for auth changes to reset/fetch
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') fetchGyms();
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
