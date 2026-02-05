import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { GymMembershipPayment, GymPaymentTransaction } from "@/types/gym";

interface ViewPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    payment: GymMembershipPayment | null;
}

export function ViewPaymentDialog({ open, onOpenChange, payment }: ViewPaymentDialogProps) {
    const [transactions, setTransactions] = useState<GymPaymentTransaction[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && payment) {
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
                .order('paid_at', { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!payment) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Payment Details</DialogTitle>
                    <DialogDescription>
                        History for {payment.gym_members?.full_name} - {payment.gym_membership_history?.gym_membership_plans?.name}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-4 py-4">
                    <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Total Cost</p>
                        <p className="text-xl font-bold">₹{payment.total_amount}</p>
                    </div>
                    <div className="bg-success/10 p-3 rounded-lg border border-success/20">
                        <p className="text-xs text-success uppercase font-semibold">Paid Amount</p>
                        <p className="text-xl font-bold text-success">₹{payment.paid_amount}</p>
                    </div>
                    <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                        <p className="text-xs text-destructive uppercase font-semibold">Due Amount</p>
                        <p className="text-xl font-bold text-destructive">₹{payment.due_amount}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Transaction History</h3>
                    <div className="border rounded-md max-h-[250px] overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Mode</TableHead>
                                    <TableHead>Ref</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : transactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                            No transactions found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    transactions.map((txn) => (
                                        <TableRow key={txn.id}>
                                            <TableCell className="font-medium text-xs">
                                                {format(new Date(txn.paid_at), 'MMM dd, yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs">{txn.payment_mode}</Badge>
                                            </TableCell>
                                            <TableCell className="text-xs font-mono text-muted-foreground">
                                                {txn.transaction_reference || '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                ₹{txn.amount}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
