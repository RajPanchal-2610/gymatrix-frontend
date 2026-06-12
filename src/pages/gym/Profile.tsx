import { useState, useEffect, useCallback } from "react";
import { User, Loader2, Mail, Phone, CalendarClock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useGym } from "@/hooks/useGym";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { GymNotificationSettings } from "@/types/gym";

const DEFAULT_NOTIFICATION_SETTINGS: GymNotificationSettings = {
  membership_expiry: {
    preferred_time: "07:00",
    before_days: [3],
    on_day: true,
    after_days: [],
  },
  overdue_payment: {
    preferred_time: "07:00",
    reminder_interval_days: 7,
    max_reminders: 0,
  },
};

const PREFERRED_TIME_OPTIONS = [
  { value: "00:00", label: "12:00 AM (Midnight)" },
  { value: "01:00", label: "1:00 AM" },
  { value: "02:00", label: "2:00 AM" },
  { value: "03:00", label: "3:00 AM" },
  { value: "04:00", label: "4:00 AM" },
  { value: "05:00", label: "5:00 AM" },
  { value: "06:00", label: "6:00 AM" },
  { value: "07:00", label: "7:00 AM" },
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
  { value: "23:00", label: "11:00 PM" },
];

const BEFORE_DAY_OPTIONS = [
  { value: 15, label: "15 days before" },
  { value: 7, label: "7 days before" },
  { value: 3, label: "3 days before" },
  { value: 1, label: "1 day before" },
];

const AFTER_DAY_OPTIONS = [
  { value: 1, label: "1 day after" },
  { value: 3, label: "3 days after" },
  { value: 7, label: "7 days after" },
  { value: 15, label: "15 days after" },
];

const REMINDER_INTERVAL_OPTIONS = [
  { value: "3", label: "Every 3 days" },
  { value: "7", label: "Every 7 days" },
  { value: "15", label: "Every 15 days" },
  { value: "30", label: "Every 30 days" },
  { value: "0", label: "Only once" },
];

const MAX_REMINDER_OPTIONS = [
  { value: "0", label: "Unlimited" },
  { value: "3", label: "After 3 reminders" },
  { value: "5", label: "After 5 reminders" },
  { value: "10", label: "After 10 reminders" },
];

