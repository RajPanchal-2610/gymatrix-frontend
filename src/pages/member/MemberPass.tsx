import { QrCode, ShieldCheck, MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMemberPortal } from "./MemberLayout";

export default function MemberPass() {
  const { member, dashboardData } = useMemberPortal();
  const memberInfo = dashboardData?.member;

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Digital Membership Pass</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Scan this digital barcode or QR code at your gym turnstile / front desk reader
        </p>
      </div>

      <Card className="overflow-hidden border border-border shadow-2xl bg-card">
        {/* Pass Header */}
        <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={member?.gym_logo || "/logo.png"}
              alt="Gym Logo"
              className="h-12 w-12 rounded-lg bg-white p-1 border object-contain shadow-sm"
            />
            <div>
              <h3 className="font-bold text-lg leading-tight">{member?.gym_name || "Gymatrix Partner Gym"}</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Official Member Identity Pass
              </p>
            </div>
          </div>
          <Badge className="gradient-primary text-white font-bold uppercase text-[10px] tracking-wider px-2.5 py-1">
            {memberInfo?.gym_membership_plans?.name || "Active"}
          </Badge>
        </div>

        {/* QR & Details Body */}
        <CardContent className="p-8 text-center space-y-6">
          <div className="mx-auto w-48 h-48 bg-white p-4 rounded-2xl shadow-xl flex items-center justify-center border-4 border-primary/20">
            <QrCode className="w-full h-full text-slate-900" />
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{memberInfo?.full_name}</h2>
            <p className="text-sm text-muted-foreground font-mono mt-1">
              Member ID: #{String(memberInfo?.id || 1).padStart(6, "0")} • {memberInfo?.phone}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border text-xs">
            <div>
              <p className="text-muted-foreground font-mono uppercase text-[10px]">Status</p>
              <p className="font-bold text-emerald-500 mt-1 uppercase text-sm">{memberInfo?.status || "Active"}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-mono uppercase text-[10px]">Join Date</p>
              <p className="font-bold mt-1 text-sm">{memberInfo?.join_date || "Recent"}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-mono uppercase text-[10px]">Expiry Date</p>
              <p className="font-bold text-primary mt-1 text-sm">{memberInfo?.expiry_date || "Ongoing"}</p>
            </div>
          </div>

          {/* Gym Address & Contact */}
          {(member?.gym_address || member?.gym_phone) && (
            <div className="pt-4 border-t border-border/50 text-[11px] text-muted-foreground flex flex-col items-center gap-1">
              {member.gym_address && (
                <p className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-primary flex-shrink-0" /> {member.gym_address}
                </p>
              )}
              {member.gym_phone && (
                <p className="flex items-center gap-1 font-mono">
                  <Phone className="h-3 w-3 text-primary flex-shrink-0" /> {member.gym_phone}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
