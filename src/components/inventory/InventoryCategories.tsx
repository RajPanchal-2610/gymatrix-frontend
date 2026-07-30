import { useState, useEffect } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { inventoryService } from "@/services/inventoryService";
import { InventoryCategory } from "@/types/inventory";
import { useGym } from "@/hooks/useGym";
import { usePermissions } from "@/contexts/PermissionsContext";

export function InventoryCategories() {
    const { toast } = useToast();
    const { gymId } = useGym();
    const { hasPermission } = usePermissions();
    const [categories, setCategories] = useState<InventoryCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Partial<InventoryCategory>>({ name: '', description: '', gym_id: gymId || 0 });

    const fetchCategories = async () => {
        if (!gymId) return;
        setLoading(true);
        try {
            const data = await inventoryService.getCategories(gymId);
            setCategories(data);
        } catch (error: any) {
            console.error("Error fetching categories:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to load categories.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, [gymId]);

    const handleSave = async () => {
        if (!editingCategory.name) {
            toast({ title: "Validation Error", description: "Category name is required", variant: "destructive" });
            return;
        }

        try {
            if (editingCategory.id) {
                await inventoryService.updateCategory(editingCategory.id, editingCategory);
                toast({ title: "Success", description: "Category updated successfully." });
            } else {
                await inventoryService.createCategory({ ...editingCategory, gym_id: gymId! });
                toast({ title: "Success", description: "Category created successfully." });
            }
            setDialogOpen(false);
            fetchCategories();
            setEditingCategory({ name: '', description: '', gym_id: gymId! });
        } catch (error: any) {
            console.error("Error saving category:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to save category.",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure? Items in this category might lose their category reference.")) return;
        try {
            await inventoryService.deleteCategory(id);
            toast({ title: "Success", description: "Category deleted." });
            fetchCategories();
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message || "Failed to delete category.", variant: "destructive" });
        }
    };

    const openDialog = (category?: InventoryCategory) => {
        if (category) {
            setEditingCategory(category);
        } else {
            setEditingCategory({ name: '', description: '', gym_id: gymId! });
        }
        setDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Categories</h2>
                {hasPermission('add_inventory') && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gradient-primary shadow-glow" onClick={() => openDialog()}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Category
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>{editingCategory.id ? 'Edit Category' : 'Create Category'}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Category Name</Label>
                                    <Input
                                        id="name"
                                        value={editingCategory.name}
                                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                        placeholder="e.g. Cardio Equipment"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description (Optional)</Label>
                                    <Input
                                        id="description"
                                        value={editingCategory.description || ''}
                                        onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                                        placeholder="e.g. Treadmills, ellipticals"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleSave}>Save</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map((category) => (
                                <TableRow key={category.id}>
                                    <TableCell className="font-medium">{category.name}</TableCell>
                                    <TableCell>{category.description || '-'}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-1">
                                            {hasPermission('edit_inventory') && (
                                                <Button variant="ghost" size="icon" onClick={() => openDialog(category)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {hasPermission('delete_inventory') && (
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(category.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {categories.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground p-6">
                                        No categories found. Create one above.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
