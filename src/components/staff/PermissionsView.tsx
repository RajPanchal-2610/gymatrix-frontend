import { useState, useEffect } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { usePermissions } from "@/contexts/PermissionsContext";
import { staffService } from "@/services/staffService";
import { Permission, Feature } from "@/types/gym";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function PermissionsView() {
    const { toast } = useToast();
    const { hasPermission } = usePermissions();
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPermission, setEditingPermission] = useState<Partial<Permission>>({ action: '', feature_id: undefined, description: '' });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [permsData, featsData] = await Promise.all([
                staffService.getPermissions(),
                staffService.getFeatures()
            ]);
            setPermissions(permsData);
            setFeatures(featsData);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({
                title: "Error",
                description: "Failed to load permissions.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async () => {
        if (!editingPermission.action || !editingPermission.feature_id) {
            toast({ title: "Validation Error", description: "Action and Feature are required", variant: "destructive" });
            return;
        }

        try {
            if (editingPermission.id) {
                await staffService.updatePermission(editingPermission.id, {
                    action: editingPermission.action,
                    feature_id: editingPermission.feature_id,
                    description: editingPermission.description,
                });
                toast({ title: "Success", description: "Permission updated successfully." });
            } else {
                await staffService.createPermission({
                    action: editingPermission.action,
                    feature_id: editingPermission.feature_id!,
                    description: editingPermission.description,
                });
                toast({ title: "Success", description: "Permission created successfully." });
            }
            setDialogOpen(false);
            fetchData();
            setEditingPermission({ action: '', feature_id: undefined, description: '' });
        } catch (error: any) {
            console.error("Error saving permission:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to save permission.",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure? This will remove this permission from all associated roles.")) return;
        try {
            await staffService.deletePermission(id);
            toast({ title: "Success", description: "Permission deleted." });
            fetchData();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete permission.", variant: "destructive" });
        }
    };

    const openDialog = (permission?: Permission) => {
        if (permission) {
            setEditingPermission(permission);
        } else {
            setEditingPermission({ action: '', feature_id: undefined, description: '' });
        }
        setDialogOpen(true);
    };

    // Use the joined feature name for grouping
    const groupedPermissions = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
        const featureName = perm.features?.name || 'Uncategorized';
        if (!acc[featureName]) acc[featureName] = [];
        acc[featureName].push(perm);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">System Permissions</h2>
                {hasPermission('add_permissions') && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gradient-primary shadow-glow" onClick={() => openDialog()}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Permission
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>{editingPermission.id ? 'Edit Permission' : 'Create Permission'}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="action">Action String *</Label>
                                    <Input
                                        id="action"
                                        value={editingPermission.action}
                                        onChange={(e) => setEditingPermission({ ...editingPermission, action: e.target.value })}
                                        placeholder="e.g. view_reports"
                                    />
                                    <p className="text-xs text-muted-foreground">This is the code used in the system.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="feature">Feature *</Label>
                                    <Select
                                        value={editingPermission.feature_id?.toString()}
                                        onValueChange={(value) => setEditingPermission({ ...editingPermission, feature_id: parseInt(value) })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a feature" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {features.map(f => (
                                                <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Select the feature module this permission belongs to.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description (Optional)</Label>
                                    <Input
                                        id="description"
                                        value={editingPermission.description || ''}
                                        onChange={(e) => setEditingPermission({ ...editingPermission, description: e.target.value })}
                                        placeholder="e.g. Can view all financial reports"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleSave}>Save</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Feature</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(groupedPermissions).flatMap(([featureName, perms]) => 
                                perms.map((perm, index) => (
                                    <TableRow key={perm.id} className={index === 0 ? "border-t border-border" : ""}>
                                        <TableCell className="font-medium text-muted-foreground">
                                            {index === 0 ? featureName : ''}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{perm.action}</TableCell>
                                        <TableCell>{perm.description}</TableCell>
                                        <TableCell className="text-right">
                                            {hasPermission('edit_permissions') && (
                                                <Button variant="ghost" size="icon" onClick={() => openDialog(perm)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {hasPermission('delete_permissions') && (
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(perm.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                            {permissions.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground p-6">
                                        No permissions found.
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
