import { useState, useEffect } from "react";
import { Building2, Loader2, Upload, X, Check, Plus, MessageSquare, Bell, Zap, Save, ArrowRight, Smartphone, Calendar, Clock, QrCode, Copy, Lock, Shield, CalendarClock, CreditCard, Key, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck, RefreshCw, FileText, Bot, Send } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useGym } from "@/hooks/useGym";
import { supabase } from "@/lib/supabase";
import ChangePasswordCard from "@/components/ChangePasswordCard";
import type { GymNotificationSettings } from "@/types/gym";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const DEFAULT_NOTIFICATION_SETTINGS: GymNotificationSettings = {
  membership_expiry: {
    preferred_time: "07:00",
    before_days: [3, 0],
    on_day: true,
    after_days: [],
    followup_interval: 7,
  },
  overdue_payment: {
    preferred_time: "07:00",
    before_days: [1, 0],
    reminder_interval_days: 7,
    max_reminders: 0,
    payment_due_grace_days: 3,
  },
};

const HOUR_OPTIONS = [
  { value: "00", label: "12 AM (Midnight)" },
  { value: "01", label: "01 AM" },
  { value: "02", label: "02 AM" },
  { value: "03", label: "03 AM" },
  { value: "04", label: "04 AM" },
  { value: "05", label: "05 AM" },
  { value: "06", label: "06 AM" },
  { value: "07", label: "07 AM" },
  { value: "08", label: "08 AM" },
  { value: "09", label: "09 AM" },
  { value: "10", label: "10 AM" },
  { value: "11", label: "11 AM" },
  { value: "12", label: "12 PM (Noon)" },
  { value: "13", label: "01 PM" },
  { value: "14", label: "02 PM" },
  { value: "15", label: "03 PM" },
  { value: "16", label: "04 PM" },
  { value: "17", label: "05 PM" },
  { value: "18", label: "06 PM" },
  { value: "19", label: "07 PM" },
  { value: "20", label: "08 PM" },
  { value: "21", label: "09 PM" },
  { value: "22", label: "10 PM" },
  { value: "23", label: "11 PM" },
];

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => {
  const val = String(i).padStart(2, "0");
  return { value: val, label: `${val} mins` };
});

const formatTime12h = (timeStr: string) => {
  if (!timeStr) return "07:00 AM";
  const [hStr = "07", mStr = "00"] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
};

interface TimePickerProps {
  value: string;
  onChange: (val: string) => void;
  id?: string;
  disabled?: boolean;
}

