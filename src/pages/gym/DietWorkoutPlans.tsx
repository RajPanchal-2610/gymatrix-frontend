import { useState, useEffect } from "react";
import {
    Plus, Edit, Trash2, Loader2, Apple, Dumbbell,
    Calendar, X, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from "@/components/ui/accordion";
import { useGym } from "@/hooks/useGym";
import { usePermissions } from "@/contexts/PermissionsContext";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    dietWorkoutService,
    DietPlan, DietPlanItem, WorkoutPlan, WorkoutPlanItem,
    DAY_LABELS, MEAL_TYPES
} from "@/services/dietWorkoutService";
import { pdfExportService } from "@/services/pdfExportService";
import { Download, FileText } from "lucide-react";

// ===== EMPTY ITEM FACTORIES =====
const emptyDietItem = (day: number): DietPlanItem => ({
    day_of_week: day,
    meal_type: "breakfast",
    food_item: "",
    quantity: "",
    calories: undefined,
    protein: undefined,
    carbs: undefined,
    fat: undefined,
    notes: "",
});

const emptyWorkoutItem = (day: number): WorkoutPlanItem => ({
    day_of_week: day,
    exercise_name: "",
    muscle_group: "",
    sets: undefined,
    reps: "",
    weight: "",
    duration: "",
    rest_period: "",
    notes: "",
});

// ===== SUB-COMPONENTS (Outside main component to prevent remounting) =====

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        active: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
        inactive: "text-muted-foreground border-border",
        completed: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    };
    return (
        <Badge variant="outline" className={styles[status] || ""}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
    );
};

const PlanCard = ({ plan, type, hasPermission, onEdit, onDelete, onDownload }: { 
    plan: DietPlan | WorkoutPlan; 
    type: "diet" | "workout";
    hasPermission: (p: string) => boolean;
    onEdit: (p: any, t: "diet" | "workout") => void;
    onDelete: (id: number, t: "diet" | "workout") => void;
    onDownload: (p: any, t: "diet" | "workout") => void;
}) => (
    <Card className="group relative overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-border/50 hover:border-primary/30 animate-slide-up">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="relative pb-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold truncate mb-1">
                        {plan.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        <span className="truncate">{plan.gym_members?.full_name || "Unknown"}</span>
                    </div>
                </div>
                <StatusBadge status={plan.status} />
            </div>
        </CardHeader>
        <CardContent className="relative space-y-3 pt-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                    {format(new Date(plan.start_date), "MMM d")} — {format(new Date(plan.end_date), "MMM d, yyyy")}
                </span>
            </div>
            {plan.gym_staff && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                    <Dumbbell className="h-3 w-3" />
                    <span>Trainer: {plan.gym_staff.full_name}</span>
                </div>
            )}
            {plan.notes && (
                <p className="text-xs text-muted-foreground/60 line-clamp-2 italic">{plan.notes}</p>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                {hasPermission('edit_diet_workout_plans') && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs min-w-[70px]"
                        onClick={() => onEdit(plan, type)}
                    >
                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                    </Button>
                )}
                {hasPermission('view_diet_workout_plans') && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs min-w-[70px] border-primary/30 text-primary hover:bg-primary/5"
                        onClick={() => onDownload(plan, type)}
                    >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        PDF
                    </Button>
                )}
                {hasPermission('delete_diet_workout_plans') && (
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => onDelete(plan.id, type)}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>
        </CardContent>
    </Card>
);

const PlansList = ({ plans, type, hasPermission, onCreate, onEdit, onDelete, onDownload }: { 
    plans: (DietPlan | WorkoutPlan)[]; 
    type: "diet" | "workout";
    hasPermission: (p: string) => boolean;
    onCreate: (t: "diet" | "workout") => void;
    onEdit: (p: any, t: "diet" | "workout") => void;
    onDelete: (id: number, t: "diet" | "workout") => void;
    onDownload: (p: any, t: "diet" | "workout") => void;
}) => {
    if (plans.length === 0) {
        return (
            <div className="text-center py-16 border-2 border-dashed border-border/50 rounded-xl bg-muted/10">
                <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    {type === "diet"
                        ? <Apple className="h-7 w-7 text-primary" />
                        : <Dumbbell className="h-7 w-7 text-primary" />
                    }
                </div>
                <p className="text-muted-foreground mb-4">No {type} plans found.</p>
                {hasPermission('add_diet_workout_plans') && (
                    <Button onClick={() => onCreate(type)} className="gradient-primary shadow-glow">
                        <Plus className="h-4 w-4 mr-2" />
                        Create First {type === "diet" ? "Diet" : "Workout"} Plan
                    </Button>
                )}
            </div>
        );
    }
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {plans.map(plan => (
                <PlanCard 
                    key={plan.id} 
                    plan={plan} 
                    type={type} 
                    hasPermission={hasPermission} 
                    onEdit={onEdit} 
                    onDelete={onDelete} 
                    onDownload={onDownload}
                />
            ))}
        </div>
    );
};

