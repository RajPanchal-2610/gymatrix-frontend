import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Loader2, TicketPercent, Calendar, Users, Hash, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface Coupon {
    id: string;
    code: string;
    discount_type: 'FLAT' | 'PERCENTAGE';
    discount_value: number;
    min_purchase_amount: number;
    max_discount_amount: number | null;
    applicable_plan_ids: string[] | null;
    applicable_duration_units: string[] | null;
    is_applicable_to_extensions: boolean;
    expiry_date: string | null;
    total_usage_limit: number | null;
    user_usage_limit: number;
    is_active: boolean;
    created_at: string;
    usage_count?: number;
}

interface Plan {
    id: string;
    name: string;
}

export default function Coupons() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog States
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        code: "",
        discount_type: "PERCENTAGE" as 'FLAT' | 'PERCENTAGE',
        discount_value: 0,
        min_purchase_amount: 0,
        max_discount_amount: "" as string | number,
        applicable_plan_ids: [] as string[],
        applicable_duration_units: [] as string[],
        is_applicable_to_extensions: false,
        expiry_date: "",
        total_usage_limit: "" as string | number,
        user_usage_limit: 1,
        is_active: true,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Usage Details States
    const [isUsageDialogOpen, setIsUsageDialogOpen] = useState(false);
    const [selectedCouponForUsage, setSelectedCouponForUsage] = useState<Coupon | null>(null);
    const [usageDetails, setUsageDetails] = useState<any[]>([]);
    const [loadingUsage, setLoadingUsage] = useState(false);

    // Fetch Coupons & Plans
    const fetchData = async () => {
        try {
            setLoading(true);
            
            // Fetch Plans for dropdown
            const { data: plansData } = await supabase
                .from('plans')
                .select('id, name')
                .order('name');
            setPlans(plansData || []);

            // Fetch Coupons via Backend to get usage counts (implied in the getCoupons controller)
            // Or fetch via Supabase for simplicity in this MVP
            const { data, error } = await supabase
                .from('coupons')
                .select(`
                    *,
                    usage:coupon_usage(count)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            const transformed = data.map((c: any) => ({
                ...c,
                usage_count: c.usage?.[0]?.count || 0
            }));
            
            setCoupons(transformed || []);
        } catch (error: any) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handle Form Change
    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        if (field === 'code') {
            setFormData(prev => ({ ...prev, code: value.toUpperCase().replace(/\s+/g, '') }));
        }
    };

    // Open Create Dialog
    const openCreateDialog = () => {
        setEditingCoupon(null);
        setFormData({
            code: "",
            discount_type: "PERCENTAGE",
            discount_value: 0,
            min_purchase_amount: 0,
            max_discount_amount: "",
            applicable_plan_ids: [],
            applicable_duration_units: [],
            is_applicable_to_extensions: false,
            expiry_date: "",
            total_usage_limit: "",
            user_usage_limit: 1,
            is_active: true,
        });
        setIsDialogOpen(true);
    };

    // Open Edit Dialog
    const openEditDialog = (coupon: Coupon) => {
        setEditingCoupon(coupon);
        setFormData({
            code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            min_purchase_amount: coupon.min_purchase_amount,
            max_discount_amount: coupon.max_discount_amount || "",
            applicable_plan_ids: coupon.applicable_plan_ids || [],
            applicable_duration_units: coupon.applicable_duration_units || [],
            is_applicable_to_extensions: coupon.is_applicable_to_extensions,
            expiry_date: coupon.expiry_date ? format(new Date(coupon.expiry_date), "yyyy-MM-dd") : "",
            total_usage_limit: coupon.total_usage_limit || "",
            user_usage_limit: coupon.user_usage_limit,
            is_active: coupon.is_active,
        });
        setIsDialogOpen(true);
    };

    // Submit Form
    const handleSubmit = async () => {
        if (!formData.code || !formData.discount_value) {
            toast.error("Code and Discount Value are required");
            return;
        }

        try {
            setIsSubmitting(true);

            const payload = {
                code: formData.code.toUpperCase(),
                discount_type: formData.discount_type,
                discount_value: Number(formData.discount_value),
                min_purchase_amount: Number(formData.min_purchase_amount),
                max_discount_amount: formData.max_discount_amount ? Number(formData.max_discount_amount) : null,
                applicable_plan_ids: formData.applicable_plan_ids.length === 0 ? null : formData.applicable_plan_ids,
                applicable_duration_units: formData.applicable_duration_units.length === 0 ? null : formData.applicable_duration_units,
                is_applicable_to_extensions: formData.is_applicable_to_extensions,
                expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : null,
                total_usage_limit: formData.total_usage_limit ? Number(formData.total_usage_limit) : null,
                user_usage_limit: Number(formData.user_usage_limit),
                is_active: formData.is_active,
            };

            if (editingCoupon) {
                const { error } = await supabase
                    .from('coupons')
                    .update(payload)
                    .eq('id', editingCoupon.id);
                if (error) throw error;
                toast.success("Coupon updated successfully");
            } else {
                const { error } = await supabase
                    .from('coupons')
                    .insert([payload]);
                if (error) throw error;
                toast.success("Coupon created successfully");
            }

            setIsDialogOpen(false);
            fetchData();

        } catch (error: any) {
            console.error("Error saving coupon:", error);
            toast.error(error.message || "Failed to save coupon");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Toggle Status
    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('coupons')
                .update({ is_active: !currentStatus })
                .eq('id', id);
            
            if (error) throw error;
            toast.success(`Coupon ${!currentStatus ? 'activated' : 'deactivated'}`);
            setCoupons(coupons.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
        } catch (error: any) {
            toast.error("Failed to update status");
        }
    };
    // Delete Coupon
    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this coupon? This will also remove its usage history.")) return;

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/coupons/${id}`, {
                method: "DELETE"
            });

            if (!response.ok) throw new Error("Failed to delete coupon");

            toast.success("Coupon deleted successfully");
            fetchData();
        } catch (error: any) {
            console.error("Delete error:", error);
            toast.error(error.message || "Failed to delete coupon");
        }
    };

    // Fetch Usage Details
    const fetchUsage = async (coupon: Coupon) => {
        try {
            setSelectedCouponForUsage(coupon);
            setUsageDetails([]);
            setLoadingUsage(true);
            setIsUsageDialogOpen(true);

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/coupons/${coupon.id}/usage`);
            if (!response.ok) throw new Error("Failed to fetch usage data");

            const data = await response.json();
            setUsageDetails(data);
        } catch (error: any) {
            console.error("Fetch usage error:", error);
            toast.error("Failed to load usage details");
        } finally {
            setLoadingUsage(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Coupons & Discounts</h1>
                    <p className="text-muted-foreground">
                        Manage promotional codes and special offers for the platform.
                    </p>
                </div>
                <Button onClick={openCreateDialog} className="gradient-primary shadow-glow">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Coupon
                </Button>
            </div>

            <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : coupons.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                            <TicketPercent className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-lg font-medium">No coupons found</h3>
                        <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                            Start by creating your first promotional discount code.
                        </p>
                        <Button onClick={openCreateDialog} variant="outline">Create Coupon</Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Discount</TableHead>
                                <TableHead>Restrictions</TableHead>
                                <TableHead>Usage / Limit</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {coupons.map((coupon) => (
                                <TableRow key={coupon.id} className="group">
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <code className="bg-primary/10 px-2 py-1 rounded font-bold text-primary">
                                                {coupon.code}
                                            </code>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-semibold text-foreground">
                                            {coupon.discount_type === 'FLAT' ? `₹${coupon.discount_value}` : `${coupon.discount_value}%`}
                                        </div>
                                        {coupon.min_purchase_amount > 0 && (
                                            <div className="text-[10px] text-muted-foreground">
                                                Min: ₹{coupon.min_purchase_amount}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {coupon.applicable_plan_ids && coupon.applicable_plan_ids.length > 0 ? (
                                                <Badge variant="outline" className="text-[10px] h-5 bg-primary/5">
                                                    {coupon.applicable_plan_ids.length === plans.length ? 
                                                        'All Plans' : 
                                                        `${coupon.applicable_plan_ids.length} Plan${coupon.applicable_plan_ids.length > 1 ? 's' : ''}`
                                                    }
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-[10px] h-5">All Plans</Badge>
                                            )}
                                            {(coupon.applicable_duration_units?.length || 0) > 0 ? (
                                                <Badge variant="outline" className="text-[10px] h-5 capitalize">
                                                    {coupon.applicable_duration_units?.length === 2 ? 
                                                        'All Durations' : 
                                                        coupon.applicable_duration_units?.map(d => d + 'ly').join(', ')
                                                    }
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-[10px] h-5">All Durations</Badge>
                                            )}
                                            {coupon.is_applicable_to_extensions && (
                                                <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-500 h-5">
                                                    Extensions
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="font-medium">{coupon.usage_count}</span>
                                            <span className="text-muted-foreground">/</span>
                                            <span className="text-muted-foreground">{coupon.total_usage_limit || '∞'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            {coupon.expiry_date ? format(new Date(coupon.expiry_date), "MMM d, yyyy") : "Never"}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center">
                                            {coupon.is_active ? (
                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                                                    <XCircle className="h-3 w-3 mr-1" /> Inactive
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/10"
                                                onClick={() => fetchUsage(coupon)}
                                            >
                                                <Users className="h-3.5 w-3.5" />
                                                Usage
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 hover:text-primary hover:bg-primary/10"
                                                onClick={() => openEditDialog(coupon)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDelete(coupon.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            <Switch 
                                                checked={coupon.is_active}
                                                onCheckedChange={() => toggleStatus(coupon.id, coupon.is_active)}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <TicketPercent className="h-5 w-5 text-primary" />
                            {editingCoupon ? "Edit Coupon" : "Create New Coupon"}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-2 gap-6 mt-4">
                        {/* Basic Info */}
                        <div className="space-y-4 col-span-2 md:col-span-1">
                            <div className="space-y-2">
                                <Label htmlFor="code">Coupon Code</Label>
                                <Input
                                    id="code"
                                    placeholder="e.g., SAVE50"
                                    className="uppercase font-bold tracking-widest"
                                    value={formData.code}
                                    onChange={(e) => handleInputChange("code", e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Discount Type</Label>
                                <Select
                                    value={formData.discount_type}
                                    onValueChange={(val: any) => handleInputChange("discount_type", val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                                        <SelectItem value="FLAT">Flat Amount (₹)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="discount_value">
                                    Discount Value {formData.discount_type === 'PERCENTAGE' ? '(%)' : '(₹)'}
                                </Label>
                                <Input
                                    id="discount_value"
                                    type="number"
                                    value={formData.discount_value}
                                    onChange={(e) => handleInputChange("discount_value", e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Limits & Expiry */}
                        <div className="space-y-4 col-span-2 md:col-span-1">
                            <div className="space-y-2">
                                <Label htmlFor="min_purchase">Min Purchase Amount (₹)</Label>
                                <Input
                                    id="min_purchase"
                                    type="number"
                                    value={formData.min_purchase_amount}
                                    onChange={(e) => handleInputChange("min_purchase_amount", e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="max_discount">Max Discount Amount (₹)</Label>
                                <Input
                                    id="max_discount"
                                    type="number"
                                    placeholder="Unlimited"
                                    value={formData.max_discount_amount}
                                    onChange={(e) => handleInputChange("max_discount_amount", e.target.value)}
                                />
                                <p className="text-[10px] text-muted-foreground">Only applicable for Percentage type</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="expiry">Expiry Date</Label>
                                <Input
                                    id="expiry"
                                    type="date"
                                    value={formData.expiry_date}
                                    onChange={(e) => handleInputChange("expiry_date", e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Restrictions */}
                        <div className="bg-secondary/30 p-4 rounded-lg col-span-2 space-y-4">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                <Shield className="h-4 w-4" /> Restrictions & Targets
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <Label>Apply to Plans (Leave empty for all)</Label>
                                    <div className="flex flex-wrap gap-2 p-3 bg-background rounded-md border border-border min-h-[46px]">
                                        {plans.map(plan => {
                                            const isSelected = formData.applicable_plan_ids.includes(plan.id);
                                            return (
                                                <Button
                                                    key={plan.id}
                                                    type="button"
                                                    variant={isSelected ? "default" : "outline"}
                                                    size="sm"
                                                    className="h-8 text-xs font-medium"
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            handleInputChange("applicable_plan_ids", formData.applicable_plan_ids.filter(id => id !== plan.id));
                                                        } else {
                                                            handleInputChange("applicable_plan_ids", [...formData.applicable_plan_ids, plan.id]);
                                                        }
                                                    }}
                                                >
                                                    {plan.name}
                                                </Button>
                                            );
                                        })}
                                        {plans.length === 0 && <p className="text-xs text-muted-foreground">No plans found</p>}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label>Apply to Durations (Leave empty for all)</Label>
                                    <div className="flex flex-wrap gap-2 p-3 bg-background rounded-md border border-border">
                                        {['month', 'year'].map(duration => {
                                            const isSelected = formData.applicable_duration_units?.includes(duration);
                                            return (
                                                <Button
                                                    key={duration}
                                                    type="button"
                                                    variant={isSelected ? "default" : "outline"}
                                                    size="sm"
                                                    className="h-8 text-xs font-medium capitalize"
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            handleInputChange("applicable_duration_units", formData.applicable_duration_units.filter(d => d !== duration));
                                                        } else {
                                                            handleInputChange("applicable_duration_units", [...formData.applicable_duration_units, duration]);
                                                        }
                                                    }}
                                                >
                                                    {duration}ly
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2 border-t border-border mt-2">
                                <div className="space-y-0.5">
                                    <Label>Allow on Extension Add-ons</Label>
                                    <p className="text-xs text-muted-foreground">Allow usage when buying extra gyms/members</p>
                                </div>
                                <Switch 
                                    checked={formData.is_applicable_to_extensions}
                                    onCheckedChange={(val) => handleInputChange("is_applicable_to_extensions", val)}
                                />
                            </div>
                        </div>

                        {/* Usage Rules */}
                        <div className="grid grid-cols-2 gap-4 col-span-2">
                             <div className="space-y-2">
                                <Label className="flex items-center gap-1.5">
                                    <Hash className="h-3.5 w-3.5" /> Total Usage Limit
                                </Label>
                                <Input
                                    type="number"
                                    placeholder="Unlimited"
                                    value={formData.total_usage_limit}
                                    onChange={(e) => handleInputChange("total_usage_limit", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5" /> Usage Per User
                                </Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={formData.user_usage_limit}
                                    onChange={(e) => handleInputChange("user_usage_limit", e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-8 border-t pt-6">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button className="gradient-primary" onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingCoupon ? "Save Changes" : "Create Coupon"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isUsageDialogOpen} onOpenChange={setIsUsageDialogOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Usage History: <span className="text-primary">{selectedCouponForUsage?.code}</span>
                        </DialogTitle>
                        <DialogDescription>
                            See a detailed list of all users who have applied this coupon.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4">
                        {loadingUsage ? (
                            <div className="flex justify-center items-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : usageDetails.length === 0 ? (
                            <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                                <p className="text-muted-foreground">No usage records found for this coupon yet.</p>
                            </div>
                        ) : (
                            <div className="rounded-md border border-border overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="text-xs">User</TableHead>
                                            <TableHead className="text-xs">Plan Purchased</TableHead>
                                            <TableHead className="text-xs">Paid Amount</TableHead>
                                            <TableHead className="text-xs">Date</TableHead>
                                            <TableHead className="text-xs text-right">Receipt</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {usageDetails.map((usage) => (
                                            <TableRow key={usage.usageId} className="text-sm">
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{usage.userName}</span>
                                                        <span className="text-[10px] text-muted-foreground">{usage.userEmail}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="capitalize">{usage.planName}</span>
                                                        <span className="text-[10px] text-muted-foreground capitalize">{usage.duration}ly</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-semibold text-emerald-600">
                                                    ₹{usage.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {format(new Date(usage.date), "MMM d, yyyy HH:mm")}
                                                </TableCell>
                                                <TableCell className="text-right text-[10px] font-mono text-muted-foreground">
                                                    {usage.receiptId}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUsageDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Shield(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        </svg>
    )
}