function PreferredTimePicker({ value, onChange, id, disabled = false }: TimePickerProps) {
  const [hStr = "07", mStr = "00"] = (value || "07:00").split(":");
  const currentHour = hStr.padStart(2, "0");
  const currentMinute = mStr.padStart(2, "0");

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour}:${currentMinute}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${currentHour}:${newMinute}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-[145px]">
        <Select value={currentHour} onValueChange={handleHourChange} disabled={disabled}>
          <SelectTrigger id={id} className="h-9 w-full text-xs">
            <SelectValue placeholder="Hour" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {HOUR_OPTIONS.map((h) => (
              <SelectItem key={h.value} value={h.value}>
                {h.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <span className="text-muted-foreground font-semibold text-sm">:</span>
      <div className="w-[115px]">
        <Select value={currentMinute} onValueChange={handleMinuteChange} disabled={disabled}>
          <SelectTrigger className="h-9 w-full text-xs">
            <SelectValue placeholder="Minute" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {MINUTE_OPTIONS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Badge variant="secondary" className="h-7 px-2.5 text-xs font-mono font-medium text-foreground/80 bg-muted/60 border border-border/50">
        {formatTime12h(`${currentHour}:${currentMinute}`)}
      </Badge>
    </div>
  );
}

const EXPIRY_PRESET_DAYS = [
  { day: 7, label: "7 Days Before" },
  { day: 5, label: "5 Days Before" },
  { day: 3, label: "3 Days Before" },
  { day: 2, label: "2 Days Before" },
  { day: 1, label: "1 Day Before" },
  { day: 0, label: "On Expiry Date" },
];

const PAYMENT_PRESET_DAYS = [
  { day: 7, label: "7 Days Before" },
  { day: 5, label: "5 Days Before" },
  { day: 3, label: "3 Days Before" },
  { day: 2, label: "2 Days Before" },
  { day: 1, label: "1 Day Before" },
  { day: 0, label: "On Due Date" },
];

export default function Settings() {
  const { hasPermission } = usePermissions();
  const { gyms, gymId, refreshGyms } = useGym();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "general");

  useEffect(() => {
    if (tabFromUrl && ["general", "payments", "notifications", "whatsapp", "security"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSearchParams({ tab: val });
  };

  const currentGym = gyms.find(g => g.id === gymId);
  const [logoUrl, setLogoUrl] = useState("");
  const [themeColor, setThemeColor] = useState("blue");
  const [savingBranding, setSavingBranding] = useState(false);

  // In-App Notification Rules State
  const [notifSettings, setNotifSettings] = useState<GymNotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [savingNotif, setSavingNotif] = useState(false);
  const [customNotifExpiryDay, setCustomNotifExpiryDay] = useState("");
  const [customNotifPaymentDay, setCustomNotifPaymentDay] = useState("");

  // Gym settings states
  const [gymName, setGymName] = useState("");

  // UPI Payment Settings State
  const [upiId, setUpiId] = useState("");
  const [upiName, setUpiName] = useState("");
  const [upiQrUrl, setUpiQrUrl] = useState("");
  const [savingUpiSettings, setSavingUpiSettings] = useState(false);
  const [defaultDueDays, setDefaultDueDays] = useState<number | string>(3);

  // WhatsApp Notification Settings State
  const [waWallet, setWaWallet] = useState<any>(null);
  const [loadingWaSettings, setLoadingWaSettings] = useState(false);
  const [savingWaSettings, setSavingWaSettings] = useState(false);
  const [customExpiryDay, setCustomExpiryDay] = useState("");
  const [customPaymentDay, setCustomPaymentDay] = useState("");
  const [showCredentialsWhenCentral, setShowCredentialsWhenCentral] = useState(false);
  const [waSettings, setWaSettings] = useState({
    is_automated_enabled: false,
    send_welcome_message: false,
    send_expiry_alert: false,
    send_payment_reminder: false,
    expiry_reminder_days: [3, 0] as number[],
    expiry_followup_interval: 7,
    expiry_preferred_time: '07:00',
    payment_reminder_days: [1, 0] as number[],
    payment_followup_interval: 7,
    payment_preferred_time: '07:00',
    payment_due_grace_days: 3,
    whatsapp_sender: 'central' as 'central' | 'custom',
    custom_phone_number_id: '',
    custom_waba_id: '',
    custom_access_token: ''
  });

  const [showAccessToken, setShowAccessToken] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    verified_name?: string;
    display_phone_number?: string;
    waba_id?: string;
    error?: string;
  } | null>(null);

  const [templates, setTemplates] = useState<Array<{
    name: string;
    status: string;
    category?: string;
    language?: string;
    reason?: string;
  }>>([]);
  const [settingUpTemplates, setSettingUpTemplates] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const fetchTemplatesStatus = async (targetGymId: number) => {
    try {
      setLoadingTemplates(true);
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/templates/${targetGymId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.templates && Array.isArray(data.templates)) {
          setTemplates(data.templates);
        }
      }
    } catch (e) {
      console.warn("Could not load template statuses:", e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchWaSettings = async () => {
    if (!gymId) return;
    try {
      setLoadingWaSettings(true);
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/wallet/${gymId}`);
      if (res.ok) {
        const data = await res.json();
        setWaWallet(data);
        const resolvedSender: 'central' | 'custom' = (data.whatsapp_sender === 'custom' || data.whatsapp_sender === 'central')
          ? data.whatsapp_sender
          : (data.custom_phone_number_id && data.custom_access_token ? 'custom' : 'central');
        const resolvedGrace = data.payment_due_grace_days !== undefined
          ? Number(data.payment_due_grace_days)
          : (data.new_member_due_days !== undefined
              ? Number(data.new_member_due_days)
              : (currentGym?.notification_settings?.overdue_payment?.payment_due_grace_days ?? currentGym?.notification_settings?.overdue_payment?.new_member_due_days ?? 3));
        setDefaultDueDays(resolvedGrace);

        setWaSettings({
          is_automated_enabled: data.is_automated_enabled ?? false,
          send_welcome_message: data.send_welcome_message ?? false,
          send_expiry_alert: data.send_expiry_alert ?? false,
          send_payment_reminder: data.send_payment_reminder ?? false,
          expiry_reminder_days: Array.isArray(data.expiry_reminder_days) ? data.expiry_reminder_days : [3, 0],
          expiry_followup_interval: data.expiry_followup_interval !== undefined ? Number(data.expiry_followup_interval) : 7,
          expiry_preferred_time: data.expiry_preferred_time || currentGym?.notification_settings?.membership_expiry?.preferred_time || '07:00',
          payment_reminder_days: Array.isArray(data.payment_reminder_days) ? data.payment_reminder_days : [1, 0],
          payment_followup_interval: data.payment_followup_interval !== undefined ? Number(data.payment_followup_interval) : 7,
          payment_preferred_time: data.payment_preferred_time || currentGym?.notification_settings?.overdue_payment?.preferred_time || '07:00',
          payment_due_grace_days: resolvedGrace,
          whatsapp_sender: resolvedSender,
          custom_phone_number_id: data.custom_phone_number_id || '',
          custom_waba_id: data.custom_waba_id || '',
          custom_access_token: data.custom_access_token || ''
        });

        if (data.custom_waba_id && data.custom_access_token) {
          fetchTemplatesStatus(gymId);
        }
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

  const handleAddCustomExpiryDay = () => {
    const day = parseInt(customExpiryDay);
    if (isNaN(day) || day < 0 || day > 365) {
      toast.error("Please enter a valid number of days (0 - 365)");
      return;
    }
    if (!waSettings.expiry_reminder_days.includes(day)) {
      setWaSettings((prev) => ({
        ...prev,
        expiry_reminder_days: [...prev.expiry_reminder_days, day].sort((a, b) => b - a),
      }));
    }
    setCustomExpiryDay("");
  };

  const handleAddCustomPaymentDay = () => {
    const day = parseInt(customPaymentDay);
    if (isNaN(day) || day < 0 || day > 365) {
      toast.error("Please enter a valid number of days (0 - 365)");
      return;
    }
    if (!waSettings.payment_reminder_days.includes(day)) {
      setWaSettings((prev) => ({
        ...prev,
        payment_reminder_days: [...prev.payment_reminder_days, day].sort((a, b) => b - a),
      }));
    }
    setCustomPaymentDay("");
  };

  const handleTestConnection = async () => {
    if (!waSettings.custom_phone_number_id || !waSettings.custom_access_token) {
      toast.error("Please enter both Phone Number ID and Access Token to test.");
      return;
    }
    try {
      setTestingConnection(true);
      setTestResult(null);
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/test-credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId: waSettings.custom_phone_number_id,
          accessToken: waSettings.custom_access_token,
        }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        const discoveredWabaId = data.waba_id || waSettings.custom_waba_id;
        if (discoveredWabaId && !waSettings.custom_waba_id) {
          setWaSettings((prev) => ({ ...prev, custom_waba_id: discoveredWabaId }));
        }
        toast.success(`Connected to ${data.verified_name} (${data.display_phone_number}) successfully!`);

        // Automatically set up & verify required templates on their Meta account upon successful connection
        if (discoveredWabaId) {
          toast.info("Configuring required message templates on your Meta account...");
          await handleSetupTemplates(discoveredWabaId);
        }
      } else {
        toast.error(data.error || "Failed to verify WhatsApp credentials.");
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message || "Failed to connect to Meta API" });
      toast.error(err.message || "Network error while verifying credentials");
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSetupTemplates = async (overrideWabaId?: string) => {
    const wabaIdToUse = (overrideWabaId || waSettings.custom_waba_id || "").trim();
    if (!wabaIdToUse || !waSettings.custom_access_token) {
      toast.error("WhatsApp Business Account ID (WABA ID) and Access Token are required to set up templates.");
      return;
    }
    try {
      setSettingUpTemplates(true);
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/setup-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wabaId: wabaIdToUse,
          accessToken: waSettings.custom_access_token,
          gymId
        })
      });
      const data = await res.json();
      if (data.templates && Array.isArray(data.templates)) {
        setTemplates(data.templates);
      }
      if (data.success) {
        toast.success("Templates successfully set up and approved on your Meta account!");
      } else {
        toast.info("Templates setup finished. Review statuses below.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to set up templates on Meta");
    } finally {
      setSettingUpTemplates(false);
    }
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
        payment_due_grace_days: waSettings.payment_due_grace_days,
        new_member_due_days: waSettings.payment_due_grace_days,
        whatsapp_sender: waSettings.whatsapp_sender,
        custom_phone_number_id: waSettings.custom_phone_number_id || '',
        custom_waba_id: waSettings.custom_waba_id || '',
        custom_access_token: waSettings.custom_access_token || ''
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

      const upi = currentGym.notification_settings?.upi_settings;
      if (upi) {
        setUpiId(upi.upi_id || "");
        setUpiName(upi.upi_name || currentGym.name || "");
        setUpiQrUrl(upi.qr_url || "");
      } else {
        setUpiId("");
        setUpiName(currentGym.name || "");
        setUpiQrUrl("");
      }

      const existingNotif = currentGym.notification_settings || {};
      const expBefore = Array.isArray(existingNotif.membership_expiry?.before_days)
        ? [...existingNotif.membership_expiry.before_days]
        : (existingNotif.membership_expiry?.before_days ? [existingNotif.membership_expiry.before_days] : [3, 0]);
      if (existingNotif.membership_expiry?.on_day && !expBefore.includes(0)) {
        expBefore.push(0);
      }

      const payBefore = Array.isArray(existingNotif.overdue_payment?.before_days)
        ? [...existingNotif.overdue_payment.before_days]
        : [1, 0];

      const resolvedGrace = existingNotif.overdue_payment?.payment_due_grace_days !== undefined
        ? Number(existingNotif.overdue_payment.payment_due_grace_days)
        : (existingNotif.overdue_payment?.new_member_due_days !== undefined
            ? Number(existingNotif.overdue_payment.new_member_due_days)
            : 3);
      setDefaultDueDays(resolvedGrace);

      const followupExpiry = existingNotif.membership_expiry?.followup_interval !== undefined
        ? Number(existingNotif.membership_expiry.followup_interval)
        : (existingNotif.membership_expiry?.after_days?.length ? existingNotif.membership_expiry.after_days[0] : 7);

      setNotifSettings({
        membership_expiry: {
          preferred_time: existingNotif.membership_expiry?.preferred_time || "07:00",
          before_days: expBefore.sort((a: number, b: number) => b - a),
          on_day: expBefore.includes(0) || !!existingNotif.membership_expiry?.on_day,
          after_days: existingNotif.membership_expiry?.after_days || [],
          followup_interval: followupExpiry,
        },
        overdue_payment: {
          preferred_time: existingNotif.overdue_payment?.preferred_time || "07:00",
          before_days: payBefore.sort((a: number, b: number) => b - a),
          reminder_interval_days: existingNotif.overdue_payment?.reminder_interval_days !== undefined
            ? Number(existingNotif.overdue_payment.reminder_interval_days)
            : 7,
          max_reminders: existingNotif.overdue_payment?.max_reminders || 0,
          payment_due_grace_days: resolvedGrace,
          new_member_due_days: resolvedGrace,
        },
      });
    }
  }, [currentGym]);

  const handleSaveNotifSettings = async () => {
    if (!gymId) return;
    try {
      setSavingNotif(true);
      const { error } = await supabase
        .from('gyms')
        .update({ notification_settings: notifSettings })
        .eq('id', gymId);

      if (error) throw error;

      // Sync to gym_whatsapp_wallets so in-app notifications and WhatsApp remain 100% harmonized
      await supabase
        .from('gym_whatsapp_wallets')
        .update({
          expiry_reminder_days: notifSettings.membership_expiry.before_days,
          expiry_followup_interval: notifSettings.membership_expiry.followup_interval ?? 7,
          payment_reminder_days: notifSettings.overdue_payment.before_days ?? [1, 0],
          payment_followup_interval: notifSettings.overdue_payment.reminder_interval_days ?? 7,
        })
        .eq('gym_id', gymId);

      toast.success("Gym notification rules saved successfully!");
      await refreshGyms();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save notification rules: " + err.message);
    } finally {
      setSavingNotif(false);
    }
  };

  const toggleNotifExpiryDay = (day: number) => {
    const current = notifSettings.membership_expiry.before_days || [];
    const exists = current.includes(day);
    const newDays = exists ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => b - a);
    setNotifSettings({
      ...notifSettings,
      membership_expiry: {
        ...notifSettings.membership_expiry,
        before_days: newDays,
        on_day: newDays.includes(0),
      },
    });
  };

  const handleAddCustomNotifExpiryDay = () => {
    const day = parseInt(customNotifExpiryDay);
    if (isNaN(day) || day < 0 || day > 365) {
      toast.error("Please enter a valid number of days (0 - 365)");
      return;
    }
    const current = notifSettings.membership_expiry.before_days || [];
    if (!current.includes(day)) {
      const newDays = [...current, day].sort((a, b) => b - a);
      setNotifSettings({
        ...notifSettings,
        membership_expiry: {
          ...notifSettings.membership_expiry,
          before_days: newDays,
          on_day: newDays.includes(0),
        },
      });
    }
    setCustomNotifExpiryDay("");
  };

  const toggleNotifPaymentDay = (day: number) => {
    const current = notifSettings.overdue_payment.before_days || [];
    const exists = current.includes(day);
    const newDays = exists ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => b - a);
    setNotifSettings({
      ...notifSettings,
      overdue_payment: {
        ...notifSettings.overdue_payment,
        before_days: newDays,
      },
    });
  };

  const handleAddCustomNotifPaymentDay = () => {
    const day = parseInt(customNotifPaymentDay);
    if (isNaN(day) || day < 0 || day > 365) {
      toast.error("Please enter a valid number of days (0 - 365)");
      return;
    }
    const current = notifSettings.overdue_payment.before_days || [];
    if (!current.includes(day)) {
      const newDays = [...current, day].sort((a, b) => b - a);
      setNotifSettings({
        ...notifSettings,
        overdue_payment: {
          ...notifSettings.overdue_payment,
          before_days: newDays,
        },
      });
    }
    setCustomNotifPaymentDay("");
  };

  const handleUpiQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("QR image size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUpiQrUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveUpiSettings = async () => {
    if (!gymId) return;
    setSavingUpiSettings(true);
    try {
      const resolvedDueDays = Number(defaultDueDays) || 0;
      const existingSettings = currentGym?.notification_settings || {};
      const updatedSettings = {
        ...existingSettings,
        upi_settings: {
          upi_id: upiId.trim(),
          upi_name: upiName.trim() || gymName || currentGym?.name || "Gymatrix Gym",
          qr_url: upiQrUrl,
        },
        overdue_payment: {
          ...(existingSettings.overdue_payment || {}),
          payment_due_grace_days: resolvedDueDays,
          new_member_due_days: resolvedDueDays,
        },
      };

      const { error } = await supabase
        .from('gyms')
        .update({
          notification_settings: updatedSettings,
        })
        .eq('id', gymId);

      if (error) throw error;

      // Keep waSettings and notifSettings state in sync
      setWaSettings((prev) => ({
        ...prev,
        payment_due_grace_days: resolvedDueDays,
      }));
      setNotifSettings((prev: any) => ({
        ...prev,
        overdue_payment: {
          ...(prev?.overdue_payment || {}),
          payment_due_grace_days: resolvedDueDays,
          new_member_due_days: resolvedDueDays,
        },
      }));
      setDefaultDueDays(resolvedDueDays);

      // Also sync to backend WhatsApp settings so background cron jobs have the latest due days
      try {
        await fetch(`${BACKEND_URL}/api/whatsapp/settings/${gymId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_due_grace_days: resolvedDueDays,
            new_member_due_days: resolvedDueDays,
          }),
        });
      } catch (syncErr) {
        console.warn('Non-blocking WhatsApp settings sync error:', syncErr);
      }

      toast.success("Payment & invoice due settings saved successfully!");
      await refreshGyms();
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to save UPI settings: " + (error.message || "Unknown error"));
    } finally {
      setSavingUpiSettings(false);
    }
  };

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
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Gym Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your gym profile, payment methods, notifications, and WhatsApp automation.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 w-full h-auto p-1 bg-muted/60 border border-border/60">
          <TabsTrigger value="general" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Building2 className="h-4 w-4" />
            <span className="text-xs sm:text-sm font-medium">General & Branding</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <QrCode className="h-4 w-4" />
            <span className="text-xs sm:text-sm font-medium">UPI & Payments</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Bell className="h-4 w-4" />
            <span className="text-xs sm:text-sm font-medium">In-App Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs sm:text-sm font-medium">WhatsApp Automation</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Shield className="h-4 w-4" />
            <span className="text-xs sm:text-sm font-medium">Security</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. General & Branding Tab */}
        <TabsContent value="general" className="space-y-6">
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
    </TabsContent>

    {/* 2. UPI & Payments Tab */}
    <TabsContent value="payments" className="space-y-6">
      {/* 2a. Default Invoice Due Date & Billing Rules */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
              <Calendar className="h-5 w-5" />
            </span>
            Default Invoice Due Date & Billing Rules
          </CardTitle>
          <CardDescription>
            Configure default due date rules for invoices created when members join or renew their memberships. Applied automatically to all new invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="defaultDueDays" className="font-semibold text-sm">
              Default Invoice Due Period
            </Label>
            <div className="flex items-center gap-2.5">
              <Input
                id="defaultDueDays"
                type="number"
                min={0}
                max={365}
                value={defaultDueDays}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setDefaultDueDays("");
                  } else {
                    const parsed = parseInt(val);
                    setDefaultDueDays(isNaN(parsed) ? "" : Math.max(0, parsed));
                  }
                }}
                onBlur={() => {
                  if (defaultDueDays === "") {
                    setDefaultDueDays(0);
                  }
                }}
                className="h-9 w-28 text-sm font-semibold text-center"
                placeholder="0"
              />
              <span className="text-xs text-muted-foreground font-medium shrink-0">Days from Join / Renewal</span>
            </div>

            <p className="text-xs text-muted-foreground">
              {Number(defaultDueDays || 0) === 0
                ? "Invoices will be marked as due immediately on the day the member joins or renews (0 days)."
                : `New invoices generated upon registration or renewal will have their due date automatically set to ${defaultDueDays} day${Number(defaultDueDays) > 1 ? "s" : ""} after the registration/renewal date.`}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="p-1.5 rounded-md bg-primary/10 text-primary">
              <QrCode className="h-5 w-5" />
            </span>
            UPI Payment & Member QR Code
          </CardTitle>
          <CardDescription>
            Configure your gym's UPI payment details so members can scan and pay their membership dues directly from their Member Portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Form inputs */}
            <div className="lg:col-span-7 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="upiId" className="font-semibold text-sm">
                  Gym UPI ID / VPA <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="upiId"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. yourgymname@okaxis, 9876543210@paytm"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Subscription fees paid by members using QR code or UPI link are deposited directly into this bank account without gateway commissions.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="upiName" className="font-semibold text-sm">
                  Payee / Business Name
                </Label>
                <Input
                  id="upiName"
                  value={upiName}
                  onChange={(e) => setUpiName(e.target.value)}
                  placeholder="e.g. Downtown Fitness Club or Account Holder Name"
                />
                <p className="text-xs text-muted-foreground">
                  The verified name displayed to members inside Google Pay, PhonePe, and Paytm before authorizing payment.
                </p>
              </div>

              <Separator />

              {/* Optional Custom Standee / QR photo upload */}
              <div className="space-y-3">
                <Label className="font-semibold text-sm">Custom QR Standee / Photo (Optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Already have a printed merchant standee from PhonePe, Google Pay, or Paytm? Upload a photo of it here to display it directly to your members.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative overflow-hidden cursor-pointer"
                    asChild
                  >
                    <label className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      {upiQrUrl ? "Replace Standee Image" : "Upload QR Image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUpiQrUpload}
                      />
                    </label>
                  </Button>
                  {upiQrUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUpiQrUrl("")}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4 mr-1.5" />
                      Remove Custom Image
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Live QR Preview */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-xl border border-border/80 bg-muted/20 text-center">
              <div className="w-full max-w-[260px] space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Member Scanner Preview
                </p>

                {upiQrUrl ? (
                  <div className="rounded-2xl border-2 border-primary/20 bg-background p-3 shadow-md">
                    <img
                      src={upiQrUrl}
                      alt="Custom Standee QR"
                      className="w-full h-auto max-h-[220px] object-contain rounded-lg"
                    />
                    <p className="text-[11px] text-muted-foreground mt-2 font-medium">
                      Custom Uploaded Standee
                    </p>
                  </div>
                ) : upiId.trim() ? (
                  <div className="rounded-2xl border-2 border-primary/20 bg-white p-4 shadow-md inline-block">
                    <QRCodeSVG
                      value={`upi://pay?pa=${upiId.trim()}&pn=${encodeURIComponent(upiName.trim() || gymName || currentGym?.name || "Gymatrix Gym")}&cu=INR`}
                      size={180}
                      level="M"
                      includeMargin={false}
                    />
                    <p className="text-[11px] text-gray-800 font-bold mt-2 truncate max-w-[180px]">
                      {upiName.trim() || gymName || currentGym?.name || "Gymatrix Gym"}
                    </p>
                    <p className="text-[10px] text-gray-500 font-mono truncate max-w-[180px]">
                      {upiId.trim()}
                    </p>
                  </div>
                ) : (
                  <div className="h-[200px] w-full rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center p-4 bg-muted/40">
                    <QrCode className="h-10 w-10 text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground font-medium">
                      Enter your UPI ID above to generate your payment QR code
                    </p>
                  </div>
                )}


              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-border/60">
            <Button
              onClick={handleSaveUpiSettings}
              disabled={savingUpiSettings}
              className="gradient-primary"
            >
              {savingUpiSettings ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving Payment & Billing Settings...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Payment & Billing Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>

    {/* 3. In-App Notifications Tab */}
    <TabsContent value="notifications" className="space-y-6">
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
              <Bell className="h-5 w-5" />
            </span>
            Gym Notification Rules (Applies to all staff)
          </CardTitle>
          <CardDescription>
            Configure global automated schedules and rules for dashboard notifications and team alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Membership Expiry Section */}
          <div className="space-y-4 rounded-xl border border-border/70 p-4 bg-muted/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <Label className="text-sm font-semibold text-foreground">Membership Expiry Alerts</Label>
              </div>
              {savingNotif && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground pl-4 -mt-2">
              Choose when to alert your team about expiring member plans.
            </p>

            <div className="pl-4 space-y-4 pt-1">
              {/* Advance Reminder Days (Multi-selection & Custom Days) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-amber-500" />
                    When to send advance reminder (Multi-select)
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Select presets or add custom days</span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {EXPIRY_PRESET_DAYS.map(({ day, label }) => {
                    const isSelected = notifSettings.membership_expiry.before_days?.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleNotifExpiryDay(day)}
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

                  {/* Custom days not in presets */}
                  {notifSettings.membership_expiry.before_days
                    ?.filter((d) => !EXPIRY_PRESET_DAYS.some((p) => p.day === d))
                    .map((day) => (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleNotifExpiryDay(day)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer bg-amber-500 text-white shadow-sm ring-1 ring-amber-600/30 group"
                        title="Click to remove"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {day} Days Before
                        <X className="h-3 w-3 ml-0.5 opacity-80 group-hover:opacity-100" />
                      </button>
                    ))}
                </div>

                {/* Custom Day Input */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      placeholder="e.g. 10"
                      value={customNotifExpiryDay}
                      onChange={(e) => setCustomNotifExpiryDay(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomNotifExpiryDay();
                        }
                      }}
                      className="h-8 w-24 text-xs"
                    />
                    <span className="text-xs text-muted-foreground font-medium">Days Before</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomNotifExpiryDay}
                    className="h-8 text-xs px-2.5 gap-1 shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Day
                  </Button>
                </div>
              </div>

              {/* Follow-up Interval */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  Follow-up interval (after expiry if unrenewed)
                </Label>
                <Select
                  value={String(notifSettings.membership_expiry.followup_interval ?? 7)}
                  onValueChange={(val) => setNotifSettings({
                    ...notifSettings,
                    membership_expiry: { ...notifSettings.membership_expiry, followup_interval: Number(val) }
                  })}
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

              {/* Preferred Delivery Time */}
              <div className="space-y-1.5">
                <Label htmlFor="notifExpiryPreferredTime" className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  Preferred Delivery Time
                </Label>
                <PreferredTimePicker
                  id="notifExpiryPreferredTime"
                  value={notifSettings.membership_expiry.preferred_time || "07:00"}
                  onChange={(val) => setNotifSettings({
                    ...notifSettings,
                    membership_expiry: { ...notifSettings.membership_expiry, preferred_time: val }
                  })}
                />
                <p className="text-[11px] text-muted-foreground">
                  The daily time when membership expiry notifications will be sent to your staff.
                </p>
              </div>
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Payment & Overdue Reminders Section */}
          <div className="space-y-4 rounded-xl border border-border/70 p-4 bg-muted/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <Label className="text-sm font-semibold text-foreground">Payment & Overdue Reminders</Label>
              </div>
              {savingNotif && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground pl-4 -mt-2">
              Configure notification alerts for upcoming dues and overdue balances.
            </p>

            <div className="pl-4 space-y-4 pt-1">
              {/* Advance Reminder Days (Multi-selection & Custom Days) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-rose-500" />
                    When to send advance reminder (Multi-select)
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Select presets or add custom days</span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {PAYMENT_PRESET_DAYS.map(({ day, label }) => {
                    const isSelected = notifSettings.overdue_payment.before_days?.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleNotifPaymentDay(day)}
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

                  {/* Custom days not in presets */}
                  {notifSettings.overdue_payment.before_days
                    ?.filter((d) => !PAYMENT_PRESET_DAYS.some((p) => p.day === d))
                    .map((day) => (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleNotifPaymentDay(day)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer bg-rose-500 text-white shadow-sm ring-1 ring-rose-600/30 group"
                        title="Click to remove"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {day} Days Before
                        <X className="h-3 w-3 ml-0.5 opacity-80 group-hover:opacity-100" />
                      </button>
                    ))}
                </div>

                {/* Custom Day Input */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      placeholder="e.g. 10"
                      value={customNotifPaymentDay}
                      onChange={(e) => setCustomNotifPaymentDay(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomNotifPaymentDay();
                        }
                      }}
                      className="h-8 w-24 text-xs"
                    />
                    <span className="text-xs text-muted-foreground font-medium">Days Before Due</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomNotifPaymentDay}
                    className="h-8 text-xs px-2.5 gap-1 shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Day
                  </Button>
                </div>
              </div>

              {/* Follow-up Interval */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-rose-500" />
                  Follow-up interval (after due date if unpaid)
                </Label>
                <Select
                  value={String(notifSettings.overdue_payment.reminder_interval_days ?? 7)}
                  onValueChange={(val) => setNotifSettings({
                    ...notifSettings,
                    overdue_payment: { ...notifSettings.overdue_payment, reminder_interval_days: Number(val) }
                  })}
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

              {/* Preferred Delivery Time */}
              <div className="space-y-1.5">
                <Label htmlFor="notifOverduePreferredTime" className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-rose-500" />
                  Preferred Delivery Time
                </Label>
                <PreferredTimePicker
                  id="notifOverduePreferredTime"
                  value={notifSettings.overdue_payment.preferred_time || "07:00"}
                  onChange={(val) => setNotifSettings({
                    ...notifSettings,
                    overdue_payment: { ...notifSettings.overdue_payment, preferred_time: val }
                  })}
                />
                <p className="text-[11px] text-muted-foreground">
                  The daily time when payment reminders will be sent.
                </p>
              </div>

              {/* Default Invoice Due Date (in Days) */}
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="notifSettingsGraceDays" className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-rose-500" />
                  Default Invoice Due Date (in Days)
                </Label>
                <div className="flex items-center gap-2.5">
                  <Input
                    id="notifSettingsGraceDays"
                    type="number"
                    min={0}
                    max={365}
                    value={notifSettings.overdue_payment.payment_due_grace_days ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const resolved = val === "" ? ("" as any) : Math.max(0, parseInt(val) || 0);
                      setNotifSettings({
                        ...notifSettings,
                        overdue_payment: {
                          ...notifSettings.overdue_payment,
                          payment_due_grace_days: resolved,
                          new_member_due_days: resolved,
                        }
                      });
                    }}
                    onBlur={() => {
                      if (notifSettings.overdue_payment.payment_due_grace_days === ("" as any)) {
                        setNotifSettings({
                          ...notifSettings,
                          overdue_payment: {
                            ...notifSettings.overdue_payment,
                            payment_due_grace_days: 0,
                            new_member_due_days: 0,
                          }
                        });
                      }
                    }}
                    className="h-9 w-28 text-sm font-semibold text-center"
                    placeholder="0"
                  />
                  <span className="text-xs text-muted-foreground font-medium shrink-0">Days from Join/Renewal</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Number of days after joining or renewal when the invoice payment is due (e.g. 5 days sets the invoice due date to 5 days after joining or renewing; 0 means due immediately on the same day).
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-border/60">
            <Button
              onClick={handleSaveNotifSettings}
              disabled={savingNotif}
              className="gradient-primary"
            >
              {savingNotif ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving Notification Rules...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Notification Rules
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>

    {/* 4. WhatsApp Automation Tab */}
    <TabsContent value="whatsapp" className="space-y-6">
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
                  {/* Advance Reminder Days (Multi-selection & Custom Days) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-amber-500" />
                        When to send advance reminder (Multi-select)
                      </Label>
                      <span className="text-[11px] text-muted-foreground">Select presets or add custom days</span>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {EXPIRY_PRESET_DAYS.map(({ day, label }) => {
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

                      {/* Any custom days not in presets */}
                      {waSettings.expiry_reminder_days
                        .filter((d) => !EXPIRY_PRESET_DAYS.some((p) => p.day === d))
                        .map((day) => (
                          <button
                            type="button"
                            key={day}
                            onClick={() => toggleExpiryReminderDay(day)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer bg-amber-500 text-white shadow-sm ring-1 ring-amber-600/30 group"
                            title="Click to remove"
                          >
                            <Check className="h-3.5 w-3.5" />
                            {day} Days Before
                            <X className="h-3 w-3 ml-0.5 opacity-80 group-hover:opacity-100" />
                          </button>
                        ))}
                    </div>

                    {/* Custom Day Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          placeholder="e.g. 10"
                          value={customExpiryDay}
                          onChange={(e) => setCustomExpiryDay(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCustomExpiryDay();
                            }
                          }}
                          className="h-8 w-24 text-xs"
                        />
                        <span className="text-xs text-muted-foreground font-medium">Days Before</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCustomExpiryDay}
                        className="h-8 text-xs px-2.5 gap-1 shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Day
                      </Button>
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

                  {/* Preferred Send Time */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      Preferred Send Time
                    </Label>
                    <PreferredTimePicker
                      value={waSettings.expiry_preferred_time || "07:00"}
                      onChange={(val) => setWaSettings({ ...waSettings, expiry_preferred_time: val })}
                    />
                    <p className="text-[11px] text-muted-foreground">The daily time when automated expiry alerts will be sent to members.</p>
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
                  {/* Advance Reminder Days (Multi-selection & Custom Days) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-rose-500" />
                        When to send advance reminder (Multi-select)
                      </Label>
                      <span className="text-[11px] text-muted-foreground">Select presets or add custom days</span>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {PAYMENT_PRESET_DAYS.map(({ day, label }) => {
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

                      {/* Any custom days not in presets */}
                      {waSettings.payment_reminder_days
                        .filter((d) => !PAYMENT_PRESET_DAYS.some((p) => p.day === d))
                        .map((day) => (
                          <button
                            type="button"
                            key={day}
                            onClick={() => togglePaymentReminderDay(day)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer bg-rose-500 text-white shadow-sm ring-1 ring-rose-600/30 group"
                            title="Click to remove"
                          >
                            <Check className="h-3.5 w-3.5" />
                            {day} Days Before
                            <X className="h-3 w-3 ml-0.5 opacity-80 group-hover:opacity-100" />
                          </button>
                        ))}
                    </div>

                    {/* Custom Day Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          placeholder="e.g. 10"
                          value={customPaymentDay}
                          onChange={(e) => setCustomPaymentDay(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCustomPaymentDay();
                            }
                          }}
                          className="h-8 w-24 text-xs"
                        />
                        <span className="text-xs text-muted-foreground font-medium">Days Before Due</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCustomPaymentDay}
                        className="h-8 text-xs px-2.5 gap-1 shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Day
                      </Button>
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

                  {/* Preferred Send Time */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-rose-500" />
                      Preferred Send Time
                    </Label>
                    <PreferredTimePicker
                      value={waSettings.payment_preferred_time || "07:00"}
                      onChange={(val) => setWaSettings({ ...waSettings, payment_preferred_time: val })}
                    />
                    <p className="text-[11px] text-muted-foreground">The daily time when automated payment reminders will be sent to members.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Sender Account Selection */}
          <div className="space-y-4 pt-1">
            <div>
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Send className="h-4 w-4 text-emerald-500" />
                Select WhatsApp Sender Account
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choose which account your gym's automated WhatsApp notifications (Welcome, Expiry, Payment Reminders) should be dispatched from.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Gymatrix Default Gateway */}
              <div
                onClick={() => setWaSettings((prev) => ({ ...prev, whatsapp_sender: "central" }))}
                className={`relative flex flex-col justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  waSettings.whatsapp_sender === "central"
                    ? "border-emerald-500 bg-emerald-500/5 shadow-sm ring-1 ring-emerald-500/20"
                    : "border-border/70 hover:border-border hover:bg-muted/30"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${waSettings.whatsapp_sender === "central" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">Gymatrix Default Gateway</h4>
                        <p className="text-[11px] text-muted-foreground">Pre-verified official WhatsApp channel</p>
                      </div>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      waSettings.whatsapp_sender === "central"
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-muted-foreground/40"
                    }`}>
                      {waSettings.whatsapp_sender === "central" && <Check className="h-3 w-3 text-white stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Zero setup required. Messages are instantly delivered to members via Gymatrix's verified official sender.
                  </p>

                  <div className="space-y-1.5 pt-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Ready to send out-of-the-box</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Uses included plan quota ({waWallet?.available_total ?? 0} messages)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>No Meta Business verification required</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                  <Badge variant={waSettings.whatsapp_sender === "central" ? "default" : "outline"} className="text-[10px] font-medium">
                    {waSettings.whatsapp_sender === "central" ? "Active Sender" : "Click to select"}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {waWallet?.available_total ?? 0} Credits Left
                  </span>
                </div>
              </div>

              {/* Option 2: Own WhatsApp Business Account */}
              <div
                onClick={() => setWaSettings((prev) => ({ ...prev, whatsapp_sender: "custom" }))}
                className={`relative flex flex-col justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  waSettings.whatsapp_sender === "custom"
                    ? "border-emerald-500 bg-emerald-500/5 shadow-sm ring-1 ring-emerald-500/20"
                    : "border-border/70 hover:border-border hover:bg-muted/30"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${waSettings.whatsapp_sender === "custom" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">My Own WhatsApp Account</h4>
                        <p className="text-[11px] text-muted-foreground">Send directly from your gym's official number</p>
                      </div>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      waSettings.whatsapp_sender === "custom"
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-muted-foreground/40"
                    }`}>
                      {waSettings.whatsapp_sender === "custom" && <Check className="h-3 w-3 text-white stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Connect your Meta WhatsApp Cloud API credentials to display your gym's name, brand logo, and phone number.
                  </p>

                  <div className="space-y-1.5 pt-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Shows your gym's verified WhatsApp profile</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Direct Meta Cloud API connection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Automated template creation & status sync</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                  <Badge variant={waSettings.whatsapp_sender === "custom" ? "default" : "outline"} className="text-[10px] font-medium">
                    {waSettings.whatsapp_sender === "custom" ? "Active Sender" : "Click to select"}
                  </Badge>
                  {waSettings.custom_phone_number_id && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Credentials Configured
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Explanatory Info Card based on selection */}
            {waSettings.whatsapp_sender === "central" ? (
              <div className="rounded-lg bg-muted/40 border border-border/70 p-3.5 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Bot className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground">Gymatrix Default Gateway is active: </span>
                    All automated messages will be delivered using Gymatrix's verified WhatsApp channel using your available message credits ({waWallet?.available_total ?? 0} messages left).
                    {waSettings.custom_phone_number_id && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium ml-1">
                        Your custom Meta credentials remain securely saved.
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCredentialsWhenCentral(!showCredentialsWhenCentral)}
                  className="text-xs h-7 self-start sm:self-auto shrink-0"
                >
                  {showCredentialsWhenCentral ? "Hide Meta Credentials" : "Configure / View Meta Credentials"}
                </Button>
              </div>
            ) : (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Your Own WhatsApp Account is active: </span>
                  Automated messages will be sent directly from your gym's official WhatsApp phone number and brand name using your Meta Cloud API credentials below.
                </div>
              </div>
            )}
          </div>

          {/* Custom WhatsApp Account Credentials & Templates Section */}
          {(waSettings.whatsapp_sender === "custom" || showCredentialsWhenCentral) && (
            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4 shadow-sm animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-emerald-500" />
                    <h4 className="font-semibold text-sm text-foreground">Meta WhatsApp Cloud API Credentials</h4>
                    {waSettings.whatsapp_sender !== "custom" && (
                      <Badge variant="secondary" className="text-[10px]">Saved (Gateway is Active)</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter your Meta credentials from Meta for Developers to send messages from your gym's official phone number.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Phone Number ID */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-primary" />
                    WhatsApp Phone Number ID <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={waSettings.custom_phone_number_id}
                    onChange={(e) => setWaSettings({ ...waSettings, custom_phone_number_id: e.target.value.trim() })}
                    placeholder="e.g. 104928472918471"
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Found in Meta for Developers &rarr; WhatsApp &rarr; API Setup &rarr; <strong>Phone number ID</strong>
                  </p>
                </div>

                {/* WhatsApp Business Account ID (WABA ID) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    WhatsApp Business Account ID (WABA ID)
                  </Label>
                  <Input
                    value={waSettings.custom_waba_id}
                    onChange={(e) => setWaSettings({ ...waSettings, custom_waba_id: e.target.value.trim() })}
                    placeholder="e.g. 109283746192837"
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Found in Meta for Developers &rarr; WhatsApp &rarr; API Setup &rarr; <strong>WhatsApp Business Account ID</strong>
                  </p>
                </div>
              </div>

              {/* Permanent Access Token */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-amber-500" />
                  Permanent Access Token <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showAccessToken ? "text" : "password"}
                    value={waSettings.custom_access_token}
                    onChange={(e) => setWaSettings({ ...waSettings, custom_access_token: e.target.value.trim() })}
                    placeholder="EAAG..."
                    className="h-9 text-xs font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessToken(!showAccessToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  System User permanent token from Meta Business Suite &rarr; Business Settings &rarr; Users &rarr; System Users with <code>whatsapp_business_messaging</code> permission.
                </p>
              </div>

              {/* Verification / Test Connection Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !waSettings.custom_phone_number_id || !waSettings.custom_access_token}
                  className="text-xs h-8 gap-1.5"
                >
                  {testingConnection ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Testing Credentials...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      Test WhatsApp Connection
                    </>
                  )}
                </Button>

                {testResult && (
                  <div className={`text-xs flex items-center gap-1.5 ${testResult.success ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-600 dark:text-rose-400 font-medium'}`}>
                    {testResult.success ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Verified: {testResult.verified_name} ({testResult.display_phone_number})</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <span className="truncate max-w-[280px]" title={testResult.error}>{testResult.error}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Meta Message Templates Section */}
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5 space-y-3 mt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-xs text-foreground">Required WhatsApp Message Templates</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      These templates must be approved on your Meta account to send automated welcome, expiry, and payment messages.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSetupTemplates()}
                    disabled={settingUpTemplates || !waSettings.custom_waba_id || !waSettings.custom_access_token}
                    className="text-xs h-8 gap-1.5"
                  >
                    {settingUpTemplates ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Setting Up on Meta...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Setup & Sync Templates
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-2 pt-1">
                  {[
                    {
                      name: "gym_member_welcome_v1",
                      title: "1. Member Welcome Message",
                      description: "Sent automatically when a new member is registered."
                    },
                    {
                      name: "gym_membership_expiry_v1",
                      title: "2. Membership Expiry Alert",
                      description: "Sent in advance and upon membership expiration."
                    },
                    {
                      name: "gym_payment_reminder_v1",
                      title: "3. Payment & Overdue Reminder",
                      description: "Sent for upcoming and overdue membership fee payments."
                    }
                  ].map((tpl) => {
                    const found = templates.find((t) => t.name === tpl.name);
                    const status = found?.status?.toUpperCase() || (templates.length > 0 ? "NOT_FOUND" : "NOT_CHECKED");
                    const isApproved = status === "APPROVED";
                    const isPending = status === "PENDING";
                    const isFailed = status === "FAILED" || status === "REJECTED";

                    return (
                      <div key={tpl.name} className="flex items-center justify-between p-2.5 rounded-md border border-border/50 bg-background text-xs">
                        <div className="space-y-0.5 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{tpl.title}</span>
                            <code className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                              {tpl.name}
                            </code>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{tpl.description}</p>
                        </div>
                        <div className="shrink-0">
                          {isApproved ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1 font-semibold">
                              <CheckCircle2 className="h-3 w-3" />
                              APPROVED
                            </Badge>
                          ) : isPending ? (
                            <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/40 text-[10px] gap-1 font-semibold">
                              <Clock className="h-3 w-3" />
                              PENDING APPROVAL
                            </Badge>
                          ) : isFailed ? (
                            <Badge variant="destructive" className="text-[10px] gap-1 font-semibold">
                              <AlertCircle className="h-3 w-3" />
                              FAILED / REJECTED
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                              {templates.length > 0 ? "NOT FOUND" : "READY TO SETUP"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          

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
    </TabsContent>

    {/* 5. Security & Password Tab */}
    <TabsContent value="security" className="space-y-6">
      <ChangePasswordCard />
    </TabsContent>
  </Tabs>
</div>
  );
}
