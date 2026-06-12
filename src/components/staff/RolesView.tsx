import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { staffService } from "@/services/staffService";
import { GymRole, Permission } from "@/types/gym";
import { useGym } from "@/hooks/useGym";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

export function RolesView() {
    const { gymId } = useGym();
    const { toast } = useToast();
    const { hasPermission } = usePermissions();
    const { hasFeature, loading: subscriptionLoading } = useSubscription();
    const [roles, setRoles] = useState<GymRole[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Partial<GymRole>>({ name: '', description: '' });
    const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

    const fetchData = async () => {
        if (!gymId) return;
        setLoading(true);
        try {
            const [rolesData, permsData] = await Promise.all([
                staffService.getRoles(gymId),
                staffService.getPermissions()
            ]);
            setRoles(rolesData);
            setPermissions(permsData);
        } catch (error) {
            console.error("Error fetching roles:", error);
            toast({
                title: "Error",
                description: "Failed to load roles.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [gymId]);

    const handleSave = async () => {
        if (!gymId) return;
        if (!editingRole.name) {
            toast({ title: "Validation Error", description: "Role name is required", variant: "destructive" });
            return;
        }

        try {
            if (editingRole.id) {
                await staffService.updateRole(editingRole.id, { 
                    ...editingRole, 
                    permission_ids: selectedPermissions 
                });
                toast({ title: "Success", description: "Role updated successfully." });
            } else {
                await staffService.createRole({ 
                    ...editingRole, 
                    gym_id: gymId,
                    permission_ids: selectedPermissions 
                });
                toast({ title: "Success", description: "Role created successfully." });
            }
            setDialogOpen(false);
            fetchData();
            setEditingRole({ name: '', description: '' });
            setSelectedPermissions([]);
        } catch (error) {
            console.error("Error saving role:", error);
            toast({
                title: "Error",
                description: "Failed to save role.",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure? accessing this role might break for existing staff.")) return;
        try {
            await staffService.getDeleteRole(id);
            toast({ title: "Success", description: "Role deleted." });
            fetchData();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete role. It might be in use.", variant: "destructive" });
        }
    };

    const openDialog = (role?: GymRole) => {
        if (role) {
            setEditingRole(role);
            // Pre-select existing permissions for this role
            const existingIds = role.gym_role_permissions?.map(rp => rp.permission_id) || [];
            setSelectedPermissions(existingIds);
        } else {
            setEditingRole({ name: '', description: '' });
            setSelectedPermissions([]);
        }
        setDialogOpen(true);
    };

    const togglePermission = (permId: number) => {
        setSelectedPermissions(prev => 
            prev.includes(permId) 
                ? prev.filter(id => id !== permId) 
                : [...prev, permId]
        );
    };

    // Group permissions by feature name
    const groupedPermissions = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
        const featureName = perm.features?.name || 'Other';
        if (!acc[featureName]) acc[featureName] = [];
        acc[featureName].push(perm);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Role Definitions</h2>
                {hasPermission('add_roles') && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gradient-primary shadow-glow" onClick={() => openDialog()}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Role
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold"> {editingRole.id ? 'Edit Role' : 'Create Role'}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-6 py-6 overflow-y-auto pr-2">
                                <div className="space-y-3">
                                    <Label htmlFor="name" className="text-base font-semibold">Role Name</Label>
                                    <Input
                                        id="name"
                                        className="text-lg h-11"
                                        value={editingRole.name}
                                        onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                                        placeholder="e.g. Senior Trainer"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label htmlFor="description" className="text-base font-semibold">Description (Optional)</Label>
                                    <Input
                                        id="description"
                                        className="text-base h-11"
                                        value={editingRole.description || ''}
                                        onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                                        placeholder="e.g. Full access to gym facilities and staff management"
                                    />
                                </div>

                                <div className="space-y-4 mt-6 border-t pt-6">
                                    <Label className="text-lg font-bold flex items-center gap-2">
                                        Select Permissions
                                    </Label>
                                    <div className="space-y-6">
                                        {Object.entries(groupedPermissions).map(([featureName, perms]) => (
                                            <div key={featureName} className="space-y-3">
                                                <h4 className="text-sm font-bold text-primary tracking-wider uppercase bg-primary/5 px-2 py-1 rounded inline-block">
                                                    {featureName}
                                                </h4>
                                                <div className="grid gap-3">
                                                    {perms.map((p) => {
                                                        const isFeatureActive = p.features?.name ? hasFeature(p.features.name) : true;
                                                        return (
                                                            <div 
                                                                key={p.id} 
                                                                className={cn(
                                                                    "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
                                                                    isFeatureActive 
                                                                        ? "bg-accent/10 hover:bg-accent/20 border-transparent hover:border-primary/10"
                                                                        : "bg-muted/30 border-muted opacity-60"
                                                                )}
                                                            >
                                                                <Checkbox 
                                                                    id={`perm-${p.id}`} 
                                                                    className="h-5 w-5 mt-0.5 animate-fade-in"
                                                                    checked={selectedPermissions.includes(p.id)}
                                                                    onCheckedChange={() => togglePermission(p.id)}
                                                                    disabled={!isFeatureActive}
                                                                />
                                                                <div className="grid gap-1.5 leading-none">
                                                                    <label
                                                                        htmlFor={`perm-${p.id}`}
                                                                        className={cn(
                                                                            "text-base font-semibold leading-tight flex items-center gap-2 cursor-pointer",
                                                                            !isFeatureActive && "cursor-not-allowed text-muted-foreground"
                                                                        )}
                                                                    >
                                                                        {p.description || p.action}
                                                                        {!isFeatureActive && (
                                                                            <span className="flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded font-bold border border-amber-500/20">
                                                                                <Lock className="h-3 w-3" /> Upgrade
                                                                            </span>
                                                                        )}
                                                                    </label>
                                                                    {p.description && (
                                                                        <span className="text-xs text-muted-foreground font-mono font-medium tracking-tight">
                                                                            {p.action}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="border-t pt-4">
                                <Button variant="outline" size="lg" className="h-11" onClick={() => setDialogOpen(false)}>Cancel</Button>
                                <Button size="lg" className="h-11 px-8" onClick={handleSave}>Save Changes</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {roles.map((role) => (
                                <TableRow key={role.id}>
                                    <TableCell className="font-medium capitalize">{role.name.replace(/_/g, ' ')}</TableCell>
                                    <TableCell>{role.description}</TableCell>
                                    <TableCell className="text-right">
                                        {hasPermission('edit_roles') && (
                                            <Button variant="ghost" size="icon" onClick={() => openDialog(role)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {hasPermission('delete_roles') && (
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(role.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {roles.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground p-6">
                                        No roles found. Create one above.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
