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
import { InventoryMaintenance as IMaintenance, InventoryItem } from "@/types/inventory";
import { useGym } from "@/hooks/useGym";
import { usePermissions } from "@/contexts/PermissionsContext";

export function InventoryMaintenance() {
    const { toast } = useToast();
    const { gymId } = useGym();
    const { hasPermission } = usePermissions();
    const [maintenanceJobs, setMaintenanceJobs] = useState<any[]>([]);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);

    const [editingJob, setEditingJob] = useState<Partial<IMaintenance>>({
        status: 'pending',
        quantity: 1,
        gym_id: gymId || 0
    });

    const fetchData = async () => {
        if (!gymId) return;
        setLoading(true);
        try {
            const [jobsData, itemsData] = await Promise.all([
                inventoryService.getMaintenance(gymId),
                inventoryService.getItems(gymId)
            ]);
            setMaintenanceJobs(jobsData);
            setItems(itemsData);
        } catch (error: any) {
            console.error("Error fetching data:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to load maintenance records.",
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
        if (!editingJob.item_id) {
            toast({ title: "Validation Error", description: "Select an item.", variant: "destructive" });
            return;
        }

        try {
            if (editingJob.id) {
                const originalJob = maintenanceJobs.find(j => j.id === editingJob.id);
                const { gym_inventory_items, ...updateData } = editingJob as any;
                await inventoryService.updateMaintenance(editingJob.id, updateData);

                if (originalJob && originalJob.status === 'pending' && (editingJob.status === 'completed' || editingJob.status === 'cancelled')) {
                    await inventoryService.handleTransaction({
                        gym_id: gymId!,
                        item_id: editingJob.item_id!,
                        maintenance_id: editingJob.id,
                        transaction_type: 'replacement',
                        quantity: originalJob.quantity || 1,
                        notes: editingJob.status === 'completed' ? 'Returned from maintenance' : 'Maintenance cancelled, returned to stock',
                        total_cost: editingJob.status === 'completed' ? (editingJob.repair_cost || 0) : 0
                    });
                }

                toast({ title: "Success", description: "Maintenance record updated." });
            } else {
                const maintenanceRecord = await inventoryService.createMaintenance({
                    ...editingJob,
                    quantity: editingJob.quantity || 1,
                    gym_id: gymId!
                });

                await inventoryService.handleTransaction({
                    gym_id: gymId!,
                    item_id: editingJob.item_id!,
                    maintenance_id: maintenanceRecord.id,
                    transaction_type: 'repair',
                    quantity: editingJob.quantity || 1,
                    notes: 'Sent to maintenance: ' + (editingJob.issue_description || 'Unknown issue')
                });

                if (editingJob.status === 'completed' || editingJob.status === 'cancelled') {
                    await inventoryService.handleTransaction({
                        gym_id: gymId!,
                        item_id: editingJob.item_id!,
                        maintenance_id: maintenanceRecord.id,
                        transaction_type: 'replacement',
                        quantity: editingJob.quantity || 1,
                        notes: editingJob.status === 'completed' ? 'Returned from maintenance' : 'Maintenance cancelled, returned to stock',
                        total_cost: editingJob.status === 'completed' ? (editingJob.repair_cost || 0) : 0
                    });
                }

                toast({ title: "Success", description: "Maintenance record created." });
            }
            setDialogOpen(false);
            fetchData();
            setEditingJob({ status: 'pending', quantity: 1, gym_id: gymId! });
        } catch (error: any) {
            console.error("Error saving record:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to save record.",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this maintenance record?")) return;
        try {
            await inventoryService.deleteMaintenance(id);
            toast({ title: "Success", description: "Record deleted." });
            fetchData();
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message || "Failed to delete record.", variant: "destructive" });
        }
    };

    const openDialog = (job?: any) => {
        if (job) {
            setEditingJob(job);
        } else {
            setEditingJob({ status: 'pending', quantity: 1, gym_id: gymId! });
        }
        setDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Maintenance & Repairs</h2>
                {hasPermission('add_inventory') && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gradient-primary shadow-glow" onClick={() => openDialog()}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Ticket
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[450px]">
                            <DialogHeader>
                                <DialogTitle>{editingJob.id ? 'Edit Ticket' : 'Create Maintenance Ticket'}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-2">
                                <div className="space-y-2">
                                    <Label>Item</Label>
                                    <Select
                                        value={editingJob.item_id?.toString() || ''}
                                        onValueChange={(val) => setEditingJob({ ...editingJob, item_id: parseInt(val) })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select equipment..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {items.map(i => (
                                                <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Issue Description</Label>
                                        <Input
                                            value={editingJob.issue_description || ''}
                                            onChange={(e) => setEditingJob({ ...editingJob, issue_description: e.target.value })}
                                            placeholder="e.g. Broken belt, making noise"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Quantity</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={editingJob.quantity || ''}
                                            onChange={(e) => setEditingJob({ ...editingJob, quantity: parseInt(e.target.value) || 1 })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Status</Label>
                                        <Select
                                            value={editingJob.status || 'pending'}
                                            onValueChange={(val: any) => setEditingJob({ ...editingJob, status: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="completed">Completed</SelectItem>
                                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Repair Cost (₹)</Label>
                                        <Input
                                            type="number"
                                            value={editingJob.repair_cost || ''}
                                            onChange={(e) => setEditingJob({ ...editingJob, repair_cost: parseFloat(e.target.value) })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Repair Date</Label>
                                    <Input
                                        type="date"
                                        value={editingJob.repair_date ? editingJob.repair_date.split('T')[0] : ''}
                                        onChange={(e) => setEditingJob({ ...editingJob, repair_date: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Repaired By</Label>
                                    <Input
                                        value={editingJob.repaired_by || ''}
                                        onChange={(e) => setEditingJob({ ...editingJob, repaired_by: e.target.value })}
                                        placeholder="Technician name or company"
                                    />
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
                                <TableHead>Date Logged</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Issue</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Cost</TableHead>
                                <TableHead>Technician</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {maintenanceJobs.map((job: any) => (
                                <TableRow key={job.id}>
                                    <TableCell className="whitespace-nowrap">
                                        {new Date(job.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {job.gym_inventory_items?.name || `Item #${job.item_id}`}
                                    </TableCell>
                                    <TableCell>
                                        {job.quantity || 1}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={job.issue_description}>
                                        {job.issue_description || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`capitalize ${job.status === 'completed' ? 'bg-green-100 text-green-800' : job.status === 'pending' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100'}`}>
                                            {job.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {job.repair_cost ? `₹${Number(job.repair_cost).toFixed(2)}` : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {job.repaired_by || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-1">
                                            {hasPermission('edit_inventory') && (
                                                <Button variant="ghost" size="icon" onClick={() => openDialog(job)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {hasPermission('delete_inventory') && (
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(job.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {maintenanceJobs.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground p-6">
                                        No maintenance records found.
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
