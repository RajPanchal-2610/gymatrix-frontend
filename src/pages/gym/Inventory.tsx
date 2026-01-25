
import { useState } from "react";
import {
    Package,
    Plus,
    Search,
    Filter,
    AlertTriangle,
    Archive,
    DollarSign,
    Tags
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/StatCard";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock Data
const inventoryItems = [
    {
        id: 1,
        name: "Whey Protein (5lb)",
        category: "Supplements",
        sku: "SUP-001",
        quantity: 45,
        minQuantity: 10,
        price: 59.99,
        status: "In Stock",
        lastUpdated: "2024-03-20",
    },
    {
        id: 2,
        name: "Dumbbell Set (5-50lbs)",
        category: "Equipment",
        sku: "EQP-042",
        quantity: 3,
        minQuantity: 2,
        price: 1299.00,
        status: "In Stock",
        lastUpdated: "2024-01-15",
    },
    {
        id: 3,
        name: "Gym T-Shirt (L)",
        category: "Merchandise",
        sku: "MER-103",
        quantity: 8,
        minQuantity: 15,
        price: 24.99,
        status: "Low Stock",
        lastUpdated: "2024-03-10",
    },
    {
        id: 4,
        name: "Pre-Workout (30 servings)",
        category: "Supplements",
        sku: "SUP-005",
        quantity: 0,
        minQuantity: 20,
        price: 34.99,
        status: "Out of Stock",
        lastUpdated: "2024-03-22",
    },
    {
        id: 5,
        name: "Yoga Mat",
        category: "Equipment",
        sku: "EQP-101",
        quantity: 22,
        minQuantity: 10,
        price: 19.99,
        status: "In Stock",
        lastUpdated: "2024-02-28",
    },
    {
        id: 6,
        name: "Protein Bar (Box of 12)",
        category: "Supplements",
        sku: "SUP-012",
        quantity: 15,
        minQuantity: 10,
        price: 29.99,
        status: "In Stock",
        lastUpdated: "2024-03-23",
    },
    {
        id: 7,
        name: "Resistance Bands Set",
        category: "Equipment",
        sku: "EQP-055",
        quantity: 5,
        minQuantity: 8,
        price: 15.99,
        status: "Low Stock",
        lastUpdated: "2024-03-05",
    },
];

export default function Inventory() {
    const [searchTerm, setSearchTerm] = useState("");

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "In Stock":
                return <Badge className="bg-success/10 text-success hover:bg-success/20">In Stock</Badge>;
            case "Low Stock":
                return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">Low Stock</Badge>;
            case "Out of Stock":
                return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">Out of Stock</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const filteredItems = inventoryItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout title="Inventory Management">
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Total Items"
                    value="156"
                    change="+12 new items"
                    changeType="positive"
                    icon={Package}
                    iconClassName="gradient-primary"
                />
                <StatCard
                    title="Total Value"
                    value="$12,450"
                    change="+5% vs last month"
                    changeType="positive"
                    icon={DollarSign}
                    iconClassName="bg-success"
                />
                <StatCard
                    title="Low Stock Items"
                    value="8"
                    change="Needs reordering"
                    changeType="negative"
                    icon={AlertTriangle}
                    iconClassName="bg-warning"
                />
                <StatCard
                    title="Categories"
                    value="5"
                    change="2 active promos"
                    changeType="neutral"
                    icon={Tags}
                    iconClassName="gradient-accent"
                />
            </div>

            <Card className="animate-slide-up">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
                    <CardTitle className="text-xl font-semibold flex items-center gap-2">
                        <Archive className="h-5 w-5 text-primary" />
                        Inventory Items
                    </CardTitle>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search items..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon">
                            <Filter className="h-4 w-4" />
                        </Button>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">Add Item</span>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Last Updated</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{item.category}</TableCell>
                                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {item.quantity}
                                                {item.quantity <= item.minQuantity && (
                                                    <AlertTriangle className="h-3 w-3 text-warning" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>${item.price.toFixed(2)}</TableCell>
                                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">{item.lastUpdated}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
