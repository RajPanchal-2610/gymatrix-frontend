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
    name: "Basic",
    price: 29,
    duration: "monthly",
    members: 145,
    features: [
      { name: "Gym Floor Access", included: true },
      { name: "Cardio Equipment", included: true },
      { name: "Locker Room", included: true },
      { name: "Group Classes", included: false },
      { name: "Personal Trainer", included: false },
      { name: "Spa & Sauna", included: false },
    ],
    popular: false,
  },
  {
    id: 2,
    name: "Standard",
    price: 49,
    duration: "monthly",
    members: 230,
    features: [
      { name: "Gym Floor Access", included: true },
      { name: "Cardio Equipment", included: true },
      { name: "Locker Room", included: true },
      { name: "Group Classes", included: true },
      { name: "Personal Trainer", included: false },
      { name: "Spa & Sauna", included: false },
    ],
    popular: true,
  },
  {
    id: 3,
    name: "Premium",
    price: 79,
    duration: "monthly",
    members: 175,
    features: [
      { name: "Gym Floor Access", included: true },
      { name: "Cardio Equipment", included: true },
      { name: "Locker Room", included: true },
      { name: "Group Classes", included: true },
      { name: "Personal Trainer", included: true },
      { name: "Spa & Sauna", included: true },
    ],
    popular: false,
  },
];

export default function MembershipPlans() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  return (
    <DashboardLayout title="Membership Plans">
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          Manage your gym membership plans and pricing
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
              <DialogTitle>Create New Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="planName">Plan Name</Label>
                <Input id="planName" placeholder="e.g., Gold Membership" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input id="price" type="number" placeholder="49" />
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3">
                <Label>Access Features</Label>
                <div className="space-y-3">
                  {["Gym Floor Access", "Cardio Equipment", "Group Classes", "Personal Trainer", "Spa & Sauna"].map((feature) => (
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
            className={`relative overflow-hidden hover:shadow-lg transition-all duration-300 animate-slide-up ${
              plan.popular ? "ring-2 ring-primary" : ""
            }`}
          >
            {plan.popular && (
              <div className="absolute top-4 right-4">
                <Badge className="gradient-primary text-primary-foreground">Most Popular</Badge>
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
                <span>{plan.members} active members</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {plan.features.map((feature) => (
                  <div
                    key={feature.name}
                    className={`flex items-center gap-2 text-sm ${
                      feature.included ? "" : "text-muted-foreground"
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
