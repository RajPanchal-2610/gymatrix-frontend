import { useState, useEffect } from "react";
import { User, Building2, Bell, Shield, CreditCard, Palette, Loader2, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useGym } from "@/hooks/useGym";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { hasPermission, role } = usePermissions();
  const { gymId } = useGym();
  const isOwner = role?.isOwner;
  const isSuperAdmin = true; // Since this page is only accessible via /admin/settings for Super Admins

  const [extensionPrices, setExtensionPrices] = useState<any[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);

  const fetchExtensionPrices = async () => {
    try {
      setLoadingPrices(true);
      const response = await fetch(`${BACKEND_URL}/api/payments/extensions/prices`);
      if (!response.ok) throw new Error("Failed to fetch extension prices");
      const data = await response.json();
      setExtensionPrices(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load extension prices");
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleUpdatePrice = async (id: number, type: string, unit_price: number, unit_quantity: number) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payments/extensions/prices`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type, unit_price, unit_quantity })
      });
      if (!response.ok) throw new Error("Update failed");
      toast.success(`${type} price updated successfully`);
      fetchExtensionPrices();
    } catch (error) {
      toast.error("Failed to update price");
    }
  };

  const handleDeletePrice = async (id: number) => {
    if (!confirm("Are you sure you want to delete this pricing?")) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/payments/extensions/prices/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error("Delete failed");
      toast.success("Price deleted successfully");
      fetchExtensionPrices();
    } catch (error) {
      toast.error("Failed to delete price");
    }
  };

  const [newPrice, setNewPrice] = useState({ type: '', unit_price: 0, unit_quantity: 0 });
  const handleCreatePrice = async () => {
    if (!newPrice.type || newPrice.unit_price <= 0 || newPrice.unit_quantity <= 0) {
      toast.error("Please fill all fields with valid values");
      return;
    }
    await handleUpdatePrice(0, newPrice.type, newPrice.unit_price, newPrice.unit_quantity);
    setNewPrice({ type: '', unit_price: 0, unit_quantity: 0 });
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchExtensionPrices();
    }
  }, [isSuperAdmin]);

  return (
    <>
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted p-1 h-auto flex-wrap">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          {hasPermission('view_gym_settings') && (
            <TabsTrigger value="gym" className="gap-2">
              <Building2 className="h-4 w-4" />
              Gym Settings
            </TabsTrigger>
          )}
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
          )}
          {isSuperAdmin && (
            <TabsTrigger value="extensions" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Extension Pricing
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                    JD
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm">
                    Change Photo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG or GIF. Max size 2MB.
                  </p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="john@gymflow.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" defaultValue="+1 234-567-8901" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button className="gradient-primary">Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gym Settings */}
        <TabsContent value="gym">
          <Card>
            <CardHeader>
              <CardTitle>Gym Settings</CardTitle>
              <CardDescription>Configure your gym details and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gymName">Gym Name</Label>
                  <Input id="gymName" defaultValue="Downtown Fitness" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gymEmail">Business Email</Label>
                  <Input id="gymEmail" type="email" defaultValue="info@downtownfitness.com" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" defaultValue="123 Fitness Street, New York, NY 10001" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openTime">Opening Time</Label>
                  <Input id="openTime" type="time" defaultValue="06:00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closeTime">Closing Time</Label>
                  <Input id="closeTime" type="time" defaultValue="22:00" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button className="gradient-primary">Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { title: "New member registrations", description: "Get notified when a new member joins" },
                { title: "Payment received", description: "Receive alerts for successful payments" },
                { title: "Membership expiring", description: "Alerts for memberships about to expire" },
                { title: "Overdue payments", description: "Notifications for overdue member payments" },
                { title: "Daily summary", description: "Receive a daily summary email" },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <span className="flex items-center space-x-2">
                    <Switch id={`notify-${index}`} defaultChecked={index < 3} />
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how Gymatrix looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Theme</Label>
                <div className="flex gap-4">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    onClick={() => setTheme("light")}
                    className="flex-1"
                  >
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    onClick={() => setTheme("dark")}
                    className="flex-1"
                  >
                    Dark
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
              <CardDescription>Manage your Gymatrix subscription</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Pro Plan</span>
                  <span className="text-primary font-bold">$49/month</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Unlimited members, all features included
                </p>
                <Button variant="outline" size="sm">
                  Manage Subscription
                </Button>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium mb-4">Payment Method</h4>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <CreditCard className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/25</p>
                  </div>
                  <Button variant="ghost" size="sm" className="ml-auto">
                    Update
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Extension Pricing (Super Admin Only) */}
        {isSuperAdmin && (
          <TabsContent value="extensions">
            <Card>
              <CardHeader>
                <CardTitle>Extension Pricing Management</CardTitle>
                <CardDescription>Set the pricing for extending gyms and members</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {extensionPrices.map((price) => (
                    <Card key={price.id} className="border-border/50 relative group">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => handleDeletePrice(price.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg capitalize">{price.type} Extension</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Metric Type</Label>
                          <Input
                            type="text"
                            defaultValue={price.type}
                            onBlur={(e) => price.type = e.target.value}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Unit Price (₹)</Label>
                          <Input
                            type="number"
                            defaultValue={price.unit_price}
                            onBlur={(e) => price.unit_price = Number(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Unit Quantity</Label>
                          <Input
                            type="number"
                            defaultValue={price.unit_quantity}
                            onBlur={(e) => price.unit_quantity = Number(e.target.value)}
                          />
                        </div>
                        <Button
                          className="w-full gradient-primary"
                          onClick={() => handleUpdatePrice(price.id, price.type, price.unit_price, price.unit_quantity)}
                        >
                          Update {price.type} Price
                        </Button>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Add New Pricing Form */}
                  <Card className="border-dashed border-primary/40 bg-primary/5">
                    <CardHeader className="pb-2 text-center">
                      <CardTitle className="text-lg">Add New Metric</CardTitle>
                      <CardDescription>Extend a new system metric</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Metric Type (e.g. staff)</Label>
                        <Input
                          placeholder="e.g. trainer"
                          value={newPrice.type}
                          onChange={(e) => setNewPrice({ ...newPrice, type: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Price (₹)</Label>
                          <Input
                            type="number"
                            value={newPrice.unit_price}
                            onChange={(e) => setNewPrice({ ...newPrice, unit_price: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            value={newPrice.unit_quantity}
                            onChange={(e) => setNewPrice({ ...newPrice, unit_quantity: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full border-primary/50 hover:bg-primary/10"
                        onClick={handleCreatePrice}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Pricing Option
                      </Button>
                    </CardContent>
                  </Card>
                  {extensionPrices.length === 0 && !loadingPrices && (
                    <p className="text-muted-foreground col-span-2 text-center py-10">No pricing data found. Please run the database migration.</p>
                  )}
                  {loadingPrices && <Loader2 className="h-8 w-8 animate-spin mx-auto col-span-2" />}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