const formatPreferredTime = (timeStr?: string) => {
  if (!timeStr) return "7:00 AM";
  const [hourStr, minStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${formattedHour}:${minStr} ${ampm}`;
};

export default function Profile() {
  const { role } = usePermissions();
  const { gyms, gymId, refreshGyms } = useGym();
  
  // Notification rules state
  const [notifSettings, setNotifSettings] = useState<GymNotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [savingNotif, setSavingNotif] = useState(false);

  const currentGym = gyms.find(g => g.id === gymId);
  const isOwnerOrAdmin = role?.isOwner || 
    role?.name?.toLowerCase() === 'owner' || 
    role?.name?.toLowerCase() === 'admin' || 
    role?.name?.toLowerCase() === 'manager';

  useEffect(() => {
    if (currentGym) {
      setNotifSettings(currentGym.notification_settings || DEFAULT_NOTIFICATION_SETTINGS);
    }
  }, [currentGym]);

  const saveNotificationSettings = useCallback(async (newSettings: GymNotificationSettings) => {
    if (!gymId) return;
    setSavingNotif(true);
    try {
      const { error } = await supabase
        .from('gyms')
        .update({ notification_settings: newSettings })
        .eq('id', gymId);

      if (error) throw error;
      toast.success("Notification rules updated");
      await refreshGyms();
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to save notification rules: " + error.message);
    } finally {
      setSavingNotif(false);
    }
  }, [gymId, refreshGyms]);

  const handleToggleBeforeDay = (day: number, checked: boolean) => {
    const updated = { ...notifSettings };
    if (checked) {
      updated.membership_expiry.before_days = [...updated.membership_expiry.before_days, day].sort((a, b) => b - a);
    } else {
      updated.membership_expiry.before_days = updated.membership_expiry.before_days.filter(d => d !== day);
    }
    setNotifSettings(updated);
    saveNotificationSettings(updated);
  };

  const handleToggleOnDay = (checked: boolean) => {
    const updated = {
      ...notifSettings,
      membership_expiry: { ...notifSettings.membership_expiry, on_day: checked }
    };
    setNotifSettings(updated);
    saveNotificationSettings(updated);
  };

  const handleToggleAfterDay = (day: number, checked: boolean) => {
    const updated = { ...notifSettings };
    if (checked) {
      updated.membership_expiry.after_days = [...updated.membership_expiry.after_days, day].sort((a, b) => a - b);
    } else {
      updated.membership_expiry.after_days = updated.membership_expiry.after_days.filter(d => d !== day);
    }
    setNotifSettings(updated);
    saveNotificationSettings(updated);
  };

  const handleReminderInterval = (value: string) => {
    const updated = {
      ...notifSettings,
      overdue_payment: { ...notifSettings.overdue_payment, reminder_interval_days: parseInt(value) }
    };
    setNotifSettings(updated);
    saveNotificationSettings(updated);
  };

  const handleMaxReminders = (value: string) => {
    const updated = {
      ...notifSettings,
      overdue_payment: { ...notifSettings.overdue_payment, max_reminders: parseInt(value) }
    };
    setNotifSettings(updated);
    saveNotificationSettings(updated);
  };

  const handleExpiryPreferredTime = (value: string) => {
    const updated = {
      ...notifSettings,
      membership_expiry: { ...notifSettings.membership_expiry, preferred_time: value }
    };
    setNotifSettings(updated);
    saveNotificationSettings(updated);
  };

  const handleOverduePreferredTime = (value: string) => {
    const updated = {
      ...notifSettings,
      overdue_payment: { ...notifSettings.overdue_payment, preferred_time: value }
    };
    setNotifSettings(updated);
    saveNotificationSettings(updated);
  };
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialData, setInitialData] = useState({ fullName: "", phone: "" });

  // Notification preferences states
  const [preferences, setPreferences] = useState({
    new_member: true,
    payment_received: true,
    membership_expiring: true,
    overdue_payment: true,
  });
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setLoadingPrefs(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name, email, phone, notification_preferences')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) throw error;

          if (profile) {
            const nameVal = profile.full_name || "";
            const phoneVal = profile.phone || "";
            setFullName(nameVal);
            setEmail(profile.email || user.email || "");
            setPhone(phoneVal);
            setInitialData({ fullName: nameVal, phone: phoneVal });
            if (profile.notification_preferences) {
              setPreferences(prev => ({
                ...prev,
                ...profile.notification_preferences
              }));
            }
          } else {
            setEmail(user.email || "");
            setInitialData({ fullName: "", phone: "" });
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast.error("Failed to load profile details.");
      } finally {
        setLoading(false);
        setLoadingPrefs(false);
      }
    };
    fetchUserProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (phone.trim() !== "") {
      const clean = phone.replace(/[\s\-\(\)\+]/g, '');
      let normalized = clean;
      if (clean.startsWith('91') && clean.length === 12) {
        normalized = clean.substring(2);
      } else if (clean.startsWith('0') && clean.length === 11) {
        normalized = clean.substring(1);
      }

      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(normalized)) {
        toast.error("Please enter a valid 10-digit mobile number");
        return;
      }
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user found");

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      let error;
      if (existingProfile) {
        const { error: err } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            phone: phone,
            email: email
          })
          .eq('user_id', user.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            full_name: fullName,
            phone: phone,
            email: email
          });
        error = err;
      }

      if (error) throw error;
      toast.success("Profile updated successfully!");
      setInitialData({ fullName: fullName, phone: phone });
      window.dispatchEvent(new CustomEvent("profile-updated"));
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to update profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePreference = async (key: string, checked: boolean) => {
    const previousPrefs = { ...preferences };
    const updatedPrefs = { ...preferences, [key]: checked };
    setPreferences(updatedPrefs);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ notification_preferences: updatedPrefs })
          .eq('user_id', user.id);

        if (error) throw error;
        toast.success("Notification preferences updated");
        window.dispatchEvent(new CustomEvent("profile-updated"));
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to save preference: " + error.message);
      // Revert state
      setPreferences(previousPrefs);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isChanged = fullName !== initialData.fullName || phone !== initialData.phone;

  const initials = initialData.fullName
    ? initialData.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : email.slice(0, 2).toUpperCase();

  return (
    <div className="w-full space-y-8 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information, contact details, and notification preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Card: Summary banner */}
        <Card className="md:col-span-1 border border-border bg-card/50 backdrop-blur-xl">
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
            <Avatar className="h-24 w-24 border-2 border-primary/20 ring-offset-background ring-2 ring-primary/10">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-xl font-bold">{initialData.fullName || "User Name"}</h2>
              <p className="text-xs text-muted-foreground bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-semibold inline-block capitalize">
                {role?.name ? role.name.replace(/_/g, ' ') : "Gym Administrator"}
              </p>
            </div>
            <div className="w-full pt-4 border-t border-border/50 text-left space-y-3">
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span className="truncate">{email}</span>
              </div>
              {initialData.phone && (
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>{initialData.phone}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Card: Profile Form */}
        <Card className="md:col-span-2 border border-border bg-card/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>
              Keep your profile up to date to ensure proper communication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="pl-9 focus-visible:ring-primary"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    placeholder="e.g. john@example.com"
                    className="pl-9 bg-muted/50 cursor-not-allowed opacity-75"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 000-0000"
                    className="pl-9 focus-visible:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border/50">
              <Button
                className="gradient-primary text-white"
                onClick={handleSaveProfile}
                disabled={saving || !isChanged}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Preferences Card */}
      <Card className="border border-border bg-card/50 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose what alerts you want to receive on your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[
            { key: "new_member", title: "New member registrations", description: "Get notified when a new member joins", schedule: "Triggered instantly" },
            { key: "payment_received", title: "Payment received", description: "Receive alerts for successful payments", schedule: "Triggered instantly" },
            { 
              key: "membership_expiring", 
              title: "Membership expiring", 
              description: "Alerts for memberships about to expire", 
              schedule: `Sent daily at ${formatPreferredTime(currentGym?.notification_settings?.membership_expiry?.preferred_time)} (3 days before & on day of expiry)` 
            },
            { 
              key: "overdue_payment", 
              title: "Overdue payments", 
              description: "Notifications for overdue member payments", 
              schedule: `Sent daily at ${formatPreferredTime(currentGym?.notification_settings?.overdue_payment?.preferred_time)} (weekly if overdue)` 
            },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm sm:text-base">{item.title}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{item.description}</p>
                <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold mt-1.5">
                  {item.schedule}
                </span>
              </div>
              <span className="flex items-center space-x-2">
                <Switch 
                  id={`notify-${item.key}`} 
                  checked={preferences[item.key as keyof typeof preferences]} 
                  onCheckedChange={(checked) => handleTogglePreference(item.key, checked)}
                  disabled={loadingPrefs}
                />
              </span>
            </div>
          ))}

          {isOwnerOrAdmin && (
            <>
              <Separator className="my-6 bg-border/50" />
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-base sm:text-lg text-foreground flex items-center gap-2">
                    Gym Notification Rules (Applies to all staff)
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Configure global automated schedules and rules for your gym alerts.</p>
                </div>

                {/* Membership Expiry Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-amber-500" />
                    <Label className="text-sm font-semibold text-foreground">Membership Expiry Alerts</Label>
                    {savingNotif && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Choose when to alert your team about expiring member plans.
                  </p>

                  {/* Preferred Delivery Time */}
                  <div className="space-y-2 pl-1 max-w-xs">
                    <Label htmlFor="expiryPreferredTime" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Preferred Delivery Time
                    </Label>
                    <Select
                      value={notifSettings.membership_expiry.preferred_time || "07:00"}
                      onValueChange={handleExpiryPreferredTime}
                    >
                      <SelectTrigger id="expiryPreferredTime">
                        <SelectValue placeholder="Select daily hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {PREFERRED_TIME_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      The daily hour when membership expiry notifications will be sent.
                    </p>
                  </div>

                  {/* Before Expiry */}
                  <div className="space-y-3 pl-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Before Expiry</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {BEFORE_DAY_OPTIONS.map((opt) => {
                        const isChecked = notifSettings.membership_expiry.before_days.includes(opt.value);
                        return (
                          <label
                            key={`before-${opt.value}`}
                            className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                              isChecked
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox
                              id={`before-${opt.value}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => handleToggleBeforeDay(opt.value, !!checked)}
                            />
                            <span className="text-sm">{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* On the Day */}
                  <div className="pl-1">
                    <label
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all max-w-md ${
                        notifSettings.membership_expiry.on_day
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-medium">On the day of expiry</span>
                      </div>
                      <Switch
                        checked={notifSettings.membership_expiry.on_day}
                        onCheckedChange={handleToggleOnDay}
                      />
                    </label>
                  </div>

                  {/* After Expiry */}
                  <div className="space-y-3 pl-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">After Expiry (if not renewed)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {AFTER_DAY_OPTIONS.map((opt) => {
                        const isChecked = notifSettings.membership_expiry.after_days.includes(opt.value);
                        return (
                          <label
                            key={`after-${opt.value}`}
                            className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                              isChecked
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox
                              id={`after-${opt.value}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => handleToggleAfterDay(opt.value, !!checked)}
                            />
                            <span className="text-sm">{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <Separator className="bg-border/50" />

                {/* Overdue Payment Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-red-500" />
                    <Label className="text-sm font-semibold text-foreground">Overdue Payment Reminders</Label>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Configure how often your team is reminded about unpaid member dues.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-1">
                    {/* Reminder Interval */}
                    <div className="space-y-2">
                      <Label htmlFor="reminderInterval" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Reminder Frequency
                      </Label>
                      <Select
                        value={notifSettings.overdue_payment.reminder_interval_days.toString()}
                        onValueChange={handleReminderInterval}
                      >
                        <SelectTrigger id="reminderInterval">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          {REMINDER_INTERVAL_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        How often to send a reminder for the same overdue payment.
                      </p>
                    </div>

                    {/* Max Reminders */}
                    <div className="space-y-2">
                      <Label htmlFor="maxReminders" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Stop Reminders After
                      </Label>
                      <Select
                        value={notifSettings.overdue_payment.max_reminders.toString()}
                        onValueChange={handleMaxReminders}
                      >
                        <SelectTrigger id="maxReminders">
                          <SelectValue placeholder="Select limit" />
                        </SelectTrigger>
                        <SelectContent>
                          {MAX_REMINDER_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {notifSettings.overdue_payment.max_reminders === 0
                          ? "Reminders will continue until payment is resolved."
                          : `Stop sending reminders after ${notifSettings.overdue_payment.max_reminders} alerts.`}
                      </p>
                    </div>

                    {/* Preferred Delivery Time */}
                    <div className="space-y-2">
                      <Label htmlFor="overduePreferredTime" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Preferred Delivery Time
                      </Label>
                      <Select
                        value={notifSettings.overdue_payment.preferred_time || "07:00"}
                        onValueChange={handleOverduePreferredTime}
                      >
                        <SelectTrigger id="overduePreferredTime">
                          <SelectValue placeholder="Select daily hour" />
                        </SelectTrigger>
                        <SelectContent>
                          {PREFERRED_TIME_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        The daily hour when overdue payment reminders are sent.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
