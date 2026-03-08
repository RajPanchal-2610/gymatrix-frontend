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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const members = [
  {
    id: 1,
    name: "Sarah Wilson",
    email: "sarah@email.com",
    phone: "+1 234-567-8901",
    plan: "Premium",
    status: "active",
    joinDate: "Jan 15, 2024",
    expiryDate: "Jul 15, 2024",
    avatar: "SW",
  },
  {
    id: 2,
    name: "Mike Johnson",
    email: "mike@email.com",
    phone: "+1 234-567-8902",
    plan: "Basic",
    status: "active",
    joinDate: "Feb 1, 2024",
    expiryDate: "Aug 1, 2024",
    avatar: "MJ",
  },
  {
    id: 3,
    name: "Emily Brown",
    email: "emily@email.com",
    phone: "+1 234-567-8903",
    plan: "Premium",
    status: "expiring",
    joinDate: "Dec 10, 2023",
    expiryDate: "Feb 10, 2024",
    avatar: "EB",
  },
  {
    id: 4,
    name: "David Lee",
    email: "david@email.com",
    phone: "+1 234-567-8904",
    plan: "Standard",
    status: "expired",
    joinDate: "Oct 5, 2023",
    expiryDate: "Jan 5, 2024",
    avatar: "DL",
  },
  {
    id: 5,
    name: "Anna Chen",
    email: "anna@email.com",
    phone: "+1 234-567-8905",
    plan: "Premium",
    status: "active",
    joinDate: "Mar 20, 2024",
    expiryDate: "Sep 20, 2024",
    avatar: "AC",
  },
  {
    id: 6,
    name: "James Wilson",
    email: "james@email.com",
    phone: "+1 234-567-8906",
    plan: "Basic",
    status: "active",
    joinDate: "Apr 1, 2024",
    expiryDate: "Oct 1, 2024",
    avatar: "JW",
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return <Badge className="bg-success/10 text-success hover:bg-success/20">Active</Badge>;
    case "expiring":
      return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">Expiring Soon</Badge>;
    case "expired":
      return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">Expired</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getPlanBadge = (plan: string) => {
  switch (plan) {
    case "Premium":
      return <Badge className="bg-primary/10 text-primary hover:bg-primary/20">{plan}</Badge>;
    case "Standard":
      return <Badge variant="secondary">{plan}</Badge>;
    case "Basic":
      return <Badge variant="outline">{plan}</Badge>;
    default:
      return <Badge variant="secondary">{plan}</Badge>;
  }
};

export default function Members() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const filteredMembers = members.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      {/* Header */}
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
        <div className="flex gap-3 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expiring">Expiring</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary shadow-glow">
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Member</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="basic" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="membership">Membership</TabsTrigger>
                </TabsList>
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="flex justify-center">
                    <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors">
                      <Plus className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
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
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" placeholder="+1 234-567-8900" />
                  </div>
                </TabsContent>
                <TabsContent value="membership" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Membership Plan</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic - $29/month</SelectItem>
                        <SelectItem value="standard">Standard - $49/month</SelectItem>
                        <SelectItem value="premium">Premium - $79/month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input id="startDate" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="card">Credit Card</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="gradient-primary">Add Member</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Members List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 hover:bg-muted/50 transition-colors animate-fade-in"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {member.avatar}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{member.name}</h3>
                    {getStatusBadge(member.status)}
                    {getPlanBadge(member.plan)}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {member.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {member.phone}
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
                      Edit Member
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
    </>
  );
}
