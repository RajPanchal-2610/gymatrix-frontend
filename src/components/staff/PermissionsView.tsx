import { useState, useEffect } from "react";
import { Plus, Edit } from "lucide-react";
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
            </div>

            <Card>
                <CardContent className="p-0">
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
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
                                                <Button variant="ghost" size="icon" onClick={() => openDialog(perm)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
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
                    </div>

                    {/* Mobile Card View */}
                    <div className="block md:hidden p-3 space-y-3 bg-muted/20">
                        {loading ? (
                            <div className="p-6 text-center text-muted-foreground text-sm bg-card rounded-xl border border-border">Loading permissions...</div>
                        ) : permissions.length === 0 ? (
                            <div className="p-6 text-center text-muted-foreground text-sm bg-card rounded-xl border border-border">No permissions found.</div>
                        ) : (
                            Object.entries(groupedPermissions).map(([featureName, perms]) => (
                                <div key={featureName} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
                                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-1 rounded inline-block">
                                        {featureName}
                                    </h4>
                                    <div className="space-y-2">
                                        {perms.map((perm) => (
                                            <div key={perm.id} className="p-3 rounded-lg border bg-muted/20 flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="font-mono text-xs font-semibold text-foreground truncate">
                                                        {perm.action}
                                                    </div>
                                                    {perm.description && (
                                                        <div className="text-xs text-muted-foreground mt-0.5">
                                                            {perm.description}
                                                        </div>
                                                    )}
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground" onClick={() => openDialog(perm)}>
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
