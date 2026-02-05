import { useState, useEffect } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { GymMembershipPayment, GymPaymentTransaction } from "@/types/gym";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface EditPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    payment: GymMembershipPayment | null;
    onSuccess: () => void;
}

export function EditPaymentDialog({ open, onOpenChange, payment, onSuccess }: EditPaymentDialogProps) {
    const [loading, setLoading] = useState(false);
    const [totalAmount, setTotalAmount] = useState("");
    const [transactions, setTransactions] = useState<GymPaymentTransaction[]>([]);
    const [deletedTransactionIds, setDeletedTransactionIds] = useState<number[]>([]);

    useEffect(() => {
        if (open && payment) {
            setTotalAmount(payment.total_amount.toString());
            setDeletedTransactionIds([]);
            fetchTransactions();
        }
    }, [open, payment]);

    const fetchTransactions = async () => {
        if (!payment) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('gym_payment_transactions')
                .select('*')
                .eq('membership_payment_id', payment.id)
                .order('paid_at', { ascending: true });

            if (error) throw error;
            setTransactions(data || []);
        } catch (error) {
            console.error("Error fetching transactions:", error);
            toast.error("Failed to load transactions");
        } finally {
            setLoading(false);
        }
    };

    const updateTransaction = (id: number, field: keyof GymPaymentTransaction, value: any) => {
        setTransactions(transactions.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const deleteTransaction = (id: number) => {
        setTransactions(transactions.filter(t => t.id !== id));
        setDeletedTransactionIds([...deletedTransactionIds, id]);
    };

    // Calculations
    const currentPaidAmount = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const currentTotalAmount = parseFloat(totalAmount) || 0;
    const currentDueAmount = Math.max(0, currentTotalAmount - currentPaidAmount);
    // Determine status automatically based on the math
    const derivedStatus = currentDueAmount <= 0 ? 'paid' : (currentPaidAmount > 0 ? 'partial' : 'unpaid');

    const handleSave = async () => {
        if (!payment) return;

        const newTotal = parseFloat(totalAmount);
        if (isNaN(newTotal) || newTotal < 0) {
            toast.error("Invalid total amount");
            return;
        }

        setLoading(true);
        try {
            // 1. Delete removed transactions
            if (deletedTransactionIds.length > 0) {
                const { error: deleteError } = await supabase
                    .from('gym_payment_transactions')
                    .delete()
                    .in('id', deletedTransactionIds);
                if (deleteError) throw deleteError;
            }

            // 2. Update modified transactions
            for (const txn of transactions) {
                const { error: updateError } = await supabase
                    .from('gym_payment_transactions')
                    .update({
                        amount: txn.amount,
                        payment_mode: txn.payment_mode,
                        transaction_reference: txn.transaction_reference
                    })
                    .eq('id', txn.id);

                if (updateError) throw updateError;
            }

            // 3. Update Parent Payment Record
            const { error: parentError } = await supabase
                .from('gym_membership_payments')
                .update({
                    total_amount: newTotal,
                    paid_amount: currentPaidAmount,
                    due_amount: currentDueAmount,
                    payment_status: derivedStatus
                })
                .eq('id', payment.id);

            if (parentError) throw parentError;

            // 4. Update History Status
            const { error: historyError } = await supabase
                .from('gym_membership_history')
                .update({ payment_status: derivedStatus })
                .eq('id', payment.membership_history_id);

            if (historyError) throw historyError;

            toast.success("Payment record and transactions updated");
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to update payment");
        } finally {
            setLoading(false);
        }
    };

    if (!payment) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Edit Payment Record</DialogTitle>
                    <DialogDescription>
                        Modify invoice details and transactions for {payment.gym_members?.full_name}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    {/* Invoice Details Section */}
                    <div className="space-y-4 border-b pb-4">
                        <Label className="text-base font-semibold">Invoice Details</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Total Expected Amount</Label>
                                <Input
                                    type="number"
                                    value={totalAmount}
                                    onChange={(e) => setTotalAmount(e.target.value)}
                                />
                            </div>
                            <div className="bg-muted p-2 rounded text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span>Paid:</span>
                                    <span className="font-semibold text-success">₹{currentPaidAmount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Due:</span>
                                    <span className="font-bold text-destructive">₹{currentDueAmount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Status:</span>
                                    <span className="capitalize badge bg-secondary text-secondary-foreground px-1 rounded">{derivedStatus}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transactions Section */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Transactions</Label>
                        <div className="border rounded-md max-h-[300px] overflow-y-auto p-2 space-y-2 bg-muted/10">
                            {transactions.length === 0 ? (
                                <div className="text-center text-muted-foreground text-sm py-4">
                                    No transactions recorded yet.
                                </div>
                            ) : (
                                transactions.map((txn) => (
                                    <div key={txn.id} className="grid grid-cols-12 gap-2 items-center bg-card p-2 rounded border">
                                        <div className="col-span-3">
                                            <Label className="text-[10px] text-muted-foreground">Amount</Label>
                                            <Input
                                                type="number"
                                                className="h-7 text-sm"
                                                value={txn.amount}
                                                onChange={(e) => updateTransaction(txn.id, 'amount', parseFloat(e.target.value))}
                                            />
                                        </div>
                                        <div className="col-span-4">
                                            <Label className="text-[10px] text-muted-foreground">Mode</Label>
                                            <Select
                                                value={txn.payment_mode}
                                                onValueChange={(val: any) => updateTransaction(txn.id, 'payment_mode', val)}
                                            >
                                                <SelectTrigger className="h-7 text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Cash">Cash</SelectItem>
                                                    <SelectItem value="Online">Online</SelectItem>
                                                    <SelectItem value="Card">Card</SelectItem>
                                                    <SelectItem value="Cheque">Cheque</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-4">
                                            <Label className="text-[10px] text-muted-foreground">Reference</Label>
                                            <Input
                                                className="h-7 text-sm"
                                                value={txn.transaction_reference || ''}
                                                placeholder="Ref #"
                                                onChange={(e) => updateTransaction(txn.id, 'transaction_reference', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-1 pt-4 text-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                                onClick={() => deleteTransaction(txn.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            * Use "Record Pay" on the main list to add new split payments.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="gradient-primary">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
