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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { inventoryService } from "@/services/inventoryService";
import { InventoryItem, InventoryCategory } from "@/types/inventory";
import { useGym } from "@/hooks/useGym";
import { usePermissions } from "@/contexts/PermissionsContext";

import { ItemFlowchartDialog } from "./ItemFlowchartDialog";

export function InventoryItems() {
    const { toast } = useToast();
    const { gymId } = useGym();
    const { hasPermission } = usePermissions();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [categories, setCategories] = useState<InventoryCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<InventoryItem> & { opening_stock?: number }>({
        name: '', brand: '', model: '', condition: 'working', status: 'active', gym_id: gymId || 0, opening_stock: 0
    });

    // For flowchart
    const [flowchartOpen, setFlowchartOpen] = useState(false);
    const [flowchartItem, setFlowchartItem] = useState<any>(null);

    const fetchData = async () => {
        if (!gymId) return;
        setLoading(true);
        try {
            const [itemsData, categoriesData] = await Promise.all([
                inventoryService.getItems(gymId),
                inventoryService.getCategories(gymId)
            ]);
            setItems(itemsData);
            setCategories(categoriesData);
        } catch (error: any) {
            console.error("Error fetching data:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to load items.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [gymId]);

    const handleSave = async () => {
        if (!editingItem.name) {
            toast({ title: "Validation Error", description: "Item name is required", variant: "destructive" });
            return;
        }

        try {
            if (editingItem.id) {
                const { opening_stock, ...updateData } = editingItem;
                await inventoryService.updateItem(editingItem.id, updateData);
                toast({ title: "Success", description: "Item updated successfully." });
            } else {
                const { opening_stock, ...createData } = editingItem;
                const createdItem = await inventoryService.createItem({
                    ...createData,
                    gym_id: gymId!
                });

                if (opening_stock && opening_stock > 0) {
                    await inventoryService.handleTransaction({
                        gym_id: gymId!,
                        item_id: createdItem.id,
                        transaction_type: 'opening_stock',
                        quantity: opening_stock,
                        notes: 'Initial opening stock',
                        total_cost: editingItem.purchase_price ? editingItem.purchase_price * opening_stock : 0
                    });
                }

                toast({ title: "Success", description: "Item created successfully." });
            }
            setDialogOpen(false);
            fetchData();
            setEditingItem({ name: '', brand: '', model: '', condition: 'working', status: 'active', gym_id: gymId!, opening_stock: 0 });
        } catch (error: any) {
            console.error("Error saving item:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to save item.",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure? Deleting this item will also delete all its associated stock history!")) return;
        try {
            await inventoryService.deleteItem(id);
            toast({ title: "Success", description: "Item deleted." });
            fetchData();
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message || "Failed to delete item.", variant: "destructive" });
        }
    };

    const openDialog = (item?: InventoryItem) => {
        if (item) {
            setEditingItem({ ...item, opening_stock: 0 });
        } else {
            setEditingItem({ name: '', brand: '', model: '', condition: 'working', status: 'active', gym_id: gymId!, opening_stock: 0 });
        }
        setDialogOpen(true);
    };

    const openFlowchart = (item: any) => {
        setFlowchartItem(item);
        setFlowchartOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Inventory Items Catalog</h2>
                {hasPermission('add_inventory') && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gradient-primary shadow-glow" onClick={() => openDialog()}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>{editingItem.id ? 'Edit Item' : 'Create Item'}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Item Name *</Label>
                                    <Input
                                        id="name"
                                        value={editingItem.name}
                                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                        placeholder="e.g. Treadmill Pro X"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select
                                        value={editingItem.category_id?.toString() || ''}
                                        onValueChange={(val) => setEditingItem({ ...editingItem, category_id: parseInt(val) })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(c => (
                                                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="brand">Brand</Label>
                                        <Input
                                            id="brand"
                                            value={editingItem.brand || ''}
                                            onChange={(e) => setEditingItem({ ...editingItem, brand: e.target.value })}
                                            placeholder="e.g. LifeFitness"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="model">Model</Label>
                                        <Input
                                            id="model"
                                            value={editingItem.model || ''}
                                            onChange={(e) => setEditingItem({ ...editingItem, model: e.target.value })}
                                            placeholder="e.g. T-9000"
                                        />
                                    </div>
                                </div>
                                {!editingItem.id && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="price">Base Purchase Price (₹)</Label>
                                            <Input
                                                id="price"
                                                type="number"
                                                value={editingItem.purchase_price || ''}
                                                onChange={(e) => setEditingItem({ ...editingItem, purchase_price: parseFloat(e.target.value) })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="opening_stock">Opening Stock</Label>
                                            <Input
                                                id="opening_stock"
                                                type="number"
                                                value={editingItem.opening_stock || ''}
                                                onChange={(e) => setEditingItem({ ...editingItem, opening_stock: parseInt(e.target.value) || 0 })}
                                                placeholder="0"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="status">Status</Label>
                                        <Select
                                            value={editingItem.status || 'active'}
                                            onValueChange={(val) => setEditingItem({ ...editingItem, status: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                                <SelectItem value="archived">Archived</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="condition">Condition</Label>
                                        <Select
                                            value={editingItem.condition || 'working'}
                                            onValueChange={(val) => setEditingItem({ ...editingItem, condition: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="new">New</SelectItem>
                                                <SelectItem value="working">Working</SelectItem>
                                                <SelectItem value="fair">Fair</SelectItem>
                                                <SelectItem value="poor">Poor</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
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
                                <TableHead>Item Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Brand / Model</TableHead>
                                <TableHead className="text-center">Total Stock</TableHead>
                                <TableHead className="text-center">Available Stock</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item: any) => (
                                <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openFlowchart(item)}>
                                    <TableCell className="font-medium text-primary underline-offset-4 hover:underline">{item.name}</TableCell>
                                    <TableCell>{item.gym_inventory_categories?.name || '-'}</TableCell>
                                    <TableCell>
                                        {item.brand && item.model ? `${item.brand} ${item.model}` : item.brand || item.model || '-'}
                                    </TableCell>
                                    <TableCell className="text-center font-semibold">
                                        {item.gym_inventory_stock?.total_quantity || 0}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={item.gym_inventory_stock?.available_quantity > 0 ? "default" : "secondary"} className={item.gym_inventory_stock?.available_quantity > 0 ? 'bg-green-500 hover:bg-green-600 font-medium' : ''}>
                                            {item.gym_inventory_stock?.available_quantity || 0}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                            {item.status} ({item.condition})
                                        </Badge>
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1">
                                            {hasPermission('edit_inventory') && (
                                                <Button variant="ghost" size="icon" onClick={() => openDialog(item)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {hasPermission('delete_inventory') && (
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {items.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground p-6">
                                        No items found. Create one above.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <ItemFlowchartDialog
                open={flowchartOpen}
                onOpenChange={setFlowchartOpen}
                item={flowchartItem}
            />
        </div>
    );
}
