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
import { InventoryVendor } from "@/types/inventory";
import { useGym } from "@/hooks/useGym";
import { usePermissions } from "@/contexts/PermissionsContext";

export function InventoryVendors() {
    const { toast } = useToast();
    const { gymId } = useGym();
    const { hasPermission } = usePermissions();
    const [vendors, setVendors] = useState<InventoryVendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Partial<InventoryVendor>>({ name: '', phone: '', email: '', address: '', gym_id: gymId || 0 });

    const fetchVendors = async () => {
        if (!gymId) return;
        setLoading(true);
        try {
            const data = await inventoryService.getVendors(gymId);
            setVendors(data);
        } catch (error: any) {
            console.error("Error fetching vendors:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to load vendors.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVendors();
    }, [gymId]);

    const handleSave = async () => {
        if (!editingVendor.name) {
            toast({ title: "Validation Error", description: "Vendor name is required", variant: "destructive" });
            return;
        }

        try {
            if (editingVendor.id) {
                await inventoryService.updateVendor(editingVendor.id, editingVendor);
                toast({ title: "Success", description: "Vendor updated successfully." });
            } else {
                await inventoryService.createVendor({ ...editingVendor, gym_id: gymId! });
                toast({ title: "Success", description: "Vendor created successfully." });
            }
            setDialogOpen(false);
            fetchVendors();
            setEditingVendor({ name: '', phone: '', email: '', address: '', gym_id: gymId! });
        } catch (error: any) {
            console.error("Error saving vendor:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to save vendor.",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure? Related items or purchase history might keep the reference as null.")) return;
        try {
            await inventoryService.deleteVendor(id);
            toast({ title: "Success", description: "Vendor deleted." });
            fetchVendors();
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message || "Failed to delete vendor.", variant: "destructive" });
        }
    };

    const openDialog = (vendor?: InventoryVendor) => {
        if (vendor) {
            setEditingVendor(vendor);
        } else {
            setEditingVendor({ name: '', phone: '', email: '', address: '', gym_id: gymId! });
        }
        setDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Vendors</h2>
                {hasPermission('add_inventory') && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gradient-primary shadow-glow" onClick={() => openDialog()}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Vendor
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>{editingVendor.id ? 'Edit Vendor' : 'Create Vendor'}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Vendor Name *</Label>
                                    <Input
                                        id="name"
                                        value={editingVendor.name}
                                        onChange={(e) => setEditingVendor({ ...editingVendor, name: e.target.value })}
                                        placeholder="e.g. Fitness Depot"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input
                                        id="phone"
                                        value={editingVendor.phone || ''}
                                        onChange={(e) => setEditingVendor({ ...editingVendor, phone: e.target.value })}
                                        placeholder="e.g. +1 234 567 8900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={editingVendor.email || ''}
                                        onChange={(e) => setEditingVendor({ ...editingVendor, email: e.target.value })}
                                        placeholder="e.g. contact@fitnessdepot.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Input
                                        id="address"
                                        value={editingVendor.address || ''}
                                        onChange={(e) => setEditingVendor({ ...editingVendor, address: e.target.value })}
                                        placeholder="e.g. 123 Main St"
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
                                <TableHead>Contact</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vendors.map((vendor) => (
                                <TableRow key={vendor.id}>
                                    <TableCell className="font-medium">{vendor.name}</TableCell>
                                    <TableCell>{vendor.phone || '-'}</TableCell>
                                    <TableCell>{vendor.email || '-'}</TableCell>
                                    <TableCell>{vendor.address || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        {hasPermission('edit_inventory') && (
                                            <Button variant="ghost" size="icon" onClick={() => openDialog(vendor)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {hasPermission('delete_inventory') && (
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(vendor.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {vendors.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground p-6">
                                        No vendors found. Create one above.
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
