import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Users, Check, Banknote, Building2, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";

// Database interfaces
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
  key: string;
  name: string;
  description: string | null;
  feature_type: 'MODULE' | 'LIMIT' | 'ACTION';
}

interface PlanFeature {
  id: number;
  plan_id: number;
  feature_id: number;
  value: string;
}

interface Plan {
  id: number;
  name: string;
  description: string | null;
  max_gyms: number;
  max_members: number;
  is_active: boolean;
  is_trial_plan: boolean;
  created_at?: string;
  plan_prices: PlanPrice[];
  plan_features: PlanFeature[];
}

export default function MembershipPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    max_gyms: "1",
    max_members: "10",
    is_active: true,
    is_trial_plan: false,
    // Price related fields
    monthlyPrice: "",
    yearlyPrice: "",
  });

  // Feature State
  const [availableFeatures, setAvailableFeatures] = useState<Feature[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<Record<number, boolean>>({});
  const [featureValues, setFeatureValues] = useState<Record<number, string>>({}); const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchFeatures();
    fetchPlans();
  }, []);

  const fetchFeatures = async () => {
    const { data } = await supabase.from('features').select('*').order('name');
    if (data) setAvailableFeatures(data);
  };

  // Fetch Plans
  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('plans')
        .select(`
          *,
          plan_prices (*),
          plan_features (*)
        `)
        .order('id', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      console.error("Error fetching plans:", error);
      toast.error("Failed to load membership plans");
    } finally {
      setLoading(false);
    }
  };



  // Handle Form Change
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Open Create Dialog
  const openCreateDialog = () => {
    setEditingPlan(null);
    setFormData({
      name: "",
      description: "",
      max_gyms: "1",
      max_members: "10",
      is_active: true,
      is_trial_plan: false,
      monthlyPrice: "",
      yearlyPrice: ""
    });
    // Reset features
    setSelectedFeatures({});
    setFeatureValues({});
    setIsDialogOpen(true);
  };

  // Open Edit Dialog
  const openEditDialog = (plan: Plan) => {
    setEditingPlan(plan);

    // Find existing prices
    const monthly = plan.plan_prices?.find(p => p.duration_unit === 'month' && p.duration_value === 1);
    const yearly = plan.plan_prices?.find(p => p.duration_unit === 'year' && p.duration_value === 1);

    setFormData({
      name: plan.name,
      description: plan.description || "",
      max_gyms: (plan.max_gyms || 1).toString(),
      max_members: (plan.max_members || 10).toString(),
      is_active: plan.is_active,
      is_trial_plan: plan.is_trial_plan || false,
      monthlyPrice: monthly ? monthly.price.toString() : "",
      yearlyPrice: yearly ? yearly.price.toString() : ""
    });

    // Set features
    const selections: Record<number, boolean> = {};
    const values: Record<number, string> = {};

    plan.plan_features?.forEach(pf => {
      const isSelected = pf.value !== 'false';
      selections[pf.feature_id] = isSelected;
      // If selected, use the value. If not (it's 'false'), clear the input value for UI cleanliness
      values[pf.feature_id] = isSelected ? (pf.value || "") : "";
    });

    setSelectedFeatures(selections);
    setFeatureValues(values);

    setIsDialogOpen(true);
  };

  // Submit Form (Create or Update)
  const handleSubmit = async () => {
    if (!formData.name || !formData.max_gyms || !formData.max_members) {
      toast.error("Name, Max Gyms, and Max Members are required");
      return;
    }

    if (!formData.monthlyPrice && !formData.yearlyPrice) {
      toast.error("At least one price (Monthly or Yearly) is required");
      return;
    }

    try {
      setIsSubmitting(true);

      const planPayload = {
        name: formData.name,
        description: formData.description,
        max_gyms: parseInt(formData.max_gyms),
        max_members: parseInt(formData.max_members),
        is_active: formData.is_active,
        is_trial_plan: formData.is_trial_plan
      };

      let planId = editingPlan?.id;

      if (editingPlan) {
        // Update Plan
        const { error: planError } = await supabase
          .from('plans')
          .update(planPayload)
          .eq('id', editingPlan.id);
        if (planError) throw planError;
      } else {
        // Create Plan
        const { data: newPlan, error: planError } = await supabase
          .from('plans')
          .insert(planPayload)
          .select()
          .single();

        if (planError) throw planError;
        planId = newPlan.id;
      }

      if (!planId) throw new Error("Plan ID is missing");

      // If this plan is set as trial, update all other plans' trial status to false
      if (formData.is_trial_plan) {
        await supabase
          .from('plans')
          .update({ is_trial_plan: false })
          .neq('id', planId);
      }

      // Handle Monthly Price
      const existingMonthly = editingPlan?.plan_prices?.find(p => p.duration_unit === 'month' && p.duration_value === 1);
      if (formData.monthlyPrice) {
        const payload = {
          plan_id: planId,
          price: parseFloat(formData.monthlyPrice),
          duration_value: 1,
          duration_unit: 'month',
          is_active: true
        };

        if (existingMonthly) {
          await supabase.from('plan_prices').update(payload).eq('id', existingMonthly.id);
        } else {
          await supabase.from('plan_prices').insert(payload);
        }
      } else if (existingMonthly) {
        // If cleared, disable or delete? Let's delete for cleanliness or set inactive
        await supabase.from('plan_prices').delete().eq('id', existingMonthly.id);
      }

      // Handle Yearly Price
      const existingYearly = editingPlan?.plan_prices?.find(p => p.duration_unit === 'year' && p.duration_value === 1);
      if (formData.yearlyPrice) {
        const payload = {
          plan_id: planId,
          price: parseFloat(formData.yearlyPrice),
          duration_value: 1,
          duration_unit: 'year',
          is_active: true
        };

        if (existingYearly) {
          await supabase.from('plan_prices').update(payload).eq('id', existingYearly.id);
        } else {
          await supabase.from('plan_prices').insert(payload);
        }
      } else if (existingYearly) {
        await supabase.from('plan_prices').delete().eq('id', existingYearly.id);
      }

      // Handle Features
      // Get current features from DB to correctly handle add/update/delete
      const { data: currentFeatures } = await supabase
        .from('plan_features')
        .select('*')
        .eq('plan_id', planId);

      const currentFeatureMap = new Map(
        currentFeatures?.map(cf => [cf.feature_id, cf]) || []
      );

      // 1. Handle Upserts (Insert or Update) for ALL available features
      const featuresToUpsert: any[] = [];

      availableFeatures.forEach(feature => {
        const fid = feature.id;
        const isSelected = !!selectedFeatures[fid];
        const existing = currentFeatureMap.get(fid);

        let val = "false";
        if (isSelected) {
          val = featureValues[fid] || "true";
        }

        if (existing) {
          // Update if value changed
          if (existing.value !== val) {
            featuresToUpsert.push({
              id: existing.id,
              plan_id: planId,
              feature_id: fid,
              value: val
            });
          }
        } else {
          // New insertion
          featuresToUpsert.push({
            plan_id: planId,
            feature_id: fid,
            value: val
          });
        }
      });

      if (featuresToUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('plan_features')
          .upsert(featuresToUpsert);

        if (upsertError) throw upsertError;
      }

      // We no longer delete features, we just set them to 'false'

      toast.success(editingPlan ? "Plan updated successfully" : "Plan created successfully");
      setIsDialogOpen(false);
      fetchPlans();

    } catch (error: any) {
      console.error("Error saving plan:", error);
      toast.error(error.message || "Failed to save plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Plan
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;

    try {
      const { error } = await supabase.from('plans').delete().eq('id', id);
      if (error) throw error;

      toast.success("Plan deleted successfully");
      setPlans(plans.filter(p => p.id !== id));
    } catch (error: any) {
      console.error("Error deleting plan:", error);
      toast.error("Failed to delete plan");
    }
  };

  const getDurationLabel = (val: number, unit: string) => {
    if (val === 1) return unit === 'month' ? 'Monthly' : 'Yearly';
    return `Every ${val} ${unit}s`;
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-muted-foreground">
            Manage your gym membership plans and pricing
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gradient-primary shadow-glow">
          <Plus className="h-4 w-4 mr-2" />
          Create Plan
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-dashed border-border">
          <h3 className="text-lg font-medium">No plans found</h3>
          <p className="text-muted-foreground mb-4">Create your first membership plan to get started.</p>
          <Button onClick={openCreateDialog} variant="outline">Create Plan</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const monthlyPrice = plan.plan_prices?.find(p => p.duration_unit === 'month' && p.duration_value === 1);
            const yearlyPrice = plan.plan_prices?.find(p => p.duration_unit === 'year' && p.duration_value === 1);

            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden hover:shadow-lg transition-all duration-300 animate-slide-up group ${!plan.is_active ? "opacity-75 grayscale-[0.5]" : ""
                  }`}
              >
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                  {!plan.is_active && <Badge variant="destructive">Inactive</Badge>}
                  {plan.is_trial_plan && <Badge className="bg-emerald-505 bg-emerald-500 hover:bg-emerald-600 text-white font-bold">Trial Plan</Badge>}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-xl font-bold">{plan.name}</span>
                  </CardTitle>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{plan.description}</p>
                  )}

                  <div className="mt-4 space-y-1">
                    {monthlyPrice && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">₹{monthlyPrice.price}</span>
                        <span className="text-muted-foreground text-sm">/ month</span>
                      </div>
                    )}
                    {yearlyPrice && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-semibold text-muted-foreground">₹{yearlyPrice.price}</span>
                        <span className="text-muted-foreground text-sm">/ year</span>
                        <Badge variant="secondary" className="ml-2 text-[10px] h-5">
                          Save {monthlyPrice ? Math.round(((monthlyPrice.price * 12 - yearlyPrice.price) / (monthlyPrice.price * 12)) * 100) : 0}%
                        </Badge>
                      </div>
                    )}
                    {!monthlyPrice && !yearlyPrice && (
                      <span className="text-muted-foreground">No prices configured</span>
                    )}
                  </div>

                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span>Up to <strong>{plan.max_gyms}</strong> Gym(s)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-primary" />
                      <span>Up to <strong>{plan.max_members}</strong> Member(s)</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 mt-auto">
                    <Button
                      variant="outline"
                      className="flex-1 hover:border-primary/50"
                      onClick={() => openEditDialog(plan)}
                    >
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
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto pr-6 -mr-6 space-y-4 mt-4 px-1">
            <div className="space-y-2">
              <Label htmlFor="planName">Plan Name</Label>
              <Input
                id="planName"
                placeholder="e.g., Gold Membership"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe what's included..."
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_gyms">Max Gyms</Label>
                <Input
                  id="max_gyms"
                  type="number"
                  placeholder="1"
                  value={formData.max_gyms}
                  onChange={(e) => handleInputChange("max_gyms", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_members">Max Members</Label>
                <Input
                  id="max_members"
                  type="number"
                  placeholder="10"
                  value={formData.max_members}
                  onChange={(e) => handleInputChange("max_members", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Active Status</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange("is_active", checked)}
                  />
                  <span className="text-sm text-muted-foreground">{formData.is_active ? "Active" : "Inactive"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Trial Plan Status</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    checked={formData.is_trial_plan}
                    onCheckedChange={(checked) => handleInputChange("is_trial_plan", checked)}
                  />
                  <span className="text-sm text-muted-foreground">{formData.is_trial_plan ? "Yes (Trial Active)" : "No"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <Label className="text-base font-semibold">Pricing Configuration</Label>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyPrice">Monthly Price (₹)</Label>
                  <Input
                    id="monthlyPrice"
                    type="number"
                    placeholder="49.99"
                    value={formData.monthlyPrice}
                    onChange={(e) => handleInputChange("monthlyPrice", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearlyPrice">Yearly Price (₹)</Label>
                  <Input
                    id="yearlyPrice"
                    type="number"
                    placeholder="499.99"
                    value={formData.yearlyPrice}
                    onChange={(e) => handleInputChange("yearlyPrice", e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Leave a price field empty to disable that billing interval.</p>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <Label className="text-base font-semibold">Features</Label>
              <div className="space-y-3">
                {availableFeatures.length === 0 && <p className="text-sm text-muted-foreground">No features definitions found. Create features first.</p>}
                {availableFeatures.map(feature => (
                  <div key={feature.id} className="flex items-center justify-between gap-4 p-2 rounded-lg border border-border/50 bg-secondary/10">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={!!selectedFeatures[feature.id]}
                        onCheckedChange={(checked) => setSelectedFeatures(prev => ({ ...prev, [feature.id]: checked }))}
                      />
                      <div>
                        <p className="text-sm font-medium">{feature.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] h-4 px-1">{feature.feature_type}</Badge>
                          {feature.description && <p className="text-xs text-muted-foreground">{feature.description}</p>}
                        </div>
                      </div>
                    </div>

                    {selectedFeatures[feature.id] && feature.feature_type === 'LIMIT' && (
                      <div className="w-24">
                        <Input
                          type="number"
                          placeholder="Limit"
                          className="h-8 text-sm"
                          value={featureValues[feature.id] || ""}
                          onChange={(e) => setFeatureValues(prev => ({ ...prev, [feature.id]: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button className="gradient-primary" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPlan ? "Update Plan" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
