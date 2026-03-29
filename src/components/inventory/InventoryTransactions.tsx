import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { InventoryTransaction, InventoryItem, InventoryVendor } from "@/types/inventory";
import { useGym } from "@/hooks/useGym";
import { usePermissions } from "@/contexts/PermissionsContext";

export function InventoryTransactions() {
    const { toast } = useToast();
    const { gymId } = useGym();
    const { hasPermission } = usePermissions();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [vendors, setVendors] = useState<InventoryVendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);

    // For maintenance record when transaction_type is 'repair'
    const [maintenanceIssue, setMaintenanceIssue] = useState('');
    const [repairedBy, setRepairedBy] = useState('');
    const [newTransaction, setNewTransaction] = useState<Partial<InventoryTransaction>>({
        transaction_type: 'purchase',
        quantity: 1,
        gym_id: gymId || 0
    });
    // For purchase specifically
    const [vendorId, setVendorId] = useState<number | ''>('');
    // For adjustment specifically
    const [adjustmentType, setAdjustmentType] = useState<'add' | 'reduce'>('add');

    const fetchData = async () => {
        if (!gymId) return;
        setLoading(true);
        try {
            const [trxData, itemsData, vendorsData] = await Promise.all([
                inventoryService.getTransactions(gymId),
                inventoryService.getItems(gymId),
                inventoryService.getVendors(gymId)
            ]);
            setTransactions(trxData);
            setItems(itemsData);
            setVendors(vendorsData);
        } catch (error: any) {
            console.error("Error fetching data:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to load transactions.",
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
        if (!newTransaction.item_id) {
            toast({ title: "Validation Error", description: "Select an item.", variant: "destructive" });
            return;
        }
        if (newTransaction.transaction_type === 'repair' && !maintenanceIssue.trim()) {
            toast({ title: "Validation Error", description: "Please enter the issue description for the repair.", variant: "destructive" });
            return;
        }
        if (!newTransaction.quantity || newTransaction.quantity <= 0) {
            toast({ title: "Validation Error", description: "Quantity must be greater than 0.", variant: "destructive" });
            return;
        }

        try {
            let purchase_id = undefined;

            const computedTotalCost = newTransaction.unit_cost && newTransaction.quantity
                ? newTransaction.unit_cost * newTransaction.quantity
                : (newTransaction.total_cost || 0);

            let finalQuantity = newTransaction.quantity;
            if (newTransaction.transaction_type === 'adjustment' && adjustmentType === 'reduce') {
                finalQuantity = -finalQuantity;
            }

            // If it's a purchase and they filled out cost/vendor, optionally create a purchase record
            if (newTransaction.transaction_type === 'purchase' && vendorId) {
                const purchase = await inventoryService.createPurchase({
                    gym_id: gymId!,
                    vendor_id: vendorId as number,
                    total_amount: computedTotalCost,
                    purchase_date: new Date().toISOString()
                });
                purchase_id = purchase.id;
            }

            let maintenance_id = undefined;

            if (newTransaction.transaction_type === 'repair') {
                const maintenanceRecord = await inventoryService.createMaintenance({
                    gym_id: gymId!,
                    item_id: newTransaction.item_id,
                    quantity: finalQuantity, // send quantity to maintenance
                    issue_description: maintenanceIssue,
                    repaired_by: repairedBy || undefined,
                    status: 'pending'
                });
                maintenance_id = maintenanceRecord.id;
            }

            await inventoryService.handleTransaction({
                ...newTransaction,
                quantity: finalQuantity,
                gym_id: gymId!,
                purchase_id: purchase_id,
                maintenance_id: maintenance_id,
                total_cost: computedTotalCost
            });

            toast({ title: "Success", description: "Transaction logged successfully." });
            setDialogOpen(false);
            fetchData();
            // Reset
            setNewTransaction({ transaction_type: 'purchase', quantity: 1, gym_id: gymId! });
            setVendorId('');
            setMaintenanceIssue('');
            setRepairedBy('');
            setAdjustmentType('add');
        } catch (error: any) {
            console.error("Error saving transaction:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to log transaction.",
                variant: "destructive",
            });
        }
    };

    const getTransactionColor = (type: string) => {
        switch (type) {
            case 'purchase': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'opening_stock': return 'bg-teal-100 text-teal-800 border-teal-200';
            case 'repair': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'replacement': return 'bg-green-100 text-green-800 border-green-200';
            case 'adjustment': return 'bg-purple-100 text-purple-800 border-purple-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Stock Transactions</h2>
                {hasPermission('add_inventory') && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gradient-primary shadow-glow">
                                <Plus className="h-4 w-4 mr-2" />
                                Log Transaction
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[450px]">
                            <DialogHeader>
                                <DialogTitle>Log Stock Movement</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-2">
                                <div className="space-y-2">
                                    <Label>Transaction Type</Label>
                                    <Select
                                        value={newTransaction.transaction_type}
                                        onValueChange={(val: any) => setNewTransaction({ ...newTransaction, transaction_type: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="purchase">Purchase (Add Stock)</SelectItem>
                                            <SelectItem value="repair">Send to Repair</SelectItem>
                                            <SelectItem value="adjustment">Stock Adjustment</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Item</Label>
                                    <Select
                                        value={newTransaction.item_id?.toString() || ''}
                                        onValueChange={(val) => setNewTransaction({ ...newTransaction, item_id: parseInt(val) })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select item" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {items.map(i => (
                                                <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {newTransaction.transaction_type === 'adjustment' && (
                                    <div className="space-y-2">
                                        <Label>Adjustment Type</Label>
                                        <Select
                                            value={adjustmentType}
                                            onValueChange={(val: any) => setAdjustmentType(val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="add">Add Stock (+)</SelectItem>
                                                <SelectItem value="reduce">Reduce Stock (-)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Quantity</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={newTransaction.quantity || ''}
                                            onChange={(e) => setNewTransaction({ ...newTransaction, quantity: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    {newTransaction.transaction_type === 'purchase' && (
                                        <div className="space-y-2">
                                            <Label>Unit Cost (₹)</Label>
                                            <Input
                                                type="number"
                                                value={newTransaction.unit_cost || ''}
                                                onChange={(e) => setNewTransaction({ ...newTransaction, unit_cost: parseFloat(e.target.value) })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    )}
                                </div>

                                {newTransaction.transaction_type === 'purchase' && (
                                    <div className="space-y-2">
                                        <Label>Vendor</Label>
                                        <Select
                                            value={vendorId.toString() || ''}
                                            onValueChange={(val) => setVendorId(parseInt(val))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select vendor" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No specific vendor</SelectItem>
                                                {vendors.map(v => (
                                                    <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {newTransaction.transaction_type === 'repair' && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Issue Description *</Label>
                                            <Input
                                                value={maintenanceIssue}
                                                onChange={(e) => setMaintenanceIssue(e.target.value)}
                                                placeholder="What is wrong with the item?"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Repair Vendor / Sent To</Label>
                                            <Input
                                                value={repairedBy}
                                                onChange={(e) => setRepairedBy(e.target.value)}
                                                placeholder="Where is the item being repaired?"
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="space-y-2">
                                    <Label>Notes</Label>
                                    <Input
                                        value={newTransaction.notes || ''}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
                                        placeholder="Optional remarks"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleSave}>Submit</Button>
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
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead>Cost</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map((trx: any) => (
                                <TableRow key={trx.id}>
                                    <TableCell className="whitespace-nowrap">
                                        {new Date(trx.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`capitalize ${getTransactionColor(trx.transaction_type)}`}>
                                            {trx.transaction_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {trx.gym_inventory_items?.name || `Item #${trx.item_id}`}
                                    </TableCell>
                                    <TableCell className="font-semibold">
                                        {trx.quantity > 0 && ['purchase', 'opening_stock', 'adjustment', 'replacement'].includes(trx.transaction_type) ? '+' : ''}{trx.quantity}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground w-[300px]">
                                        <div className="truncate" title={trx.notes}>
                                            {trx.notes || '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {trx.total_cost ? `₹${Number(trx.total_cost).toFixed(2)}` : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {transactions.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground p-6">
                                        No transactions found. Log one above.
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
