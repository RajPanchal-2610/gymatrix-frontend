
import { useState } from "react";
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
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
import { Label } from "@/components/ui/label";

const gymMembers = [
    {
        id: 1,
        name: "John Smith",
        email: "john@example.com",
        phone: "+1 555-0101",
        subscription: "1 Month Plan",
        status: "active",
        joinDate: "2024-01-10",
        expiryDate: "2024-02-10",
    },
    {
        id: 2,
        name: "Alice Johnson",
        email: "alice@example.com",
        phone: "+1 555-0102",
        subscription: "1 Year Plan",
        status: "active",
        joinDate: "2023-12-01",
        expiryDate: "2024-12-01",
    },
    {
        id: 3,
        name: "Bob Williams",
        email: "bob@example.com",
        phone: "+1 555-0103",
        subscription: "3 Months Plan",
        status: "expired",
        joinDate: "2023-09-15",
        expiryDate: "2023-12-15",
    },
];

export default function Members() {
    const [searchQuery, setSearchQuery] = useState("");
    const [addDialogOpen, setAddDialogOpen] = useState(false);

    return (
        <DashboardLayout title="Gym Members">
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
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gradient-primary shadow-glow">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Member
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Register New Member</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input id="firstName" placeholder="John" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input id="lastName" placeholder="Doe" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" placeholder="john@email.com" />
                            </div>
                            <div className="space-y-2">
                                <Label>Subscription Plan</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1_month">1 Month Plan</SelectItem>
                                        <SelectItem value="3_months">3 Months Plan</SelectItem>
                                        <SelectItem value="1_year">1 Year Plan</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button className="gradient-primary">Register Member</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="divide-y divide-border">
                        {gymMembers.map((member) => (
                            <div
                                key={member.id}
                                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 hover:bg-muted/50 transition-colors animate-fade-in"
                            >
                                <Avatar className="h-12 w-12">
                                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                        {member.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-semibold">{member.name}</h3>
                                        <Badge variant={member.status === "active" ? "default" : "destructive"} className={member.status === "active" ? "bg-success hover:bg-success/80" : ""}>
                                            {member.status}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Mail className="h-3.5 w-3.5" />
                                            {member.email}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5" />
                                            Plan: {member.subscription}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5" />
                                            Expires: {member.expiryDate}
                                        </span>
                                    </div>
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem>
                                            <Eye className="h-4 w-4 mr-2" />
                                            View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive">
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
