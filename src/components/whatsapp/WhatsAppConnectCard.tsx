import React, { useState, useEffect } from "react";
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Link2,
  Unlink,
  Loader2,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { launchWhatsAppSignup } from "@/utils/metaSdk";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const META_APP_ID = import.meta.env.VITE_META_APP_ID || "";
const META_CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID || "";

interface WhatsAppIntegrationData {
  id: number;
  gym_id: number;
  waba_id: string;
  phone_number_id: string;
  display_phone_number?: string;
  business_name?: string;
  token_expiry?: string;
  connection_status: "connected" | "disconnected" | "expired" | "error";
  integration_type: "business_app_coexistence" | "cloud_api";
  coexistence_status?: {
    is_on_biz_app?: boolean;
    coexistence_eligible?: boolean;
    platform_type?: string;
    quality_rating?: string;
    last_app_state_sync_at?: string;
    connected_at?: string;
  };
  created_at: string;
  updated_at: string;
}

interface WhatsAppConnectCardProps {
  gymId?: number;
  onConnectionChange?: () => void;
}

export function WhatsAppConnectCard({ gymId, onConnectionChange }: WhatsAppConnectCardProps) {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectingStep, setConnectingStep] = useState<string>("");
  const [integration, setIntegration] = useState<WhatsAppIntegrationData | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${BACKEND_URL}/api/whatsapp/status`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.is_connected && data.integration) {
          setIntegration(data.integration);
        } else {
          setIntegration(null);
        }
      }
    } catch (err) {
      console.error("Error fetching WhatsApp connection status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gymId) {
      fetchStatus();
    }
  }, [gymId]);

  // Handle Meta Embedded Signup Trigger
  const handleConnectWhatsApp = async () => {
    if (!META_APP_ID || !META_CONFIG_ID) {
      toast.error(
        "Meta App ID or Configuration ID is not configured. Please add VITE_META_APP_ID and VITE_META_CONFIG_ID in your frontend .env file."
      );
      return;
    }

    try {
      setConnecting(true);
      setConnectingStep("Opening Meta Embedded Signup popup...");

      // 1. Launch Facebook Login for Business Embedded Signup Popup
      const signupResult = await launchWhatsAppSignup({
        appId: META_APP_ID,
        configId: META_CONFIG_ID
      });

      setConnectingStep("Verifying authorization and configuring WhatsApp Business Account...");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("User session expired. Please log in again.");
      }

      // 2. Send authorization code and captured session details to backend
      const completeRes = await fetch(`${BACKEND_URL}/api/whatsapp/embedded-signup/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          code: signupResult.code,
          waba_id: signupResult.sessionData.waba_id,
          phone_number_id: signupResult.sessionData.phone_number_id
        })
      });

      const completeData = await completeRes.json();

      if (!completeRes.ok || !completeData.success) {
        throw new Error(completeData.error || "Failed to complete Meta WhatsApp onboarding");
      }

      // 3. Update local state
      setIntegration(completeData.integration);
      const isCoex = completeData.integration?.integration_type === "business_app_coexistence";

      if (isCoex) {
        toast.success(
          "WhatsApp Connected! WhatsApp Business App Coexistence is active. You can continue using your mobile WhatsApp Business app as normal."
        );
      } else {
        toast.success("WhatsApp Business Account connected successfully via Meta Cloud API!");
      }

      onConnectionChange?.();
    } catch (err: any) {
      console.error("WhatsApp Connection failed:", err);
      toast.error(err.message || "Failed to connect WhatsApp Business");
    } finally {
      setConnecting(false);
      setConnectingStep("");
    }
  };

  // Handle Disconnect WhatsApp
  const handleDisconnectWhatsApp = async () => {
    try {
      setDisconnecting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("User session expired");
      }

      const res = await fetch(`${BACKEND_URL}/api/whatsapp/disconnect`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to disconnect WhatsApp");
      }

      setIntegration(null);
      toast.success("WhatsApp disconnected. Messages will now fallback to the central Gymatrix gateway.");
      onConnectionChange?.();
    } catch (err: any) {
      console.error("Error disconnecting WhatsApp:", err);
      toast.error(err.message || "Failed to disconnect WhatsApp");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 rounded-xl border border-border/60 bg-muted/20">
        <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
        <span className="text-xs text-muted-foreground">Checking WhatsApp connection status...</span>
      </div>
    );
  }

  const isConnected = !!(integration && integration.connection_status === "connected");
  const isCoexistence = integration?.integration_type === "business_app_coexistence";

  return (
    <div className="space-y-4">
      {isConnected && integration ? (
        // Connected State
        <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-5 animate-in fade-in-50 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground">
                    {integration.business_name || "Your WhatsApp Business Account"}
                  </h4>
                  <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/40 text-[10px] font-bold">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                </div>
                <p className="text-xs font-mono font-medium text-emerald-700 dark:text-emerald-300">
                  {integration.display_phone_number || "Verified Number"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStatus}
                className="h-8 text-xs border-border/80"
                title="Refresh Status"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disconnecting}
                    className="h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    {disconnecting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Unlink className="h-3.5 w-3.5 mr-1" />
                    )}
                    Disconnect
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect WhatsApp Business Account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Disconnecting will detach your business phone number ({integration.display_phone_number || "connected number"}) from Gymatrix. Automated reminders and welcome messages will automatically fall back to the central Gymatrix WhatsApp gateway.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDisconnectWhatsApp}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, Disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Coexistence or Cloud API Badge & Explainer */}
          {isCoexistence ? (
            <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                WhatsApp Business App Coexistence Active
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                You can continue to use your physical mobile device and chat with members inside the official <strong>WhatsApp Business mobile app</strong>. Inbound customer replies and outbound echoes remain synchronized while Gymatrix sends automated membership reminders in the background.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 text-xs space-y-1 text-muted-foreground">
              <div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
                <Info className="h-4 w-4" />
                Meta WhatsApp Cloud API Active
              </div>
              <p className="text-[11px]">
                Messages are routed through your Meta Cloud API connection.
              </p>
            </div>
          )}

          {/* Technical Connection Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-emerald-500/20 text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">WABA ID</span>
              <p className="font-mono text-[11px] text-foreground truncate">{integration.waba_id}</p>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Phone Number ID</span>
              <p className="font-mono text-[11px] text-foreground truncate">{integration.phone_number_id}</p>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Authorization</span>
              <p className="text-[11px] text-foreground">
                {integration.token_expiry
                  ? `Active (~${Math.max(0, Math.round((new Date(integration.token_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days remaining)`
                  : "Active (60-day System User)"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Not Connected State
        <div className="p-5 rounded-xl border border-border/80 bg-muted/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                  <Smartphone className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">
                  Connect Your Own WhatsApp Business Number
                </h4>
                <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground">
                  Coexistence Supported
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground max-w-xl">
                Send automated welcome messages, membership expiry reminders, and fee alerts directly from your gym's official WhatsApp Business number.
              </p>
            </div>

            <Button
              onClick={handleConnectWhatsApp}
              disabled={connecting}
              className="bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs h-9 px-4 shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Connect WhatsApp
                </>
              )}
            </Button>
          </div>

          {connecting && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-primary animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{connectingStep || "Processing Meta WhatsApp onboarding..."}</span>
            </div>
          )}

          {/* Highlights & Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-border/50 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Keep Using WhatsApp Business App:</strong> Eligible numbers can continue chatting with members on mobile via Meta Coexistence.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Automated Messages:</strong> Send registration welcomes, expiry reminders, and payment dues with your gym brand.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Meta Embedded Signup v4:</strong> Official secure flow with 60-day system-user access token.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Automatic Fallback:</strong> If not connected, messages continue sending smoothly via the central Gymatrix gateway.
              </span>
            </div>
          </div>

          {(!META_APP_ID || !META_CONFIG_ID) && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                Frontend environment variables <code>VITE_META_APP_ID</code> and <code>VITE_META_CONFIG_ID</code> must be configured in <code>gymatrix-frontend/.env</code> to launch Meta Embedded Signup.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

