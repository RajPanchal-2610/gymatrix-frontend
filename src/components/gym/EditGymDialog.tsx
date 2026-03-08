import { useState, useEffect } from "react";
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
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface EditGymDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    gymId: number | null;
    initialName: string;
    onSuccess: () => void;
}

export function EditGymDialog({ open, onOpenChange, gymId, initialName, onSuccess }: EditGymDialogProps) {
    const [name, setName] = useState(initialName);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setName(initialName);
    }, [initialName, open]);

    const handleUpdate = async () => {
        if (!name.trim() || !gymId) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('gyms')
                .update({ name: name.trim() })
                .eq('id', gymId);

            if (error) throw error;

            toast.success("Gym name updated successfully!");
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to update gym: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Gym Name</DialogTitle>
                    <DialogDescription>
                        Update the name of your gym display across the platform.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Gym Name</Label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="edit-name"
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
                        onClick={handleUpdate}
                        className="gradient-primary"
                        disabled={loading || !name.trim() || name.trim() === initialName}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            "Update Name"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
