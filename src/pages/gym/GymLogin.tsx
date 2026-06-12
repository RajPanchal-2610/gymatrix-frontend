import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dumbbell, Mail, Lock, Eye, EyeOff, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function GymLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem("remembered_gym_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password) {
      toast.error("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;

      if (data.user) {
        // Check if user is a gym admin
        // Check if user is a gym owner
        const { data: gymOwner, error: ownerError } = await supabase
          .from('gyms')
          .select('id')
          .eq('owner_id', data.user.id)
          .limit(1)
          .maybeSingle();

        // Check if user is a gym staff member
        const { data: gymStaff, error: staffError } = await supabase
          .from('gym_staff')
          .select('gym_id')
          .eq('user_id', data.user.id)
          .eq('is_deleted', false)
          .ilike('status', 'active')
          .eq('allow_login', true)
          .limit(1)
          .maybeSingle();

        if (ownerError || staffError) {
          console.error("Access check error:", ownerError || staffError);
          toast.error("Error verifying access");
          setLoading(false);
          await supabase.auth.signOut();
          return;
        }

        if (!gymOwner && !gymStaff) {
          toast.error("Access denied. Not a registered gym owner or staff member.");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        toast.success("Welcome back!");
        if (remember) {
          localStorage.setItem("remembered_gym_email", email);
        } else {
          localStorage.removeItem("remembered_gym_email");
        }
        navigate("/");
      }

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative animate-scale-in">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-14 w-14 rounded-xl bg-white p-1 border flex items-center justify-center mb-4 shadow-glow overflow-hidden">
            <img src="/logo.png" alt="Gymatrix Logo" className="h-full w-full object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>Manage your gym efficiently</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@gym.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  disabled={loading}
                  checked={remember}
                  onCheckedChange={(checked) => setRemember(checked === true)}
                />
                <Label htmlFor="remember" className="text-sm font-normal">
                  Remember me
                </Label>
              </div>
              <Link
                to="/auth/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full gradient-primary shadow-glow" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/auth/register" className="text-primary hover:underline font-medium">
              Register
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
