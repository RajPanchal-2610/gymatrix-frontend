import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export interface SubscriptionFeature {
    id: number;
    subscription_id: number;
    feature_id: number;
    value: string;
    features: {
        key: string;
        name: string;
        feature_type: string;
    }
}

export interface Subscription {
    id: number;
    user_id: string;
    plan_id: number;
    plan_price_id: number;
    status: 'active' | 'trial' | 'expired' | 'cancelled';
    start_date: string;
    end_date: string;
    max_gyms: number;
    max_members: number;
    extra_gyms?: number;
    extra_members?: number;
    created_at?: string;
}

interface SubscriptionContextType {
    subscription: Subscription | null;
    features: SubscriptionFeature[];
    loading: boolean;
    hasFeature: (featureName: string) => boolean;
    refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [features, setFeatures] = useState<SubscriptionFeature[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSubscription = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setSubscription(null);
                setFeatures([]);
                setLoading(false);
                return;
            }

            // 1. Try fetching subscription belonging directly to the user (for owners)
            let { data: subData } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            // 2. If no direct subscription, check if user is a staff member and fetch owner's subscription
            if (!subData) {
                const { data: staffRecord } = await supabase
                    .from('gym_staff')
                    .select('gym_id, gyms(owner_id)')
                    .eq('user_id', user.id)
                    .eq('is_deleted', false)
                    .eq('status', 'active')
                    .limit(1)
                    .maybeSingle();

                if (staffRecord?.gyms) {
                    const ownerId = (staffRecord.gyms as any).owner_id;
                    const { data: ownerSub } = await supabase
                        .from('subscriptions')
                        .select('*')
                        .eq('user_id', ownerId)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    
                    subData = ownerSub;
                }
            }

            if (subData) {
                setSubscription(subData as Subscription);

                const { data: subFeatures } = await supabase
                    .from('subscription_features')
                    .select(`
                        *,
                        features (
                            key,
                            name,
                            feature_type
                        )
                    `)
                    .eq('subscription_id', subData.id);

                if (subFeatures) {
                    setFeatures(subFeatures as any);
                } else {
                    setFeatures([]);
                }
            } else {
                setSubscription(null);
                setFeatures([]);
            }
        } catch (error) {
            console.error("Error fetching subscription:", error);
            setSubscription(null);
            setFeatures([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscription();

        // Listen for auth changes to re-fetch - using silent fetch
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                // Fetch in background, do not set loading to true
                fetchSubscription();
            } else if (event === 'SIGNED_OUT') {
                setSubscription(null);
                setFeatures([]);
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const hasFeature = (featureName: string) => {
        // If still loading, we can't definitively say no, 
        // but for UI guards we typically treat as false or handle loading state separately.
        if (loading) return false;

        return features.some(f => {
            const nameMatch = f.features?.name?.toLowerCase().includes(featureName.toLowerCase());
            const keyMatch = f.features?.key?.toLowerCase().includes(featureName.toLowerCase());
            // Check strictly for truthy value string (assuming checkbox 'true'/'false' storage)
            const isEnabled = f.value === 'true';
            return (nameMatch || keyMatch) && isEnabled;
        });
    };

    return (
        <SubscriptionContext.Provider value={{ subscription, features, loading, hasFeature, refreshSubscription: fetchSubscription }}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
}
