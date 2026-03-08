import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft, Mail, Phone, Calendar, Clock, User, UserCircle, MapPin, Map,
    Activity, IndianRupee, Briefcase, FileText, History, CheckCircle, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
            <>
                <div className="flex justify-center items-center h-[50vh]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </>
        );
    }

    if (!member) {
        return (
            <>
                <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                    <UserCircle className="h-16 w-16 text-muted-foreground" />
                    <h2>Member could not be found</h2>
                    <Button onClick={() => navigate("/members")}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Members
                    </Button>
                </div>
            </>
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
        <>
            <div className="w-full px-6 py-4 space-y-6">

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
                                    {member.gender && (
                                        <div className="flex items-center text-sm">
                                            <User className="h-4 w-4 mr-3 text-muted-foreground" />
                                            <span className="text-foreground">Gender: {member.gender}</span>
                                        </div>
                                    )}
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
                    <div className="md:col-span-2">
                        <Tabs defaultValue="membership" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6">
                                <TabsTrigger value="membership" className="flex items-center gap-2">
                                    <Activity className="h-4 w-4" />
                                    Membership & Activity
                                </TabsTrigger>
                                <TabsTrigger value="payments" className="flex items-center gap-2">
                                    <IndianRupee className="h-4 w-4" />
                                    Billing & Payments
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="membership" className="space-y-6 animate-in fade-in-50 duration-500">
                                {/* Active Plan Details */}
                                <Card>
                                    <CardHeader className="pb-3 border-b border-muted">
                                        <CardTitle className="flex items-center text-lg font-bold">
                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3 text-primary">
                                                <Activity className="h-4 w-4" />
                                            </div>
                                            Active Plan Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Plan</span>
                                                <div className="font-bold text-xl text-primary">
                                                    {member.gym_membership_plans?.name || 'No Active Plan'}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expiry Date</span>
                                                <div className="font-bold text-xl text-destructive flex items-center gap-2">
                                                    <Calendar className="h-5 w-5" />
                                                    {member.expiry_date ? format(new Date(member.expiry_date), "dd MMM yyyy") : '-'}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Membership History */}
                                <Card>
                                    <CardHeader className="pb-3 border-b border-muted">
                                        <CardTitle className="flex items-center text-lg font-bold">
                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3 text-primary">
                                                <History className="h-4 w-4" />
                                            </div>
                                            Membership History
                                        </CardTitle>
                                        <CardDescription>All-time membership plans and renewals</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        {member.gym_membership_history && member.gym_membership_history.length > 0 ? (
                                            <div className="border rounded-xl overflow-hidden shadow-sm">
                                                <div className="overflow-auto max-h-[400px] scrollbar-thin scrollbar-thumb-muted-foreground/20 cursor-default">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                                                            <tr>
                                                                <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Plan Name</th>
                                                                <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Duration Period</th>
                                                                <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Current Status</th>
                                                                <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Renewed On</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-muted">
                                                            {member.gym_membership_history
                                                                .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
                                                                .map((history) => (
                                                                    <tr key={history.id} className="hover:bg-muted/30 transition-colors">
                                                                        <td className="py-4 px-4 font-semibold text-foreground">{history.gym_membership_plans?.name || 'Unknown Plan'}</td>
                                                                        <td className="py-4 px-4 whitespace-nowrap text-muted-foreground">
                                                                            <div className="flex flex-col">
                                                                                <span>{format(new Date(history.start_date), "dd MMM yyyy")}</span>
                                                                                <span className="text-xs opacity-60">to {format(new Date(history.end_date), "dd MMM yyyy")}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-4 px-4">
                                                                            {(() => {
                                                                                let statusLabel = 'EXPIRED';
                                                                                let statusVariant: "default" | "secondary" | "destructive" | "outline" = 'destructive';
                                                                                let statusClassName = '';

                                                                                const isPast = new Date().getTime() > new Date(history.end_date).getTime() + 86400000;

                                                                                if (history.is_active && !isPast) {
                                                                                    statusLabel = 'ACTIVE';
                                                                                    statusVariant = 'default';
                                                                                    statusClassName = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
                                                                                }

                                                                                return (
                                                                                    <Badge variant={statusVariant} className={cn("px-2 py-0.5 text-[10px] font-bold", statusClassName)}>
                                                                                        {statusLabel}
                                                                                    </Badge>
                                                                                );
                                                                            })()}
                                                                        </td>
                                                                        <td className="py-4 px-4 whitespace-nowrap text-muted-foreground">
                                                                            {history.renewed_at ? format(new Date(history.renewed_at), "dd MMM yyyy") : (
                                                                                <span className="opacity-40 italic">Not renewed</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                                                <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                                <p className="font-medium">No membership history found</p>
                                                <p className="text-xs opacity-60">History will appear here after renewals</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="payments" className="space-y-6 animate-in fade-in-50 duration-500">
                                {/* Payment Summary Highlights */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl border bg-success/5 border-success/10 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-semibold text-emerald-600 uppercase">Total Paid</p>
                                            <p className="text-2xl font-black text-emerald-700">₹{(member.gym_membership_payments || []).reduce((sum, p) => sum + (p.paid_amount || 0), 0).toLocaleString()}</p>
                                        </div>
                                        <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                                            <CheckCircle className="h-6 w-6" />
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl border bg-destructive/5 border-destructive/10 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-semibold text-red-600 uppercase">Current Dues</p>
                                            <p className="text-2xl font-black text-red-700">₹{(member.gym_membership_payments || []).reduce((sum, p) => sum + (p.due_amount || 0), 0).toLocaleString()}</p>
                                        </div>
                                        <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-600">
                                            <AlertCircle className="h-6 w-6" />
                                        </div>
                                    </div>
                                </div>

                                {/* Payment History */}
                                <Card>
                                    <CardHeader className="pb-3 border-b border-muted">
                                        <CardTitle className="flex items-center text-lg font-bold">
                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3 text-primary">
                                                <IndianRupee className="h-4 w-4" />
                                            </div>
                                            Payment History
                                        </CardTitle>
                                        <CardDescription>Complete record of transactions and dues</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        {member.gym_membership_payments && member.gym_membership_payments.length > 0 ? (
                                            <div className="border rounded-xl overflow-hidden shadow-sm">
                                                <div className="overflow-auto max-h-[400px] scrollbar-thin scrollbar-thumb-muted-foreground/20 cursor-default">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                                                            <tr>
                                                                <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Billing Date</th>
                                                                <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Status</th>
                                                                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">Price</th>
                                                                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">Paid</th>
                                                                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">Due</th>
                                                                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-muted">
                                                            {member.gym_membership_payments
                                                                .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
                                                                .map((payment) => (
                                                                    <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                                                                        <td className="py-4 px-4 whitespace-nowrap font-medium">
                                                                            {payment.billing_date ? format(new Date(payment.billing_date), "dd MMM yyyy") : '-'}
                                                                        </td>
                                                                        <td className="py-4 px-4">
                                                                            <Badge
                                                                                variant={payment.payment_status === 'paid' ? 'default' : payment.payment_status === 'partial' ? 'secondary' : 'destructive'}
                                                                                className={cn("px-2 py-0.5 text-[10px] font-bold uppercase",
                                                                                    payment.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''
                                                                                )}
                                                                            >
                                                                                {payment.payment_status}
                                                                            </Badge>
                                                                        </td>
                                                                        <td className="py-4 px-4 text-right font-semibold">₹{payment.total_amount.toLocaleString()}</td>
                                                                        <td className="py-4 px-4 text-right text-emerald-600 font-bold">₹{payment.paid_amount.toLocaleString()}</td>
                                                                        <td className="py-4 px-4 text-right text-destructive font-bold">₹{payment.due_amount.toLocaleString()}</td>
                                                                        <td className="py-4 px-4 text-right">
                                                                            {payment.payment_status !== 'paid' ? (
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="h-8 px-4 text-xs font-bold border-primary/20 hover:bg-primary/5 text-primary"
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
                                                                                <div className="flex items-center justify-end text-emerald-600 text-xs font-bold gap-1 pr-2">
                                                                                    <CheckCircle className="h-4 w-4" />
                                                                                    DONE
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                                                <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                                <p className="font-medium">No payment records found</p>
                                                <p className="text-xs opacity-60">Complete history will appear here</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
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
        </>
    );
}
