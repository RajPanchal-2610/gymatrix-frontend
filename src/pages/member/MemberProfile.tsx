import { useState } from "react";
import { Lock, Loader2, User, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { memberAuthService } from "@/services/memberAuthService";
import { useMemberPortal } from "./MemberLayout";
import { toast } from "sonner";

export default function MemberProfile() {
  const { member, dashboardData } = useMemberPortal();
  const memberInfo = dashboardData?.member;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword) {
      toast.error("Please fill in current and new password");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      await memberAuthService.changePassword(currentPassword, newPassword);
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl animate-in fade-in-50 duration-200">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Security & Profile</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your personal credentials, contact info, and account protection
        </p>
      </div>

      {/* Member Profile Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Registered Member Profile</CardTitle>
          <CardDescription>Your registered identity at {member?.gym_name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage src={memberInfo?.image_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold uppercase">
                {memberInfo?.full_name ? memberInfo.full_name.substring(0, 2) : "M"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-lg text-foreground">{memberInfo?.full_name}</h3>
              <p className="text-sm text-muted-foreground font-mono">{memberInfo?.phone}</p>
              {memberInfo?.email && <p className="text-xs text-muted-foreground">{memberInfo.email}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">Change Portal Password</CardTitle>
              <CardDescription>Keep your account secure with a private password</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currPass">Current Password</Label>
              <Input
                id="currPass"
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={savingPassword}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPass">New Password</Label>
                <Input
                  id="newPass"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={savingPassword}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confPass">Confirm New Password</Label>
                <Input
                  id="confPass"
                  type="password"
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={savingPassword}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={savingPassword} className="w-full sm:w-auto text-xs">
              {savingPassword ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
