
import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useGym } from "@/hooks/useGym";
import { GymMembershipPlan } from "@/types/gym";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function MembershipPlans() {
    const { gymId, loading: gymLoading } = useGym();
    const [plans, setPlans] = useState<GymMembershipPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<GymMembershipPlan | null>(null);

    // Form states
    const [formData, setFormData] = useState<{
        name: string;
        price: string;
        duration_value: string;
        duration_unit: string;
        description: string;
    }>({
        name: "",
        price: "",
        duration_value: "1",
        duration_unit: "month",
        description: "",
    });

    useEffect(() => {
        if (gymId) {
            fetchPlans();
        }
    }, [gymId]);

    const fetchPlans = async () => {
        try {
            if (plans.length === 0) setLoading(true);
            const { data, error } = await supabase
                .from("gym_membership_plans")
                .select("*")
                .eq("gym_id", gymId)
                .eq("is_deleted", false)
                .order("price", { ascending: true });

            if (error) throw error;
            setPlans(data || []);
        } catch (error: any) {
            toast.error("Failed to fetch plans: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (plan?: GymMembershipPlan) => {
        if (plan) {
            setEditingPlan(plan);
            setFormData({
                name: plan.name,
                price: plan.price.toString(),
                duration_value: plan.duration_value.toString(),
                duration_unit: plan.duration_unit,
                description: plan.description || "",
            });
        } else {
            setEditingPlan(null);
            setFormData({
                name: "",
                price: "",
                duration_value: "1",
                duration_unit: "month",
                description: "",
            });
        }
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!gymId) return;
        if (!formData.name || !formData.price || !formData.duration_value) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            const payload = {
                gym_id: gymId,
                name: formData.name,
                price: parseFloat(formData.price),
                duration_value: parseInt(formData.duration_value),
                duration_unit: formData.duration_unit,
                description: formData.description,
                status: 'active',
                is_active: true,
                is_deleted: false
            };

            if (editingPlan) {
                const { error } = await supabase
                    .from("gym_membership_plans")
                    .update(payload)
                    .eq("id", editingPlan.id);

                if (error) throw error;
                toast.success("Plan updated successfully");
            } else {
                const { error } = await supabase
                    .from("gym_membership_plans")
                    .insert(payload);

                if (error) throw error;
                toast.success("Plan created successfully");
            }

            setDialogOpen(false);
            fetchPlans();
        } catch (error: any) {
            toast.error("Operation failed: " + error.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this plan?")) return;

        try {
            const { error } = await supabase
                .from("gym_membership_plans")
                .update({ is_deleted: true })
                .eq("id", id);

            if (error) throw error;
            toast.success("Plan deleted successfully");
            fetchPlans();
        } catch (error: any) {
            toast.error("Failed to delete plan: " + error.message);
        }
    };

    return (
        <DashboardLayout title="Subscription Plans">
            {gymLoading || (loading && !plans.length && gymId) ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <p className="text-muted-foreground">
                            Manage your gym's membership plans
                        </p>
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="gradient-primary shadow-glow" onClick={() => handleOpenDialog()}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Plan
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="planName">Plan Name</Label>
                                        <Input
                                            id="planName"
                                            placeholder="e.g., Monthly Silver"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="price">Price</Label>
                                            <Input
                                                id="price"
                                                type="number"
                                                placeholder="0.00"
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Duration</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="number"
                                                    value={formData.duration_value}
                                                    onChange={(e) => setFormData({ ...formData, duration_value: e.target.value })}
                                                    className="w-20"
                                                />
                                                <Select
                                                    value={formData.duration_unit}
                                                    onValueChange={(val) => setFormData({ ...formData, duration_unit: val })}
                                                >
                                                    <SelectTrigger className="flex-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="day">Days</SelectItem>
                                                        <SelectItem value="month">Months</SelectItem>
                                                        <SelectItem value="year">Years</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            placeholder="Plan details..."
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button className="gradient-primary" onClick={handleSubmit}>
                                        {editingPlan ? "Update Plan" : "Create Plan"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {plans.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/20">
                            <p className="text-muted-foreground mb-4">No membership plans found.</p>
                            <Button onClick={() => handleOpenDialog()}>Create First Plan</Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plans.map((plan) => (
                                <Card
                                    key={plan.id}
                                    className="relative overflow-hidden hover:shadow-lg transition-all duration-300 animate-slide-up"
                                >
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between gap-2">
                                            <span>{plan.name}</span>
                                            {plan.is_active ? (
                                                <Badge variant="outline" className="text-success border-success bg-success/10">Active</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                                            )}
                                        </CardTitle>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-bold">{Number(plan.price).toLocaleString('en-US', { style: 'currency', currency: 'INR' })}</span>
                                            <span className="text-muted-foreground">
                                                / {plan.duration_value} {plan.duration_unit}{plan.duration_value > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-sm text-muted-foreground min-h-[40px]">
                                            {plan.description || "No description provided."}
                                        </p>

                                        <div className="flex gap-2 pt-4">
                                            <Button variant="outline" className="flex-1" onClick={() => handleOpenDialog(plan)}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                                onClick={() => handleDelete(plan.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            )}
        </DashboardLayout>
    );
}
