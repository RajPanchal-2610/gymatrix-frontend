
import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Loader2, List, Type, Key } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface Feature {
    id: number;
    key: string;
    name: string;
    description: string | null;
    feature_type: 'MODULE' | 'LIMIT' | 'ACTION';
    created_at: string;
}

export default function Features() {
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog States
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingFeature, setEditingFeature] = useState<Feature | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        key: "",
        name: "",
        description: "",
        feature_type: "MODULE" as 'MODULE' | 'LIMIT' | 'ACTION',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch Features
    const fetchFeatures = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('features')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;
            setFeatures(data || []);
        } catch (error: any) {
            console.error("Error fetching features:", error);
            toast.error("Failed to load features");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeatures();
    }, []);

    // Handle Form Change
    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Auto-generate key from name if creating new and key is empty
        if (field === 'name' && !editingFeature && (!formData.key || formData.key.trim() === '')) {
            const suggestedKey = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
            setFormData(prev => ({ ...prev, key: suggestedKey }));
        }
    };

    // Open Create Dialog
    const openCreateDialog = () => {
        setEditingFeature(null);
        setFormData({
            key: "",
            name: "",
            description: "",
            feature_type: "MODULE",
        });
        setIsDialogOpen(true);
    };

    // Open Edit Dialog
    const openEditDialog = (feature: Feature) => {
        setEditingFeature(feature);
        setFormData({
            key: feature.key,
            name: feature.name,
            description: feature.description || "",
            feature_type: feature.feature_type,
        });
        setIsDialogOpen(true);
    };

    // Submit Form
    const handleSubmit = async () => {
        if (!formData.key || !formData.name || !formData.feature_type) {
            toast.error("Key, Name, and Feature Type are required");
            return;
        }

        try {
            setIsSubmitting(true);

            const payload = {
                key: formData.key,
                name: formData.name,
                description: formData.description,
                feature_type: formData.feature_type,
            };

            if (editingFeature) {
                // Update
                const { error } = await supabase
                    .from('features')
                    .update(payload)
                    .eq('id', editingFeature.id);
                if (error) throw error;
                toast.success("Feature updated successfully");
            } else {
                // Create
                const { error } = await supabase
                    .from('features')
                    .insert(payload);
                if (error) throw error;
                toast.success("Feature created successfully");
            }

            setIsDialogOpen(false);
            fetchFeatures();

        } catch (error: any) {
            console.error("Error saving feature:", error);
            toast.error(error.message || "Failed to save feature");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete Feature
    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this feature? This might affect existing plans.")) return;

        try {
            const { error } = await supabase.from('features').delete().eq('id', id);
            if (error) throw error;

            toast.success("Feature deleted successfully");
            setFeatures(features.filter(f => f.id !== id));
        } catch (error: any) {
            console.error("Error deleting feature:", error);
            toast.error("Failed to delete feature");
        }
    };

    return (
        <DashboardLayout title="Platform Features">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <p className="text-muted-foreground">
                        Manage available features for the gym management system.
                    </p>
                </div>
                <Button onClick={openCreateDialog} className="gradient-primary shadow-glow">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Feature
                </Button>
            </div>

            <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : features.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                            <List className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-lg font-medium">No features found</h3>
                        <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                            Start by adding features that can be assigned to membership plans.
                        </p>
                        <Button onClick={openCreateDialog} variant="outline">Add Feature</Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Available Name</TableHead>
                                <TableHead>Key</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {features.map((feature) => (
                                <TableRow key={feature.id} className="group">
                                    <TableCell className="font-medium">
                                        {feature.name}
                                    </TableCell>
                                    <TableCell>
                                        <code className="bg-secondary px-2 py-1 rounded text-xs font-mono text-secondary-foreground">
                                            {feature.key}
                                        </code>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            feature.feature_type === 'MODULE' ? 'default' :
                                                feature.feature_type === 'LIMIT' ? 'secondary' : 'outline'
                                        }>
                                            {feature.feature_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-md truncate text-muted-foreground">
                                        {feature.description || "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => openEditDialog(feature)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(feature.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingFeature ? "Edit Feature" : "Add New Feature"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Feature Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g., Inventory Management"
                                value={formData.name}
                                onChange={(e) => handleInputChange("name", e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="key">
                                Feature Key <span className="text-xs font-normal text-muted-foreground">(Unique identifier)</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="key"
                                    className="pl-9 font-mono text-sm"
                                    placeholder="inventory_management"
                                    value={formData.key}
                                    onChange={(e) => handleInputChange("key", e.target.value)}
                                />
                                <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type">Feature Type</Label>
                            <Select
                                value={formData.feature_type}
                                onValueChange={(value) => handleInputChange("feature_type", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MODULE">Module (Enable/Disable)</SelectItem>
                                    <SelectItem value="LIMIT">Limit (Numeric Count)</SelectItem>
                                    <SelectItem value="ACTION">Action (Permission)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe what this feature enables..."
                                value={formData.description}
                                onChange={(e) => handleInputChange("description", e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button className="gradient-primary" onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingFeature ? "Update Feature" : "Add Feature"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