const DietItemsEditor = ({ items, onUpdate, onAdd, onRemove }: {
    items: DietPlanItem[];
    onUpdate: (idx: number, field: keyof DietPlanItem, val: any) => void;
    onAdd: (day: number) => void;
    onRemove: (idx: number) => void;
}) => {
    const [selectedDay, setSelectedDay] = useState(1);
    const dayItems = items
        .map((item, idx) => ({ ...item, _idx: idx }))
        .filter(item => item.day_of_week === selectedDay);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 pb-2 border-b border-border/50">
                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                    <Button
                        key={day}
                        variant={selectedDay === day ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedDay(day)}
                        className={`h-9 min-w-[50px] flex-1 ${selectedDay === day ? "gradient-primary shadow-glow border-none" : ""}`}
                    >
                        {DAY_LABELS[day].substring(0, 3)}
                        {items.filter(i => i.day_of_week === day).length > 0 && (
                            <Badge variant="secondary" className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] rounded-full">
                                {items.filter(i => i.day_of_week === day).length}
                            </Badge>
                        )}
                    </Button>
                ))}
            </div>

            <div className="space-y-3 min-h-[300px]">
                <div className="flex justify-between items-center bg-muted/20 p-2 rounded-lg border border-border/50">
                    <h4 className="text-sm font-semibold text-primary">{DAY_LABELS[selectedDay]} Items</h4>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[11px] text-primary hover:text-primary hover:bg-primary/5"
                        onClick={() => onAdd(selectedDay)}
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Meal
                    </Button>
                </div>

                {dayItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border/30 rounded-xl bg-muted/5 opacity-60">
                        <Apple className="h-10 w-10 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No meals added for {DAY_LABELS[selectedDay]}</p>
                    </div>
                ) : (
                    dayItems.map(item => (
                        <div key={item._idx} className="relative border border-border/40 rounded-lg p-3 bg-card shadow-sm hover:shadow-md transition-all space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-1.5 right-1.5 h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => onRemove(item._idx)}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Meal Type</Label>
                                    <Select
                                        value={item.meal_type}
                                        onValueChange={v => onUpdate(item._idx, "meal_type", v)}
                                    >
                                        <SelectTrigger className="h-8 text-xs font-medium"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {MEAL_TYPES.map(mt => (
                                                <SelectItem key={mt.value} value={mt.value} className="text-xs">{mt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Food Item *</Label>
                                    <Input
                                        className="h-8 text-xs"
                                        placeholder="e.g., Oats + Banana"
                                        value={item.food_item}
                                        onChange={e => onUpdate(item._idx, "food_item", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                <div>
                                    <Label className="text-xs text-muted-foreground leading-none mb-1 block">Qty</Label>
                                    <Input className="h-8 text-xs px-2" placeholder="1 bowl" value={item.quantity || ""} onChange={e => onUpdate(item._idx, "quantity", e.target.value)} />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground leading-none mb-1 block">Cal</Label>
                                    <Input className="h-8 text-xs px-2" type="number" placeholder="0" value={item.calories ?? ""} onChange={e => onUpdate(item._idx, "calories", e.target.value ? Number(e.target.value) : undefined)} />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground leading-none mb-1 block">Prot</Label>
                                    <Input className="h-8 text-xs px-2" type="number" placeholder="0" value={item.protein ?? ""} onChange={e => onUpdate(item._idx, "protein", e.target.value ? Number(e.target.value) : undefined)} />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground leading-none mb-1 block">Carb</Label>
                                    <Input className="h-8 text-xs px-2" type="number" placeholder="0" value={item.carbs ?? ""} onChange={e => onUpdate(item._idx, "carbs", e.target.value ? Number(e.target.value) : undefined)} />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground leading-none mb-1 block">Fat</Label>
                                    <Input className="h-8 text-xs px-2" type="number" placeholder="0" value={item.fat ?? ""} onChange={e => onUpdate(item._idx, "fat", e.target.value ? Number(e.target.value) : undefined)} />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground leading-none mb-1 block">Notes / Instructions</Label>
                                <Input 
                                    className="h-8 text-xs" 
                                    placeholder="e.g., Post-workout meal" 
                                    value={item.notes || ""} 
                                    onChange={e => onUpdate(item._idx, "notes", e.target.value)} 
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const WorkoutItemsEditor = ({ items, onUpdate, onAdd, onRemove }: {
    items: WorkoutPlanItem[];
    onUpdate: (idx: number, field: keyof WorkoutPlanItem, val: any) => void;
    onAdd: (day: number) => void;
    onRemove: (idx: number) => void;
}) => {
    const [selectedDay, setSelectedDay] = useState(1);
    const dayItems = items
        .map((item, idx) => ({ ...item, _idx: idx }))
        .filter(item => item.day_of_week === selectedDay);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 pb-2 border-b border-border/50">
                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                    <Button
                        key={day}
                        variant={selectedDay === day ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedDay(day)}
                        className={`h-9 min-w-[50px] flex-1 ${selectedDay === day ? "gradient-primary shadow-glow border-none" : ""}`}
                    >
                        {DAY_LABELS[day].substring(0, 3)}
                        {items.filter(i => i.day_of_week === day).length > 0 && (
                            <Badge variant="secondary" className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] rounded-full">
                                {items.filter(i => i.day_of_week === day).length}
                            </Badge>
                        )}
                    </Button>
                ))}
            </div>

            <div className="space-y-3 min-h-[300px]">
                <div className="flex justify-between items-center bg-muted/20 p-2 rounded-lg border border-border/50">
                    <h4 className="text-sm font-semibold text-primary">{DAY_LABELS[selectedDay]} Exercises</h4>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[11px] text-primary hover:text-primary hover:bg-primary/5"
                        onClick={() => onAdd(selectedDay)}
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Exercise
                    </Button>
                </div>

                {dayItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border/30 rounded-xl bg-muted/5 opacity-60">
                        <Dumbbell className="h-10 w-10 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No exercises added for {DAY_LABELS[selectedDay]}</p>
                    </div>
                ) : (
                    dayItems.map(item => (
                        <div key={item._idx} className="relative border border-border/40 rounded-lg p-3 bg-card shadow-sm hover:shadow-md transition-all space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-1.5 right-1.5 h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => onRemove(item._idx)}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <Label className="text-xs text-muted-foreground font-semibold">Exercise Name *</Label>
                                    <Input className="h-8 text-xs" placeholder="e.g., Bench Press" value={item.exercise_name} onChange={e => onUpdate(item._idx, "exercise_name", e.target.value)} />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Muscle Group</Label>
                                    <Input className="h-8 text-xs" placeholder="e.g., Chest" value={item.muscle_group || ""} onChange={e => onUpdate(item._idx, "muscle_group", e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                <div>
                                    <Label className="text-[10px] text-muted-foreground leading-none mb-1 block">Sets</Label>
                                    <Input className="h-8 text-xs px-2" type="number" placeholder="4" value={item.sets ?? ""} onChange={e => onUpdate(item._idx, "sets", e.target.value ? Number(e.target.value) : undefined)} />
                                </div>
                                <div>
                                    <Label className="text-[10px] text-muted-foreground leading-none mb-1 block">Reps</Label>
                                    <Input className="h-8 text-xs px-2" placeholder="8-12" value={item.reps || ""} onChange={e => onUpdate(item._idx, "reps", e.target.value)} />
                                </div>
                                <div>
                                    <Label className="text-[10px] text-muted-foreground leading-none mb-1 block">Weight</Label>
                                    <Input className="h-8 text-xs px-2" placeholder="60kg" value={item.weight || ""} onChange={e => onUpdate(item._idx, "weight", e.target.value)} />
                                </div>
                                <div>
                                    <Label className="text-[10px] text-muted-foreground leading-none mb-1 block">Time</Label>
                                    <Input className="h-8 text-xs px-2" placeholder="30s" value={item.duration || ""} onChange={e => onUpdate(item._idx, "duration", e.target.value)} />
                                </div>
                                <div>
                                    <Label className="text-[10px] text-muted-foreground leading-none mb-1 block">Rest</Label>
                                    <Input className="h-8 text-xs px-2" placeholder="60s" value={item.rest_period || ""} onChange={e => onUpdate(item._idx, "rest_period", e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground opacity-70">Special Notes</Label>
                                <Input 
                                    className="h-8 text-xs bg-muted/20" 
                                    placeholder="e.g., Use spotter" 
                                    value={item.notes || ""} 
                                    onChange={e => onUpdate(item._idx, "notes", e.target.value)} 
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// ===== MAIN COMPONENT =====
export default function DietWorkoutPlans() {
    const { gymId, gyms, loading: gymLoading } = useGym();
    const { hasPermission, role } = usePermissions();
    const [activeTab, setActiveTab] = useState<"diet" | "workout">("diet");

    const currentGym = gyms.find(g => g.id === gymId);
    const gymName = currentGym?.name || "Gymatrix Gym";

    // Data
    const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
    const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
    const [members, setMembers] = useState<{ id: number; full_name: string; trainer_id: number | null }[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogType, setDialogType] = useState<"diet" | "workout">("diet");
    const [editing, setEditing] = useState<DietPlan | WorkoutPlan | null>(null);
    const [saving, setSaving] = useState(false);

    // Form
    const [formTitle, setFormTitle] = useState("");
    const [formMemberId, setFormMemberId] = useState<string>("");
    const [formStartDate, setFormStartDate] = useState("");
    const [formEndDate, setFormEndDate] = useState("");
    const [formNotes, setFormNotes] = useState("");
    const [formStatus, setFormStatus] = useState<string>("active");
    const [dietItems, setDietItems] = useState<DietPlanItem[]>([]);
    const [workoutItems, setWorkoutItems] = useState<WorkoutPlanItem[]>([]);

    // Determine if user is a trainer (staff) or owner
    const staffId = role?.isOwner ? null : (role?.staff_id ?? null);

    useEffect(() => {
        if (gymId) fetchAll();
    }, [gymId]);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [diet, workout, mems] = await Promise.all([
                dietWorkoutService.getDietPlans(gymId!, staffId),
                dietWorkoutService.getWorkoutPlans(gymId!, staffId),
                dietWorkoutService.getTrainerMembers(gymId!, staffId),
            ]);
            setDietPlans(diet);
            setWorkoutPlans(workout);
            setMembers(mems);
        } catch (err: any) {
            toast.error("Failed to load data: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ===== DIALOG HANDLERS =====
    const openCreateDialog = (type: "diet" | "workout") => {
        setDialogType(type);
        setEditing(null);
        setFormTitle("");
        setFormMemberId("");
        setFormStartDate("");
        setFormEndDate("");
        setFormNotes("");
        setFormStatus("active");
        setDietItems([]);
        setWorkoutItems([]);
        setDialogOpen(true);
    };

    const openEditDialog = async (plan: DietPlan | WorkoutPlan, type: "diet" | "workout") => {
        setDialogType(type);
        setEditing(plan);
        setFormTitle(plan.title);
        setFormMemberId(plan.member_id.toString());
        setFormStartDate(plan.start_date);
        setFormEndDate(plan.end_date);
        setFormNotes(plan.notes || "");
        setFormStatus(plan.status);

        try {
            if (type === "diet") {
                const full = await dietWorkoutService.getDietPlanWithItems(plan.id);
                setDietItems(full.gym_diet_plan_items || []);
                setWorkoutItems([]);
            } else {
                const full = await dietWorkoutService.getWorkoutPlanWithItems(plan.id);
                setWorkoutItems(full.gym_workout_plan_items || []);
                setDietItems([]);
            }
        } catch (err: any) {
            toast.error("Failed to load plan details: " + err.message);
        }

        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!gymId) return;
        if (!formTitle || !formMemberId || !formStartDate || !formEndDate) {
            toast.error("Please fill in title, member, and dates");
            return;
        }

        const items = dialogType === "diet" ? dietItems : workoutItems;
        const validItems = dialogType === "diet"
            ? (items as DietPlanItem[]).filter(i => i.food_item.trim() !== "")
            : (items as WorkoutPlanItem[]).filter(i => i.exercise_name.trim() !== "");

        setSaving(true);
        try {
            const trainerId = staffId || (members.find(m => m.id === parseInt(formMemberId))?.trainer_id);

            if (dialogType === "diet") {
                const planData = {
                    gym_id: gymId,
                    member_id: parseInt(formMemberId),
                    trainer_id: trainerId || null,
                    title: formTitle,
                    start_date: formStartDate,
                    end_date: formEndDate,
                    notes: formNotes || undefined,
                    status: formStatus as 'active' | 'inactive' | 'completed',
                };

                if (editing) {
                    await dietWorkoutService.updateDietPlan(editing.id, planData, validItems as DietPlanItem[]);
                    toast.success("Diet plan updated successfully");
                } else {
                    await dietWorkoutService.createDietPlan(planData, validItems as DietPlanItem[]);
                    toast.success("Diet plan created successfully");
                }
            } else {
                const planData = {
                    gym_id: gymId,
                    member_id: parseInt(formMemberId),
                    trainer_id: trainerId || null,
                    title: formTitle,
                    start_date: formStartDate,
                    end_date: formEndDate,
                    notes: formNotes || undefined,
                    status: formStatus as 'active' | 'inactive' | 'completed',
                };

                if (editing) {
                    await dietWorkoutService.updateWorkoutPlan(editing.id, planData, validItems as WorkoutPlanItem[]);
                    toast.success("Workout plan updated successfully");
                } else {
                    await dietWorkoutService.createWorkoutPlan(planData, validItems as WorkoutPlanItem[]);
                    toast.success("Workout plan created successfully");
                }
            }

            setDialogOpen(false);
            fetchAll();
        } catch (err: any) {
            toast.error("Failed to save plan: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number, type: "diet" | "workout") => {
        if (!confirm("Are you sure you want to delete this plan?")) return;
        try {
            if (type === "diet") await dietWorkoutService.deleteDietPlan(id);
            else await dietWorkoutService.deleteWorkoutPlan(id);
            toast.success("Plan deleted successfully");
            fetchAll();
        } catch (err: any) {
            toast.error("Failed to delete: " + err.message);
        }
    };

    const handleDownload = async (plan: DietPlan | WorkoutPlan, type: "diet" | "workout") => {
        try {
            toast.loading(`Generating PDF for ${plan.gym_members?.full_name}...`, { id: "export-pdf" });
            
            // Get full items
            if (type === "diet") {
                const full = await dietWorkoutService.getDietPlanWithItems(plan.id);
                await pdfExportService.exportDietPlan(full, gymName);
            } else {
                const full = await dietWorkoutService.getWorkoutPlanWithItems(plan.id);
                await pdfExportService.exportWorkoutPlan(full, gymName);
            }
            
            toast.success("PDF downloaded successfully", { id: "export-pdf" });
        } catch (err: any) {
            toast.error("Failed to export PDF: " + err.message, { id: "export-pdf" });
        }
    };

    // ITEM MANIPULATION
    const addDietItem = (day: number) => setDietItems(prev => [...prev, emptyDietItem(day)]);
    const removeDietItem = (index: number) => setDietItems(prev => prev.filter((_, i) => i !== index));
    const updateDietItem = (index: number, field: keyof DietPlanItem, value: any) => {
        setDietItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const addWorkoutItem = (day: number) => setWorkoutItems(prev => [...prev, emptyWorkoutItem(day)]);
    const removeWorkoutItem = (index: number) => setWorkoutItems(prev => prev.filter((_, i) => i !== index));
    const updateWorkoutItem = (index: number, field: keyof WorkoutPlanItem, value: any) => {
        setWorkoutItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    if (gymLoading || (loading && gymId)) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <p className="text-muted-foreground">Manage diet and workout plans for your members</p>
            </div>

            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as "diet" | "workout")} className="w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                    <TabsList className="grid grid-cols-2 w-full sm:w-auto">
                        <TabsTrigger value="diet" className="gap-2 px-6"><Apple className="h-4 w-4" />Diet Plans</TabsTrigger>
                        <TabsTrigger value="workout" className="gap-2 px-6"><Dumbbell className="h-4 w-4" />Workout Plans</TabsTrigger>
                    </TabsList>
                    {hasPermission('add_diet_workout_plans') && (
                        <Button className="gradient-primary shadow-glow w-full sm:w-auto" onClick={() => openCreateDialog(activeTab)}>
                            <Plus className="h-4 w-4 mr-2" />Create {activeTab === "diet" ? "Diet" : "Workout"} Plan
                        </Button>
                    )}
                </div>

                <TabsContent value="diet" className="mt-0">
                    <PlansList 
                        plans={dietPlans} 
                        type="diet" 
                        hasPermission={hasPermission} 
                        onCreate={openCreateDialog} 
                        onEdit={openEditDialog} 
                        onDelete={handleDelete} 
                        onDownload={handleDownload}
                    />
                </TabsContent>
                <TabsContent value="workout" className="mt-0">
                    <PlansList 
                        plans={workoutPlans} 
                        type="workout" 
                        hasPermission={hasPermission} 
                        onCreate={openCreateDialog} 
                        onEdit={openEditDialog} 
                        onDelete={handleDelete} 
                        onDownload={handleDownload}
                    />
                </TabsContent>
            </Tabs>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[1000px] w-[95vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {dialogType === "diet" ? <Apple className="h-5 w-5 text-primary" /> : <Dumbbell className="h-5 w-5 text-primary" />}
                            {editing ? "Edit" : "Create"} {dialogType === "diet" ? "Diet" : "Workout"} Plan
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <Label>Plan Title *</Label>
                            <Input placeholder="e.g., Week 1 — Cutting Phase" value={formTitle} onChange={e => setFormTitle(e.target.value)} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Member *</Label>
                                <Select value={formMemberId} onValueChange={setFormMemberId}>
                                    <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                                    <SelectContent>
                                        {members.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.full_name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={formStatus} onValueChange={setFormStatus}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date *</Label>
                                <Input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date *</Label>
                                <Input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea placeholder="Additional notes..." value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} />
                        </div>

                        <div className="space-y-2 pt-2 border-t border-border/50">
                            <Label className="text-sm font-semibold">Weekly {dialogType === "diet" ? "Meals" : "Exercises"} (Mon–Sun)</Label>
                            <p className="text-xs text-muted-foreground mb-3">Define the schedule for each day. This alternates weekly during the plan period.</p>
                            {dialogType === "diet" ? (
                                <DietItemsEditor items={dietItems} onUpdate={updateDietItem} onAdd={addDietItem} onRemove={removeDietItem} />
                            ) : (
                                <WorkoutItemsEditor items={workoutItems} onUpdate={updateWorkoutItem} onAdd={addWorkoutItem} onRemove={removeWorkoutItem} />
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border/50">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                        <Button className="gradient-primary" onClick={handleSubmit} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editing ? "Update Plan" : "Create Plan"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
