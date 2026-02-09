import { useState, useEffect } from "react";
import { Plus, Search, MoreHorizontal, Mail, Phone, Edit, Trash2, Shield, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useGym } from "@/hooks/useGym";
import { staffService } from "@/services/staffService";
import { GymStaff, GymRole } from "@/types/gym";
import { useToast } from "@/components/ui/use-toast";

type StaffListProps = {
    // Pass any necessary props
};

const getRoleBadge = (roleName?: string) => {
    switch (roleName) {
        case "Super Admin":
            return <Badge className="gradient-primary text-primary-foreground">{roleName}</Badge>;
        case "Gym Owner":
            return <Badge className="bg-accent/10 text-accent hover:bg-accent/20">{roleName}</Badge>;
        case "Personal Trainer":
            return <Badge className="bg-primary/10 text-primary hover:bg-primary/20">{roleName}</Badge>;
        default:
            return <Badge variant="secondary">{roleName || 'Staff'}</Badge>;
    }
};

export function StaffList() {
    const { gymId } = useGym();
    const { toast } = useToast();
    const [staff, setStaff] = useState<GymStaff[]>([]);
    const [roles, setRoles] = useState<GymRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [currentStaffId, setCurrentStaffId] = useState<number | null>(null);

    // Form State
    const [newStaff, setNewStaff] = useState<Partial<GymStaff>>({
        full_name: '',
        phone: '',
        status: 'active',
        salary: 0,
        role_id: undefined
    });
    const [editStaff, setEditStaff] = useState<Partial<GymStaff>>({});

    const loadData = async () => {
        if (!gymId) return;
        try {
            setLoading(true);
            const [staffData, rolesData] = await Promise.all([
                staffService.getStaff(gymId),
                staffService.getRoles()
            ]);
            setStaff(staffData);
            setRoles(rolesData);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({
                title: "Error",
                description: "Failed to load staff or roles.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [gymId]);

    const handleCreateStaff = async () => {
        if (!gymId) return;
        if (!newStaff.full_name || !newStaff.role_id) {
            toast({ title: "Validation Error", description: "Name and Role are required.", variant: "destructive" });
            return;
        }

        try {
            await staffService.createStaff({
                ...newStaff,
                gym_id: gymId,
            });
            toast({
                title: "Success",
                description: "Staff member added successfully.",
            });
            setAddDialogOpen(false);
            loadData();
            setNewStaff({ full_name: '', phone: '', status: 'active', salary: 0, role_id: undefined });
        } catch (error) {
            console.error("Error creating staff:", error);
            toast({
                title: "Error",
                description: "Failed to create staff member.",
                variant: "destructive",
            });
        }
    };

    const handleEditClick = (member: GymStaff) => {
        setEditStaff({
            full_name: member.full_name,
            phone: member.phone,
            join_date: member.join_date,
            role_id: member.role_id,
            status: member.status,
            salary: member.salary
        });
        setCurrentStaffId(member.id);
        setEditDialogOpen(true);
    };

    const handleUpdateStaff = async () => {
        if (!currentStaffId || !gymId) return;
        if (!editStaff.full_name || !editStaff.role_id) {
            toast({ title: "Validation Error", description: "Name and Role are required.", variant: "destructive" });
            return;
        }

        try {
            await staffService.updateStaff(currentStaffId, editStaff);
            toast({
                title: "Success",
                description: "Staff member updated successfully.",
            });
            setEditDialogOpen(false);
            loadData();
        } catch (error) {
            console.error("Error updating staff:", error);
            toast({
                title: "Error",
                description: "Failed to update staff member.",
                variant: "destructive",
            });
        }
    };

    const filteredStaff = staff.filter(
        (member) =>
            member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (member.phone && member.phone.includes(searchQuery))
    );

    if (loading) return <div>Loading staff...</div>;

    return (
        <div className="space-y-6">
            {/* Header and Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex-1 w-full sm:max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search staff..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gradient-primary shadow-glow">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Staff
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Add Staff Member</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Full Name *</Label>
                                <Input
                                    id="full_name"
                                    value={newStaff.full_name}
                                    onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    value={newStaff.phone}
                                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                                    placeholder="+1 234-567-8900"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="join_date">Join Date</Label>
                                <Input
                                    id="join_date"
                                    type="date"
                                    value={newStaff.join_date || ''}
                                    onChange={(e) => setNewStaff({ ...newStaff, join_date: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Role *</Label>
                                    <Select
                                        value={newStaff.role_id?.toString()}
                                        onValueChange={(val) => setNewStaff({ ...newStaff, role_id: parseInt(val) })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map(role => (
                                                <SelectItem key={role.id} value={role.id.toString()}>
                                                    {role.name.replace(/_/g, ' ')}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select
                                        value={newStaff.status}
                                        onValueChange={(val) => setNewStaff({ ...newStaff, status: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="salary">Monthly Salary</Label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="salary"
                                        type="number"
                                        className="pl-9"
                                        value={newStaff.salary || ''}
                                        onChange={(e) => setNewStaff({ ...newStaff, salary: parseFloat(e.target.value) })}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button className="gradient-primary" onClick={handleCreateStaff}>Add Staff</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Staff Member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit_full_name">Full Name *</Label>
                            <Input
                                id="edit_full_name"
                                value={editStaff.full_name || ''}
                                onChange={(e) => setEditStaff({ ...editStaff, full_name: e.target.value })}
                                placeholder="John Doe"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_phone">Phone Number</Label>
                            <Input
                                id="edit_phone"
                                value={editStaff.phone || ''}
                                onChange={(e) => setEditStaff({ ...editStaff, phone: e.target.value })}
                                placeholder="+1 234-567-8900"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_join_date">Join Date</Label>
                            <Input
                                id="edit_join_date"
                                type="date"
                                value={editStaff.join_date || ''}
                                onChange={(e) => setEditStaff({ ...editStaff, join_date: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Role *</Label>
                                <Select
                                    value={editStaff.role_id?.toString()}
                                    onValueChange={(val) => setEditStaff({ ...editStaff, role_id: parseInt(val) })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map(role => (
                                            <SelectItem key={role.id} value={role.id.toString()}>
                                                {role.name.replace(/_/g, ' ')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={editStaff.status}
                                    onValueChange={(val) => setEditStaff({ ...editStaff, status: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_salary">Monthly Salary</Label>
                            <div className="relative">
                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="edit_salary"
                                    type="number"
                                    className="pl-9"
                                    value={editStaff.salary || ''}
                                    onChange={(e) => setEditStaff({ ...editStaff, salary: parseFloat(e.target.value) })}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="gradient-primary" onClick={handleUpdateStaff}>Update Staff</Button>
                    </div>
                </DialogContent>
            </Dialog>


            {/* Staff Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStaff.map((member) => (
                    <Card
                        key={member.id}
                        className="overflow-hidden hover:shadow-lg transition-all duration-300 animate-fade-in"
                    >
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-14 w-14">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.full_name}`} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                                            {member.full_name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-semibold">{member.full_name}</h3>
                                        <p className="text-sm text-muted-foreground capitalize">
                                            {member.gym_roles?.name?.replace(/_/g, ' ') || 'Staff'}
                                        </p>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEditClick(member)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => {
                                            if (confirm('Are you sure you want to remove this staff member?')) {
                                                staffService.deleteStaff(member.id).then(() => loadData());
                                            }
                                        }}>
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Remove
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="mb-4">{getRoleBadge(member.gym_roles?.name?.replace(/_/g, ' '))}</div>

                            <div className="space-y-2 text-sm">
                                {member.user_email && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Mail className="h-4 w-4" />
                                        <span className="truncate">{member.user_email}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="h-4 w-4" />
                                    <span>{member.phone || 'N/A'}</span>
                                </div>
                                {member.join_date && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Joined: {new Date(member.join_date).toLocaleDateString()}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                                <span
                                    className={`h-2 w-2 rounded-full ${member.status === "active" ? "bg-success" : "bg-muted-foreground"
                                        }`}
                                />
                                <span className="text-sm text-muted-foreground capitalize">
                                    {member.status}
                                </span>
                                <span className="ml-auto text-sm font-semibold text-primary">
                                    ₹{member.salary?.toLocaleString() || 0}/mo
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
