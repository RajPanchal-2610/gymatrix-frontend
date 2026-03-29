
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Search,
    Plus,
    Filter,
    MoreHorizontal,
    Mail,
    Phone,
    Calendar,
    Edit,
    Trash2,
    Eye,
    CheckCircle,
    AlertCircle,
    Clock,
    IndianRupee,
    Upload,
    Loader2,
    RefreshCw,
    User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useGym } from "@/hooks/useGym";
import { useSubscription } from "@/hooks/useSubscription";
import { GymMember, GymMembershipPlan, GymMembershipPayment, GymStaff } from "@/types/gym";
import { supabase } from "@/lib/supabase";
import { staffService } from "@/services/staffService";
import { toast } from "sonner";
import { format, addMonths, addDays, addYears, differenceInCalendarDays } from "date-fns";
import { usePermissions } from "@/contexts/PermissionsContext";
import { RecordPaymentDialog } from "@/components/payments/RecordPaymentDialog";

export default function Members() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { gymId, gyms, loading: gymLoading } = useGym();
    const { hasPermission, role } = usePermissions();
    const { subscription } = useSubscription();
    const [members, setMembers] = useState<GymMember[]>([]);
    const [plans, setPlans] = useState<GymMembershipPlan[]>([]);
    const [trainers, setTrainers] = useState<GymStaff[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<GymMember | null>(null);

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone: "",
        membership_plan_id: "",
        trainer_id: "none",
        join_date: format(new Date(), "yyyy-MM-dd"),
        image_url: "",
        gender: "",
        pt_fee: "0",
        status: "active" as "active" | "expired" | "paused" | "cancelled",
        device_user_id: "",
    });
    const [uploading, setUploading] = useState(false);

    // Renewal State
    const [renewDialogOpen, setRenewDialogOpen] = useState(false);
    const [renewingMember, setRenewingMember] = useState<GymMember | null>(null);
    const [renewFormData, setRenewFormData] = useState({
        plan_id: "",
        start_date: format(new Date(), "yyyy-MM-dd"),
    });

    // History State
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [memberHistory, setMemberHistory] = useState<any[]>([]);
    const [viewingMember, setViewingMember] = useState<GymMember | null>(null);

    // Payment State
    const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
    const [selectedPaymentMember, setSelectedPaymentMember] = useState<GymMembershipPayment | null>(null);

    // Assign Trainer State
    const [assignTrainerOpen, setAssignTrainerOpen] = useState(false);
    const [assignTrainerMember, setAssignTrainerMember] = useState<GymMember | null>(null);
    const [selectedTrainerId, setSelectedTrainerId] = useState<string>("none");
    const [showOnlyMyMembers, setShowOnlyMyMembers] = useState(false);

    useEffect(() => {
        const filter = searchParams.get('filter');
        if (filter === 'my') {
            setShowOnlyMyMembers(true);
        } else {
            setShowOnlyMyMembers(false);
        }
    }, [searchParams]);

    useEffect(() => {
        if (gymId) {
            fetchMembers();
            fetchPlans();
            fetchTrainers();
        }
    }, [gymId]);

    const fetchMembers = async () => {
        try {
            if (members.length === 0) setLoading(true);
            const { data, error } = await supabase
                .from("gym_members")
                .select(`
                    *,
                    gym_membership_plans (
                        name
                    ),
                    gym_membership_history (
                        id,
                        plan_id,
                        payment_status,
                        is_active
                    ),
                    gym_membership_payments (
                        id,
                        total_amount,
                        paid_amount,
                        due_amount,
                        payment_status,
                        created_at,
                        remarks,
                        membership_history_id
                    ),
                    gym_staff (
                        id,
                        full_name
                    )
                `)
                .eq("gym_id", gymId)
                .eq("is_deleted", false)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setMembers(data as any || []);
        } catch (error: any) {
            toast.error("Failed to fetch members: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlans = async () => {
        const { data } = await supabase
            .from("gym_membership_plans")
            .select("*")
            .eq("gym_id", gymId)
            .eq("is_deleted", false)
            .eq("status", "active");

        if (data) setPlans(data);
    };

    const fetchTrainers = async () => {
        try {
            const data = await staffService.getStaff(gymId!);
            setTrainers(data || []);
        } catch (error) {
            console.error("Failed to fetch trainers", error);
        }
    };

    const handleOpenDialog = async (member?: GymMember) => {
        if (member) {
            setEditingMember(member);
            let deviceId = "";
            try {
                const { data } = await supabase
                    .from('gym_device_mappings')
                    .select('device_user_id')
                    .eq('gym_id', gymId)
                    .eq('user_type', 'member')
                    .eq('member_id', member.id)
                    .maybeSingle();
                if (data) deviceId = data.device_user_id;
            } catch (err) { console.error("Failed to fetch device mapping", err); }

            setFormData({
                full_name: member.full_name,
                email: member.email || "",
                phone: member.phone || "",
                membership_plan_id: member.membership_plan_id?.toString() || "",
                trainer_id: member.trainer_id?.toString() || "none",
                join_date: member.join_date,
                image_url: member.image_url || "",
                gender: member.gender || "",
                pt_fee: member.pt_fee?.toString() || "0",
                status: member.status,
                device_user_id: deviceId
            });
        } else {
            setEditingMember(null);
            setFormData({
                full_name: "",
                email: "",
                phone: "",
                membership_plan_id: "",
                trainer_id: "none",
                join_date: format(new Date(), "yyyy-MM-dd"),
                image_url: "",
                gender: "",
                pt_fee: "0",
                status: "active",
                device_user_id: ""
            });
        }
        setDialogOpen(true);
    };

    const calculateExpiry = (joinDate: string, planId: string) => {
        const plan = plans.find(p => p.id.toString() === planId);
        if (!plan) return null;

        const start = new Date(joinDate);
        if (plan.duration_unit === 'month') return format(addMonths(start, plan.duration_value), 'yyyy-MM-dd');
        if (plan.duration_unit === 'year') return format(addYears(start, plan.duration_value), 'yyyy-MM-dd');
        if (plan.duration_unit === 'day') return format(addDays(start, plan.duration_value), 'yyyy-MM-dd');
        return null;
    };

    const handleOpenRenewDialog = (member: GymMember) => {
        setRenewingMember(member);
        setRenewFormData({
            plan_id: member.membership_plan_id?.toString() || "",
            start_date: format(new Date(), "yyyy-MM-dd"),
        });
        setRenewDialogOpen(true);
    };

    const handleOpenAssignTrainer = (member: GymMember) => {
        setAssignTrainerMember(member);
        setSelectedTrainerId(member.trainer_id?.toString() || "none");
        setAssignTrainerOpen(true);
    };

    const handleAssignTrainerSubmit = async () => {
        if (!assignTrainerMember || !gymId) return;

        try {
            const { error } = await supabase
                .from("gym_members")
                .update({ trainer_id: selectedTrainerId === "none" ? null : parseInt(selectedTrainerId) })
                .eq("id", assignTrainerMember.id);

            if (error) throw error;

            toast.success("Personal Trainer assigned successfully");
            setAssignTrainerOpen(false);
            fetchMembers();
        } catch (error: any) {
            toast.error("Failed to assign Personal Trainer: " + error.message);
        }
    };

    const handleViewHistory = async (member: GymMember) => {
        setViewingMember(member);
        setHistoryDialogOpen(true);
        setHistoryLoading(true);
        try {
            // 1. Fetch History
            const { data: historyData, error: historyError } = await supabase
                .from("gym_membership_history")
                .select(`
                    *,
                    gym_membership_plans (
                        name
                    )
                `)
                .eq("member_id", member.id)
                .order("start_date", { ascending: false });

            if (historyError) throw historyError;

            if (!historyData || historyData.length === 0) {
                setMemberHistory([]);
                return;
            }

            // 2. Fetch Payments for these history records
            const historyIds = historyData.map(h => h.id);
            const { data: paymentsData, error: paymentsError } = await supabase
                .from("gym_membership_payments")
                .select("*")
                .in("membership_history_id", historyIds);

            if (paymentsError) {
                console.error("Error fetching payments history:", paymentsError);
            }

            // 3. Merge Payments into History
            const mergedHistory = historyData.map(history => {
                const associatedPayments = paymentsData?.filter(p => p.membership_history_id === history.id) || [];
                // Sort by created_at desc to get latest if multiple
                associatedPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                return {
                    ...history,
                    gym_membership_payments: associatedPayments
                };
            });

            setMemberHistory(mergedHistory);
        } catch (error: any) {
            toast.error("Failed to load history: " + error.message);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleRenewSubmit = async () => {
        if (!gymId || !renewingMember) return;
        if (!renewFormData.plan_id) {
            toast.error("Please select a plan");
            return;
        }

        try {
            const expiry = calculateExpiry(renewFormData.start_date, renewFormData.plan_id);
            if (!expiry) {
                toast.error("Invalid plan or date");
                return;
            }

            // 1. Update Member
            const { error: updateError } = await supabase
                .from("gym_members")
                .update({
                    membership_plan_id: parseInt(renewFormData.plan_id),
                    join_date: renewFormData.start_date, // Optionally update reference join date or keep original
                    expiry_date: expiry,
                    status: 'active',
                    is_active: true
                })
                .eq("id", renewingMember.id);

            if (updateError) throw updateError;

            // 2. Add History Entry
            const { data: historyData, error: historyError } = await supabase
                .from("gym_membership_history")
                .insert({
                    gym_id: gymId,
                    member_id: renewingMember.id,
                    plan_id: parseInt(renewFormData.plan_id),
                    start_date: renewFormData.start_date,
                    end_date: expiry,
                    renewed_at: new Date().toISOString()
                })
                .select()
                .single();

            if (historyError) {
                console.error("History insert error:", historyError);
                toast.warning("Member renewed but history log failed");
            } else if (historyData) {
                // 3. Create Payment Record (Unpaid)
                const plan = plans.find(p => p.id === parseInt(renewFormData.plan_id));
                if (plan) {
                    await supabase
                        .from("gym_membership_payments")
                        .insert({
                            membership_history_id: historyData.id,
                            member_id: renewingMember.id,
                            gym_id: gymId,
                            total_amount: plan.price,
                            paid_amount: 0,
                            due_amount: plan.price,
                            payment_status: 'unpaid',
                            billing_date: renewFormData.start_date,
                            remarks: 'Membership Subscription'
                        });

                    if (renewingMember.pt_fee && renewingMember.pt_fee > 0) {
                        await supabase
                            .from("gym_membership_payments")
                            .insert({
                                membership_history_id: historyData.id,
                                member_id: renewingMember.id,
                                gym_id: gymId,
                                total_amount: renewingMember.pt_fee,
                                paid_amount: 0,
                                due_amount: renewingMember.pt_fee,
                                payment_status: 'unpaid',
                                billing_date: renewFormData.start_date,
                                remarks: 'Personal Training Fee'
                            });
                    }
                }
                toast.success("Membership renewed successfully");
            }

            setRenewDialogOpen(false);
            fetchMembers();
        } catch (error: any) {
            toast.error("Renewal failed: " + error.message);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            return;
        }
        if (!gymId) return;

        const file = e.target.files[0];

        // Validation: Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB");
            return;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${gymId}/${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        setUploading(true);

        try {
            const { error: uploadError } = await supabase.storage
                .from('gym_assets')
                .upload(filePath, file, {
                    contentType: file.type,
                    upsert: false
                });

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('gym_assets')
                .getPublicUrl(filePath);

            setFormData({ ...formData, image_url: data.publicUrl });
            toast.success("Image uploaded successfully");
        } catch (error: any) {
            toast.error("Error uploading image: " + error.message);
        } finally {
            setUploading(false);
        }
    };


    const handleSubmit = async () => {
        if (!gymId) return;
        if (!formData.full_name.trim()) {
            toast.error("Full Name is required");
            return;
        }

        if (!formData.membership_plan_id) {
            toast.error("Subscription Plan is required");
            return;
        }

        // Subscription Member Limit Check
        if (!editingMember && subscription) {
            try {
                // Count active/valid members across ALL gyms of this owner
                const { count, error: countError } = await supabase
                    .from("gym_members")
                    .select("*", { count: 'exact', head: true })
                    .in('gym_id', gyms.map(g => g.id))
                    .eq('is_deleted', false);

                if (countError) throw countError;

                if (count !== null && count >= (subscription.max_members || 0)) {
                    toast.error(`Member limit reached! Your ${subscription.status === 'trial' ? 'trial' : 'plan'} allows ${subscription.max_members} members. Upgrade to add more.`);
                    setDialogOpen(false);
                    navigate("/pricing");
                    return;
                }
            } catch (error) {
                console.error("Error checking member limit:", error);
                // Continue if check fails? Or block? Usually safer to block or log.
            }
        }

        try {
            const expiry_date = formData.membership_plan_id
                ? calculateExpiry(formData.join_date, formData.membership_plan_id)
                : null;

            const payload = {
                gym_id: gymId,
                full_name: formData.full_name,
                email: formData.email,
                phone: formData.phone,
                membership_plan_id: formData.membership_plan_id ? parseInt(formData.membership_plan_id) : null,
                trainer_id: formData.trainer_id && formData.trainer_id !== "none" ? parseInt(formData.trainer_id) : null,
                join_date: formData.join_date,
                expiry_date: expiry_date,
                image_url: formData.image_url || null,
                gender: formData.gender || null,
                pt_fee: parseFloat(formData.pt_fee) || 0,
                status: formData.status,
                is_active: formData.status === 'active',
                is_deleted: false
            };

            let savedMemberId = null;

            if (editingMember) {
                const { error } = await supabase
                    .from("gym_members")
                    .update(payload)
                    .eq("id", editingMember.id);

                if (error) throw error;
                savedMemberId = editingMember.id;
                toast.success("Member updated successfully");
            } else {
                const { data: newMember, error } = await supabase
                    .from("gym_members")
                    .insert(payload)
                    .select()
                    .single();

                if (error) throw error;
                savedMemberId = newMember.id;

                // Add history entry for new member if plan is selected
                if (newMember && payload.membership_plan_id && payload.expiry_date) {
                    // Add history entry for new member if plan is selected
                    const { data: historyData, error: historyError } = await supabase
                        .from("gym_membership_history")
                        .insert({
                            gym_id: gymId,
                            member_id: newMember.id,
                            plan_id: payload.membership_plan_id,
                            start_date: payload.join_date,
                            end_date: payload.expiry_date,
                            renewed_at: null
                        })
                        .select()
                        .single();

                    if (!historyError && historyData) {
                        const plan = plans.find(p => p.id === payload.membership_plan_id);
                        if (plan) {
                            await supabase
                                .from("gym_membership_payments")
                                .insert({
                                    membership_history_id: historyData.id,
                                    member_id: newMember.id,
                                    gym_id: gymId,
                                    total_amount: plan.price,
                                    paid_amount: 0,
                                    due_amount: plan.price,
                                    payment_status: 'unpaid',
                                    billing_date: payload.join_date,
                                    remarks: 'Membership Subscription'
                                });

                            if (payload.pt_fee && payload.pt_fee > 0) {
                                await supabase
                                    .from("gym_membership_payments")
                                    .insert({
                                        membership_history_id: historyData.id,
                                        member_id: newMember.id,
                                        gym_id: gymId,
                                        total_amount: payload.pt_fee,
                                        paid_amount: 0,
                                        due_amount: payload.pt_fee,
                                        payment_status: 'unpaid',
                                        billing_date: payload.join_date,
                                        remarks: 'Personal Training Fee'
                                    });
                            }
                        }
                    }
                }

                toast.success("Member added successfully");
            }

            // Save device mapping
            if (savedMemberId) {
                const { data: existingMap } = await supabase
                    .from('gym_device_mappings')
                    .select('id')
                    .eq('gym_id', gymId)
                    .eq('user_type', 'member')
                    .eq('member_id', savedMemberId)
                    .maybeSingle();

                if (formData.device_user_id) {
                    if (existingMap) {
                        await supabase.from('gym_device_mappings').update({ device_user_id: formData.device_user_id }).eq('id', existingMap.id);
                    } else {
                        await supabase.from('gym_device_mappings').insert({
                            gym_id: gymId,
                            device_user_id: formData.device_user_id,
                            user_type: 'member',
                            member_id: savedMemberId
                        });
                    }
                } else if (existingMap) {
                    await supabase.from('gym_device_mappings').delete().eq('id', existingMap.id);
                }
            }

            setDialogOpen(false);
            fetchMembers();
        } catch (error: any) {
            toast.error("Operation failed: " + error.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this member?")) return;

        try {
            const { error } = await supabase
                .from("gym_members")
                .update({ is_deleted: true })
                .eq("id", id);

            if (error) throw error;
            toast.success("Member deleted successfully");
            fetchMembers();
        } catch (error: any) {
            toast.error("Failed to delete member: " + error.message);
        }
    };

    const getMemberStatusDisplay = (member: GymMember) => {
        // If manually set to non-active, respect that
        if (member.status === 'paused' || member.status === 'cancelled') {
            return {
                label: member.status.charAt(0).toUpperCase() + member.status.slice(1),
                variant: "secondary" as const,
                className: ""
            };
        }

        if (!member.expiry_date) {
            return {
                label: member.status.charAt(0).toUpperCase() + member.status.slice(1),
                variant: member.status === 'active' ? "default" : "destructive" as const,
                className: member.status === 'active' ? "bg-success hover:bg-success/80" : ""
            };
        }

        const daysUntilExpiry = differenceInCalendarDays(new Date(member.expiry_date), new Date());

        if (daysUntilExpiry < 0) {
            return {
                label: "Expired",
                variant: "destructive" as const,
                className: ""
            };
        }

        if (daysUntilExpiry === 0) {
            return {
                label: "Expires Today",
                variant: "destructive" as const,
                className: "bg-orange-500 hover:bg-orange-600 border-orange-600"
            };
        }

        if (daysUntilExpiry <= 5) {
            return {
                label: `Expires in ${daysUntilExpiry} days`,
                variant: "secondary" as const,
                className: "bg-yellow-500/15 text-yellow-600 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-900"
            };
        }

        return {
            label: "Active",
            variant: "default" as const,
            className: "bg-success hover:bg-success/80"
        };
    };

    const filteredMembers = members.filter(member => {
        const matchesSearch = member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.phone?.includes(searchQuery);

        if (showOnlyMyMembers && role?.staff_id) {
            return matchesSearch && member.trainer_id === role.staff_id;
        }

        return matchesSearch;
    });

    return (
        <>
            {gymLoading || (loading && !members.length && gymId) ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                        <div className="flex-1 w-full sm:max-w-md relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search members..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                            {role?.staff_id && (
                                <Button
                                    variant={showOnlyMyMembers ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setShowOnlyMyMembers(!showOnlyMyMembers)}
                                    className={cn(
                                        "h-10 px-4 transition-all duration-200",
                                        showOnlyMyMembers && "bg-primary text-primary-foreground shadow-glow border-none"
                                    )}
                                >
                                    <User className="h-4 w-4 mr-2" />
                                    My Members
                                </Button>
                            )}
                            {hasPermission('add_members') && (
                                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="gradient-primary shadow-glow h-10 px-4" onClick={() => handleOpenDialog()}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Member
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px]">
                                        <DialogHeader>
                                            <DialogTitle>{editingMember ? "Edit Member" : "Register New Member"}</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 mt-4">
                                            <div className="flex justify-center">
                                                <Avatar className="h-20 w-20">
                                                    <AvatarImage src={formData.image_url} />
                                                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                                                        {formData.full_name ? formData.full_name.substring(0, 2).toUpperCase() : "M"}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="imageUpload">Profile Image</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        id="imageUpload"
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleFileUpload}
                                                        disabled={uploading}
                                                        className="cursor-pointer"
                                                    />
                                                    {uploading && (
                                                        <div className="flex items-center px-3 border rounded-md bg-muted">
                                                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
                                                <Input
                                                    id="fullName"
                                                    placeholder="John Doe"
                                                    value={formData.full_name}
                                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="email">Email</Label>
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        placeholder="john@email.com"
                                                        value={formData.email}
                                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="phone">Phone</Label>
                                                    <Input
                                                        id="phone"
                                                        placeholder="+1 234 567 890"
                                                        value={formData.phone}
                                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="device_user_id">Biometric ID (Device Assigned)</Label>
                                                    <Input
                                                        id="device_user_id"
                                                        placeholder="e.g. 1001"
                                                        value={formData.device_user_id}
                                                        onChange={(e) => setFormData({ ...formData, device_user_id: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Subscription Plan <span className="text-destructive">*</span></Label>
                                                <Select
                                                    value={formData.membership_plan_id}
                                                    onValueChange={(val) => setFormData({ ...formData, membership_plan_id: val })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select plan" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {plans.map((plan) => (
                                                            <SelectItem key={plan.id} value={plan.id.toString()}>
                                                                {plan.name} - ₹{plan.price}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="joinDate">Join Date</Label>
                                                    <Input
                                                        id="joinDate"
                                                        type="date"
                                                        value={formData.join_date}
                                                        onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Assigned Personal Trainer</Label>
                                                    <Select
                                                        value={formData.trainer_id}
                                                        onValueChange={(val) => setFormData({ ...formData, trainer_id: val })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Personal Trainer (optional)" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">No Personal Trainer</SelectItem>
                                                            {trainers.map((trainer) => (
                                                                <SelectItem key={trainer.id} value={trainer.id.toString()}>
                                                                    {trainer.full_name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="ptFee">Personal Training Fee (Monthly)</Label>
                                                        <div className="relative">
                                                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                            <Input
                                                                id="ptFee"
                                                                type="number"
                                                                className="pl-9"
                                                                value={formData.pt_fee}
                                                                onChange={(e) => setFormData({ ...formData, pt_fee: e.target.value })}
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 mt-4">
                                                    <div className="space-y-2">
                                                        <Label>Gender</Label>
                                                        <Select
                                                            value={formData.gender}
                                                            onValueChange={(val) => setFormData({ ...formData, gender: val })}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select gender" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Male">Male</SelectItem>
                                                                <SelectItem value="Female">Female</SelectItem>
                                                                <SelectItem value="Other">Other</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Status</Label>
                                                        <Select
                                                            value={formData.status}
                                                            onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="active">Active</SelectItem>
                                                                <SelectItem value="expired">Expired</SelectItem>
                                                                <SelectItem value="paused">Paused</SelectItem>
                                                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-3 mt-6">
                                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button className="gradient-primary" onClick={handleSubmit}>
                                                {editingMember ? "Update Member" : "Register Member"}
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>

                        {/* Renewal Dialog */}
                        <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
                            <DialogContent className="sm:max-w-[400px]">
                                <DialogHeader>
                                    <DialogTitle>Renew Membership</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Member</Label>
                                        <div className="font-medium">{renewingMember?.full_name}</div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Select Plan</Label>
                                        <Select
                                            value={renewFormData.plan_id}
                                            onValueChange={(val) => setRenewFormData({ ...renewFormData, plan_id: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select plan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {plans.map((plan) => (
                                                    <SelectItem key={plan.id} value={plan.id.toString()}>
                                                        {plan.name} - ₹{plan.price} ({plan.duration_value} {plan.duration_unit})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Start Date</Label>
                                        <Input
                                            type="date"
                                            value={renewFormData.start_date}
                                            onChange={(e) => setRenewFormData({ ...renewFormData, start_date: e.target.value })}
                                        />
                                    </div>
                                    {renewingMember?.pt_fee && (role?.isOwner || renewingMember.trainer_id?.toString() === role?.staff_id?.toString()) ? (
                                        <div className="p-3 bg-muted/30 rounded-lg flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground font-medium flex items-center gap-2">
                                                <User className="h-3.5 w-3.5" />
                                                PT Fee (Current)
                                            </span>
                                            <span className="font-semibold text-primary">₹{renewingMember.pt_fee}</span>
                                        </div>
                                    ) : null}
                                </div>
                                <div className="flex justify-end gap-3">
                                    <Button variant="outline" onClick={() => setRenewDialogOpen(false)}>Cancel</Button>
                                    <Button className="gradient-primary" onClick={handleRenewSubmit}>
                                        Confirm Renewal
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* History Dialog */}
                        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
                            <DialogContent className="sm:max-w-[700px]">
                                <DialogHeader>
                                    <DialogTitle>Membership History - {viewingMember?.full_name}</DialogTitle>
                                </DialogHeader>
                                <div className="mt-4">
                                    {historyLoading ? (
                                        <div className="flex justify-center p-8">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        </div>
                                    ) : memberHistory.length === 0 ? (
                                        <div className="text-center p-8 text-muted-foreground">
                                            No history found for this member.
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Plan</TableHead>
                                                    <TableHead>Start Date</TableHead>
                                                    <TableHead>End Date</TableHead>
                                                    <TableHead>Renwed At</TableHead>
                                                    <TableHead>Payment Status</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {memberHistory.map((history) => {
                                                    const payment = history.gym_membership_payments?.[0];
                                                    return (
                                                        <TableRow key={history.id}>
                                                            <TableCell className="font-medium">
                                                                {history.gym_membership_plans?.name || "Unknown Plan"}
                                                            </TableCell>
                                                            <TableCell>{history.start_date}</TableCell>
                                                            <TableCell>{history.end_date}</TableCell>
                                                            <TableCell>
                                                                {history.renewed_at ? format(new Date(history.renewed_at), "MMM d, yyyy") : "-"}
                                                            </TableCell>
                                                            <TableCell>
                                                                {payment ? (
                                                                    <div className="flex flex-col gap-1.5">
                                                                        {payment.payment_status === 'paid' && (
                                                                            <Badge variant="outline" className="w-fit bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800">
                                                                                <CheckCircle className="w-3 h-3 mr-1" /> Paid
                                                                            </Badge>
                                                                        )}
                                                                        {payment.payment_status === 'partial' && (
                                                                            <Badge variant="outline" className="w-fit bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-800">
                                                                                <Clock className="w-3 h-3 mr-1" /> Partial
                                                                            </Badge>
                                                                        )}
                                                                        {payment.payment_status === 'unpaid' && (
                                                                            <Badge variant="outline" className="w-fit bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-800">
                                                                                <AlertCircle className="w-3 h-3 mr-1" /> Unpaid
                                                                            </Badge>
                                                                        )}
                                                                        <span className="text-xs text-muted-foreground font-medium">
                                                                            ₹{payment.paid_amount} <span className="text-muted-foreground/60">/</span> ₹{payment.total_amount}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-muted-foreground text-sm">-</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={differenceInCalendarDays(new Date(history.end_date), new Date()) < 0 ? "secondary" : "default"}>
                                                                    {differenceInCalendarDays(new Date(history.end_date), new Date()) < 0 ? "Expired" : "Active"}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {(payment && (payment.payment_status === 'unpaid' || payment.payment_status === 'partial')) ? (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-7 text-xs"
                                                                        onClick={() => {
                                                                            if (viewingMember) {
                                                                                setSelectedPaymentMember({
                                                                                    ...payment,
                                                                                    gym_members: viewingMember
                                                                                } as any);
                                                                                setRecordPaymentOpen(true);
                                                                            }
                                                                        }}
                                                                    >
                                                                        Pay
                                                                    </Button>
                                                                ) : (payment && payment.payment_status === 'paid') ? (
                                                                    <div className="flex items-center justify-end text-emerald-600 text-xs font-medium opacity-80 gap-1 pr-2">
                                                                        <CheckCircle className="h-3.5 w-3.5" />
                                                                        Done
                                                                    </div>
                                                                ) : null}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Member</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Plan</TableHead>
                                        <TableHead>Expiry</TableHead>
                                        <TableHead>Trainer</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredMembers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                                No members found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredMembers.map((member) => (
                                            <TableRow
                                                key={member.id}
                                                className="hover:bg-muted/50 transition-colors animate-fade-in cursor-pointer"
                                                onClick={() => navigate(`/members/${member.id}`)}
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10">
                                                            <AvatarImage src={member.image_url || undefined} />
                                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                                {member.full_name.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="font-semibold">{member.full_name}</div>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                                                        {member.email && (
                                                            <span className="flex items-center gap-1">
                                                                <Mail className="h-3.5 w-3.5" />
                                                                {member.email}
                                                            </span>
                                                        )}
                                                        {member.phone ? (
                                                            <span className="flex items-center gap-1">
                                                                <Phone className="h-3.5 w-3.5" />
                                                                {member.phone}
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-muted-foreground/50">
                                                                <Phone className="h-3.5 w-3.5 opacity-50" />
                                                                -
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                                                        {member.gym_membership_plans ? (
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-3.5 w-3.5" />
                                                                {member.gym_membership_plans.name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                                                        {member.expiry_date ? (
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3.5 w-3.5" />
                                                                {member.expiry_date}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        {member.gym_staff ? (
                                                            <span className="flex items-center gap-1 text-primary text-sm font-medium">
                                                                <User className="h-3.5 w-3.5" />
                                                                {member.gym_staff.full_name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground text-sm">-</span>
                                                        )}
                                                        {member.pt_fee && member.pt_fee > 0 && (role?.isOwner || member.trainer_id?.toString() === role?.staff_id?.toString()) ? (
                                                            <div className="flex flex-col gap-1 mt-1">
                                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                    <IndianRupee className="h-2.5 w-2.5" />
                                                                    PT Fee: ₹{member.pt_fee}
                                                                </span>
                                                                {(() => {
                                                                    const ptPayment = member.gym_membership_payments?.find(p => 
                                                                        p.remarks === 'Personal Training Fee' && 
                                                                        p.payment_status !== 'paid'
                                                                    );
                                                                    if (ptPayment) {
                                                                        return (
                                                                            <Button 
                                                                                size="sm" 
                                                                                variant="outline" 
                                                                                className="h-6 text-[10px] w-fit px-2 border-primary/30 text-primary hover:bg-primary/5"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSelectedPaymentMember({ ...ptPayment, gym_members: member } as any);
                                                                                    setRecordPaymentOpen(true);
                                                                                }}
                                                                            >
                                                                                Pay PT Fee
                                                                            </Button>
                                                                        );
                                                                    }
                                                                    return null;
                                                                })()}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex flex-col items-start gap-1">
                                                        {(() => {
                                                            const allPayments = member.gym_membership_payments || [];
                                                            // 1. Identify "Current" Payments (linked to latest history)
                                                            const sortedHistory = member.gym_membership_history?.slice().sort((a, b) => b.id - a.id) || [];
                                                            const latestHistory = sortedHistory[0];

                                                            const currentPayments = allPayments.filter(p => p.membership_history_id === latestHistory?.id);

                                                            const badges = [];

                                                            // 1. Current/Latest Payments Status
                                                            if (currentPayments.length > 0) {
                                                                currentPayments.forEach((payment, idx) => {
                                                                    let colorClass = "bg-secondary text-secondary-foreground";
                                                                    if (payment.payment_status === 'paid') colorClass = "text-success bg-success/10 border-success/20";
                                                                    if (payment.payment_status === 'partial') colorClass = "text-warning bg-warning/10 border-warning/20";
                                                                    if (payment.payment_status === 'unpaid') colorClass = "text-destructive bg-destructive/10 border-destructive/20";

                                                                    badges.push(
                                                                        <span key={`current-${payment.id}`} className="flex items-center">
                                                                            <Badge variant="outline" className={`h-5 text-[10px] px-1.5 ${colorClass}`}>
                                                                                {payment.remarks ? `${payment.remarks}: ` : ""}
                                                                                {payment.payment_status.toUpperCase()}
                                                                                {payment.payment_status !== 'paid' && ` (₹${payment.due_amount})`}
                                                                            </Badge>
                                                                        </span>
                                                                    );
                                                                });
                                                            } else if (latestHistory && latestHistory.payment_status) {
                                                                // Fallback to history status if payment record missing
                                                                let colorClass = "bg-secondary text-secondary-foreground";
                                                                if (latestHistory.payment_status === 'paid') colorClass = "text-success bg-success/10 border-success/20";
                                                                if (latestHistory.payment_status === 'partial') colorClass = "text-warning bg-warning/10 border-warning/20";
                                                                if (latestHistory.payment_status === 'unpaid') colorClass = "text-destructive bg-destructive/10 border-destructive/20";

                                                                badges.push(
                                                                    <span key="history-status" className="flex items-center">
                                                                        <Badge variant="outline" className={`h-5 text-[10px] px-1.5 ${colorClass}`}>
                                                                            {latestHistory.payment_status.toUpperCase()}
                                                                        </Badge>
                                                                    </span>
                                                                );
                                                            }

                                                            // 2. Check for Previous Unpaid/Partial Payments
                                                            const previousUnpaid = allPayments.filter(p => 
                                                                !currentPayments.some(cp => cp.id === p.id) && 
                                                                (p.payment_status === 'unpaid' || p.payment_status === 'partial')
                                                            );

                                                            if (previousUnpaid.length > 0) {
                                                                const totalPreviousDue = previousUnpaid.reduce((sum, p) => sum + (p.due_amount || 0), 0);

                                                                badges.push(
                                                                    <span key="previous-dues" className="flex items-center">
                                                                        <Badge variant="outline" className="h-5 text-[10px] px-1.5 text-destructive bg-destructive/10 border-destructive/20 border-dashed">
                                                                            PREVIOUS DUE (₹{totalPreviousDue})
                                                                        </Badge>
                                                                    </span>
                                                                );
                                                            }

                                                            return badges;
                                                        })()}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    {(() => {
                                                        const status = getMemberStatusDisplay(member);
                                                        return <Badge
                                                            variant={status.variant as "default" | "secondary" | "destructive" | "outline"}
                                                            className={status.className}
                                                        >
                                                            {status.label}
                                                        </Badge>
                                                            ;
                                                    })()}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <div className="flex justify-end items-center gap-2">
                                                        {hasPermission('edit_members') && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenDialog(member);
                                                                }}
                                                                title="Edit Member"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {hasPermission('delete_members') && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-destructive hover:bg-destructive/10"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDelete(member.id);
                                                                }}
                                                                title="Delete Member"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                                {hasPermission('view_membership_history') && (
                                                                    <DropdownMenuItem onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleViewHistory(member);
                                                                    }}>
                                                                        <Eye className="h-4 w-4 mr-2" />
                                                                        View History
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {hasPermission('edit_members') && (
                                                                    <DropdownMenuItem onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleOpenAssignTrainer(member);
                                                                    }}>
                                                                        <User className="h-4 w-4 mr-2" />
                                                                        Assign Personal Trainer
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {hasPermission('renew_membership') && (
                                                                    <DropdownMenuItem onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleOpenRenewDialog(member);
                                                                    }}>
                                                                        <RefreshCw className="h-4 w-4 mr-2" />
                                                                        Renew
                                                                    </DropdownMenuItem>
                                                                )}

                                                                {/* Payment Action */}
                                                                {(hasPermission('manage_payments') || (member.trainer_id && member.trainer_id.toString() === role?.staff_id?.toString())) && (() => {
                                                                    const actions = [];
                                                                    // 1. Existing Payments that need attention (Unpaid or Partial)
                                                                    // Get ALL payments for this member
                                                                    const allPayments = member.gym_membership_payments || [];

                                                                    // Filter for unpaid or partial
                                                                    const outstandingPayments = allPayments.filter(p => p.payment_status !== 'paid');

                                                                    // Sort: Most recent first
                                                                    outstandingPayments.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

                                                                    // Find the active or most recent history to identify which one is "Current"
                                                                    const sortedHistory = member.gym_membership_history?.slice().sort((a, b) => b.id - a.id) || [];
                                                                    const latestHistory = sortedHistory[0];

                                                                    // Render actions for existing payments
                                                                    outstandingPayments.forEach(payment => {
                                                                        const isLatest = latestHistory && payment.membership_history_id === latestHistory.id;
                                                                        const label = isLatest
                                                                            ? (payment.remarks || `Record Payment`)
                                                                            : (payment.remarks ? `Pay ${payment.remarks} (Previous)` : `Pay Previous Due`);

                                                                        actions.push(
                                                                            <DropdownMenuItem key={`pay-${payment.id}`} onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const paymentWithMember = { ...payment, gym_members: member };
                                                                                setSelectedPaymentMember(paymentWithMember as any);
                                                                                setRecordPaymentOpen(true);
                                                                            }}>
                                                                                <IndianRupee className="h-4 w-4 mr-2" />
                                                                                {label} (₹{payment.due_amount})
                                                                            </DropdownMenuItem>
                                                                        );
                                                                    });

                                                                    // 2. Missing Invoices (History exists as unpaid/partial, but no payment record)
                                                                    // This happens if a user deleted the payment record manually but history remains
                                                                    const paidHistoryIds = allPayments.map(p => p.membership_history_id);

                                                                    // Find histories that are unpaid/partial but NOT in the payments list
                                                                    const orphanHistories = sortedHistory.filter(h =>
                                                                        (h.payment_status === 'unpaid' || h.payment_status === 'partial') &&
                                                                        !paidHistoryIds.includes(h.id)
                                                                    );

                                                                    orphanHistories.forEach(history => {
                                                                        const isLatest = history.id === latestHistory?.id;
                                                                        const label = isLatest ? "Regenerate Invoice" : "Regenerate Past Invoice";

                                                                        actions.push(
                                                                            <DropdownMenuItem key={`regen-${history.id}`} onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                try {
                                                                                    // Find plan details to get price
                                                                                    const plan = plans.find(p => p.id === history.plan_id);
                                                                                    if (!plan) {
                                                                                        toast.error("Plan details not found, cannot regenerate invoice.");
                                                                                        return;
                                                                                    }

                                                                                    const loadingToast = toast.loading("Regenerating invoice...");

                                                                                    // Create new Payment Record
                                                                                    const { data: newPayment, error } = await supabase
                                                                                        .from("gym_membership_payments")
                                                                                        .insert({
                                                                                            membership_history_id: history.id,
                                                                                            member_id: member.id,
                                                                                            gym_id: gymId,
                                                                                            total_amount: plan.price,
                                                                                            paid_amount: 0,
                                                                                            due_amount: plan.price,
                                                                                            payment_status: 'unpaid',
                                                                                            billing_date: new Date().toISOString()
                                                                                        })
                                                                                        .select()
                                                                                        .single();

                                                                                    if (error) throw error;

                                                                                    toast.dismiss(loadingToast);
                                                                                    toast.success("Invoice regenerated");

                                                                                    // Refresh list then open dialog
                                                                                    await fetchMembers();

                                                                                    const paymentWithMember = { ...newPayment, gym_members: member };
                                                                                    setSelectedPaymentMember(paymentWithMember as any);
                                                                                    setRecordPaymentOpen(true);

                                                                                } catch (err: any) {
                                                                                    toast.error("Failed to regenerate invoice: " + err.message);
                                                                                }
                                                                            }}>
                                                                                <IndianRupee className="h-4 w-4 mr-2" />
                                                                                {label}
                                                                            </DropdownMenuItem>
                                                                        );
                                                                    });

                                                                    return actions;
                                                                })()}

                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Dialog open={assignTrainerOpen} onOpenChange={setAssignTrainerOpen}>
                        <DialogContent className="sm:max-w-[400px]">
                            <DialogHeader>
                                <DialogTitle>Assign Personal Trainer</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Member</Label>
                                    <div className="font-medium">{assignTrainerMember?.full_name}</div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Select Personal Trainer</Label>
                                    <Select
                                        value={selectedTrainerId}
                                        onValueChange={setSelectedTrainerId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Personal Trainer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Personal Trainer</SelectItem>
                                            {trainers.map((trainer) => (
                                                <SelectItem key={trainer.id} value={trainer.id.toString()}>
                                                    {trainer.full_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setAssignTrainerOpen(false)}>Cancel</Button>
                                <Button className="gradient-primary" onClick={handleAssignTrainerSubmit}>
                                    Save Assignment
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <RecordPaymentDialog
                        open={recordPaymentOpen}
                        onOpenChange={setRecordPaymentOpen}
                        payment={selectedPaymentMember}
                        onSuccess={() => {
                            fetchMembers();
                            if (historyDialogOpen && viewingMember) {
                                handleViewHistory(viewingMember);
                            }
                        }}
                    />
                </>
            )}
        </>
    );
}
