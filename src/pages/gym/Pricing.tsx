
import React, { useEffect, useMemo, useState } from "react";
import { parseISO } from "date-fns";
import { Check, Loader2, Building2, Users, Calendar, Banknote, Plus, Minus, CreditCard, CornerDownRight, Download, Eye, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Zap } from "lucide-react";
import { pdfExportService } from "@/services/pdfExportService";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

interface PlanPrice {
    id: number;
    plan_id: number;
    price: number;
    duration_value: number;
    duration_unit: 'month' | 'year';
    is_active: boolean;
}

interface Feature {
    id: number;
    name: string;
    description: string | null;
    feature_type: 'MODULE' | 'LIMIT' | 'ACTION';
}

interface PlanFeature {
    id: number;
    plan_id: number;
    feature_id: number;
    value: string;
    features: Feature;
}

interface Plan {
    id: number;
    name: string;
    description: string | null;
    max_gyms: number;
    max_members: number;
    is_active: boolean;
    plan_prices: PlanPrice[];
    plan_features: PlanFeature[];
}

interface SubscriptionHistoryRecord {
    id: number | string;
    isAddon: boolean;
    name: string;
    amount: number;
    status: string;
    created_at: string;
    duration: string;
    tx_id?: number | null;
    invoice_number?: string;
    start_date?: string;
    end_date?: string;
    max_gyms?: number;
    max_members?: number;
    addons?: {
        id: string | number;
        name: string;
        amount: number;
        created_at: string;
        duration?: string;
        quantity?: number;
        type?: string;
        tx_id?: number | null;
        invoice_number?: string;
    }[];
}

