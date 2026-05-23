import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export interface Gym {
    id: number;
    name: string;
    created_at: string;
    owner_id: string;
    logo_url?: string;
    theme_color?: string;
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
                .select('*')
                .eq('owner_id', user.id);

            // 2. Fetch gyms where user is a staff member
            const { data: staffRecords, error: staffError } = await supabase
                .from('gym_staff')
                .select('gym_id, gyms(*)')
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

    // Apply dynamic gym theme color to CSS custom variables
    useEffect(() => {
        const root = document.documentElement;
        
        const updateColors = () => {
            const currentGym = gyms.find(g => g.id === gymId);
            const isDark = root.classList.contains('dark');
            
            if (currentGym?.theme_color) {
                const color = currentGym.theme_color;
                
                if (color === 'emerald') {
                    root.style.setProperty('--primary', '142 76% 36%');
                    root.style.setProperty('--ring', '142 76% 36%');
                    root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, hsl(142, 76%, 36%) 0%, hsl(160, 84%, 39%) 100%)');
                    root.style.setProperty('--shadow-glow', '0 0 20px hsl(142 76% 36% / 0.3)');
                    
                    if (isDark) {
                        root.style.setProperty('--accent', '142 70% 12%');
                        root.style.setProperty('--accent-foreground', '210 40% 98%');
                        root.style.setProperty('--sidebar-accent', '142 70% 12%');
                        root.style.setProperty('--sidebar-accent-foreground', '210 40% 98%');
                    } else {
                        root.style.setProperty('--accent', '142 70% 94%');
                        root.style.setProperty('--accent-foreground', '142 76% 25%');
                        root.style.setProperty('--sidebar-accent', '142 70% 96%');
                        root.style.setProperty('--sidebar-accent-foreground', '142 76% 25%');
                    }
                } else if (color === 'violet') {
                    root.style.setProperty('--primary', '262 83% 58%');
                    root.style.setProperty('--ring', '262 83% 58%');
                    root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(282, 84%, 60%) 100%)');
                    root.style.setProperty('--shadow-glow', '0 0 20px hsl(262 83% 58% / 0.3)');
                    
                    if (isDark) {
                        root.style.setProperty('--accent', '262 83% 15%');
                        root.style.setProperty('--accent-foreground', '210 40% 98%');
                        root.style.setProperty('--sidebar-accent', '262 83% 15%');
                        root.style.setProperty('--sidebar-accent-foreground', '210 40% 98%');
                    } else {
                        root.style.setProperty('--accent', '262 83% 95%');
                        root.style.setProperty('--accent-foreground', '262 83% 30%');
                        root.style.setProperty('--sidebar-accent', '262 83% 97%');
                        root.style.setProperty('--sidebar-accent-foreground', '262 83% 30%');
                    }
                } else if (color === 'rose') {
                    root.style.setProperty('--primary', '346 84% 50%');
                    root.style.setProperty('--ring', '346 84% 50%');
                    root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, hsl(346, 84%, 50%) 0%, hsl(355, 90%, 62%) 100%)');
                    root.style.setProperty('--shadow-glow', '0 0 20px hsl(346 84% 50% / 0.3)');
                    
                    if (isDark) {
                        root.style.setProperty('--accent', '346 84% 15%');
                        root.style.setProperty('--accent-foreground', '210 40% 98%');
                        root.style.setProperty('--sidebar-accent', '346 84% 15%');
                        root.style.setProperty('--sidebar-accent-foreground', '210 40% 98%');
                    } else {
                        root.style.setProperty('--accent', '346 84% 95%');
                        root.style.setProperty('--accent-foreground', '346 84% 30%');
                        root.style.setProperty('--sidebar-accent', '346 84% 97%');
                        root.style.setProperty('--sidebar-accent-foreground', '346 84% 30%');
                    }
                } else if (color === 'orange') {
                    root.style.setProperty('--primary', '24 95% 53%');
                    root.style.setProperty('--ring', '24 95% 53%');
                    root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, hsl(24, 95%, 53%) 0%, hsl(38, 92%, 50%) 100%)');
                    root.style.setProperty('--shadow-glow', '0 0 20px hsl(24 95% 53% / 0.3)');
                    
                    if (isDark) {
                        root.style.setProperty('--accent', '24 95% 12%');
                        root.style.setProperty('--accent-foreground', '210 40% 98%');
                        root.style.setProperty('--sidebar-accent', '24 95% 12%');
                        root.style.setProperty('--sidebar-accent-foreground', '210 40% 98%');
                    } else {
                        root.style.setProperty('--accent', '24 95% 94%');
                        root.style.setProperty('--accent-foreground', '24 95% 25%');
                        root.style.setProperty('--sidebar-accent', '24 95% 96%');
                        root.style.setProperty('--sidebar-accent-foreground', '24 95% 25%');
                    }
                } else {
                    // Default blue
                    root.style.setProperty('--primary', '221 83% 53%');
                    root.style.setProperty('--ring', '221 83% 53%');
                    root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, hsl(221, 83%, 53%) 0%, hsl(199, 89%, 48%) 100%)');
                    root.style.setProperty('--shadow-glow', '0 0 20px hsl(221 83% 53% / 0.3)');
                    
                    if (isDark) {
                        root.style.setProperty('--accent', '221 83% 15%');
                        root.style.setProperty('--accent-foreground', '210 40% 98%');
                        root.style.setProperty('--sidebar-accent', '222 47% 12%');
                        root.style.setProperty('--sidebar-accent-foreground', '210 40% 98%');
                    } else {
                        root.style.setProperty('--accent', '221 83% 93%');
                        root.style.setProperty('--accent-foreground', '221 83% 30%');
                        root.style.setProperty('--sidebar-accent', '210 40% 96%');
                        root.style.setProperty('--sidebar-accent-foreground', '222 47% 11%');
                    }
                }
            } else {
                // Reset to default blue
                root.style.setProperty('--primary', '221 83% 53%');
                root.style.setProperty('--ring', '221 83% 53%');
                root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, hsl(221, 83%, 53%) 0%, hsl(199, 89%, 48%) 100%)');
                root.style.setProperty('--shadow-glow', '0 0 20px hsl(221 83% 53% / 0.3)');
                
                if (isDark) {
                    root.style.setProperty('--accent', '222 47% 12%');
                    root.style.setProperty('--accent-foreground', '210 40% 98%');
                    root.style.setProperty('--sidebar-accent', '222 47% 12%');
                    root.style.setProperty('--sidebar-accent-foreground', '210 40% 98%');
                } else {
                    root.style.setProperty('--accent', '210 40% 96%');
                    root.style.setProperty('--accent-foreground', '222 47% 11%');
                    root.style.setProperty('--sidebar-accent', '210 40% 96%');
                    root.style.setProperty('--sidebar-accent-foreground', '222 47% 11%');
                }
            }
        };

        // Initial update
        updateColors();

        // Observe class changes on html element to handle theme toggles (dark/light)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    updateColors();
                }
            });
        });

        observer.observe(root, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, [gymId, gyms]);

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
