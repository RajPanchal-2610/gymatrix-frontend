import { useState, useEffect } from "react";
import { User, Building2, Bell, Shield, Palette, Loader2, Upload, X, Check } from "lucide-react";
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
import { supabase } from "@/lib/supabase";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { hasPermission, role } = usePermissions();
  const { gyms, gymId, refreshGyms } = useGym();
  const isOwner = role?.isOwner;

  const currentGym = gyms.find(g => g.id === gymId);
  const [logoUrl, setLogoUrl] = useState("");
  const [themeColor, setThemeColor] = useState("blue");
  const [savingBranding, setSavingBranding] = useState(false);

  // User profile states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Gym settings states
  const [gymName, setGymName] = useState("");
  const [gymEmail, setGymEmail] = useState("info@downtownfitness.com");
  const [address, setAddress] = useState("123 Fitness Street, New York, NY 10001");
  const [openTime, setOpenTime] = useState("06:00");
  const [closeTime, setCloseTime] = useState("22:00");

  useEffect(() => {
    if (currentGym) {
      setLogoUrl(currentGym.logo_url || "");
      setThemeColor(currentGym.theme_color || "blue");
      setGymName(currentGym.name || "");
    }
  }, [currentGym]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name, email, phone')
            .eq('user_id', user.id)
            .maybeSingle();

          if (profile) {
            setFullName(profile.full_name || "");
            setEmail(profile.email || user.email || "");
            setPhone(profile.phone || "");
          } else {
            setEmail(user.email || "");
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };
    fetchUserProfile();
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
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
      window.dispatchEvent(new CustomEvent("profile-updated"));
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to update profile: " + error.message);
    } finally {
      setSavingProfile(false);
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

        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    placeholder="e.g. john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 234-567-8901"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  className="gradient-primary"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gym Settings */}
        <TabsContent value="gym">
          <div className="grid grid-cols-1 gap-6">
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
          </div>
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
              <CardDescription>Customize how GymFlow looks</CardDescription>
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


      </Tabs>
    </>
  );
}
