import { useState, useEffect } from "react";
import { User, Loader2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { usePermissions } from "@/contexts/PermissionsContext";

export default function Profile() {
  const { role } = usePermissions();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showOnWebsite, setShowOnWebsite] = useState(false);
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [experienceYears, setExperienceYears] = useState<number | "">("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialData, setInitialData] = useState({
    fullName: "",
    phone: "",
    showOnWebsite: false,
    title: "",
    bio: "",
    specialties: "",
    experienceYears: "" as number | "",
    instagramUrl: "",
    linkedinUrl: "",
    avatarUrl: ""
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name, email, phone, show_on_website, title, bio, specialties, experience_years, social_links, avatar_url')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) throw error;

          if (profile) {
            const nameVal = profile.full_name || "";
            const phoneVal = profile.phone || "";
            const showOnWebsiteVal = profile.show_on_website || false;
            const titleVal = profile.title || "";
            const bioVal = profile.bio || "";
            const specialtiesVal = profile.specialties ? profile.specialties.join(", ") : "";
            const experienceYearsVal = profile.experience_years !== undefined && profile.experience_years !== null ? profile.experience_years : "";
            const instagramVal = profile.social_links?.instagram || "";
            const linkedinVal = profile.social_links?.linkedin || "";
            const avatarVal = profile.avatar_url || "";

            setFullName(nameVal);
            setEmail(profile.email || user.email || "");
            setPhone(phoneVal);
            setShowOnWebsite(showOnWebsiteVal);
            setTitle(titleVal);
            setBio(bioVal);
            setSpecialties(specialtiesVal);
            setExperienceYears(experienceYearsVal);
            setInstagramUrl(instagramVal);
            setLinkedinUrl(linkedinVal);
            setAvatarUrl(avatarVal);

            setInitialData({
              fullName: nameVal,
              phone: phoneVal,
              showOnWebsite: showOnWebsiteVal,
              title: titleVal,
              bio: bioVal,
              specialties: specialtiesVal,
              experienceYears: experienceYearsVal,
              instagramUrl: instagramVal,
              linkedinUrl: linkedinVal,
              avatarUrl: avatarVal
            });
          } else {
            setEmail(user.email || "");
            setInitialData({
              fullName: "",
              phone: "",
              showOnWebsite: false,
              title: "",
              bio: "",
              specialties: "",
              experienceYears: "",
              instagramUrl: "",
              linkedinUrl: "",
              avatarUrl: ""
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast.error("Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file");
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size must be less than 2MB");
        return;
      }

      setUploadingAvatar(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('gym_assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('gym_assets')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success("Avatar uploaded successfully");
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to upload avatar: " + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const isChanged = 
    fullName !== initialData.fullName ||
    phone !== initialData.phone ||
    showOnWebsite !== initialData.showOnWebsite ||
    title !== initialData.title ||
    bio !== initialData.bio ||
    specialties !== initialData.specialties ||
    experienceYears !== initialData.experienceYears ||
    instagramUrl !== initialData.instagramUrl ||
    linkedinUrl !== initialData.linkedinUrl ||
    avatarUrl !== initialData.avatarUrl;

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const specialtiesArray = specialties
        ? specialties.split(",").map(s => s.trim()).filter(Boolean)
        : [];

      const updateData = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        show_on_website: showOnWebsite,
        title: title.trim(),
        bio: bio.trim(),
        specialties: specialtiesArray,
        experience_years: experienceYears === "" ? null : Number(experienceYears),
        social_links: {
          instagram: instagramUrl.trim(),
          linkedin: linkedinUrl.trim(),
        },
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      setInitialData({
        fullName,
        phone,
        showOnWebsite,
        title,
        bio,
        specialties,
        experienceYears,
        instagramUrl,
        linkedinUrl,
        avatarUrl
      });

      toast.success("Profile updated successfully!");
      window.dispatchEvent(new CustomEvent("profile-updated"));
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to update profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isTrainer = role?.name?.toLowerCase() === "trainer";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Profile Settings</h2>
        <p className="text-muted-foreground text-sm sm:text-base mt-1">
          Manage your personal information and contact details.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Overview */}
        <Card className="border border-border bg-card/50 backdrop-blur-xl h-fit">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="relative group">
                <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-2 border-border shadow-md">
                  <AvatarImage src={avatarUrl} alt={fullName} className="object-cover" />
                  <AvatarFallback className="text-2xl sm:text-3xl bg-primary/10 text-primary">
                    {fullName ? fullName.slice(0, 2).toUpperCase() : <User className="h-12 w-12" />}
                  </AvatarFallback>
                </Avatar>
                <label 
                  htmlFor="avatar-upload" 
                  className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-xs font-medium"
                >
                  {uploadingAvatar ? <Loader2 className="h-5 w-5 animate-spin" /> : "Change"}
                </label>
                <input 
                  id="avatar-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </div>
            </div>
            <CardTitle className="text-xl">{fullName || "Your Name"}</CardTitle>
            <CardDescription className="capitalize">
              {role?.name || "Member"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/50">
              <Mail className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{email || "No email provided"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/50">
              <Phone className="h-4 w-4 shrink-0 text-primary" />
              <span>{phone || "No phone provided"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Edit Profile Form */}
        <Card className="lg:col-span-2 border border-border bg-card/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your public details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="focus-visible:ring-primary"
                />
              </div>
            </div>

            {/* Trainer Specific Profile Section */}
            {isTrainer && (
              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showOnWebsite" className="text-base font-semibold">
                      Public Directory Listing
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Display your trainer profile on the gym's public website & landing page
                    </p>
                  </div>
                  <Switch
                    id="showOnWebsite"
                    checked={showOnWebsite}
                    onCheckedChange={setShowOnWebsite}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Professional Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Senior CrossFit Coach"
                      className="focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experienceYears">Years of Experience</Label>
                    <Input
                      id="experienceYears"
                      type="number"
                      min={0}
                      max={50}
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 5"
                      className="focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialties">Specialties / Tags (Comma separated)</Label>
                  <Input
                    id="specialties"
                    value={specialties}
                    onChange={(e) => setSpecialties(e.target.value)}
                    placeholder="e.g. Strength Training, HIIT, Weight Loss, Nutrition"
                    className="focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Trainer Bio / About</Label>
                  <textarea
                    id="bio"
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell members about your fitness philosophy, certifications, and background..."
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instagramUrl">Instagram Profile URL</Label>
                    <Input
                      id="instagramUrl"
                      type="url"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder="https://instagram.com/yourhandle"
                      className="focus-visible:ring-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedinUrl">LinkedIn Profile URL</Label>
                    <Input
                      id="linkedinUrl"
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/yourusername"
                      className="focus-visible:ring-primary"
                    />
                  </div>
                </div>
              </div>
            )}

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
    </div>
  );
}
