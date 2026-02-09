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
import { staffService } from "@/services/staffService";
import { GymRole } from "@/types/gym";

export function RolesView() {
    const { toast } = useToast();
    const [roles, setRoles] = useState<GymRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Partial<GymRole>>({ name: '', description: '' });

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const data = await staffService.getRoles();
            setRoles(data);
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
        fetchRoles();
    }, []);

    const handleSave = async () => {
        if (!editingRole.name) {
            toast({ title: "Validation Error", description: "Role name is required", variant: "destructive" });
            return;
        }

        try {
            if (editingRole.id) {
                await staffService.updateRole(editingRole.id, editingRole);
                toast({ title: "Success", description: "Role updated successfully." });
            } else {
                await staffService.createRole(editingRole);
                toast({ title: "Success", description: "Role created successfully." });
            }
            setDialogOpen(false);
            fetchRoles();
            setEditingRole({ name: '', description: '' });
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
            await staffService.deleteRole(id);
            toast({ title: "Success", description: "Role deleted." });
            fetchRoles();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete role. It might be in use.", variant: "destructive" });
        }
    };

    const openDialog = (role?: GymRole) => {
        if (role) {
            setEditingRole(role);
        } else {
            setEditingRole({ name: '', description: '' });
        }
        setDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Role Definitions</h2>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gradient-primary shadow-glow" onClick={() => openDialog()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Role
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{editingRole.id ? 'Edit Role' : 'Create Role'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Role Name</Label>
                                <Input
                                    id="name"
                                    value={editingRole.name}
                                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                                    placeholder="e.g. Trainer"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description (Optional)</Label>
                                <Input
                                    id="description"
                                    value={editingRole.description || ''}
                                    onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                                    placeholder="e.g. Manages gym floor"
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
                                        <Button variant="ghost" size="icon" onClick={() => openDialog(role)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(role.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
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
