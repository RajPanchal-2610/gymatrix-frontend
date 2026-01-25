
import { useEffect, useState } from "react";
import { parseISO } from "date-fns";
import { Check, Loader2, Building2, Users } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface PlanPrice {
    id: number;
    plan_id: number;
    price: number;
    duration_value: number;
    duration_unit: 'month' | 'year';
    is_active: boolean;
}

interface Plan {
    id: number;
    name: string;
    description: string | null;
    max_gyms: number;
    max_members: number;
    is_active: boolean;
    plan_prices: PlanPrice[];
}

export default function Pricing() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const init = async () => {
            await checkSubscription();
            fetchPlans();
        };
        init();
    }, []);

    const checkSubscription = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('subscriptions')
                .select('status, end_date')
                .eq('user_id', user.id)
                .maybeSingle();

            if (!data) {
                setIsExpired(true);
                return;
            }

            const isTrial = data.status === 'trial';
            const isActive = data.status === 'active';

            if (isActive) {
                setIsExpired(false);
                return;
            }

            if (isTrial) {
                const endDate = parseISO(data.end_date);
                const now = new Date();
                setIsExpired(endDate < now);
                return;
            }

            setIsExpired(true);
        } catch (error) {
            console.error("Error checking subscription:", error);
            setIsExpired(true);
        }
    };

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('plans')
                .select(`
                    *,
                    plan_prices (
                        *
                    )
                `)
                .eq('is_active', true)
                .eq('plan_prices.is_active', true)
                .order('id');

            if (error) throw error;
            setPlans(data || []);
        } catch (error: any) {
            console.error("Error fetching plans:", error);
            toast.error("Failed to load subscription plans");
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (planId: number, priceId: number) => {
        // Placeholder for subscription logic
        toast.info("Subscription integration coming soon!");
    };

    return (
        <DashboardLayout title="Upgrade Subscription" hideSidebar={isExpired}>
            <div className="flex flex-col items-center justify-center mb-10 text-center space-y-4">
                <h2 className="text-3xl font-bold tracking-tight">Simple, transparent pricing</h2>
                <p className="text-muted-foreground max-w-2xl">
                    Choose the perfect plan for your gym business. Scale as you grow.
                </p>

                <div className="flex items-center space-x-4 mt-6 bg-secondary/50 p-1 rounded-full border border-border">
                    <button
                        onClick={() => setBillingInterval('month')}
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billingInterval === 'month'
                            ? 'bg-background shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingInterval('year')}
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billingInterval === 'year'
                            ? 'bg-background shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Yearly <span className="text-xs text-primary ml-1 font-normal">(Save ~20%)</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : plans.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No subscription plans available at the moment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {plans.map((plan) => {
                        const price = plan.plan_prices.find(
                            p => p.duration_unit === billingInterval
                        );

                        // If plan doesn't have a price for selected interval, display alternative or N/A
                        if (!price && plan.plan_prices.length === 0) return null;

                        // Logic to find a display price if exact interval match is missing but others exist?
                        // For now, let's just show if it matches, to avoid confusion.
                        if (!price) return null;

                        return (
                            <Card
                                key={plan.id}
                                className={`relative flex flex-col hover:shadow-xl transition-all duration-300 border-border/50 ${plan.name.toLowerCase().includes('pro') ? 'border-primary/50 shadow-lg shadow-primary/5 ring-1 ring-primary/20' : ''
                                    }`}
                            >
                                {plan.name.toLowerCase().includes('pro') && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                        <Badge className="gradient-primary text-primary-foreground px-4 py-1 text-xs">
                                            Most Popular
                                        </Badge>
                                    </div>
                                )}

                                <CardHeader>
                                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                                    <CardDescription>{plan.description}</CardDescription>
                                </CardHeader>

                                <CardContent className="flex-1 space-y-6">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold">
                                            ₹{price.price}
                                        </span>
                                        <span className="text-muted-foreground font-medium">
                                            /{billingInterval}
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <Building2 className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">Manage {plan.max_gyms} Gym{plan.max_gyms > 1 ? 's' : ''}</p>
                                                <p className="text-xs text-muted-foreground">Multi-location support</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <Users className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">Up to {plan.max_members} Members</p>
                                                <p className="text-xs text-muted-foreground">Active member capacity</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <Check className="h-4 w-4 text-primary" />
                                            </div>
                                            <p className="font-medium text-foreground">Basic Reporting & Analytics</p>
                                        </div>

                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <Check className="h-4 w-4 text-primary" />
                                            </div>
                                            <p className="font-medium text-foreground">Inventory Management</p>
                                        </div>
                                    </div>
                                </CardContent>

                                <CardFooter className="pt-4">
                                    <Button
                                        className={`w-full ${plan.name.toLowerCase().includes('pro') ? 'gradient-primary shadow-glow' : ''}`}
                                        variant={plan.name.toLowerCase().includes('pro') ? 'default' : 'outline'}
                                        onClick={() => handleSubscribe(plan.id, price.id)}
                                    >
                                        {plan.name.toLowerCase().includes('free') ? 'Current Plan' : 'Upgrade Now'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}
        </DashboardLayout>
    );
}
