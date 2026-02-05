import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { GymMembershipPayment } from "@/types/gym";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";

interface RecordPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    payment: GymMembershipPayment | null;
    onSuccess: () => void;
}

interface PaymentSplit {
    id: string; // Temp ID for UI list
    amount: string;
    mode: string;
    reference: string;
}

export function RecordPaymentDialog({ open, onOpenChange, payment, onSuccess }: RecordPaymentDialogProps) {
    const { gymId } = useGym();
    const [splits, setSplits] = useState<PaymentSplit[]>([
        { id: '1', amount: "", mode: "Cash", reference: "" }
    ]);
    const [loading, setLoading] = useState(false);

    if (!payment) return null;

    const addSplit = () => {
        setSplits([...splits, { id: Math.random().toString(), amount: "", mode: "Cash", reference: "" }]);
    };

    const removeSplit = (id: string) => {
        if (splits.length > 1) {
            setSplits(splits.filter(s => s.id !== id));
        }
    };

    const updateSplit = (id: string, field: keyof PaymentSplit, value: string) => {
        setSplits(splits.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const totalEntered = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

    const handleSave = async () => {
        if (!gymId) return;

        if (totalEntered <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        if (totalEntered > payment.due_amount) {
            toast.error(`Total amount cannot exceed due amount (₹${payment.due_amount})`);
            return;
        }

        // Validate individual splits
        for (const split of splits) {
            if (!split.amount || parseFloat(split.amount) <= 0) {
                toast.error("All payment splits must have a valid amount");
                return;
            }
        }

        setLoading(true);
        try {
            // 1. Create Transactions (Batch insert)
            const transactions = splits.map(split => ({
                membership_payment_id: payment.id,
                gym_id: gymId,
                payment_mode: split.mode,
                amount: parseFloat(split.amount),
                transaction_reference: split.reference || null,
                paid_at: new Date().toISOString()
            }));

            const { error: txnError } = await supabase
                .from('gym_payment_transactions')
                .insert(transactions);

            if (txnError) throw txnError;

            // 2. Update Membership Payment Record
            const newPaidAmount = (payment.paid_amount || 0) + totalEntered;
            const newDueAmount = (payment.due_amount || 0) - totalEntered;
            const newStatus = newDueAmount <= 0 ? 'paid' : 'partial';

            const { error: updateError } = await supabase
                .from('gym_membership_payments')
                .update({
                    paid_amount: newPaidAmount,
                    due_amount: newDueAmount,
                    payment_status: newStatus
                })
                .eq('id', payment.id);

            if (updateError) throw updateError;

            // 3. Update History Status
            const { error: historyError } = await supabase
                .from('gym_membership_history')
                .update({ payment_status: newStatus })
                .eq('id', payment.membership_history_id);

            if (historyError) throw historyError;

            toast.success("Payments recorded successfully");
            onSuccess();
            onOpenChange(false);
            setSplits([{ id: '1', amount: "", mode: "Cash", reference: "" }]); // Reset
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to record payments");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                        Recording payment for {payment.gym_members?.full_name}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg">
                        <div>
                            <Label className="text-muted-foreground">Due Amount</Label>
                            <p className="text-lg font-semibold text-destructive">₹{payment.due_amount}</p>
                        </div>
                        <div className="text-right">
                            <Label className="text-muted-foreground">Total Entered</Label>
                            <p className={`text-lg font-semibold ${totalEntered > payment.due_amount ? 'text-destructive' : 'text-success'}`}>
                                ₹{totalEntered}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {splits.map((split, index) => (
                            <div key={split.id} className="grid grid-cols-12 gap-2 items-end border-b pb-3 mb-2 last:border-0">
                                <div className="col-span-3">
                                    <Label className="text-xs mb-1 block">Amount</Label>
                                    <Input
                                        type="number"
                                        value={split.amount}
                                        onChange={(e) => updateSplit(split.id, 'amount', e.target.value)}
                                        placeholder="0.00"
                                        className="h-8"
                                    />
                                </div>
                                <div className="col-span-4">
                                    <Label className="text-xs mb-1 block">Mode</Label>
                                    <Select value={split.mode} onValueChange={(val) => updateSplit(split.id, 'mode', val)}>
                                        <SelectTrigger className="h-8">
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
                                    <Label className="text-xs mb-1 block">Reference (Opt)</Label>
                                    <Input
                                        value={split.reference}
                                        onChange={(e) => updateSplit(split.id, 'reference', e.target.value)}
                                        placeholder="Ref ID"
                                        className="h-8"
                                    />
                                </div>
                                <div className="col-span-1">
                                    {splits.length > 1 && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80" onClick={() => removeSplit(split.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button variant="outline" size="sm" onClick={addSplit} className="w-full border-dashed">
                        <Plus className="h-4 w-4 mr-2" /> Add Split Payment
                    </Button>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="gradient-primary"
                        disabled={loading || totalEntered <= 0 || totalEntered > payment.due_amount}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Payments"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
