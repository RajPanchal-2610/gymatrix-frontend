import { useState } from "react";
import { Building2, Loader2 } from "lucide-react";
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
import { useSubscription } from "@/hooks/useSubscription";
import { useGym } from "@/hooks/useGym";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface CreateGymDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void; // Callback to refresh parent list
}

export function CreateGymDialog({ open, onOpenChange, onSuccess }: CreateGymDialogProps) {
    const { subscription } = useSubscription();
    // We only need the list of gyms for counting limits, 
    // but ideally the parent should pass the count or we transparently fetch here.
    // Fetching here is safer to ensure up-to-date count before insert.
    const { gyms } = useGym();

    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleCreate = async () => {
        if (!name.trim()) return;

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("You must be logged in");
                return;
            }

            // Subscription Limit Check
            const maxGyms = subscription?.max_gyms || 1;
            const ownedGyms = gyms.filter(g => g.owner_id === user.id);

            // Note: Since 'gyms' from useGym fetches async, ensure it's loaded.
            // If gyms are empty but loading, we might falsely allow create?
            // Realistically, the user is likely clicking this button AFTER the page loaded.

            if (ownedGyms.length >= maxGyms) {
                toast.error(`Plan limit reached! Your plan allows ${maxGyms} gym(s). Upgrade to add more.`);
                onOpenChange(false);
                navigate("/pricing");
                return;
            }

            // 1. Create Gym
            const { data: gymData, error: gymError } = await supabase
                .from('gyms')
                .insert({
                    name: name,
                    owner_id: user.id
                })
                .select()
                .single();

            if (gymError) throw gymError;

            // 2. Fetch GYM_ADMIN role
            const { data: roleData } = await supabase
                .from('roles')
                .select('id')
                .eq('name', 'GYM_ADMIN')
                .single();

            if (!roleData) throw new Error("Role 'GYM_ADMIN' not found");

            // 3. Add to gym_users
            const { error: userError } = await supabase
                .from('gym_users')
                .insert({
                    gym_id: gymData.id,
                    user_id: user.id,
                    role_id: roleData.id
                });

            if (userError) throw userError;

            toast.success("Gym created successfully!");
            onSuccess(); // Refresh parent
            onOpenChange(false);
            setName("");

        } catch (error: any) {
            console.error(error);
            toast.error("Failed to create gym: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Gym</DialogTitle>
                    <DialogDescription>
                        Add a new gym location to your account.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Gym Name</Label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="pl-9"
                                placeholder="e.g. Downtown Fitness"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        className="gradient-primary"
                        disabled={loading || !name.trim()}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "Create Gym"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
