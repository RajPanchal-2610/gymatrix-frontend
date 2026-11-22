import { useState, useEffect } from "react";
import {
    Search,
    Filter,
    IndianRupee,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Clock,
    PlusCircle,
    Eye,
    Edit,
    Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/StatCard";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useGym } from "@/hooks/useGym";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { usePermissions } from "@/contexts/PermissionsContext";
import { GymMembershipPayment } from "@/types/gym";
import { RecordPaymentDialog } from "@/components/payments/RecordPaymentDialog";
import { ViewPaymentDialog } from "@/components/payments/ViewPaymentDialog";
import { EditPaymentDialog } from "@/components/payments/EditPaymentDialog";

export default function GymPayments() {
    const { gymId, loading: gymLoading } = useGym();
    const { hasPermission, role, permissions } = usePermissions();
    const [payments, setPayments] = useState<GymMembershipPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState<"all" | "plan" | "pt">("all");

    // Dialog State
    const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
    const [viewPaymentOpen, setViewPaymentOpen] = useState(false);
    const [editPaymentOpen, setEditPaymentOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<GymMembershipPayment | null>(null);

    const fetchPayments = async () => {
        if (!gymId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('gym_membership_payments')
                .select(`
                    *,
                    gym_members (
                        full_name,
                        phone,
                        image_url,
                        assigned_staff_id,
                        is_active,
                        status
                    ),
                    gym_membership_history (
                        plan_id,
                        gym_membership_plans (
                            name
                        )
                    ),
                    gym_payment_transactions (
                        id,
                        payment_mode,
                        amount,
                        transaction_reference,
                        paid_at
                    )
                `)
                .eq('gym_id', gymId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setPayments(data as unknown as GymMembershipPayment[]);
        } catch (error) {
            console.error("Error fetching payments:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, [gymId]);

    // Derived State
    const isOwnerOrSuperAdmin = role?.isOwner || permissions?.includes('*');

    const visiblePayments = payments.filter(payment => {
        if (payment.remarks === 'Personal Training Fee') {
            return !!((payment.gym_members as any)?.assigned_staff_id?.toString() === role?.staff_id?.toString());
        }
        return true;
    });

    const typeFilteredPayments = visiblePayments.filter(payment => {
        if (typeFilter === 'plan') {
            return payment.remarks !== 'Personal Training Fee';
        }
        if (typeFilter === 'pt') {
            return payment.remarks === 'Personal Training Fee';
        }
        return true;
    });

    const filteredPayments = typeFilteredPayments.filter(p => {
        const matchesSearch = p.gym_members?.full_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || p.payment_status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalCollected = typeFilteredPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
    const totalDue = typeFilteredPayments.reduce((sum, p) => sum + (p.due_amount || 0), 0);
    const overdueCount = typeFilteredPayments.filter(p => p.payment_status === 'unpaid' || p.payment_status === 'partial').length;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "paid":
                return <Badge className="bg-success/10 text-success hover:bg-success/20"><CheckCircle className="h-3 w-3 mr-1" /> Paid</Badge>;
            case "partial":
                return <Badge className="bg-warning/10 text-warning hover:bg-warning/20"><Clock className="h-3 w-3 mr-1" /> Partial</Badge>;
            case "unpaid":
                return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20"><AlertCircle className="h-3 w-3 mr-1" /> Unpaid</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const handleDeletePayment = async (paymentId: number) => {
        if (!confirm("Are you sure you want to delete this payment record? This will not refund transactions.")) return;
        try {
            // 1. Get payment details to find history ID
            const { data: paymentData, error: fetchError } = await supabase
                .from('gym_membership_payments')
                .select('membership_history_id')
                .eq('id', paymentId)
                .single();

            if (fetchError) throw fetchError;

            // 2. Delete the payment
            const { error } = await supabase
                .from('gym_membership_payments')
                .delete()
                .eq('id', paymentId);

            if (error) throw error;

            // 3. Update History Status to 'unpaid' (since payment record is gone)
            if (paymentData?.membership_history_id) {
                const { error: historyError } = await supabase
                    .from('gym_membership_history')
                    .update({ payment_status: 'unpaid' })
                    .eq('id', paymentData.membership_history_id);

                if (historyError) console.error("Failed to update history status:", historyError);
            }
            toast.success("Payment record deleted");
            fetchPayments();
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to delete payment");
        }
    };

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <StatCard
                    title="Total Collected"
                    value={`₹${totalCollected.toLocaleString()}`}
                    change="Lifetime"
                    changeType="neutral"
                    icon={IndianRupee}
                    iconClassName="gradient-primary"
                />
                <StatCard
                    title="Total Due"
                    value={`₹${totalDue.toLocaleString()}`}
                    change="Pending collection"
                    changeType="negative"
                    icon={AlertCircle}
                    iconClassName="bg-destructive"
                />
                <StatCard
                    title="Pending Invoices"
                    value={overdueCount.toString()}
                    change="Unpaid/Partial"
                    changeType="neutral"
                    icon={Clock}
                    iconClassName="bg-warning"
                />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search members..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Payment Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Payments</SelectItem>
                        <SelectItem value="plan">Membership Plan</SelectItem>
                        <SelectItem value="pt">PT Fee Only</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Payment History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto scrollbar-none">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border text-left">
                                    <th className="px-4 py-3 text-sm font-medium text-muted-foreground whitespace-nowrap">Member</th>
                                    <th className="px-4 py-3 text-sm font-medium text-muted-foreground whitespace-nowrap">Plan</th>
                                    <th className="px-4 py-3 text-sm font-medium text-muted-foreground whitespace-nowrap">Total</th>
                                    <th className="px-4 py-3 text-sm font-medium text-muted-foreground whitespace-nowrap">Paid</th>
                                    <th className="px-4 py-3 text-sm font-medium text-muted-foreground whitespace-nowrap">Due</th>
                                    <th className="px-4 py-3 text-sm font-medium text-muted-foreground whitespace-nowrap">Status</th>
                                    <th className="px-4 py-3 text-sm font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-4">Loading...</td>
                                    </tr>
                                ) : filteredPayments.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-4 text-muted-foreground">No payments found</td>
                                    </tr>
                                ) : (
                                    filteredPayments.map((payment) => {
                                        const isMemberPaused = payment.gym_members?.is_active === false || payment.gym_members?.status === 'paused';
                                        const pendingTxn = payment.gym_payment_transactions?.find(
                                            t => t.transaction_reference
                                        );
                                        const latestUtr = pendingTxn?.transaction_reference;
                                        return (
                                            <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-4 py-3 font-medium whitespace-nowrap">
                                                    <div>
                                                        <span>{payment.gym_members?.full_name}</span>
                                                        {latestUtr && (
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                                                    UTR: {latestUtr}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                    {payment.gym_membership_history?.gym_membership_plans?.name || 'Unknown Plan'}
                                                </td>
                                                <td className="px-4 py-3 font-semibold whitespace-nowrap">₹{payment.total_amount}</td>
                                                <td className="px-4 py-3 text-success whitespace-nowrap">₹{payment.paid_amount}</td>
                                                <td className="px-4 py-3 text-destructive font-medium whitespace-nowrap">₹{payment.due_amount}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(payment.payment_status)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        {hasPermission('add_payments') && (payment.payment_status === 'unpaid' || payment.payment_status === 'partial') && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setSelectedPayment(payment);
                                                                    setRecordPaymentOpen(true);
                                                                }}
                                                                disabled={isMemberPaused}
                                                            >
                                                                <PlusCircle className="h-3 w-3 mr-2" />
                                                                Record Pay
                                                            </Button>
                                                        )}

                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                                                onClick={() => {
                                                                    setSelectedPayment(payment);
                                                                    setViewPaymentOpen(true);
                                                                }}
                                                                title="View Details"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>

                                                            {hasPermission('edit_payments') && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                                                    onClick={() => {
                                                                        setSelectedPayment(payment);
                                                                        setEditPaymentOpen(true);
                                                                    }}
                                                                    disabled={isMemberPaused}
                                                                    title={isMemberPaused ? "Cannot edit payment of paused member" : "Edit Record"}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            )}

                                                            {hasPermission('delete_payments') && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                    onClick={() => handleDeletePayment(payment.id)}
                                                                    disabled={isMemberPaused}
                                                                    title={isMemberPaused ? "Cannot delete payment of paused member" : "Delete"}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="block md:hidden p-3 space-y-3 bg-muted/20">
                        {loading ? (
                            <div className="p-6 text-center text-muted-foreground bg-card rounded-xl border border-border">Loading...</div>
                        ) : filteredPayments.length === 0 ? (
                            <div className="p-6 text-center text-muted-foreground bg-card rounded-xl border border-border">No payments found</div>
                        ) : (
                            filteredPayments.map((payment) => {
                                const isMemberPaused = payment.gym_members?.is_active === false || payment.gym_members?.status === 'paused';
                                const pendingTxn = payment.gym_payment_transactions?.find(
                                    t => t.transaction_reference
                                );
                                const latestUtr = pendingTxn?.transaction_reference;
                                const planName = payment.gym_membership_history?.gym_membership_plans?.name || 'Unknown Plan';

                                return (
                                    <div key={payment.id} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm hover:border-primary/30 transition-all">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <h4 className="font-semibold text-foreground text-sm truncate">
                                                    {payment.gym_members?.full_name}
                                                </h4>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {planName}
                                                </p>
                                            </div>
                                            <div className="shrink-0">
                                                {getStatusBadge(payment.payment_status)}
                                            </div>
                                        </div>

                                        {latestUtr && (
                                            <div className="flex items-center gap-1.5 bg-primary/5 p-2 rounded border border-primary/15 text-xs">
                                                <span className="font-medium text-muted-foreground">UTR:</span>
                                                <span className="font-mono font-semibold text-primary">{latestUtr}</span>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-lg bg-muted/40 text-xs text-center">
                                            <div>
                                                <span className="text-muted-foreground block text-[11px]">Total</span>
                                                <span className="font-semibold text-foreground">₹{payment.total_amount}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-[11px]">Paid</span>
                                                <span className="font-semibold text-success">₹{payment.paid_amount}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-[11px]">Due</span>
                                                <span className="font-semibold text-destructive">₹{payment.due_amount}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-1 border-t border-border/50">
                                            {/* Other Buttons on Left */}
                                            <div className="flex items-center gap-1.5">
                                                {hasPermission('add_payments') && (payment.payment_status === 'unpaid' || payment.payment_status === 'partial') && (
                                                    <Button
                                                        size="sm"
                                                        className="h-8 text-xs gradient-primary"
                                                        onClick={() => {
                                                            setSelectedPayment(payment);
                                                            setRecordPaymentOpen(true);
                                                        }}
                                                        disabled={isMemberPaused}
                                                    >
                                                        <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                                                        Record Pay
                                                    </Button>
                                                )}
                                            </div>

                                            {/* View, Edit, and Delete Icons on Right */}
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                                    onClick={() => {
                                                        setSelectedPayment(payment);
                                                        setViewPaymentOpen(true);
                                                    }}
                                                    title="View Details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>

                                                {hasPermission('edit_payments') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                        onClick={() => {
                                                            setSelectedPayment(payment);
                                                            setEditPaymentOpen(true);
                                                        }}
                                                        disabled={isMemberPaused}
                                                        title={isMemberPaused ? "Cannot edit payment of paused member" : "Edit Record"}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                )}

                                                {hasPermission('delete_payments') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDeletePayment(payment.id)}
                                                        disabled={isMemberPaused}
                                                        title={isMemberPaused ? "Cannot delete payment of paused member" : "Delete"}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </CardContent>
            </Card>

            <RecordPaymentDialog
                open={recordPaymentOpen}
                onOpenChange={setRecordPaymentOpen}
                payment={selectedPayment}
                onSuccess={fetchPayments}
            />

            <ViewPaymentDialog
                open={viewPaymentOpen}
                onOpenChange={setViewPaymentOpen}
                payment={selectedPayment}
            />

            <EditPaymentDialog
                open={editPaymentOpen}
                onOpenChange={setEditPaymentOpen}
                payment={selectedPayment}
                onSuccess={fetchPayments}
            />
        </>
    );
}
