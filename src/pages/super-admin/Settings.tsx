import { useState, useEffect } from "react";
import { User, Building2, Bell, Shield, CreditCard, Palette, Loader2, Trash2, Plus, MessageSquare, Save, CheckCircle2, ShieldCheck, Zap, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useGym } from "@/hooks/useGym";
import ChangePasswordCard from "@/components/ChangePasswordCard";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { hasPermission, role } = usePermissions();
  const { gymId } = useGym();
  const isOwner = role?.isOwner;
  const isSuperAdmin = true; // Since this page is only accessible via /admin/settings for Super Admins

  const [extensionPrices, setExtensionPrices] = useState<any[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // WhatsApp Meta Cloud API Configuration
  const [metaConfig, setMetaConfig] = useState({
    is_enabled: true,
    phone_number_id: '',
    waba_id: '',
    access_token: '',
    webhook_verify_token: 'gymatrix_meta_webhook_secret_2026',
    default_country_code: '91'
  });
  const [loadingMetaConfig, setLoadingMetaConfig] = useState(false);
  const [savingMetaConfig, setSavingMetaConfig] = useState(false);

  // WhatsApp Addon Packs (Monthly & Yearly)
  const [waPacks, setWaPacks] = useState<any[]>([]);
  const [loadingWaPacks, setLoadingWaPacks] = useState(false);
  const [packDialogOpen, setPackDialogOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<any | null>(null);
  const [savingPack, setSavingPack] = useState(false);
  const [packFormData, setPackFormData] = useState({
    name: '',
    message_count: 500,
    price: 199,
    duration_unit: 'month' as 'month' | 'year',
    description: '',
    is_active: true
  });

  const fetchMetaConfig = async () => {
    try {
      setLoadingMetaConfig(true);
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/config`);
      if (res.ok) {
        const data = await res.json();
        setMetaConfig(prev => ({
          ...prev,
          ...data
        }));
      }
    } catch (err) {
      console.error('Error fetching Meta config:', err);
    } finally {
      setLoadingMetaConfig(false);
    }
  };

  const handleSaveMetaConfig = async () => {
    try {
      setSavingMetaConfig(true);
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metaConfig)
      });
      if (!res.ok) throw new Error('Failed to save Meta configuration');
      toast.success('Meta WhatsApp configuration saved successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Error saving Meta config');
    } finally {
      setSavingMetaConfig(false);
    }
  };

  const fetchWaPacks = async () => {
    try {
      setLoadingWaPacks(true);
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/packs?include_inactive=true`);
      if (res.ok) {
        const data = await res.json();
        setWaPacks(data);
      }
    } catch (err) {
      console.error('Error fetching WhatsApp packs:', err);
    } finally {
      setLoadingWaPacks(false);
    }
  };

  const openAddPackDialog = () => {
    setEditingPack(null);
    setPackFormData({
      name: '',
      message_count: 500,
      price: 199,
      duration_unit: 'month',
      description: '',
      is_active: true
    });
    setPackDialogOpen(true);
  };

  const openEditPackDialog = (pack: any) => {
    setEditingPack(pack);
    setPackFormData({
      name: pack.name || '',
      message_count: pack.message_count || 500,
      price: pack.price || 199,
      duration_unit: (pack.duration_unit as 'month' | 'year') || 'month',
      description: pack.description || '',
      is_active: pack.is_active ?? true
    });
    setPackDialogOpen(true);
  };

  const handleSavePack = async () => {
    if (!packFormData.name || packFormData.message_count <= 0 || packFormData.price <= 0) {
      toast.error('Please enter a valid pack name, message count, and price');
      return;
    }
    try {
      setSavingPack(true);
      if (editingPack) {
        const res = await fetch(`${BACKEND_URL}/api/whatsapp/super-admin/packs/${editingPack.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(packFormData)
        });
        if (!res.ok) throw new Error('Failed to update pack');
        toast.success('WhatsApp pack updated successfully!');
      } else {
        const res = await fetch(`${BACKEND_URL}/api/whatsapp/super-admin/packs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(packFormData)
        });
        if (!res.ok) throw new Error('Failed to create pack');
        toast.success('WhatsApp pack created successfully!');
      }
      setPackDialogOpen(false);
      fetchWaPacks();
    } catch (err: any) {
      toast.error(err.message || 'Error saving pack');
    } finally {
      setSavingPack(false);
    }
  };

  const handleDeletePack = async (id: number) => {
    if (!confirm('Are you sure you want to delete this WhatsApp pack?')) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/super-admin/packs/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete pack');
      toast.success('Pack deleted successfully');
      fetchWaPacks();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting pack');
    }
  };

  const handleTogglePack = async (id: number, currentActive: boolean) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/super-admin/packs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive })
      });
      if (!res.ok) throw new Error('Failed to update pack status');
      toast.success(`Pack ${!currentActive ? 'activated' : 'deactivated'}`);
      fetchWaPacks();
    } catch (err: any) {
      toast.error(err.message || 'Error updating pack');
    }
  };

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
      fetchMetaConfig();
      fetchWaPacks();
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
            <>
              <TabsTrigger value="extensions" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Extension Pricing
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-500" />
                WhatsApp Management
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
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

          {/* Change Password Card */}
          <ChangePasswordCard />
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

        {/* WhatsApp Management (Meta Cloud API & Monthly/Yearly Addon Packs) */}
        {isSuperAdmin && (
          <TabsContent value="whatsapp" className="space-y-6">
            {/* 1. Meta WhatsApp Cloud API Gateway Settings */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-emerald-500" />
                    Meta WhatsApp Cloud API Gateway
                  </CardTitle>
                  <CardDescription>
                    Configure the central WhatsApp Business Cloud API credentials for automated messaging.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="meta_toggle" className="text-sm font-medium">Gateway Active</Label>
                  <Switch
                    id="meta_toggle"
                    checked={metaConfig.is_enabled}
                    onCheckedChange={(val) => setMetaConfig({ ...metaConfig, is_enabled: val })}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingMetaConfig ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone_number_id">Meta Phone Number ID</Label>
                        <Input
                          id="phone_number_id"
                          placeholder="e.g. 104829104928102"
                          value={metaConfig.phone_number_id}
                          onChange={(e) => setMetaConfig({ ...metaConfig, phone_number_id: e.target.value })}
                        />
                        <p className="text-[11px] text-muted-foreground">From Meta Developer App &gt; WhatsApp &gt; API Setup</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="waba_id">WhatsApp Business Account (WABA) ID</Label>
                        <Input
                          id="waba_id"
                          placeholder="e.g. 109283746591029"
                          value={metaConfig.waba_id}
                          onChange={(e) => setMetaConfig({ ...metaConfig, waba_id: e.target.value })}
                        />
                        <p className="text-[11px] text-muted-foreground">Your Meta WhatsApp Business Account ID</p>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="access_token">System User Permanent Access Token</Label>
                        <Input
                          id="access_token"
                          type="password"
                          placeholder="EAAB..."
                          value={metaConfig.access_token}
                          onChange={(e) => setMetaConfig({ ...metaConfig, access_token: e.target.value })}
                        />
                        <p className="text-[11px] text-muted-foreground">Generate in Meta Business Settings &gt; System Users with `whatsapp_business_messaging` permission</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="webhook_token">Webhook Verify Token</Label>
                        <Input
                          id="webhook_token"
                          value={metaConfig.webhook_verify_token}
                          onChange={(e) => setMetaConfig({ ...metaConfig, webhook_verify_token: e.target.value })}
                        />
                        <p className="text-[11px] text-muted-foreground">Use this token when verifying the Meta Webhook URL: <code>/api/whatsapp/webhook</code></p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country_code">Default Country Code</Label>
                        <Input
                          id="country_code"
                          placeholder="91"
                          value={metaConfig.default_country_code}
                          onChange={(e) => setMetaConfig({ ...metaConfig, default_country_code: e.target.value })}
                        />
                        <p className="text-[11px] text-muted-foreground">Country code without '+' to prepend to 10-digit mobile numbers</p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button onClick={handleSaveMetaConfig} disabled={savingMetaConfig} className="gradient-primary">
                        {savingMetaConfig ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Meta Gateway Configuration
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 2. Extra WhatsApp Message Add-on Packs (Monthly & Yearly) */}
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    WhatsApp Message Add-on Packs (Monthly & Yearly)
                  </CardTitle>
                  <CardDescription>
                    Create and manage top-up packs available for gym owners to purchase when they need extra WhatsApp messages.
                  </CardDescription>
                </div>
                <Button onClick={openAddPackDialog} className="gradient-primary shrink-0">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add New Pack
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Existing Packs List */}
                {loadingWaPacks ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : waPacks.length === 0 ? (
                  <div className="text-center py-10 border border-dashed rounded-lg">
                    <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-muted-foreground font-medium">No WhatsApp packs found</p>
                    <p className="text-xs text-muted-foreground mt-1">Click "Add New Pack" above to create your first top-up pack.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {waPacks.map((pack) => (
                      <Card key={pack.id} className="relative flex flex-col justify-between overflow-hidden border border-border/70 hover:border-primary/50 transition-all">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-bold">{pack.name}</CardTitle>
                            <Badge variant={pack.duration_unit === 'year' ? 'default' : 'secondary'} className="text-[10px] uppercase font-bold">
                              {pack.duration_unit === 'year' ? 'Yearly' : 'Monthly'}
                            </Badge>
                          </div>
                          <CardDescription className="text-xs">
                            {pack.description || (pack.duration_unit === 'year' ? 'Valid for 1 full year (365 days)' : 'Valid for 1 month (30 days)')}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pb-3">
                          <div className="flex items-baseline justify-between">
                            <div>
                              <span className="text-2xl font-extrabold text-foreground">₹{pack.price}</span>
                              <span className="text-xs text-muted-foreground ml-1">/ {pack.duration_unit}</span>
                            </div>
                            <span className="text-sm font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              {Number(pack.message_count).toLocaleString()} msgs
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Switch
                                checked={pack.is_active}
                                onCheckedChange={() => handleTogglePack(pack.id, pack.is_active)}
                              />
                              <span className="text-muted-foreground">{pack.is_active ? 'Active' : 'Hidden'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditPackDialog(pack)}
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                title="Edit Pack"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeletePack(pack.id)}
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                title="Delete Pack"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add / Edit Pack Dialog Form */}
            <Dialog open={packDialogOpen} onOpenChange={setPackDialogOpen}>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    {editingPack ? "Edit WhatsApp Add-on Pack" : "Create WhatsApp Add-on Pack"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingPack
                      ? "Update pricing, duration tier, and message count for this add-on pack."
                      : "Configure a new message top-up pack for gym owners to purchase."}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="pack_name">Pack Name</Label>
                    <Input
                      id="pack_name"
                      placeholder="e.g. Pro Boost, Mega Annual Saver"
                      value={packFormData.name}
                      onChange={(e) => setPackFormData({ ...packFormData, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="pack_duration">Duration Tier</Label>
                      <Select
                        value={packFormData.duration_unit}
                        onValueChange={(val: 'month' | 'year') => setPackFormData({ ...packFormData, duration_unit: val })}
                      >
                        <SelectTrigger id="pack_duration">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">Monthly (30 Days)</SelectItem>
                          <SelectItem value="year">Yearly (365 Days)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="pack_messages">Message Count</Label>
                      <Input
                        id="pack_messages"
                        type="number"
                        placeholder="500"
                        value={packFormData.message_count}
                        onChange={(e) => setPackFormData({ ...packFormData, message_count: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="pack_price">Price (₹ INR)</Label>
                      <Input
                        id="pack_price"
                        type="number"
                        placeholder="199"
                        value={packFormData.price}
                        onChange={(e) => setPackFormData({ ...packFormData, price: Number(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Active Status</Label>
                      <div className="flex items-center space-x-2 pt-2">
                        <Switch
                          checked={packFormData.is_active}
                          onCheckedChange={(checked) => setPackFormData({ ...packFormData, is_active: checked })}
                        />
                        <span className="text-sm text-muted-foreground">{packFormData.is_active ? 'Active' : 'Hidden'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pack_description">Description (Optional)</Label>
                    <Textarea
                      id="pack_description"
                      rows={2}
                      placeholder="e.g. Ideal for gyms needing extra alerts during holiday seasons..."
                      value={packFormData.description}
                      onChange={(e) => setPackFormData({ ...packFormData, description: e.target.value })}
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setPackDialogOpen(false)} disabled={savingPack}>
                    Cancel
                  </Button>
                  <Button onClick={handleSavePack} disabled={savingPack} className="gradient-primary">
                    {savingPack && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                    {editingPack ? "Update Pack" : "Create Pack"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
