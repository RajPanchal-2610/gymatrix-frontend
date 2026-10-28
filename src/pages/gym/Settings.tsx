import { useState, useEffect } from "react";
import { Building2, Loader2, Upload, X, Check, MessageSquare, Bell, Zap, Save, ArrowRight, Smartphone, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useGym } from "@/hooks/useGym";
import { supabase } from "@/lib/supabase";
import ChangePasswordCard from "@/components/ChangePasswordCard";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const PREFERRED_TIME_OPTIONS = [
  { value: "05:00", label: "5:00 AM" },
  { value: "06:00", label: "6:00 AM" },
  { value: "07:00", label: "7:00 AM (Default)" },
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM (Noon)" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "17:00", label: "5:00 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "19:00", label: "7:00 PM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "21:00", label: "9:00 PM" },
  { value: "22:00", label: "10:00 PM" },
];

export default function Settings() {
  const { hasPermission } = usePermissions();
  const { gyms, gymId, refreshGyms } = useGym();

  const currentGym = gyms.find(g => g.id === gymId);
  const [logoUrl, setLogoUrl] = useState("");
  const [themeColor, setThemeColor] = useState("blue");
  const [savingBranding, setSavingBranding] = useState(false);

  // Gym settings states
  const [gymName, setGymName] = useState("");

  // WhatsApp Notification Settings State
  const [waWallet, setWaWallet] = useState<any>(null);
  const [loadingWaSettings, setLoadingWaSettings] = useState(false);
  const [savingWaSettings, setSavingWaSettings] = useState(false);
  const [waSettings, setWaSettings] = useState({
    is_automated_enabled: true,
    send_welcome_message: true,
    send_expiry_alert: true,
    send_payment_reminder: true,
    expiry_reminder_days: [3, 0] as number[],
    expiry_followup_interval: 7,
    expiry_preferred_time: '07:00',
    payment_reminder_days: [1, 0] as number[],
    payment_followup_interval: 7,
    payment_preferred_time: '07:00',
    use_custom_sender: false,
    custom_phone_number_id: '',
    custom_waba_id: '',
    custom_access_token: ''
  });

  const fetchWaSettings = async () => {
    if (!gymId) return;
    try {
      setLoadingWaSettings(true);
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/wallet/${gymId}`);
      if (res.ok) {
        const data = await res.json();
        setWaWallet(data);
        const hasCustom = !!(data.custom_phone_number_id || data.custom_waba_id || data.custom_access_token);
        setWaSettings({
          is_automated_enabled: data.is_automated_enabled ?? true,
          send_welcome_message: data.send_welcome_message ?? true,
          send_expiry_alert: data.send_expiry_alert ?? true,
          send_payment_reminder: data.send_payment_reminder ?? true,
          expiry_reminder_days: Array.isArray(data.expiry_reminder_days) ? data.expiry_reminder_days : [3, 0],
          expiry_followup_interval: data.expiry_followup_interval !== undefined ? Number(data.expiry_followup_interval) : 7,
          expiry_preferred_time: data.expiry_preferred_time || currentGym?.notification_settings?.membership_expiry?.preferred_time || '07:00',
          payment_reminder_days: Array.isArray(data.payment_reminder_days) ? data.payment_reminder_days : [1, 0],
          payment_followup_interval: data.payment_followup_interval !== undefined ? Number(data.payment_followup_interval) : 7,
          payment_preferred_time: data.payment_preferred_time || currentGym?.notification_settings?.overdue_payment?.preferred_time || '07:00',
          use_custom_sender: hasCustom,
          custom_phone_number_id: data.custom_phone_number_id || '',
          custom_waba_id: data.custom_waba_id || '',
          custom_access_token: data.custom_access_token || ''
        });
      }
    } catch (err) {
      console.error("Error loading WhatsApp settings:", err);
    } finally {
      setLoadingWaSettings(false);
    }
  };

  const toggleExpiryReminderDay = (day: number) => {
    setWaSettings((prev) => {
      const exists = prev.expiry_reminder_days.includes(day);
      const newDays = exists
        ? prev.expiry_reminder_days.filter((d) => d !== day)
        : [...prev.expiry_reminder_days, day].sort((a, b) => b - a);
      return { ...prev, expiry_reminder_days: newDays };
    });
  };

  const togglePaymentReminderDay = (day: number) => {
    setWaSettings((prev) => {
      const exists = prev.payment_reminder_days.includes(day);
      const newDays = exists
        ? prev.payment_reminder_days.filter((d) => d !== day)
        : [...prev.payment_reminder_days, day].sort((a, b) => b - a);
      return { ...prev, payment_reminder_days: newDays };
    });
  };

  const handleSaveWaSettings = async () => {
    if (!gymId) return;
    try {
      setSavingWaSettings(true);
      const payload = {
        is_automated_enabled: waSettings.is_automated_enabled,
        send_welcome_message: waSettings.send_welcome_message,
        send_expiry_alert: waSettings.send_expiry_alert,
        send_payment_reminder: waSettings.send_payment_reminder,
        expiry_reminder_days: waSettings.expiry_reminder_days,
        expiry_followup_interval: waSettings.expiry_followup_interval,
        expiry_preferred_time: waSettings.expiry_preferred_time,
        payment_reminder_days: waSettings.payment_reminder_days,
        payment_followup_interval: waSettings.payment_followup_interval,
        payment_preferred_time: waSettings.payment_preferred_time,
        custom_phone_number_id: waSettings.use_custom_sender ? waSettings.custom_phone_number_id : '',
        custom_waba_id: waSettings.use_custom_sender ? waSettings.custom_waba_id : '',
        custom_access_token: waSettings.use_custom_sender ? waSettings.custom_access_token : ''
      };
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/settings/${gymId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to update WhatsApp settings");
      toast.success("WhatsApp notification settings saved successfully!");
      await refreshGyms();
      fetchWaSettings();
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSavingWaSettings(false);
    }
  };

  useEffect(() => {
    if (gymId) {
      fetchWaSettings();
    }
  }, [gymId]);

  useEffect(() => {
    if (currentGym) {
      setLogoUrl(currentGym.logo_url || "");
      setThemeColor(currentGym.theme_color || "blue");
      setGymName(currentGym.name || "");
    }
  }, [currentGym]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      toast.error("Image size must be less than 1MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // Clear file input value to allow uploading the same file again
  };

  const handleSaveBranding = async () => {
    if (!gymId) return;
    setSavingBranding(true);
    try {
      const { error } = await supabase
        .from('gyms')
        .update({
          name: gymName,
          logo_url: logoUrl,
          theme_color: themeColor
        })
        .eq('id', gymId);

      if (error) throw error;
      toast.success("Gym branding and settings updated successfully!");
      await refreshGyms();
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to update settings: " + error.message);
    } finally {
      setSavingBranding(false);
    }
  };

  const themes = [
    { id: "blue", name: "Flow Blue", class: "bg-blue-600" },
    { id: "emerald", name: "Emerald Green", class: "bg-emerald-600" },
    { id: "violet", name: "Royal Violet", class: "bg-violet-600" },
    { id: "rose", name: "Rose Red", class: "bg-rose-600" },
    { id: "orange", name: "Sunset Orange", class: "bg-orange-500" },
  ];

  if (!hasPermission('view_gym_settings')) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">You do not have permission to view gym settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gym Branding & Settings</CardTitle>
          <CardDescription>Configure your gym display name, logo, and primary theme color</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="gymName">Gym Name</Label>
            <Input
              id="gymName"
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              placeholder="e.g. Downtown Fitness"
            />
          </div>

          <Separator />

          {/* Gym Logo Upload */}
          <div className="space-y-4">
            <Label>Gym Logo</Label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="h-24 w-24 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Gym Logo Preview" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative overflow-hidden cursor-pointer"
                    asChild
                  >
                    <label className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                    </label>
                  </Button>
                  {logoUrl && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setLogoUrl("")}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended: Square PNG/JPG, max size 1MB.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Theme Customization */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Dashboard Theme Color</Label>
              <p className="text-xs text-muted-foreground">
                Select your gym's primary branding color to personalize the dashboard.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {themes.map((t) => {
                const isSelected = themeColor === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setThemeColor(t.id)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${isSelected
                      ? "border-primary ring-2 ring-primary bg-primary/5 font-medium"
                      : "border-border hover:bg-muted"
                      }`}
                  >
                    <span className={`h-4 w-4 rounded-full ${t.class} flex-shrink-0 flex items-center justify-center`}>
                      {isSelected && <Check className="h-2 w-2 text-white" />}
                    </span>
                    <span className="text-xs truncate">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSaveBranding}
              disabled={savingBranding}
              className="gradient-primary"
            >
              {savingBranding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Automated Notification Settings */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                <MessageSquare className="h-5 w-5" />
              </span>
              WhatsApp Notification Settings
            </CardTitle>
            <CardDescription className="mt-1">
              Configure whether to send automated WhatsApp messages to members for registrations, expiries, and payment dues.
            </CardDescription>
          </div>
          {waWallet && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 px-3 py-1 font-semibold text-xs">
                <Zap className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                {waWallet.available_total ?? 0} Messages Available
              </Badge>
              <Button variant="outline" size="sm" asChild className="h-8 text-xs">
                <Link to="/gym/pricing">
                  Buy Pack <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Master Toggle */}
          <div className="flex items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/80 bg-muted/40">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold flex items-center gap-2">
                Enable Automated WhatsApp Messages
              </Label>
              <p className="text-xs text-muted-foreground">
                Master switch to enable or pause all background automated WhatsApp notifications for your gym.
              </p>
            </div>
            <Switch
              checked={waSettings.is_automated_enabled}
              onCheckedChange={(checked) => setWaSettings({ ...waSettings, is_automated_enabled: checked })}
            />
          </div>

          <Separator />

          {/* Granular Event Toggles */}
          <div className={`space-y-4 ${!waSettings.is_automated_enabled ? "opacity-50 pointer-events-none" : ""}`}>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Automated Event Triggers</h4>
              <p className="text-xs text-muted-foreground">Choose specific events that should trigger an automated message.</p>
            </div>

            {/* 1. Welcome Message */}
            <div className="flex items-start sm:items-center justify-between gap-4 p-3.5 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <Label className="font-medium text-sm">Send Welcome Message</Label>
                </div>
                <p className="text-xs text-muted-foreground pl-4">
                  Automatically send a personalized WhatsApp greeting with plan name and membership dates immediately when a new member is registered.
                </p>
              </div>
              <Switch
                checked={waSettings.send_welcome_message}
                onCheckedChange={(checked) => setWaSettings({ ...waSettings, send_welcome_message: checked })}
              />
            </div>

            {/* 2. Membership Expiry */}
            <div className="rounded-lg border border-border/60 p-3.5 space-y-3 transition-colors hover:bg-muted/20">
              <div className="flex items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <Label className="font-medium text-sm">Send Membership Expiry Reminder</Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-4">
                    Automatically notify members via WhatsApp when their gym membership is nearing expiration or needs renewal.
                  </p>
                </div>
                <Switch
                  checked={waSettings.send_expiry_alert}
                  onCheckedChange={(checked) => setWaSettings({ ...waSettings, send_expiry_alert: checked })}
                />
              </div>

              {waSettings.send_expiry_alert && (
                <div className="pl-4 pt-3 border-t border-border/40 space-y-4">
                  {/* Advance Reminder Days (Multi-selection) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-amber-500" />
                        When to send advance reminder (Multi-select)
                      </Label>
                      <span className="text-[11px] text-muted-foreground">Select one or more</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { day: 3, label: "3 Days Before" },
                        { day: 2, label: "2 Days Before" },
                        { day: 1, label: "1 Day Before" },
                        { day: 0, label: "On Expiry Date" },
                      ].map(({ day, label }) => {
                        const isSelected = waSettings.expiry_reminder_days.includes(day);
                        return (
                          <button
                            type="button"
                            key={day}
                            onClick={() => toggleExpiryReminderDay(day)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                              isSelected
                                ? "bg-amber-500 text-white shadow-sm ring-1 ring-amber-600/30"
                                : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
                            }`}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Follow-up Interval */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      Follow-up interval (after expiry if unrenewed)
                    </Label>
                    <Select
                      value={String(waSettings.expiry_followup_interval)}
                      onValueChange={(val) => setWaSettings({ ...waSettings, expiry_followup_interval: Number(val) })}
                    >
                      <SelectTrigger className="h-9 w-full sm:w-[320px] text-xs">
                        <SelectValue placeholder="Select follow-up schedule" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None (No follow-up reminder)</SelectItem>
                        <SelectItem value="3">Every 3 Days (until renewed)</SelectItem>
                        <SelectItem value="7">Every 7 Days / Weekly (until renewed)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Preferred Send Time (Hourly) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      Preferred Send Time (Hour of Day)
                    </Label>
                    <Select
                      value={waSettings.expiry_preferred_time || "07:00"}
                      onValueChange={(val) => setWaSettings({ ...waSettings, expiry_preferred_time: val })}
                    >
                      <SelectTrigger className="h-9 w-full sm:w-[320px] text-xs">
                        <SelectValue placeholder="Select daily hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {PREFERRED_TIME_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">The daily hour when automated expiry alerts will be sent to members.</p>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Payment Reminder */}
            <div className="rounded-lg border border-border/60 p-3.5 space-y-3 transition-colors hover:bg-muted/20">
              <div className="flex items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <Label className="font-medium text-sm">Send Payment & Overdue Reminder</Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-4">
                    Automatically dispatch friendly WhatsApp payment reminders to members who have upcoming fee dues or overdue balances.
                  </p>
                </div>
                <Switch
                  checked={waSettings.send_payment_reminder}
                  onCheckedChange={(checked) => setWaSettings({ ...waSettings, send_payment_reminder: checked })}
                />
              </div>

              {waSettings.send_payment_reminder && (
                <div className="pl-4 pt-3 border-t border-border/40 space-y-4">
                  {/* Advance Reminder Days (Multi-selection) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-rose-500" />
                        When to send advance reminder (Multi-select)
                      </Label>
                      <span className="text-[11px] text-muted-foreground">Select one or more</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { day: 3, label: "3 Days Before" },
                        { day: 2, label: "2 Days Before" },
                        { day: 1, label: "1 Day Before" },
                        { day: 0, label: "On Due Date" },
                      ].map(({ day, label }) => {
                        const isSelected = waSettings.payment_reminder_days.includes(day);
                        return (
                          <button
                            type="button"
                            key={day}
                            onClick={() => togglePaymentReminderDay(day)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                              isSelected
                                ? "bg-rose-500 text-white shadow-sm ring-1 ring-rose-600/30"
                                : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
                            }`}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Follow-up Interval */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-rose-500" />
                      Follow-up interval (after due date if unpaid)
                    </Label>
                    <Select
                      value={String(waSettings.payment_followup_interval)}
                      onValueChange={(val) => setWaSettings({ ...waSettings, payment_followup_interval: Number(val) })}
                    >
                      <SelectTrigger className="h-9 w-full sm:w-[320px] text-xs">
                        <SelectValue placeholder="Select follow-up schedule" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None (No follow-up reminder)</SelectItem>
                        <SelectItem value="3">Every 3 Days (until paid)</SelectItem>
                        <SelectItem value="7">Every 7 Days / Weekly (until paid)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Preferred Send Time (Hourly) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-rose-500" />
                      Preferred Send Time (Hour of Day)
                    </Label>
                    <Select
                      value={waSettings.payment_preferred_time || "07:00"}
                      onValueChange={(val) => setWaSettings({ ...waSettings, payment_preferred_time: val })}
                    >
                      <SelectTrigger className="h-9 w-full sm:w-[320px] text-xs">
                        <SelectValue placeholder="Select daily hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {PREFERRED_TIME_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">The daily hour when automated payment reminders will be sent to members.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Custom WhatsApp Sender Credentials (BYO Number) */}
          <div className="space-y-4">
            <div className="flex items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/70 bg-secondary/15">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" />
                  Send From My Own WhatsApp Business Number
                </Label>
                <p className="text-xs text-muted-foreground">
                  By default, messages are sent through the centralized Gymatrix Meta WhatsApp gateway. Turn this on if you want messages to be sent from your own Meta WhatsApp Business Account number instead.
                </p>
              </div>
              <Switch
                checked={waSettings.use_custom_sender}
                onCheckedChange={(checked) => setWaSettings({ ...waSettings, use_custom_sender: checked })}
              />
            </div>

            {waSettings.use_custom_sender && (
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4 animate-in fade-in-50 duration-200">
                <div className="space-y-1">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-primary">Your Meta Cloud API Credentials</h5>
                  <p className="text-xs text-muted-foreground">
                    Enter your Meta WhatsApp Business API credentials to route automated messages directly through your own business phone number.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="custom_phone_number_id" className="text-xs font-medium">
                      Phone Number ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="custom_phone_number_id"
                      placeholder="e.g. 104928374928374"
                      value={waSettings.custom_phone_number_id}
                      onChange={(e) => setWaSettings({ ...waSettings, custom_phone_number_id: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">From Meta WhatsApp API Setup</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="custom_waba_id" className="text-xs font-medium">
                      WhatsApp Business Account (WABA) ID
                    </Label>
                    <Input
                      id="custom_waba_id"
                      placeholder="e.g. 192837465918273"
                      value={waSettings.custom_waba_id}
                      onChange={(e) => setWaSettings({ ...waSettings, custom_waba_id: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">Your Meta WABA Account ID</p>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                    <Label htmlFor="custom_access_token" className="text-xs font-medium">
                      Permanent Access Token <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="custom_access_token"
                      type="password"
                      placeholder="e.g. EAAG..."
                      value={waSettings.custom_access_token}
                      onChange={(e) => setWaSettings({ ...waSettings, custom_access_token: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">System User Permanent Token</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveWaSettings}
              disabled={savingWaSettings || loadingWaSettings}
              className="gradient-primary"
            >
              {savingWaSettings ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving WhatsApp Settings...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save WhatsApp Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security & Password */}
      <ChangePasswordCard />

    </div>
  );
}