export default function Pricing() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
    const [isExpired, setIsExpired] = useState(false);
    const [history, setHistory] = useState<SubscriptionHistoryRecord[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const { subscription, refreshSubscription } = useSubscription();
    const [carryOverCredit, setCarryOverCredit] = useState<number>(0);
    const [extensionCarryOverCredit, setExtensionCarryOverCredit] = useState<number>(0);

    // Purchase Dialog States
    const [selectedPlanForPurchase, setSelectedPlanForPurchase] = useState<{ plan: Plan, price: PlanPrice } | null>(null);
    const [purchaseExtraGyms, setPurchaseExtraGyms] = useState<number>(0);
    const [purchaseExtraMembers, setPurchaseExtraMembers] = useState<number>(0);
    const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);

    // Extensions State
    const [extensionPricing, setExtensionPricing] = useState<any[]>([]);
    const [extensionQtys, setExtensionQtys] = useState<Record<number, number>>({});
    const [isExtending, setIsExtending] = useState(false);
    const [downloadingInvoice, setDownloadingInvoice] = useState<string | number | null>(null);

    // Memoized pricing lookups
    const gymExtensionPrice = useMemo(() => extensionPricing.find(p => (p.type || '').toLowerCase().startsWith('gym')), [extensionPricing]);
    const memberExtensionPrice = useMemo(() => extensionPricing.find(p => (p.type || '').toLowerCase().startsWith('member')), [extensionPricing]);
    const gymUnitPrice = gymExtensionPrice?.unit_price || 0;
    const gymUnitQty = gymExtensionPrice?.unit_quantity || 1;
    const memberUnitPrice = memberExtensionPrice?.unit_price || 0;
    const memberUnitQty = memberExtensionPrice?.unit_quantity || 100;

    const setQty = (id: number, val: number) => {
        setExtensionQtys(prev => ({ ...prev, [id]: val }));
    };

    // Helper to load Razorpay script dynamically
    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    useEffect(() => {
        const init = async () => {
            await checkSubscription();
            fetchPlans();
            fetchHistory();
        };
        init();
        fetchExtensionPricing();
    }, []);

    const fetchExtensionPricing = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/payments/extensions/prices`);
            if (response.ok) {
                const data = await response.json();
                setExtensionPricing(data);
            }
        } catch (error) {
            console.error("Error fetching extension prices:", error);
        }
    };

    const fetchHistory = async () => {
        try {
            setHistoryLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const response = await fetch(`${BACKEND_URL}/api/payments/history/${user.id}`);
            if (!response.ok) throw new Error("Failed to fetch history");

            const data = await response.json();
            setHistory(data);
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setHistoryLoading(false);
        }
    };

    // Helper: Calculate credit from current active subscription
    const getCarryOverCredit = async () => {
        if (!subscription || subscription.status?.toLowerCase() === 'trial') return 0;
        if (!subscription.plan_price_id) return 0;

        const now = new Date();
        const start = new Date(subscription.start_date);
        const end = new Date(subscription.end_date);

        if (end <= now) return 0;

        try {
            // Fetch the PREVIOUS plan's base price (without extensions)
            const { data: previousPlanPrice, error } = await supabase
                .from('plan_prices')
                .select('price')
                .eq('id', subscription.plan_price_id)
                .maybeSingle();

            if (error || !previousPlanPrice || previousPlanPrice.price <= 0) return 0;

            const msInDay = 24 * 60 * 60 * 1000;
            const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msInDay));
            const remainingDays = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / msInDay));

            // Calculate credit based on PREVIOUS PLAN'S base price and remaining days
            return Math.floor((previousPlanPrice.price / totalDays) * remainingDays);
        } catch (error) {
            console.error("Error calculating carry over credit:", error);
            return 0;
        }
    };

    // Helper: Calculate pro-rated extension carry-over credit
    const getExtensionCarryOverCredit = async () => {
        if (!subscription || subscription.status?.toLowerCase() !== 'active') return 0;

        const now = new Date();
        const end = new Date(subscription.end_date);
        if (end <= now) return 0;

        try {
            const msInDay = 24 * 60 * 60 * 1000;

            // Fetch extension addons for the current subscription
            const { data: addons, error } = await supabase
                .from('subscription_addons')
                .select('*')
                .eq('subscription_id', subscription.id);

            if (error || !addons || addons.length === 0) return 0;

            let totalCredit = 0;
            for (const addon of addons) {
                const addonPurchaseDate = new Date(addon.created_at);
                const addonTotalDays = Math.max(1, Math.ceil((end.getTime() - addonPurchaseDate.getTime()) / msInDay));
                const addonRemainingDays = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / msInDay));

                if (addonRemainingDays > 0 && addonTotalDays > 0) {
                    const proRateRatio = addonRemainingDays / addonTotalDays;
                    totalCredit += Math.floor(addon.amount_paid * proRateRatio);
                }
            }

            return totalCredit;
        } catch (error) {
            console.error("Error calculating extension carry over credit:", error);
            return 0;
        }
    };

    // Update carry over credits when subscription changes
    useEffect(() => {
        getCarryOverCredit().then(credit => setCarryOverCredit(credit));
        getExtensionCarryOverCredit().then(credit => setExtensionCarryOverCredit(credit));
    }, [subscription]);

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

            const isTrial = data.status.toLowerCase() === 'trial';
            const isActive = data.status.toLowerCase() === 'active';

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
                    plan_prices (*),
                    plan_features (
                        *,
                        features (*)
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

    // Core Checkout Execution
    const performCheckout = async (plan: Plan, price: PlanPrice, extraGyms: number, extraMembers: number) => {
        if (!subscription) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error("User not found.");
            return;
        }

        const res = await loadRazorpayScript();
        if (!res) {
            toast.error("Failed to load Razorpay SDK. Please check your connection.");
            return;
        }

        try {
            const loadingToast = toast.loading("Initiating purchase...");

            // 1. Create Order in Backend with bundled extensions
            const response = await fetch(`${BACKEND_URL}/api/payments/create-subscription-order`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId: user.id,
                    planPriceId: price.id,
                    subscriptionId: subscription.id,
                    extra_gyms: extraGyms,
                    extra_members: extraMembers
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                toast.dismiss(loadingToast);
                throw new Error(err.error || "Failed to create order");
            }

            const data = await response.json();
            toast.dismiss(loadingToast);

            // 2. Open Razorpay Checkout
            const options = {
                key: data.keyId,
                amount: data.amount,
                currency: data.currency,
                name: "FitFlow",
                description: `Upgrade to ${plan.name} Plan`,
                order_id: data.orderId,
                handler: async function (paymentResponse: any) {
                    toast.loading("Verifying payment...", { id: "payment-verify" });
                    try {
                        const verifyRes = await fetch(`${BACKEND_URL}/api/payments/verify-subscription-payment`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                razorpay_order_id: paymentResponse.razorpay_order_id,
                                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                                razorpay_signature: paymentResponse.razorpay_signature,
                                transactionId: data.transactionId,
                                subscriptionId: subscription.id,
                                planPriceId: price.id,
                                userId: user.id
                            }),
                        });

                        if (!verifyRes.ok) throw new Error("Verification failed");

                        toast.success(`Plan upgraded to ${plan.name} successfully!`, { id: "payment-verify" });

                        await refreshSubscription();
                        await fetchHistory();
                    } catch (error: any) {
                        toast.error(error.message, { id: "payment-verify" });
                    }
                },
                prefill: { email: user.email },
                theme: { color: "#0f172a" },
            };

            const paymentObject = new (window as any).Razorpay(options);
            paymentObject.on('payment.failed', (resp: any) => toast.error(resp.error.description));
            paymentObject.open();

        } catch (error: any) {
            toast.error(error.message);
        }
    };

    // Helper: Check if a plan is a downgrade compared to current active subscription
    const isPlanDowngrade = (plan: Plan): boolean => {
        if (!subscription || subscription.status?.toLowerCase() !== 'active') return false;
        if (new Date(subscription.end_date) <= new Date()) return false;

        const currentPlan = plans.find(p => p.id === subscription.plan_id);
        if (!currentPlan) return false;

        // A plan is considered "lower" if it has fewer max_gyms OR fewer max_members
        return plan.max_gyms < currentPlan.max_gyms || plan.max_members < currentPlan.max_members;
    };

    // Trigger for plan purchase button
    const handleSubscribe = async (plan: Plan, price: PlanPrice) => {
        if (!subscription) {
            toast.error("Subscription details not found. Please log in again.");
            return;
        }

        if (isPlanDowngrade(plan)) {
            toast.error("Cannot downgrade your plan while your current subscription is active. Please wait until your current plan expires or contact support.");
            return;
        }

        const hasExtensions = (subscription.extra_gyms || 0) > 0 || (subscription.extra_members || 0) > 0;
        const hasCarryOver = carryOverCredit > 0;

        // Set state for dialog (incase it opens)
        const extraG = subscription.extra_gyms || 0;
        const extraM = subscription.extra_members || 0;

        setSelectedPlanForPurchase({ plan, price });
        setPurchaseExtraGyms(extraG);
        setPurchaseExtraMembers(extraM);

        if (hasExtensions || hasCarryOver) {
            // Show dialog if user has extensions to adjust OR has carry over credit to display
            setIsPurchaseDialogOpen(true);
        } else {
            // No extensions or carry over - skip dialog and proceed to checkout
            await performCheckout(plan, price, extraG, extraM);
        }
    };

    // Actual Checkout (called from Confirmation Dialog)
    const handleCheckout = async () => {
        if (!selectedPlanForPurchase) return;
        setIsPurchaseDialogOpen(false);
        await performCheckout(
            selectedPlanForPurchase.plan,
            selectedPlanForPurchase.price,
            purchaseExtraGyms,
            purchaseExtraMembers
        );
    };

    const handleExtendLimit = async (type: 'gym' | 'member', quantity: number) => {
        if (!subscription) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const res = await loadRazorpayScript();
        if (!res) {
            toast.error("Failed to load Razorpay SDK");
            return;
        }

        try {
            setIsExtending(true);
            const loadingToast = toast.loading("Creating extension order...");

            const response = await fetch(`${BACKEND_URL}/api/payments/extensions/create-order`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.id,
                    subscriptionId: subscription.id,
                    type,
                    quantity
                }),
            });

            if (!response.ok) throw new Error("Order creation failed");
            const data = await response.json();
            toast.dismiss(loadingToast);

            const options = {
                key: data.keyId,
                amount: data.amount,
                currency: data.currency,
                name: "FitFlow",
                description: `Extend ${type === 'gym' ? 'Gyms' : 'Members'} Limit`,
                order_id: data.orderId,
                handler: async function (paymentResponse: any) {
                    toast.loading("Activating extension...", { id: "ext-verify" });
                    try {
                        const verifyRes = await fetch(`${BACKEND_URL}/api/payments/extensions/verify-payment`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpay_order_id: paymentResponse.razorpay_order_id,
                                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                                razorpay_signature: paymentResponse.razorpay_signature,
                                transactionId: data.transactionId,
                                subscriptionId: subscription.id,
                                extensionType: type,
                                quantity
                            }),
                        });

                        if (!verifyRes.ok) throw new Error("Verification failed");
                        toast.success("Extension activated! Limits increased.", { id: "ext-verify" });
                        await refreshSubscription();
                        await fetchHistory();
                    } catch (error: any) {
                        toast.error(error.message, { id: "ext-verify" });
                    }
                },
                prefill: { email: user.email },
                theme: { color: "#0f172a" }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsExtending(false);
        }
    };

    const handleDownloadInvoice = async (record: SubscriptionHistoryRecord | any) => {
        if (!record.tx_id) {
            toast.error("Invoice details not available.");
            return;
        }

        try {
            setDownloadingInvoice(record.id);
            const response = await fetch(`${BACKEND_URL}/api/payments/invoice/${record.tx_id}`);
            if (!response.ok) throw new Error("Failed to fetch invoice details");

            const data = await response.json();
            
            // Branding
            const gymBranding = "FitFlow Membership"; 
            
            await pdfExportService.exportInvoice(data, gymBranding);
            toast.success("Invoice downloaded!");
        } catch (error: any) {
            console.error("Download invoice error:", error);
            toast.error(error.message || "Failed to download invoice");
        } finally {
            setDownloadingInvoice(null);
        }
    };

    return (
        <>
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

            {/* Extend Limits Section */}
            {subscription && subscription.status?.toLowerCase() !== 'trial' && extensionPricing.length > 0 && (
                <div className="max-w-7xl mx-auto mb-16 px-4">
                    <div className="flex items-center gap-2 mb-6">
                        <Plus className="h-6 w-6 text-primary" />
                        <h3 className="text-2xl font-bold tracking-tight">Extend Your Limits</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {extensionPricing.map((price) => {
                            const isGym = (price.type || '').toLowerCase().startsWith('gym');
                            const currentQty = extensionQtys[price.id] !== undefined ? extensionQtys[price.id] : price.unit_quantity;

                            // Human-friendly pro-rating based on days (100% on first day)
                            const now = new Date();
                            const startDate = subscription?.start_date ? new Date(subscription.start_date) : null;
                            const endDate = subscription?.end_date ? new Date(subscription.end_date) : null;

                            let durationRatio = 1;
                            let diffDays = 0;
                            if (startDate && endDate && endDate > now) {
                                // Calculate total days in the plan period
                                const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                                // Calculate how many full days have passed
                                const daysPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

                                // Ratio based on days (if 0 days passed, ratio is 1)
                                durationRatio = Math.max(0, Math.min(1, (totalDays - daysPassed) / totalDays));

                                // Actual remaining days for display
                                const remainMs = endDate.getTime() - now.getTime();
                                diffDays = Math.ceil(remainMs / (1000 * 60 * 60 * 24));
                            }

                            const baseAmount = (Number(currentQty || 0) / price.unit_quantity) * price.unit_price;
                            const totalPrice = Number(currentQty || 0) === 0 ? 0 : Math.max(1, Math.round(baseAmount * durationRatio));

                            return (
                                <Card key={price.id} className="border-primary/20 bg-background hover:border-primary/40 transition-colors">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-xl capitalize">
                                            {isGym ? <Building2 className="h-5 w-5 text-primary" /> : <Users className="h-5 w-5 text-primary" />}
                                            {price.type}
                                        </CardTitle>
                                        <CardDescription className="flex flex-col gap-1">
                                            <span>₹{price.unit_price} / {price.unit_quantity} {isGym ? 'gym' : 'member'}{price.unit_quantity > 1 ? 's' : ''}</span>
                                            {subscription?.end_date && (
                                                <Badge variant="secondary" className="w-fit text-[10px] py-0 px-1 border-primary/20 bg-primary/10 text-primary">
                                                    Pro-rated for remaining plan duration
                                                </Badge>
                                            )}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                                            <div className="space-y-1">
                                                <Label className="text-sm font-medium capitalize">Quantity ({price.type})</Label>
                                                <div className="flex items-center gap-3">
                                                    {isGym ? (
                                                        <div className="flex items-center border border-input rounded-md bg-background overflow-hidden">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 rounded-none border-r"
                                                                onClick={() => setQty(price.id, Math.max(1, (currentQty as number) - 1))}
                                                            >
                                                                <Minus className="h-4 w-4" />
                                                            </Button>
                                                            <Input
                                                                type="number"
                                                                className="flex-1 w-12 border-none text-center focus-visible:ring-0 p-0 h-9"
                                                                value={currentQty}
                                                                onChange={(e) => setQty(price.id, e.target.value === '' ? '' as any : Math.max(0, parseInt(e.target.value) || 0))}
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 rounded-none border-l"
                                                                onClick={() => setQty(price.id, (Number(currentQty) || 0) + 1)}
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center border border-input rounded-md bg-background overflow-hidden">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 rounded-none border-r"
                                                                onClick={() => setQty(price.id, Math.max(1, (currentQty as number) - price.unit_quantity))}
                                                            >
                                                                <Minus className="h-4 w-4" />
                                                            </Button>
                                                            <Input
                                                                type="number"
                                                                className="flex-1 w-12 border-none text-center focus-visible:ring-0 p-0 h-9"
                                                                value={currentQty}
                                                                onChange={(e) => setQty(price.id, e.target.value === '' ? '' as any : Math.max(0, parseInt(e.target.value) || 0))}
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 rounded-none border-l"
                                                                onClick={() => setQty(price.id, (Number(currentQty) || 0) + price.unit_quantity)}
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total for current plan</p>
                                                <p className="text-2xl font-bold text-foreground">₹{totalPrice.toLocaleString()}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {diffDays} days left ({(durationRatio * 100).toFixed(1)}% of plan)
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button
                                            className="w-full h-11 gradient-primary shadow-glow transition-transform hover:scale-[1.02] active:scale-95"
                                            disabled={isExtending || currentQty <= 0}
                                            onClick={() => handleExtendLimit(price.type, currentQty)}
                                        >
                                            {isExtending ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                                <CreditCard className="h-4 w-4 mr-2" />
                                            )}
                                            Pay ₹{totalPrice.toLocaleString()} Now
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                    <Separator className="mt-16" />
                </div>
            )}

            {subscription && (
                <div className="max-w-4xl mx-auto mb-10 w-full">
                    <Card className="border-primary/50 bg-primary/5">
                        <CardHeader className="pb-3 text-center sm:text-left">
                            <CardTitle className="flex flex-col sm:flex-row items-center gap-2">
                                Your Current Subscription
                                <Badge
                                    variant={subscription.status.toLowerCase() === 'expired' ? "destructive" : "default"}
                                    className={subscription.status.toLowerCase() === 'active' ? 'bg-primary text-primary-foreground text-xs' :
                                        subscription.status.toLowerCase() === 'trial' ? 'bg-blue-500 text-white text-xs' : ''}
                                >
                                    {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col sm:flex-row justify-between items-center text-sm">
                            <div className="space-y-1 text-center sm:text-left mb-4 sm:mb-0">
                                <div><span className="font-semibold text-muted-foreground">Current Plan:</span> {plans.find(p => p.id === subscription.plan_id)?.name || 'Free Tier'}</div>
                                <div><span className="font-semibold text-muted-foreground">Max Members:</span> {subscription.max_members}</div>
                                <div><span className="font-semibold text-muted-foreground">Max Gyms:</span> {subscription.max_gyms}</div>
                            </div>
                            <div className="text-center sm:text-right space-y-1">
                                <div><span className="font-semibold text-muted-foreground">Started:</span> {new Date(subscription.start_date).toLocaleDateString()}</div>
                                <div className={isExpired ? 'text-destructive font-bold' : ''}><span className="font-semibold text-muted-foreground">Ends:</span> {new Date(subscription.end_date).toLocaleDateString()}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

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
                                className={`relative flex flex-col hover:shadow-xl transition-all duration-300 border-border/50 ${
                                    plan.name.toLowerCase().includes('pro') ? 'border-primary/50 shadow-lg shadow-primary/5 ring-1 ring-primary/20' : ''
                                } ${isPlanDowngrade(plan) ? 'opacity-60 border-destructive/30' : ''}`}
                            >
                                {plan.name.toLowerCase().includes('pro') && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                        <Badge className="gradient-primary text-primary-foreground px-4 py-1 text-xs">
                                            Most Popular
                                        </Badge>
                                    </div>
                                )}
                                {isPlanDowngrade(plan) && (
                                    <div className="absolute -top-4 right-4">
                                        <Badge variant="destructive" className="text-xs">
                                            Lower Tier
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

                                        {plan.plan_features
                                            ?.filter(pf => pf.value !== 'false')
                                            .map((pf) => (
                                                <div key={pf.id} className="flex flex-col gap-1 text-sm pt-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                            <Check className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <p className="font-medium text-foreground">
                                                                {pf.features.name}
                                                                {pf.features.feature_type === 'LIMIT' && pf.value !== 'true' && (
                                                                    <span className="text-primary font-bold ml-1">({pf.value})</span>
                                                                )}
                                                            </p>
                                                            {pf.features.description && (
                                                                <p className="text-xs text-muted-foreground">{pf.features.description}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </CardContent>

                                <CardFooter className="pt-4">
                                    {(() => {
                                        const isDowngrade = isPlanDowngrade(plan);
                                        const isCurrentPlan = subscription?.plan_id === plan.id && subscription.status?.toLowerCase() === 'active';
                                        const isDisabled = isCurrentPlan || isDowngrade;

                                        return (
                                            <div className="w-full relative group">
                                                <Button
                                                    className={`w-full ${plan.name.toLowerCase().includes('pro') && !isDowngrade ? 'gradient-primary shadow-glow' : ''}`}
                                                    variant={plan.name.toLowerCase().includes('pro') && !isDowngrade ? 'default' : 'outline'}
                                                    onClick={() => handleSubscribe(plan, price)}
                                                    disabled={isDisabled}
                                                >
                                                    {isCurrentPlan ? 'Current Plan' : isDowngrade ? 'Downgrade Not Allowed' : 'Purchase Plan'}
                                                </Button>
                                                {isDowngrade && (
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                                        <div className="bg-destructive text-destructive-foreground text-xs px-3 py-2 rounded shadow-lg whitespace-nowrap">
                                                            Cannot downgrade while current plan is active
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Purchase Confirmation & Extension Dialog */}
            <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
                <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary" />
                            Confirm Your Selection
                        </DialogTitle>
                        <DialogDescription>
                            Customize your limits and review the total before payment.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-4">
                        {/* Plan Summary */}
                        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex justify-between items-center">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Target Plan</p>
                                <p className="font-bold text-lg">{selectedPlanForPurchase?.plan.name}</p>
                                <p className="text-xs text-muted-foreground">{selectedPlanForPurchase?.price.duration_value} {selectedPlanForPurchase?.price.duration_unit}(s)</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold">₹{selectedPlanForPurchase?.price.price.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Extensions Management */}
                        <div className="space-y-4">
                            <div className="px-1">
                                <h4 className="text-sm font-semibold mb-1">Carryover & Adjust Limits</h4>
                                <p className="text-xs text-muted-foreground">Modify active extensions for your new plan period.</p>
                            </div>

                            {/* Carry Over Credit Info */}
                            {(carryOverCredit > 0 || extensionCarryOverCredit > 0) && subscription && (
                                <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <CornerDownRight className="h-4 w-4 text-orange-600 flex-shrink-0" />
                                        <p className="text-sm font-semibold text-orange-800">Carry-Over Credit</p>
                                    </div>

                                    <div className="space-y-2 pl-6">
                                        {/* Plan Credit */}
                                        {carryOverCredit > 0 && (
                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                                <span className="text-muted-foreground col-span-1">Previous Plan:</span>
                                                <p className="font-medium text-foreground truncate">{subscription.plan_id ? plans.find(p => p.id === subscription.plan_id)?.name || 'Unknown' : 'N/A'}</p>
                                                <span className="text-muted-foreground">Remaining Days:</span>
                                                <p className="font-medium text-foreground">{Math.max(0, Math.ceil((new Date(subscription.end_date).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)))} days</p>
                                                <span className="text-muted-foreground">Plan Credit:</span>
                                                <p className="font-bold text-orange-600">₹{carryOverCredit.toLocaleString()}</p>
                                            </div>
                                        )}

                                        {/* Extension Credit */}
                                        {extensionCarryOverCredit > 0 && (
                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                                {subscription && (subscription.extra_gyms || 0) > 0 && (
                                                    <>
                                                        <span className="text-muted-foreground">Extra Gyms:</span>
                                                        <p className="font-medium text-foreground">{subscription.extra_gyms}</p>
                                                    </>
                                                )}
                                                {subscription && (subscription.extra_members || 0) > 0 && (
                                                    <>
                                                        <span className="text-muted-foreground">Extra Members:</span>
                                                        <p className="font-medium text-foreground">{subscription.extra_members}</p>
                                                    </>
                                                )}
                                                <span className="text-muted-foreground">Extension Credit:</span>
                                                <p className="font-bold text-orange-600">₹{extensionCarryOverCredit.toLocaleString()}</p>
                                            </div>
                                        )}

                                        {/* Total Credit */}
                                        <div className="pt-2 border-t border-orange-200 flex justify-between items-center">
                                            <span className="text-xs font-semibold text-orange-800">Total Credit:</span>
                                            <span className="text-base font-bold text-orange-600">₹{(carryOverCredit + extensionCarryOverCredit).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-3">
                                {/* Extra Gyms */}
                                {subscription && (subscription.extra_gyms || 0) > 0 && (
                                    <div className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/30">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Building2 className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Extra Gyms</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    ₹{gymUnitPrice} / {gymUnitQty} gym{gymUnitQty > 1 ? 's' : ''}
                                                    <span className="ml-1 text-primary font-semibold">(Current: {subscription.extra_gyms})</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center border border-input rounded-md bg-background h-9 overflow-hidden">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-none border-r"
                                                disabled={purchaseExtraGyms <= (subscription?.extra_gyms || 0)}
                                                onClick={() => setPurchaseExtraGyms(Math.max(subscription?.extra_gyms || 0, purchaseExtraGyms - 1))}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <Input
                                                type="number"
                                                className="w-12 h-8 border-none text-center focus-visible:ring-0 p-0"
                                                value={purchaseExtraGyms}
                                                onChange={(e) => setPurchaseExtraGyms(e.target.value === '' ? '' as any : Math.max(subscription?.extra_gyms || 0, parseInt(e.target.value) || 0))}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-none border-l"
                                                onClick={() => setPurchaseExtraGyms(purchaseExtraGyms + 1)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Extra Members */}
                                {subscription && (subscription.extra_members || 0) > 0 && (
                                    <div className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/30">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Users className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Extra Members</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    ₹{memberUnitPrice} / {memberUnitQty} member{memberUnitQty > 1 ? 's' : ''}
                                                    <span className="ml-1 text-primary font-semibold">(Current: {subscription.extra_members})</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center border border-input rounded-md bg-background h-9 overflow-hidden">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-none border-r"
                                                disabled={purchaseExtraMembers <= (subscription?.extra_members || 0)}
                                                onClick={() => setPurchaseExtraMembers(Math.max(subscription?.extra_members || 0, purchaseExtraMembers - memberUnitQty))}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <Input
                                                type="number"
                                                className="w-16 h-8 border-none text-center focus-visible:ring-0 p-0"
                                                value={purchaseExtraMembers}
                                                onChange={(e) => setPurchaseExtraMembers(e.target.value === '' ? '' as any : Math.max(subscription?.extra_members || 0, parseInt(e.target.value) || 0))}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-none border-l"
                                                onClick={() => setPurchaseExtraMembers(purchaseExtraMembers + memberUnitQty)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Final Total */}
                        <div className="pt-4 border-t space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Plan Base Price ({selectedPlanForPurchase?.price.duration_unit})</span>
                                <span>₹{selectedPlanForPurchase?.price.price.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Extensions Cost</span>
                                <span className="text-emerald-600 font-medium">₹{(
                                    (purchaseExtraGyms * gymUnitPrice / gymUnitQty) +
                                    (purchaseExtraMembers * memberUnitPrice / memberUnitQty)
                                ).toLocaleString()}</span>
                            </div>

                            {carryOverCredit > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Plan Carry-Over Credit</span>
                                    <span className="text-orange-600 font-medium">-₹{carryOverCredit.toLocaleString()}</span>
                                </div>
                            )}
                            {extensionCarryOverCredit > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Extension Carry-Over Credit</span>
                                    <span className="text-orange-600 font-medium">-₹{extensionCarryOverCredit.toLocaleString()}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-2 border-t mt-2">
                                <span className="font-bold text-lg">Grand Total</span>
                                <span className="text-3xl font-black text-primary">
                                    ₹{Math.max(1, (
                                        (selectedPlanForPurchase?.price.price || 0) +
                                        (Number(purchaseExtraGyms || 0) * gymUnitPrice / gymUnitQty) +
                                        (Number(purchaseExtraMembers || 0) * memberUnitPrice / memberUnitQty) -
                                        carryOverCredit -
                                        extensionCarryOverCredit
                                    )).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex flex-row items-center justify-between gap-3 w-full">
                        <Button variant="ghost" onClick={() => setIsPurchaseDialogOpen(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button className="gradient-primary flex-[2]" onClick={handleCheckout}>
                            Purchase & Pay Now
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Subscription History Section */}
            <div className="max-w-7xl mx-auto mt-20 mb-10">
                <div className="flex items-center gap-2 mb-6">
                    <Calendar className="h-6 w-6 text-primary" />
                    <h3 className="text-2xl font-bold tracking-tight">Subscription History</h3>
                </div>

                <Card className="border-border/50 overflow-hidden shadow-sm">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                                    <tr>
                                        <th className="px-6 py-4">Plan</th>
                                        <th className="px-6 py-4 text-center">Limits</th>
                                        <th className="px-6 py-4">Duration</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4">Period</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {historyLoading ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-10 text-center">
                                                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Loading history...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : history.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                                                No subscription history found.
                                            </td>
                                        </tr>
                                    ) : (
                                        history.map((record) => (
                                            <React.Fragment key={record.id}>
                                                <tr className="hover:bg-muted/30 transition-colors border-b border-border/50">
                                                    <td className="px-6 py-4 font-semibold text-foreground">
                                                        <div className="flex flex-col gap-1">
                                                            <span>{record.name}</span>
                                                            {!record.isAddon && (
                                                                <span className="text-[10px] text-muted-foreground font-normal">
                                                                    Primary Subscription
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex flex-col items-center gap-1.5 group cursor-default">
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10">
                                                                <Building2 className="h-3 w-3 text-primary/70" />
                                                                <span className="text-xs font-bold text-foreground">{record.max_gyms || 0}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50/50 border border-amber-200/30">
                                                                <Users className="h-3 w-3 text-amber-600/70" />
                                                                <span className="text-xs font-bold text-foreground">{record.max_members || 0}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 capitalize">
                                                        {record.duration}
                                                    </td>
                                                    <td className="px-6 py-4 flex items-center gap-1 font-medium">
                                                        <Banknote className="h-3 w-3 text-emerald-600" />
                                                        ₹{record.amount.toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                                                        <div className="flex items-center gap-1">
                                                            <span>{record.start_date ? new Date(record.start_date).toLocaleDateString() : 'N/A'}</span>
                                                            <span className="text-border">→</span>
                                                            <span>{record.end_date ? new Date(record.end_date).toLocaleDateString() : 'N/A'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Badge
                                                            variant={record.status.toLowerCase() === 'active' ? 'default' :
                                                                record.status.toLowerCase() === 'expired' ? 'destructive' : 'secondary'}
                                                            className={record.status.toLowerCase() === 'active' ? 'bg-emerald-100 text-emerald-800 border-none hover:bg-emerald-200' : ''}
                                                        >
                                                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-muted-foreground">
                                                        {new Date(record.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {record.tx_id ? (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-8 gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
                                                                onClick={() => handleDownloadInvoice(record)}
                                                                disabled={downloadingInvoice === record.id}
                                                            >
                                                                {downloadingInvoice === record.id ? (
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <Download className="h-3.5 w-3.5" />
                                                                )}
                                                                Download Invoice
                                                            </Button>
                                                        ) : (
                                                            <span className="text-[10px] text-muted-foreground italic px-2">N/A</span>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Nested Add-ons */}
                                                {record.addons && record.addons.length > 0 && record.addons.map((addon) => (
                                                    <tr key={addon.id} className="bg-muted/5 hover:bg-muted/10 transition-colors border-b border-border/20">
                                                        <td className="px-6 py-4 pl-12">
                                                            <div className="flex items-center gap-2 group">
                                                                <CornerDownRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-medium text-muted-foreground">{addon.name}</span>
                                                                    <Badge variant="outline" className="w-fit text-[9px] py-0 px-1 bg-amber-50/50 text-amber-700/70 border-amber-200/50">
                                                                        Extension
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3 text-center">
                                                            <div className="flex flex-col items-center group">
                                                                <span className="text-[10px] font-bold text-emerald-600/70">
                                                                    +{addon.quantity || 0}
                                                                </span>
                                                                <span className="text-[8px] uppercase tracking-tighter text-muted-foreground/50">
                                                                    {addon.type || 'Units'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3 text-xs text-muted-foreground/70">
                                                            {addon.duration}
                                                        </td>
                                                        <td className="px-6 py-3 text-xs font-medium text-emerald-600/80">
                                                            ₹{addon.amount.toLocaleString()}
                                                        </td>
                                                        <td className="px-6 py-3 text-xs text-muted-foreground/60 italic">
                                                            Added to plan
                                                        </td>
                                                        <td className="px-6 py-3">
                                                                <span className="text-muted-foreground/40 ml-4">—</span>
                                                        </td>
                                                        <td className="px-6 py-3 text-xs text-muted-foreground/60">
                                                            {new Date(addon.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-3 text-right">
                                                            {(addon as any).tx_id ? (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="h-8 gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
                                                                    onClick={() => handleDownloadInvoice(addon)}
                                                                    disabled={downloadingInvoice === addon.id}
                                                                >
                                                                    {downloadingInvoice === addon.id ? (
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                    ) : (
                                                                        <Download className="h-3.5 w-3.5" />
                                                                    )}
                                                                    Download Invoice
                                                                </Button>
                                                            ) : null}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
