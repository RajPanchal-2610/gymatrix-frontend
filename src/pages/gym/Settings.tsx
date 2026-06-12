import { useState, useEffect } from "react";
import { Building2, Loader2, Upload, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useGym } from "@/hooks/useGym";
import { supabase } from "@/lib/supabase";

export default function Settings() {
  const { hasPermission } = usePermissions();
  const { gyms, gymId, refreshGyms } = useGym();

  const currentGym = gyms.find(g => g.id === gymId);
  const [logoUrl, setLogoUrl] = useState("");
  const [themeColor, setThemeColor] = useState("blue");
  const [savingBranding, setSavingBranding] = useState(false);

  // Gym settings states
  const [gymName, setGymName] = useState("");

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

    </div>
  );
}
