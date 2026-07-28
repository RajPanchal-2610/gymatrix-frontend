import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft, Mail, Phone, Calendar, Clock, User, UserCircle, MapPin, Map,
    Activity, IndianRupee, Briefcase, FileText, History, CheckCircle, AlertCircle,
    Filter, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GymMember } from "@/types/gym";
import { toast } from "sonner";
import { format, addMonths } from "date-fns";
import { RecordPaymentDialog } from "@/components/payments/RecordPaymentDialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { usePermissions } from "@/contexts/PermissionsContext";
import { useGym } from "@/hooks/useGym";

export default function MemberView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { hasPermission, role, permissions } = usePermissions();
    const { gymId } = useGym();
    const [member, setMember] = useState<GymMember | null>(null);
    const [typeFilter, setTypeFilter] = useState<"all" | "plan" | "pt">("all");
    const [isLoading, setIsLoading] = useState(true);
    const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
    const [selectedPaymentMember, setSelectedPaymentMember] = useState<any>(null);

    // PT Renewal State
    const [renewDialogOpen, setRenewDialogOpen] = useState(false);
    const [renewFormData, setRenewFormData] = useState({ start_date: new Date().toISOString().split('T')[0] });
    const [renewing, setRenewing] = useState(false);

    const handleRenewPTSubmit = async () => {
        if (!gymId || !member) return;
        setRenewing(true);
        try {
            // Fetch the latest history record for the member
            const { data: latestHistory, error: historyErr } = await supabase
                .from("gym_membership_history")
                .select("id")
                .eq("member_id", member.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (historyErr) throw historyErr;

            if (!latestHistory) {
                toast.error("No membership history found. Please renew membership plan first.");
                setRenewing(false);
                return;
            }

            // Create new unpaid Personal Training Fee payment
            const { error: ptError } = await supabase
                .from("gym_membership_payments")
                .insert({
                    membership_history_id: latestHistory.id,
                    member_id: member.id,
                    gym_id: gymId,
                    total_amount: member.pt_fee,
                    paid_amount: 0,
                    due_amount: member.pt_fee,
                    payment_status: 'unpaid',
                    billing_date: renewFormData.start_date,
                    remarks: 'Personal Training Fee'
                });

            if (ptError) throw ptError;

            // Create a record in gym_pt_history table
            const ptEndDate = format(addMonths(new Date(renewFormData.start_date), 1), 'yyyy-MM-dd');
            const { error: ptHistError } = await supabase
                .from("gym_pt_history")
                .insert({
                    gym_id: gymId,
                    member_id: member.id,
                    assigned_staff_id: member.assigned_staff_id,
                    start_date: renewFormData.start_date,
                    end_date: ptEndDate,
                    pt_fee: member.pt_fee,
                    status: 'active',
                    renewed_at: new Date().toISOString()
                });

            if (ptHistError) throw ptHistError;

            toast.success("Personal Training Fee renewed successfully");
            setRenewDialogOpen(false);
            fetchMemberDetails();
        } catch (error: any) {
            toast.error("PT Renewal failed: " + error.message);
        } finally {
            setRenewing(false);
        }
    };

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
                    gym_pt_history (
                        *,
                        gym_staff (*)
                    ),
                    gym_membership_payments (
                        *,
                        gym_payment_transactions (*)
                    ),
                    gym_staff:assigned_staff_id (*)
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

    const isOwnerOrSuperAdmin = role?.isOwner || permissions?.includes('*');
    const isAssignedStaff = member?.assigned_staff_id?.toString() === role?.staff_id?.toString();
    const isPaused = member?.is_active === false || member?.status === 'paused';

    const visiblePayments = (member.gym_membership_payments || []).filter(payment => {
        if (payment.remarks === 'Personal Training Fee') {
            return !!(member.assigned_staff_id?.toString() === role?.staff_id?.toString());
        }
        return true;
    });

    const typeFilteredPayments = visiblePayments.filter(p => {
        if (typeFilter === 'plan') {
            return p.remarks !== 'Personal Training Fee';
        }
        if (typeFilter === 'pt') {
            return p.remarks === 'Personal Training Fee';
        }
        return true;
    });

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
                    {isAssignedStaff && member && member.pt_fee && member.pt_fee > 0 && (
                        <Button 
                            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold"
                            onClick={() => {
                                setRenewFormData({ start_date: new Date().toISOString().split('T')[0] });
                                setRenewDialogOpen(true);
                            }}
                            disabled={isPaused}
                        >
                            <Calendar className="mr-2 h-4 w-4" />
                            Renew PT Subscription
                        </Button>
                    )}
                </div>

                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6 max-w-2xl mx-auto">
                        <TabsTrigger value="profile" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Profile Info
                        </TabsTrigger>
                        <TabsTrigger value="membership" className="flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Membership & Activity
                        </TabsTrigger>
                        <TabsTrigger value="payments" className="flex items-center gap-2">
                            <IndianRupee className="h-4 w-4" />
                            Billing & Payments
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Profile Info */}
                    <TabsContent value="profile" className="space-y-6 animate-in fade-in-50 duration-500">
                        <Card className="overflow-hidden relative">
                            {/* Decorative background gradient */}
                            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20" />
                            <CardContent className="pt-12 pb-6 px-6 relative z-10">
                                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6">
                                    <Avatar className="h-28 w-28 border-4 border-background shadow-xl bg-background">
                                        <AvatarImage src={member.image_url || undefined} />
                                        <AvatarFallback className="text-4xl bg-primary/10 text-primary font-bold">
                                            {member.full_name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-3 flex-1 mt-2">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-center sm:justify-start">
                                            <h2 className="text-3xl font-extrabold tracking-tight">{member.full_name}</h2>
                                            <div className="w-fit mx-auto sm:mx-0">
                                                {getStatusBadge(member.status)}
                                            </div>
                                        </div>
                                        <p className="text-muted-foreground text-sm flex items-center justify-center sm:justify-start gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            Registered Member since {member.join_date ? format(new Date(member.join_date), "MMMM dd, yyyy") : 'Not specified'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Personal & Contact Card */}
                            <Card>
                                <CardHeader className="pb-3 border-b border-muted">
                                    <CardTitle className="text-lg flex items-center font-bold">
                                        <User className="h-5 w-5 mr-2 text-primary" />
                                        Personal & Contact Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</span>
                                            <p className="text-foreground font-medium flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-muted-foreground/75" />
                                                {member.email || 'No email provided'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</span>
                                            <p className="text-foreground font-medium flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-muted-foreground/75" />
                                                {member.phone || 'No phone provided'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gender</span>
                                            <p className="text-foreground font-medium">
                                                {member.gender || 'Not specified'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Joined Date</span>
                                            <p className="text-foreground font-medium">
                                                {member.join_date ? format(new Date(member.join_date), "dd MMM yyyy") : 'Not specified'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Assigned Staff Card */}
                            <Card>
                                <CardHeader className="pb-3 border-b border-muted">
                                    <CardTitle className="text-lg flex items-center font-bold">
                                        <Briefcase className="h-5 w-5 mr-2 text-primary" />
                                        Assigned Staff
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {member.gym_staff ? (
                                        <div className="flex items-center gap-4 py-2">
                                            <Avatar className="h-16 w-16 shadow-sm border border-muted">
                                                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                                                    {member.gym_staff.full_name?.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="space-y-1">
                                                <p className="font-bold text-lg">{member.gym_staff.full_name}</p>
                                                <p className="text-sm text-primary font-semibold">Staff</p>
                                                {member.gym_staff.email && (
                                                    <p className="text-xs text-muted-foreground">{member.gym_staff.email}</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-muted-foreground">
                                            <UserCircle className="h-12 w-12 mx-auto opacity-20 mb-2" />
                                            <p className="font-semibold text-sm">No Staff Assigned</p>
                                            <p className="text-xs opacity-60">Assign a staff member to this member via edit settings</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Tab 2: Membership & Activity */}
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

                        {/* PT Subscription History */}
                        {isAssignedStaff && member.gym_pt_history && member.gym_pt_history.length > 0 && (
                            <Card>
                                <CardHeader className="pb-3 border-b border-muted">
                                    <CardTitle className="flex items-center text-lg font-bold">
                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3 text-primary">
                                            <Briefcase className="h-4 w-4" />
                                        </div>
                                        Personal Training History
                                    </CardTitle>
                                    <CardDescription>All-time personal training cycles and expirations</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="border rounded-xl overflow-hidden shadow-sm">
                                        <div className="overflow-auto max-h-[400px] scrollbar-thin scrollbar-thumb-muted-foreground/20 cursor-default">
                                            <table className="w-full text-sm">
                                                <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                                                    <tr>
                                                        <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Staff</th>
                                                        <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Duration Period</th>
                                                        <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Rate</th>
                                                        <th className="py-3 px-4 text-left font-semibold text-muted-foreground">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-muted">
                                                    {member.gym_pt_history
                                                        .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
                                                        .map((ptHistory) => (
                                                            <tr key={ptHistory.id} className="hover:bg-muted/30 transition-colors">
                                                                <td className="py-4 px-4 font-semibold text-foreground">{ptHistory.gym_staff?.full_name || 'Assigned Staff'}</td>
                                                                <td className="py-4 px-4 whitespace-nowrap text-muted-foreground">
                                                                    <div className="flex flex-col">
                                                                        <span>{format(new Date(ptHistory.start_date), "dd MMM yyyy")}</span>
                                                                        <span className="text-xs opacity-60">to {format(new Date(ptHistory.end_date), "dd MMM yyyy")}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-4 px-4 text-left font-semibold">₹{ptHistory.pt_fee.toLocaleString()}</td>
                                                                <td className="py-4 px-4">
                                                                    {(() => {
                                                                        const isPast = new Date().getTime() > new Date(ptHistory.end_date).getTime() + 86400000;
                                                                        const isActive = ptHistory.status === 'active' && !isPast;
                                                                        return (
                                                                            <Badge variant={isActive ? 'default' : 'destructive'} className={cn("px-2 py-0.5 text-[10px] font-bold uppercase", isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "")}>
                                                                                {isActive ? 'ACTIVE' : 'EXPIRED'}
                                                                            </Badge>
                                                                        );
                                                                    })()}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Tab 3: Billing & Payments */}
                    <TabsContent value="payments" className="space-y-6 animate-in fade-in-50 duration-500">
                        {/* Payment Summary Highlights */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl border bg-success/5 border-success/10 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-emerald-600 uppercase">Total Paid</p>
                                    <p className="text-2xl font-black text-emerald-700">₹{typeFilteredPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0).toLocaleString()}</p>
                                </div>
                                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                                    <CheckCircle className="h-6 w-6" />
                                </div>
                            </div>
                            <div className="p-4 rounded-xl border bg-destructive/5 border-destructive/10 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-red-600 uppercase">Current Dues</p>
                                    <p className="text-2xl font-black text-red-700">₹{typeFilteredPayments.reduce((sum, p) => sum + (p.due_amount || 0), 0).toLocaleString()}</p>
                                </div>
                                <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-600">
                                    <AlertCircle className="h-6 w-6" />
                                </div>
                            </div>
                        </div>

                        {/* Payment History */}
                        <div className="flex justify-end mb-4">
                            <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
                                <SelectTrigger className="w-[180px]">
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
                                {typeFilteredPayments && typeFilteredPayments.length > 0 ? (
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
                                                    {typeFilteredPayments
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
                                                                        hasPermission('add_payments') ? (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="h-8 px-4 text-xs font-bold border-primary/20 hover:bg-primary/5 text-primary"
                                                                                disabled={isPaused}
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
                                                                            <div className="text-destructive text-xs font-bold">UNPAID</div>
                                                                        )
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

            {/* PT Renewal Dialog */}
            <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Renew PT Subscription</DialogTitle>
                        <DialogDescription>
                            Create a new unpaid Personal Training Fee bill for {member.full_name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="start_date">Billing Date</Label>
                            <Input
                                id="start_date"
                                type="date"
                                value={renewFormData.start_date}
                                onChange={(e) => setRenewFormData({ ...renewFormData, start_date: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-1">
                            <Label>PT Fee Amount</Label>
                            <div className="text-lg font-bold text-primary">
                                ₹{member.pt_fee?.toLocaleString()}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenewDialogOpen(false)} disabled={renewing}>
                            Cancel
                        </Button>
                        <Button onClick={handleRenewPTSubmit} disabled={renewing}>
                            {renewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Renewal
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
