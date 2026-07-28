import React, { useState, useRef, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Upload,
    Download,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Loader2,
    FileSpreadsheet,
    Play,
    RefreshCw,
    Info
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { GymMembershipPlan, GymStaff } from "@/types/gym";
import { toast } from "sonner";
import { format, addMonths, addDays, addYears, differenceInCalendarDays } from "date-fns";
import * as XLSX from "xlsx";

interface ImportMembersDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    gymId: number | null;
    plans: GymMembershipPlan[];
    staffList: GymStaff[];
    onSuccess: () => void;
    subscription: any;
    currentMembersCount: number;
    gyms: any[];
}

interface ParsedRow {
    index: number;
    fullName: string;
    phone: string;
    email: string;
    gender: string;
    joinDate: string;
    planName: string;
    status: "active" | "expired" | "paused" | "cancelled";
    errors: string[];
    warnings: string[];
    matchedPlanId?: number;
}

export default function ImportMembersDialog({
    open,
    onOpenChange,
    gymId,
    plans,
    staffList,
    onSuccess,
    subscription,
    currentMembersCount,
    gyms
}: ImportMembersDialogProps) {
    const [step, setStep] = useState<"upload" | "preview" | "importing" | "result">("upload");
    const [dragActive, setDragActive] = useState(false);
    const [fileName, setFileName] = useState<string>("");
    const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
    const [importProgress, setImportProgress] = useState(0);
    const [importStats, setImportStats] = useState({
        success: 0,
        failed: 0,
        total: 0
    });
    const [importErrors, setImportErrors] = useState<{ row: number; name: string; error: string }[]>([]);
    const [isCheckingLimits, setIsCheckingLimits] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state when dialog is closed
    useEffect(() => {
        if (!open) {
            resetState();
        }
    }, [open]);

    // Helpers
    const parseExcelDate = (val: any): string => {
        if (!val) return format(new Date(), "yyyy-MM-dd");

        // Excel serial date format
        if (typeof val === 'number') {
            const utc_days = Math.floor(val - 25569);
            const utc_value = utc_days * 86400;
            const date_info = new Date(utc_value * 1000);
            const fractional_day = val - Math.floor(val) + 0.0000001;
            let total_seconds = Math.floor(86400 * fractional_day);
            const seconds = total_seconds % 60;
            total_seconds -= seconds;
            const minutes = Math.floor(total_seconds / 60) % 60;
            const hours = Math.floor(total_seconds / 3600);

            const date = new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
            return format(date, "yyyy-MM-dd");
        }

        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            return format(d, "yyyy-MM-dd");
        }

        return format(new Date(), "yyyy-MM-dd");
    };

    const calculateExpiry = (joinDate: string, planId: number) => {
        const plan = plans.find(p => p.id === planId);
        if (!plan) return null;

        const start = new Date(joinDate);
        if (plan.duration_unit === 'month') return format(addMonths(start, plan.duration_value), 'yyyy-MM-dd');
        if (plan.duration_unit === 'year') return format(addYears(start, plan.duration_value), 'yyyy-MM-dd');
        if (plan.duration_unit === 'day') return format(addDays(start, plan.duration_value), 'yyyy-MM-dd');
        return null;
    };

    const getMemberStatusDisplay = (status: string, joinDate: string, planId?: number) => {
        // If manually set to non-active, respect that
        if (status === 'paused' || status === 'cancelled') {
            return {
                label: status.charAt(0).toUpperCase() + status.slice(1),
                variant: "secondary" as const,
                className: ""
            };
        }

        const expiryDate = planId ? calculateExpiry(joinDate, planId) : null;

        if (!expiryDate) {
            return {
                label: status.charAt(0).toUpperCase() + status.slice(1),
                variant: status === 'active' ? "default" : "destructive" as const,
                className: status === 'active' ? "bg-success hover:bg-success/80" : ""
            };
        }

        const daysUntilExpiry = differenceInCalendarDays(new Date(expiryDate), new Date());

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

    // Download template
    const handleDownloadTemplate = () => {
        const headers = [
            ["Full Name *", "Phone", "Email", "Gender", "Join Date (YYYY-MM-DD)", "Plan Name", "Status"]
        ];
        const sampleData = [
            ["John Doe", "9876543210", "john@example.com", "Male", "2026-05-29", plans[0]?.name || "Monthly Standard", "active"],
            ["Alice Smith", "8765432109", "alice@example.com", "Female", "2026-05-30", plans[1]?.name || plans[0]?.name || "Monthly Premium", "active"]
        ];

        const wsMembers = XLSX.utils.aoa_to_sheet([...headers, ...sampleData]);

        // Col widths for premium layout
        wsMembers["!cols"] = [
            { wch: 20 }, // Full Name
            { wch: 15 }, // Phone
            { wch: 25 }, // Email
            { wch: 10 }, // Gender
            { wch: 22 }, // Join Date
            { wch: 20 }, // Plan Name
            { wch: 10 }, // Status
        ];

        // Reference Sheet
        const refHeaders = [["Available Membership Plans", "Price"]];
        const refData: any[][] = [];
        for (let i = 0; i < plans.length; i++) {
            const plan = plans[i];
            refData.push([
                plan ? plan.name : "",
                plan ? `₹${plan.price}` : ""
            ]);
        }

        const wsRef = XLSX.utils.aoa_to_sheet([...refHeaders, ...refData]);
        wsRef["!cols"] = [
            { wch: 25 }, // Plan Name
            { wch: 12 }, // Price
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsMembers, "Import Members");
        XLSX.utils.book_append_sheet(wb, wsRef, "Available Reference Data");

        XLSX.writeFile(wb, "Gymatrix_Members_Import_Template.xlsx");
        toast.success("Excel template downloaded!");
    };

    // Drag-and-drop & File Handling
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = async (file: File) => {
        const validExtensions = ["xlsx", "xls", "csv"];
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!ext || !validExtensions.includes(ext)) {
            toast.error("Please upload an Excel spreadsheet (.xlsx, .xls) or CSV file.");
            return;
        }

        setFileName(file.name);
        setIsCheckingLimits(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Read rows as AOA (Array of Arrays) to control mapping strictly
                const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

                if (rows.length <= 1) {
                    toast.error("The spreadsheet contains no member data rows.");
                    setIsCheckingLimits(false);
                    return;
                }

                // Verify header columns look correct (simple check)
                const headerRow = rows[0];
                if (!headerRow || headerRow.length === 0) {
                    toast.error("The spreadsheet has an invalid header row.");
                    setIsCheckingLimits(false);
                    return;
                }

                const newParsedData: ParsedRow[] = [];

                // Parse content rows (start from index 1)
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    // Skip empty rows
                    if (!row || row.length === 0 || row.every(val => val === undefined || val === null || val === "")) {
                        continue;
                    }

                    const errors: string[] = [];
                    const warnings: string[] = [];

                    // Fields mapping
                    const fullName = (row[0] || "").toString().trim();
                    const phone = (row[1] || "").toString().trim();
                    const email = (row[2] || "").toString().trim();
                    const gender = (row[3] || "").toString().trim();
                    const rawJoinDate = row[4];
                    const rawPlanName = (row[5] || "").toString().trim();
                    const statusStr = (row[6] || "active").toString().trim().toLowerCase();

                    // Validation - Full Name
                    if (!fullName) {
                        errors.push("Full Name is required.");
                    }

                    // Validation - Email
                    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                        warnings.push("Invalid email format.");
                    }

                    // Validation - Phone
                    if (phone && !/^\+?[0-9\s-]{8,15}$/.test(phone)) {
                        warnings.push("Phone format looks irregular.");
                    }

                    // Validate Join Date
                    const joinDate = parseExcelDate(rawJoinDate);

                    // Map Plan
                    let matchedPlanId: number | undefined = undefined;
                    if (rawPlanName) {
                        const matchedPlan = plans.find(
                            p => p.name.toLowerCase() === rawPlanName.toLowerCase()
                        );
                        if (matchedPlan) {
                            matchedPlanId = matchedPlan.id;
                        } else {
                            warnings.push(`Plan "${rawPlanName}" not found. Member will have no active plan.`);
                        }
                    } else {
                        warnings.push("No subscription plan specified. Member will have no active plan.");
                    }

                    // Validate Status
                    let status: "active" | "expired" | "paused" | "cancelled" = "active";
                    if (["active", "expired", "paused", "cancelled"].includes(statusStr)) {
                        status = statusStr as any;
                    }

                    newParsedData.push({
                        index: i,
                        fullName,
                        phone,
                        email,
                        gender,
                        joinDate,
                        planName: rawPlanName,
                        status,
                        errors,
                        warnings,
                        matchedPlanId
                    });
                }

                setParsedData(newParsedData);
                setStep("preview");
            } catch (err: any) {
                console.error(err);
                toast.error("Failed to parse file: " + err.message);
            } finally {
                setIsCheckingLimits(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Confirm and Execute Import
    const handleImportSubmit = async () => {
        if (!gymId) return;

        // 1. Subscription Check (Only check if subscription config is active)
        if (subscription) {
            try {
                const { count, error: countError } = await supabase
                    .from("gym_members")
                    .select("*", { count: "exact", head: true })
                    .in("gym_id", gyms.map(g => g.id))
                    .eq("is_deleted", false);

                if (countError) throw countError;

                const currentCount = count || 0;
                const newValidMembersCount = parsedData.filter(d => d.errors.length === 0).length;

                if (currentCount + newValidMembersCount > (subscription.max_members || 0)) {
                    toast.error(
                        `Import blocked! This import would exceed your subscription limit of ${subscription.max_members
                        } members (Current: ${currentCount}, Trying to add: ${newValidMembersCount}). Please upgrade.`
                    );
                    return;
                }
            } catch (error) {
                console.error("Subscription check error", error);
            }
        }

        // Filter valid data rows only
        const rowsToImport = parsedData.filter(d => d.errors.length === 0);
        if (rowsToImport.length === 0) {
            toast.error("No valid member records to import.");
            return;
        }

        setStep("importing");
        setImportProgress(0);
        setImportErrors([]);

        let successCount = 0;
        let failedCount = 0;
        const total = rowsToImport.length;

        for (let i = 0; i < total; i++) {
            const memberRow = rowsToImport[i];

            try {
                const expiryDate = memberRow.matchedPlanId
                    ? calculateExpiry(memberRow.joinDate, memberRow.matchedPlanId)
                    : null;

                const payload = {
                    gym_id: gymId,
                    full_name: memberRow.fullName,
                    email: memberRow.email || null,
                    phone: memberRow.phone || null,
                    membership_plan_id: memberRow.matchedPlanId || null,
                    assigned_staff_id: null,
                    join_date: memberRow.joinDate,
                    expiry_date: expiryDate,
                    image_url: null,
                    gender: memberRow.gender || null,
                    pt_fee: 0,
                    status: memberRow.status,
                    is_active: memberRow.status === 'active',
                    is_deleted: false
                };

                // Insert Member
                const { data: newMember, error: insertError } = await supabase
                    .from("gym_members")
                    .insert(payload)
                    .select()
                    .single();

                if (insertError) throw insertError;

                // Add History and Payments
                if (newMember && payload.membership_plan_id && payload.expiry_date) {
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
                            // Insert Subscription Payment Record
                            await supabase.from("gym_membership_payments").insert({
                                membership_history_id: historyData.id,
                                member_id: newMember.id,
                                gym_id: gymId,
                                total_amount: plan.price,
                                paid_amount: 0,
                                due_amount: plan.price,
                                payment_status: "unpaid",
                                billing_date: payload.join_date,
                                remarks: "Membership Subscription (Imported)"
                            });
                        }
                    }
                }

                successCount++;
            } catch (err: any) {
                failedCount++;
                setImportErrors(prev => [
                    ...prev,
                    {
                        row: memberRow.index,
                        name: memberRow.fullName || "Row " + memberRow.index,
                        error: err.message || "Unknown database error"
                    }
                ]);
            }

            // Update Progress bar
            setImportProgress(Math.round(((i + 1) / total) * 100));
            setImportStats({ success: successCount, failed: failedCount, total });
        }

        onSuccess();
        if (failedCount === 0) {
            toast.success(`Successfully imported all ${successCount} members!`);
            onOpenChange(false);
        } else {
            setStep("result");
            toast.warning(`Imported ${successCount} members. ${failedCount} records failed.`);
        }
    };

    const resetState = () => {
        setStep("upload");
        setFileName("");
        setParsedData([]);
        setImportProgress(0);
        setImportErrors([]);
        setImportStats({ success: 0, failed: 0, total: 0 });
    };

    return (
        <Dialog open={open} onOpenChange={(val) => { if (step !== "importing") onOpenChange(val); }}>
            <DialogContent className={`transition-all duration-300 p-0 overflow-hidden ${step === "preview" ? "sm:max-w-[950px] h-[85vh]" : "sm:max-w-[550px]"
                }`}>
                <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-muted">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-primary animate-pulse" />
                        {step === "upload" && "Import Members from Excel"}
                        {step === "preview" && "Preview & Validate Imported Members"}
                        {step === "importing" && "Importing Members..."}
                        {step === "result" && "Import Results Summary"}
                    </DialogTitle>
                    <DialogDescription>
                        {step === "upload" && "Upload a spreadsheet (.xlsx, .xls, .csv) with member profiles."}
                        {step === "preview" && `Verified ${parsedData.filter(p => p.errors.length === 0).length} valid rows out of ${parsedData.length}. Check warnings before continuing.`}
                        {step === "importing" && "Adding new members and setting up their membership plans..."}
                        {step === "result" && "All members have been successfully processed."}
                    </DialogDescription>
                </DialogHeader>

                {/* STEP 1: UPLOAD & TEMPLATE DOWNLOAD */}
                {step === "upload" && (
                    <div className="p-6 space-y-6">
                        <div className="flex justify-between items-center p-4 bg-primary/5 rounded-xl border border-primary/10">
                            <div className="space-y-1">
                                <h4 className="font-bold text-sm text-foreground">Need the correct template?</h4>
                                <p className="text-xs text-muted-foreground">Download our pre-structured template containing your gym's current plans and staff.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="border-primary/20 hover:bg-primary/5 text-primary font-bold whitespace-nowrap">
                                <Download className="h-4 w-4 mr-1.5" />
                                Download template
                            </Button>
                        </div>

                        <div
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200 ${dragActive
                                    ? "border-primary bg-primary/5 scale-[0.98]"
                                    : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/10"
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <div className="p-4 rounded-full bg-primary/10 text-primary">
                                {isCheckingLimits ? (
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                ) : (
                                    <Upload className="h-8 w-8" />
                                )}
                            </div>
                            <div className="text-center space-y-1">
                                <p className="font-semibold text-sm">Drag and drop file here, or click to browse</p>
                                <p className="text-xs text-muted-foreground">Supports .xlsx, .xls, and .csv (Max 5MB)</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: PREVIEW & VALIDATION */}
                {step === "preview" && (
                    <div className="flex flex-col h-[calc(85vh-90px)]">
                        <ScrollArea className="flex-1 px-6">
                            <div className="space-y-6 py-4">
                                <div className="border rounded-xl overflow-hidden shadow-sm bg-background">
                                    <Table>
                                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                            <TableRow>
                                                <TableHead className="w-12 text-center">Row</TableHead>
                                                <TableHead>Full Name</TableHead>
                                                <TableHead>Contact / Email</TableHead>
                                                <TableHead>Gender</TableHead>
                                                <TableHead>Join Date</TableHead>
                                                <TableHead>Sub Plan</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="max-w-[200px]">Validation Issues</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="divide-y divide-muted">
                                            {parsedData.map((row) => (
                                                <TableRow key={row.index} className={`hover:bg-muted/30 transition-colors ${row.errors.length > 0 ? "bg-red-500/5 hover:bg-red-500/10" : ""
                                                    }`}>
                                                    <TableCell className="text-center font-bold text-muted-foreground">{row.index}</TableCell>
                                                    <TableCell className="font-semibold">{row.fullName || <span className="text-destructive font-bold italic">Missing</span>}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col text-xs">
                                                            <span className="font-medium text-foreground">{row.phone || "-"}</span>
                                                            <span className="text-muted-foreground">{row.email || "-"}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">{row.gender || "-"}</TableCell>
                                                    <TableCell className="text-xs whitespace-nowrap">{row.joinDate}</TableCell>
                                                    <TableCell>
                                                        {row.planName ? (
                                                            <div className="flex flex-col text-xs">
                                                                <span className={row.matchedPlanId ? "text-foreground font-semibold" : "text-amber-600 font-bold"}>{row.planName}</span>
                                                                {row.matchedPlanId && (
                                                                    <span className="text-[10px] text-emerald-600 font-bold">Mapped ✓</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">None</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {(() => {
                                                            const status = getMemberStatusDisplay(row.status, row.joinDate, row.matchedPlanId);
                                                            return (
                                                                <Badge
                                                                    variant={status.variant as "default" | "secondary" | "destructive" | "outline"}
                                                                    className={status.className}
                                                                >
                                                                    {status.label}
                                                                </Badge>
                                                            );
                                                        })()}
                                                    </TableCell>
                                                    <TableCell className="max-w-[200px]">
                                                        <div className="flex flex-col gap-1">
                                                            {row.errors.map((err, idx) => (
                                                                <span key={idx} className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                                                                    <XCircle className="h-3 w-3 flex-shrink-0" />
                                                                    {err}
                                                                </span>
                                                            ))}
                                                            {row.warnings.map((warn, idx) => (
                                                                <span key={idx} className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                                                                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                                                    {warn}
                                                                </span>
                                                            ))}
                                                            {row.errors.length === 0 && row.warnings.length === 0 && (
                                                                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                                                    <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                                                                    Valid Record
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </ScrollArea>

                        <div className="flex justify-between items-center p-6 border-t bg-muted/30">
                            <Button variant="outline" onClick={resetState}>
                                Back to Upload
                            </Button>

                            <div className="flex gap-3">
                                <Button variant="ghost" className="text-muted-foreground hover:bg-muted" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    className="gradient-primary shadow-glow font-bold"
                                    disabled={parsedData.filter(p => p.errors.length === 0).length === 0}
                                    onClick={handleImportSubmit}
                                >
                                    <Play className="h-4 w-4 mr-2" />
                                    Import {parsedData.filter(p => p.errors.length === 0).length} Valid Members
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: IMPORTING */}
                {step === "importing" && (
                    <div className="p-10 space-y-8 flex flex-col items-center text-center">
                        <div className="relative flex items-center justify-center">
                            <Loader2 className="h-16 w-16 text-primary animate-spin" />
                            <span className="absolute text-xs font-black text-primary">{importProgress}%</span>
                        </div>
                        <div className="space-y-2 w-full max-w-sm">
                            <h4 className="font-bold text-lg text-foreground">Saving members to your gym...</h4>
                            <Progress value={importProgress} className="h-2 w-full" />
                            <p className="text-xs text-muted-foreground mt-2">
                                Successfully added {importStats.success} member profiles
                            </p>
                        </div>
                    </div>
                )}

                {/* STEP 4: SUMMARY & RESULTS */}
                {step === "result" && (
                    <div className="p-6 space-y-6">
                        <div className="flex flex-col items-center justify-center gap-2 py-4">
                            <div className="h-14 w-14 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600 mb-2">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">Import Completed!</h3>
                            <p className="text-xs text-muted-foreground text-center max-w-sm">
                                Member profiles have been successfully updated. Review the details below.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl border bg-muted/30 text-center">
                                <span className="text-xs text-muted-foreground font-semibold uppercase">Total Checked</span>
                                <p className="text-2xl font-black mt-1 text-foreground">{importStats.total}</p>
                            </div>
                            <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/10 text-center">
                                <span className="text-xs text-emerald-600 font-semibold uppercase">Success</span>
                                <p className="text-2xl font-black mt-1 text-emerald-600">{importStats.success}</p>
                            </div>
                            <div className="p-4 rounded-xl border bg-destructive/5 border-destructive/10 text-center">
                                <span className="text-xs text-destructive font-semibold uppercase">Failed</span>
                                <p className="text-2xl font-black mt-1 text-destructive">{importStats.failed}</p>
                            </div>
                        </div>

                        {importErrors.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                    <Info className="h-3.5 w-3.5 text-destructive" />
                                    Failed to Import ({importErrors.length})
                                </div>
                                <ScrollArea className="h-40 border rounded-xl p-3 bg-muted/10">
                                    <div className="space-y-1.5">
                                        {importErrors.map((err, idx) => (
                                            <div key={idx} className="text-[11px] font-semibold text-destructive flex justify-between bg-destructive/5 border border-destructive/10 px-2 py-1.5 rounded-lg">
                                                <span>Row {err.row}: {err.name}</span>
                                                <span className="opacity-75">{err.error}</span>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}

                        <div className="flex gap-3 justify-end pt-4 border-t">
                            <Button variant="outline" onClick={resetState} className="flex gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Import Another File
                            </Button>
                            <Button className="gradient-primary shadow-glow font-bold px-6" onClick={() => onOpenChange(false)}>
                                Done & Close
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
