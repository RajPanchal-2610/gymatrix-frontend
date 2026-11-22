import React, { useState, useEffect } from "react";
import { MessageSquare, Send, Smartphone, Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { supabase } from "@/lib/supabase";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

interface SendWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id?: number;
    full_name: string;
    phone: string;
    plan_name?: string;
    start_date?: string;
    expiry_date?: string;
    due_amount?: number;
    billing_date?: string;
  } | null;
  defaultEventType?: 'welcome' | 'membership_expiring' | 'payment_reminder';
}

export function SendWhatsAppDialog({
  open,
  onOpenChange,
  member,
  defaultEventType = 'welcome'
}: SendWhatsAppDialogProps) {
  const { gymId, currentGym } = useGym();
  const [eventType, setEventType] = useState<'welcome' | 'membership_expiring' | 'payment_reminder'>(defaultEventType);
  const [sendingMeta, setSendingMeta] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  const [integration, setIntegration] = useState<any>(null);

  useEffect(() => {
    if (defaultEventType) {
      setEventType(defaultEventType);
    }
  }, [defaultEventType, open]);

  useEffect(() => {
    if (open && gymId) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          fetch(`${BACKEND_URL}/api/whatsapp/status`, {
            headers: { Authorization: `Bearer ${session.access_token}` }
          })
            .then(res => res.json())
            .then(data => {
              if (data.is_connected && data.integration) {
                setIntegration(data.integration);
              } else {
                setIntegration(null);
              }
              if (data.wallet) {
                setWallet(data.wallet);
              }
            })
            .catch(err => console.error("Error fetching status in dialog:", err));
        }
      });
    }
  }, [open, gymId]);

  if (!member) return null;

  const gymName = currentGym?.name || "Our Gym";
  const planName = member.plan_name || "Gym Membership";
  const startDate = member.start_date || "Today";
  const expiryDate = member.expiry_date || "N/A";
  const dueAmount = member.due_amount || 0;
  const dueDate = member.billing_date
    ? new Date(member.billing_date).toLocaleDateString()
    : "Immediate";

  // Build message preview text
  let previewText = "";
  let templateVariables: string[] = [];

  if (eventType === 'welcome') {
    previewText = `Hi ${member.full_name}, welcome to ${gymName}! Your ${planName} membership is active from ${startDate} to ${expiryDate}. To access your member portal on Gymatrix, please register with your mobile number, set your password, and log in to track your fitness journey. We’re excited to have you with us!`;
    templateVariables = [member.full_name, gymName, planName, startDate, expiryDate];
  } else if (eventType === 'membership_expiring') {
    previewText = `Hello ${member.full_name}, this is a reminder from ${gymName}. Your ${planName} membership is set to expire on ${expiryDate}. Renew today to keep your fitness journey going uninterrupted! Log in to your member portal on Gymatrix to renew and view your plan details.`;
    templateVariables = [member.full_name, gymName, planName, expiryDate];
  } else {
    previewText = `Dear ${member.full_name}, this is a payment reminder from ${gymName}. You have a pending balance of ₹${dueAmount} for your ${planName} membership, due on ${dueDate}. Log in to your member portal on Gymatrix to scan the payment QR code and clear your dues. Thank you!`;
    templateVariables = [member.full_name, gymName, String(dueAmount), planName, dueDate];
  }

  // 1. Send from Owner Mobile via wa.me deeplink
  const handleSendFromMobile = () => {
    let cleanPhone = member.phone.replace(/[\s\-\(\)\+]/g, '').replace(/^0+/, '');
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(previewText)}`;
    window.open(url, '_blank');
    toast.success("Opening WhatsApp with pre-filled message!");
    onOpenChange(false);
  };

  // 2. Send via Meta WhatsApp Cloud API (automated)
  const handleSendViaMeta = async () => {
    if (!gymId) {
      toast.error("Gym context is missing");
      return;
    }

    try {
      setSendingMeta(true);
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${BACKEND_URL}/api/whatsapp/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          gymId,
          recipientPhone: member.phone,
          recipientName: member.full_name,
          eventType,
          templateName:
            eventType === 'welcome'
              ? 'gym_member_welcome_v1'
              : eventType === 'membership_expiring'
              ? 'gym_membership_expiry_v1'
              : 'gym_payment_reminder_v1',
          languageCode: 'en_US',
          variables: templateVariables
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispatch WhatsApp message");
      }

      toast.success("WhatsApp message dispatched successfully via Meta Cloud API!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send WhatsApp message");
    } finally {
      setSendingMeta(false);
    }
  };

  const totalCredits = (wallet?.available_total !== undefined)
    ? wallet.available_total
    : (Math.max(0, (wallet?.plan_monthly_quota || 0) - (wallet?.plan_quota_used || 0)) + (wallet?.addon_credits_balance || 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Send WhatsApp Message</DialogTitle>
              <DialogDescription className="text-xs">
                To: <strong className="text-foreground">{member.full_name}</strong> ({member.phone})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Event Type Tabs */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Select Message Event
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setEventType('welcome')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all text-center ${eventType === 'welcome'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'border-border/60 hover:bg-muted text-muted-foreground'
                  }`}
              >
                🌟 Welcome
              </button>
              <button
                type="button"
                onClick={() => setEventType('membership_expiring')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all text-center ${eventType === 'membership_expiring'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'border-border/60 hover:bg-muted text-muted-foreground'
                  }`}
              >
                ⏰ Expiry Alert
              </button>
              <button
                type="button"
                onClick={() => setEventType('payment_reminder')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all text-center ${eventType === 'payment_reminder'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'border-border/60 hover:bg-muted text-muted-foreground'
                  }`}
              >
                💰 Payment Due
              </button>
            </div>
          </div>

          {/* Message Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Message Preview
              </span>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Meta Template
              </Badge>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 text-xs text-foreground/90 leading-relaxed font-sans whitespace-pre-wrap">
              {previewText}
            </div>
          </div>

          {/* Connected Sender Status */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/60 text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-primary" />
              Sending From:
            </span>
            {integration ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-semibold">
                {integration.display_phone_number || "Your WhatsApp Business"}
                {integration.integration_type === "business_app_coexistence" && " (Coexistence)"}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Gymatrix Central Gateway (Default)
              </Badge>
            )}
          </div>

          {/* Wallet Balance Notification */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/60 text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              Meta Cloud API Balance:
            </span>
            <span className={`font-extrabold ${totalCredits > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
              {totalCredits} msgs available
            </span>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            className="flex-1 text-xs h-10 border-emerald-600/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            onClick={handleSendFromMobile}
          >
            <Smartphone className="h-4 w-4 mr-1.5" />
            Send from My Mobile
          </Button>

          <Button
            type="button"
            className="flex-1 gradient-primary text-xs h-10 font-bold"
            disabled={sendingMeta || totalCredits <= 0}
            onClick={handleSendViaMeta}
          >
            {sendingMeta ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Send className="h-4 w-4 mr-1.5" />
            )}
            Send via Meta Cloud API
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
