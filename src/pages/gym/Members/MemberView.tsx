import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft, Mail, Phone, Calendar, Clock, User, UserCircle, MapPin, Map,
    Activity, IndianRupee, Briefcase, FileText, History, CheckCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { GymMember } from "@/types/gym";
import { toast } from "sonner";
import { format } from "date-fns";
import { RecordPaymentDialog } from "@/components/payments/RecordPaymentDialog";

export default function MemberView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [member, setMember] = useState<GymMember | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
    const [selectedPaymentMember, setSelectedPaymentMember] = useState<any>(null);

    useEffect(() => {
        fetchMemberDetails();
    }, [id]);

    const fetchMemberDetails = async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("gym_members")
                .select(`
                    *,
                    gym_membership_plans (*),
                    gym_membership_history (
                        *,
                        gym_membership_plans (*)
                    ),
                    gym_membership_payments (
                        *,
                        gym_payment_transactions (*)
                    ),
                    gym_staff:trainer_id (*)
                `)
                .eq("id", parseInt(id))
                .single();

            if (error) throw error;
            setMember(data);
        } catch (error: any) {
            console.error("Error fetching member details:", error);
            toast.error("Failed to load member details.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout title="Member Details">
                <div className="flex justify-center items-center h-[50vh]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!member) {
        return (
            <DashboardLayout title="Member Not Found">
                <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                    <UserCircle className="h-16 w-16 text-muted-foreground" />
                    <h2>Member could not be found</h2>
                    <Button onClick={() => navigate("/members")}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Members
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    // Helper to get status badge 
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/20">Active</Badge>;
            case 'expired':
                return <Badge variant="destructive">Expired</Badge>;
            case 'paused':
                return <Badge variant="secondary">Paused</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <DashboardLayout title="Member Details">
            <div className="container mx-auto p-4 max-w-6xl space-y-6">

                {/* Header Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/members")}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-2xl font-bold tracking-tight">Member Profile</h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Left Column - Essential Info */}
                    <div className="space-y-6">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                                        <AvatarImage src={member.image_url || undefined} />
                                        <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                                            {member.full_name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-bold">{member.full_name}</h2>
                                        <div className="flex items-center justify-center gap-2">
                                            {getStatusBadge(member.status)}
                                        </div>
                                    </div>

                                </div>

                                <Separator className="my-6" />

                                <div className="space-y-4">
                                    <div className="flex items-center text-sm">
                                        <Mail className="h-4 w-4 mr-3 text-muted-foreground" />
                                        <span className="text-foreground">{member.email || 'No email provided'}</span>
                                    </div>
                                    <div className="flex items-center text-sm">
                                        <Phone className="h-4 w-4 mr-3 text-muted-foreground" />
                                        <span className="text-foreground">{member.phone || 'No phone provided'}</span>
                                    </div>
                                    <div className="flex items-center text-sm">
                                        <Calendar className="h-4 w-4 mr-3 text-muted-foreground" />
                                        <span className="text-foreground">Joined: {member.join_date ? format(new Date(member.join_date), "dd MMM yyyy") : 'Not specified'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center">
                                    <User className="h-5 w-5 mr-2 text-primary" />
                                    Assigned Trainer
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {member.gym_staff ? (
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12">
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                {member.gym_staff.full_name?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{member.gym_staff.full_name}</p>
                                            <p className="text-sm text-muted-foreground">Personal Trainer</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-muted-foreground">
                                        <p>No Personal Trainer Assigned</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Details */}
                    <div className="md:col-span-2 space-y-6">

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Activity className="h-5 w-5 mr-2 text-primary" />
                                    Active Plan Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <span className="text-sm text-muted-foreground">Current Plan</span>
                                        <div className="font-medium text-lg flex items-center gap-2">
                                            {member.gym_membership_plans?.name || 'No Active Plan'}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm text-muted-foreground">Expiry Date</span>
                                        <div className="font-medium text-lg flex items-center gap-2">
                                            {member.expiry_date ? format(new Date(member.expiry_date), "dd MMM yyyy") : '-'}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <History className="h-5 w-5 mr-2 text-primary" />
                                    Membership History
                                </CardTitle>
                                <CardDescription>Past and current membership plans</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {member.gym_membership_history && member.gym_membership_history.length > 0 ? (
                                    <div className="border rounded-md overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted">
                                                <tr>
                                                    <th className="py-2 px-4 text-left font-medium">Plan</th>
                                                    <th className="py-2 px-4 text-left font-medium">Duration</th>
                                                    <th className="py-2 px-4 text-left font-medium">Status</th>
                                                    <th className="py-2 px-4 text-left font-medium">Renewed On</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {member.gym_membership_history
                                                    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
                                                    .map((history) => (
                                                        <tr key={history.id} className="hover:bg-muted/50 transition-colors">
                                                            <td className="py-2 px-4 font-medium">{history.gym_membership_plans?.name || 'Unknown Plan'}</td>
                                                            <td className="py-2 px-4 whitespace-nowrap text-muted-foreground">
                                                                {format(new Date(history.start_date), "dd MMM yyyy")} - {format(new Date(history.end_date), "dd MMM yyyy")}
                                                            </td>
                                                            <td className="py-2 px-4">
                                                                {(() => {
                                                                    let statusLabel = 'EXPIRED';
                                                                    let statusVariant: "default" | "secondary" | "destructive" | "outline" = 'destructive';
                                                                    let statusClassName = '';

                                                                    const isPast = new Date().getTime() > new Date(history.end_date).getTime() + 86400000;

                                                                    if (history.is_active && !isPast) {
                                                                        statusLabel = 'ACTIVE';
                                                                        statusVariant = 'default';
                                                                        statusClassName = 'bg-emerald-500/15 text-emerald-600';
                                                                    }

                                                                    return (
                                                                        <Badge variant={statusVariant} className={statusClassName}>
                                                                            {statusLabel}
                                                                        </Badge>
                                                                    );
                                                                })()}
                                                            </td>
                                                            <td className="py-2 px-4 whitespace-nowrap text-muted-foreground">
                                                                {history.renewed_at ? format(new Date(history.renewed_at), "dd MMM yyyy") : '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-muted-foreground border rounded-md border-dashed">
                                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p>No membership history found</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <IndianRupee className="h-5 w-5 mr-2 text-primary" />
                                    Payment History
                                </CardTitle>
                                <CardDescription>Recent transaction records for this member</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {member.gym_membership_payments && member.gym_membership_payments.length > 0 ? (
                                    <div className="border rounded-md overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted">
                                                <tr>
                                                    <th className="py-2 px-4 text-left font-medium">Date</th>
                                                    <th className="py-2 px-4 text-left font-medium">Status</th>
                                                    <th className="py-2 px-4 text-right font-medium">Total</th>
                                                    <th className="py-2 px-4 text-right font-medium">Paid</th>
                                                    <th className="py-2 px-4 text-right font-medium">Due</th>
                                                    <th className="py-2 px-4 text-left font-medium">Transactions</th>
                                                    <th className="py-2 px-4 text-right font-medium">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {member.gym_membership_payments
                                                    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
                                                    .slice(0, 5) // Display last 5
                                                    .map((payment) => (
                                                        <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                                                            <td className="py-2 px-4 whitespace-nowrap">
                                                                {payment.billing_date ? format(new Date(payment.billing_date), "dd MMM yyyy") : '-'}
                                                            </td>
                                                            <td className="py-2 px-4">
                                                                <Badge variant={payment.payment_status === 'paid' ? 'default' : payment.payment_status === 'partial' ? 'secondary' : 'destructive'}
                                                                    className={payment.payment_status === 'paid' ? 'bg-emerald-500/15 text-emerald-600' : ''}>
                                                                    {payment.payment_status.toUpperCase()}
                                                                </Badge>
                                                            </td>
                                                            <td className="py-2 px-4 text-right">₹{payment.total_amount}</td>
                                                            <td className="py-2 px-4 text-right text-emerald-600 font-medium">₹{payment.paid_amount}</td>
                                                            <td className="py-2 px-4 text-right text-destructive font-medium">₹{payment.due_amount}</td>
                                                            <td className="py-2 px-4 text-xs">
                                                                {payment.gym_payment_transactions && payment.gym_payment_transactions.length > 0 ? (
                                                                    <div className="flex flex-col gap-1">
                                                                        {payment.gym_payment_transactions.map(tx => (
                                                                            <span key={tx.id} className="text-muted-foreground whitespace-nowrap">
                                                                                <span className="font-medium text-foreground">{tx.payment_mode}</span>: ₹{tx.amount}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : <span className="text-muted-foreground">-</span>}
                                                            </td>
                                                            <td className="py-2 px-4 text-right">
                                                                {payment.payment_status !== 'paid' ? (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-7 text-xs"
                                                                        onClick={() => {
                                                                            const paymentWithMember = { ...payment, gym_members: member };
                                                                            setSelectedPaymentMember(paymentWithMember as any);
                                                                            setRecordPaymentOpen(true);
                                                                        }}
                                                                    >
                                                                        <IndianRupee className="h-3 w-3 mr-1" />
                                                                        Pay
                                                                    </Button>
                                                                ) : (
                                                                    <div className="flex items-center justify-end text-emerald-600 text-xs font-medium opacity-80 gap-1 pr-2">
                                                                        <CheckCircle className="h-3.5 w-3.5" />
                                                                        Done
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                        {member.gym_membership_payments.length > 5 && (
                                            <div className="p-2 text-center bg-muted/30 text-muted-foreground text-xs">
                                                Showing 5 most recent payments
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-muted-foreground border rounded-md border-dashed">
                                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p>No payment records found</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </div>

            {/* Record Payment Dialog */}
            {selectedPaymentMember && (
                <RecordPaymentDialog
                    open={recordPaymentOpen}
                    onOpenChange={setRecordPaymentOpen}
                    payment={selectedPaymentMember}
                    onSuccess={() => {
                        setRecordPaymentOpen(false);
                        fetchMemberDetails();
                    }}
                />
            )}
        </DashboardLayout>
    );
}
