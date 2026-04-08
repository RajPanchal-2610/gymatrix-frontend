
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dumbbell, Mail, Lock, Eye, EyeOff, Building2, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function GymRegister() {
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        gymName: "",
        adminName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setIsLoading(true);

        try {
            // 1. Register User
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            });
            if (authError) throw authError;
            if (!authData.user) throw new Error("Registration failed");

            const userId = authData.user.id;

            // 2. Create Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    user_id: userId,
                    full_name: formData.adminName,
                });
            if (profileError) {
                // detailed error logging
                console.error("Profile creation error:", profileError);
                throw new Error("Failed to create user profile");
            }

            // 3. Create Gym
            const { data: gymData, error: gymError } = await supabase
                .from('gyms')
                .insert({
                    name: formData.gymName,
                    owner_id: userId
                })
                .select()
                .single();
            if (gymError) {
                console.error("Gym creation error:", gymError);
                throw new Error("Failed to create gym");
            }

            // 4. Role assignment skipped for Gym Owner (handled via owner_id in gyms table)


            // 5. Create 14-day Trial Subscription (Pro Plan)
            // Fetch the Pro plan along with limits and price info
            const { data: planData, error: planError } = await supabase
                .from('plans')
                .select(`
                    id, 
                    max_gyms, 
                    max_members,
                    plan_prices!inner (
                        id
                    ),
                    plan_features (
                        feature_id,
                        value
                    )
                `)
                .ilike('name', '%Pro%')
                .limit(1)
                .maybeSingle();

            // If Pro plan not found, fetch ANY active plan to assign as trial
            let selectedPlan = planData;

            if (!selectedPlan) {
                const { data: fallbackPlan } = await supabase
                    .from('plans')
                    .select(`
                        id, 
                        max_gyms, 
                        max_members,
                        plan_prices!inner (
                            id
                        ),
                        plan_features (
                            feature_id,
                            value
                        )
                    `)
                    .eq('is_active', true)
                    .limit(1)
                    .maybeSingle();
                selectedPlan = fallbackPlan;
            }

            if (selectedPlan && selectedPlan.plan_prices?.[0]) {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(startDate.getDate() + 14); // 14 days trial

                const { data: subscription, error: subError } = await supabase
                    .from('subscriptions')
                    .insert({
                        user_id: userId,
                        plan_id: selectedPlan.id,
                        plan_price_id: selectedPlan.plan_prices[0].id, // Use first available price ID
                        max_gyms: selectedPlan.max_gyms,
                        max_members: selectedPlan.max_members,
                        status: 'trial',
                        start_date: startDate.toISOString(),
                        end_date: endDate.toISOString(),
                        amount: 0
                    })
                    .select()
                    .single();

                if (subError) {
                    console.error("Subscription creation error:", subError);
                    toast.error("Account created but failed to assign trial plan. Please contact support.");
                } else if (subscription && selectedPlan.plan_features && selectedPlan.plan_features.length > 0) {
                    // 6. Add Subscription Features
                    const featuresToInsert = selectedPlan.plan_features.map((pf: any) => ({
                        subscription_id: subscription.id,
                        feature_id: pf.feature_id,
                        value: pf.value
                    }));

                    const { error: featuresError } = await supabase
                        .from('subscription_features')
                        .insert(featuresToInsert);

                    if (featuresError) {
                        console.error("Subscription features creation error:", featuresError);
                        // We don't block the user flow here, as the account and subscription are created
                    }
                }
            } else {
                console.warn("No valid plans with pricing found to assign for trial.");
            }

            toast.success("Gym registered successfully! Please login.");
            navigate("/auth");

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            {/* Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
            </div>

            <Card className="w-full max-w-xl relative animate-scale-in">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto h-14 w-14 rounded-xl gradient-primary flex items-center justify-center mb-4 shadow-glow">
                        <Building2 className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Register Your Gym</CardTitle>
                    <CardDescription>Start managing your fitness center with GymFlow</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="gymName">Gym Name</Label>
                                <div className="relative">
                                    <Dumbbell className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="gymName"
                                        type="text"
                                        placeholder="FitLife Gym"
                                        className="pl-10"
                                        value={formData.gymName}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="adminName">Admin Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="adminName"
                                        type="text"
                                        placeholder="John Doe"
                                        className="pl-10"
                                        value={formData.adminName}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@gym.com"
                                    className="pl-10"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="pl-10 pr-10"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="confirmPassword"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="pl-10"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-2 pt-2">
                            <Checkbox id="terms" required />
                            <Label htmlFor="terms" className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                I agree to the <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                            </Label>
                        </div>

                        <Button type="submit" className="w-full gradient-primary shadow-glow" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                "Create Gym Account"
                            )}
                        </Button>
                    </form>
                    <div className="mt-6 text-center text-sm">
                        <span className="text-muted-foreground">Already have an admin account? </span>
                        <Link to="/auth" className="text-primary hover:underline font-medium">
                            Login here
                        </Link>
                    </div>
                </CardContent>

            </Card>
        </div>
    );
}
