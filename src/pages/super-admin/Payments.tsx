import { useState } from "react";
import {
  Search,
  Filter,
  Download,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const payments = [
  {
    id: "INV-001",
    member: "Sarah Wilson",
    avatar: "SW",
    amount: 79,
    plan: "Premium",
    date: "Jan 15, 2024",
    status: "paid",
    method: "Credit Card",
  },
  {
    id: "INV-002",
    member: "Mike Johnson",
    avatar: "MJ",
    amount: 29,
    plan: "Basic",
    date: "Jan 14, 2024",
    status: "paid",
    method: "Cash",
  },
  {
    id: "INV-003",
    member: "Emily Brown",
    avatar: "EB",
    amount: 79,
    plan: "Premium",
    date: "Jan 14, 2024",
    status: "pending",
    method: "Bank Transfer",
  },
  {
    id: "INV-004",
    member: "David Lee",
    avatar: "DL",
    amount: 49,
    plan: "Standard",
    date: "Jan 12, 2024",
    status: "overdue",
    method: "—",
  },
  {
    id: "INV-005",
    member: "Anna Chen",
    avatar: "AC",
    amount: 79,
    plan: "Premium",
    date: "Jan 10, 2024",
    status: "paid",
    method: "Credit Card",
  },
  {
    id: "INV-006",
    member: "James Wilson",
    avatar: "JW",
    amount: 29,
    plan: "Basic",
    date: "Jan 8, 2024",
    status: "paid",
    method: "Credit Card",
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "paid":
      return (
        <Badge className="bg-success/10 text-success hover:bg-success/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-warning/10 text-warning hover:bg-warning/20">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case "overdue":
      return (
        <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">
          <AlertCircle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function Payments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const totalCollected = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const pending = payments.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);
  const overdue = payments.filter((p) => p.status === "overdue").reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Collected"
          value={`$${totalCollected.toLocaleString()}`}
          change="This month"
          changeType="neutral"
          icon={DollarSign}
          iconClassName="gradient-primary"
        />
        <StatCard
          title="Pending Payments"
          value={`$${pending}`}
          change="1 payment"
          changeType="neutral"
          icon={Clock}
          iconClassName="bg-warning"
        />
        <StatCard
          title="Overdue"
          value={`$${overdue}`}
          change="1 member"
          changeType="negative"
          icon={AlertCircle}
          iconClassName="bg-destructive"
        />
        <StatCard
          title="Collection Rate"
          value="94%"
          change="+2% from last month"
          changeType="positive"
          icon={TrendingUp}
          iconClassName="bg-success"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Payment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Invoice</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Member</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Plan</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Method</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm">{payment.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/placeholder.svg" />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {payment.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{payment.member}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{payment.plan}</Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold">${payment.amount}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{payment.date}</td>
                    <td className="px-4 py-3 text-sm">{payment.method}</td>
                    <td className="px-4 py-3">{getStatusBadge(payment.status)}</td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Receipt className="h-4 w-4 mr-2" />
                            View Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download Invoice
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
