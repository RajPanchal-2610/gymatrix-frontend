
import { useState } from "react";
import { Plus, Edit, Trash2, Users, Check, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const plans = [
    {
        id: 1,
        name: "1 Month Plan",
        price: 49,
        duration: "1 Month",
        members: 45,
        features: [
            { name: "Gym Floor Access", included: true },
            { name: "Locker Room", included: true },
            { name: "Group Classes", included: false },
        ],
        popular: false,
    },
    {
        id: 2,
        name: "3 Months Plan",
        price: 129,
        duration: "3 Months",
        members: 89,
        features: [
            { name: "Gym Floor Access", included: true },
            { name: "Locker Room", included: true },
            { name: "Group Classes", included: true },
        ],
        popular: true,
    },
    {
        id: 3,
        name: "1 Year Plan",
        price: 450,
        duration: "1 Year",
        members: 25,
        features: [
            { name: "Gym Floor Access", included: true },
            { name: "Locker Room", included: true },
            { name: "Group Classes", included: true },
            { name: "Personal Trainer", included: true },
        ],
        popular: false,
    },
];

export default function MembershipPlans() {
    const [addDialogOpen, setAddDialogOpen] = useState(false);

    return (
        <DashboardLayout title="Subscription Plans">
            <div className="flex justify-between items-center mb-6">
                <p className="text-muted-foreground">
                    Manage your gym's subscription plans (1 Month, 3 Months, 1 Year, etc.)
                </p>
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gradient-primary shadow-glow">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Plan
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Create New Subscription Plan</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="planName">Plan Name</Label>
                                <Input id="planName" placeholder="e.g., 6 Months Saver" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="price">Price ($)</Label>
                                    <Input id="price" type="number" placeholder="199" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Duration</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1_month">1 Month</SelectItem>
                                            <SelectItem value="3_months">3 Months</SelectItem>
                                            <SelectItem value="6_months">6 Months</SelectItem>
                                            <SelectItem value="1_year">1 Year</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label>Features Included</Label>
                                <div className="space-y-3">
                                    {["Gym Access", "Locker Room", "Cardio Area", "Personal Trainer", "Sauna"].map((feature) => (
                                        <div key={feature} className="flex items-center justify-between">
                                            <span className="text-sm">{feature}</span>
                                            <Switch />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button className="gradient-primary">Create Plan</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <Card
                        key={plan.id}
                        className={`relative overflow-hidden hover:shadow-lg transition-all duration-300 animate-slide-up ${plan.popular ? "ring-2 ring-primary" : ""
                            }`}
                    >
                        {plan.popular && (
                            <div className="absolute top-4 right-4">
                                <Badge className="gradient-primary text-primary-foreground">Best Value</Badge>
                            </div>
                        )}
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span>{plan.name}</span>
                            </CardTitle>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold">${plan.price}</span>
                                <span className="text-muted-foreground">/{plan.duration}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Users className="h-4 w-4" />
                                <span>{plan.members} active subscribers</span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                {plan.features.map((feature) => (
                                    <div
                                        key={feature.name}
                                        className={`flex items-center gap-2 text-sm ${feature.included ? "" : "text-muted-foreground"
                                            }`}
                                    >
                                        {feature.included ? (
                                            <Check className="h-4 w-4 text-success" />
                                        ) : (
                                            <X className="h-4 w-4" />
                                        )}
                                        <span>{feature.name}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 pt-4">
                                <Button variant="outline" className="flex-1">
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                </Button>
                                <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </DashboardLayout>
    );
}
