import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSubscription } from "@/hooks/useSubscription";
import { useGym } from "@/hooks/useGym";
import { usePermissions } from "@/contexts/PermissionsContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  Building2,
  Users,
  Check,
  Loader2,
  Search,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export function ConflictResolutionDialog() {
  const { subscription, refreshSubscription } = useSubscription();
  const { role } = usePermissions();
  const { refreshGyms } = useGym();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data states
  const [ownedGyms, setOwnedGyms] = useState<any[]>([]);
  const [activeMembers, setActiveMembers] = useState<any[]>([]);

  // Selection states
  const [selectedGymIds, setSelectedGymIds] = useState<number[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  
  // Search and filter states
  const [memberSearch, setMemberSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"gyms" | "members">("gyms");

  // Limits
  const maxGyms = subscription?.max_gyms || 1;
  const maxMembers = subscription?.max_members || 50;

  // Checks
  const activeGymsCount = ownedGyms.filter((g) => g.is_active !== false).length;
  const hasGymConflict = activeGymsCount > maxGyms;

  const hasMemberConflict = activeMembers.length > maxMembers;

  const membersInSelectedGyms = activeMembers.filter((m) => selectedGymIds.includes(m.gym_id));
  const targetSelectMemberCount = Math.min(maxMembers, membersInSelectedGyms.length);

  const isOwner = role?.isOwner || role?.name?.toLowerCase() === "owner";

  useEffect(() => {
    if (subscription && isOwner) {
      checkConflict();
    } else {
      setLoading(false);
    }
  }, [subscription, role]);

  const checkConflict = async () => {
    if (isOpen) return;
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch all gyms owned by user
      const { data: gymsData, error: gymsError } = await supabase
        .from("gyms")
        .select("*")
        .eq("owner_id", user.id);

      if (gymsError) throw gymsError;

      if (gymsData && gymsData.length > 0) {
        const gymIds = gymsData.map((g) => g.id);

        // 2. Fetch all members across all owned gyms (active and paused)
        const { data: membersData, error: membersError } = await supabase
          .from("gym_members")
          .select("id, full_name, join_date, is_active, status, gym_id")
          .in("gym_id", gymIds)
          .eq("is_deleted", false);

        if (membersError) throw membersError;
        let allMembers = membersData || [];

        let gymsUpdated = false;
        let membersUpdated = false;

        // 3. Auto-reactivate gyms if total owned gyms fits in maxGyms
        const inactiveGyms = gymsData.filter((g) => g.is_active === false);
        if (gymsData.length <= maxGyms && inactiveGyms.length > 0) {
          const { error: gymReactivateErr } = await supabase
            .from("gyms")
            .update({ is_active: true })
            .eq("owner_id", user.id);

          if (gymReactivateErr) throw gymReactivateErr;
          gymsData.forEach((g) => { g.is_active = true; });
          gymsUpdated = true;
        }

        // 4. Auto-reactivate members if total members fits in maxMembers
        const pausedMembers = allMembers.filter((m) => m.is_active === false || m.status === 'paused');
        if (allMembers.length <= maxMembers && pausedMembers.length > 0) {
          const pausedIds = pausedMembers.map((m) => m.id);
          const { error: memberReactivateErr } = await supabase
            .from("gym_members")
            .update({ is_active: true, status: "active" })
            .in("id", pausedIds);

          if (memberReactivateErr) throw memberReactivateErr;
          allMembers.forEach((m) => {
            if (pausedIds.includes(m.id)) {
              m.is_active = true;
              m.status = "active";
            }
          });
          membersUpdated = true;
        }

        setOwnedGyms(gymsData);
        setActiveMembers(allMembers);

        if (gymsUpdated || membersUpdated) {
          toast.success("Resource limits upgraded. Reactivating gyms and members.");
          await refreshGyms();
          await refreshSubscription();
          window.location.reload();
          return;
        }

        const currentActiveGyms = gymsData.filter((g) => g.is_active !== false);
        const activeGymCount = currentActiveGyms.length;
        const currentActiveMembers = allMembers.filter((m) => m.is_active !== false);
        const activeMemberCount = currentActiveMembers.length;

        // A conflict exists if currently active count > max,
        // OR if total count > max but currently active count has not been chosen to fill the quota.
        const gymConflict = activeGymCount > maxGyms || (gymsData.length > maxGyms && activeGymCount !== maxGyms);
        const memberConflict = activeMemberCount > maxMembers || (allMembers.length > maxMembers && activeMemberCount !== maxMembers);

        if (gymConflict || memberConflict) {
          setIsOpen(true);
          
          // Pre-populate gyms: active ones first, then inactive ones
          const activeGymIds = currentActiveGyms.map((g) => g.id);
          const inactiveGymIds = gymsData.filter((g) => g.is_active === false).map((g) => g.id);
          const prepopulatedGymIds = [...activeGymIds, ...inactiveGymIds].slice(0, maxGyms);
          setSelectedGymIds(prepopulatedGymIds);
          
          // Pre-populate members: active ones first, then paused/inactive ones
          const activeMemIds = currentActiveMembers.map((m) => m.id);
          const pausedMemIds = allMembers.filter((m) => m.is_active === false || m.status === 'paused').map((m) => m.id);
          const prepopulatedMemberIds = [...activeMemIds, ...pausedMemIds].slice(0, maxMembers);
          setSelectedMemberIds(prepopulatedMemberIds);

          // Decide starting tab
          if (gymConflict) {
            setActiveTab("gyms");
          } else {
            setActiveTab("members");
          }
        } else {
          setIsOpen(false);
        }
      }
    } catch (error) {
      console.error("Conflict check error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGymToggle = (gymId: number) => {
    setSelectedGymIds((prev) => {
      let nextGymIds;
      if (prev.includes(gymId)) {
        nextGymIds = prev.filter((id) => id !== gymId);
        // Also remove members of this gym from selectedMemberIds
        setSelectedMemberIds((prevMembers) => {
          const membersOfThisGym = activeMembers.filter((m) => m.gym_id === gymId).map((m) => m.id);
          return prevMembers.filter((id) => !membersOfThisGym.includes(id));
        });
      } else {
        if (prev.length >= maxGyms) {
          toast.warning(`You can only select up to ${maxGyms} active gym(s).`);
          return prev;
        }
        nextGymIds = [...prev, gymId];
      }
      return nextGymIds;
    });
  };

  const handleMemberToggle = (memberId: number) => {
    setSelectedMemberIds((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }
      if (prev.length >= targetSelectMemberCount) {
        toast.warning(`You can only select up to ${targetSelectMemberCount} active member(s).`);
        return prev;
      }
      return [...prev, memberId];
    });
  };

  // Helper Auto-Selectors for members
  const selectOldestMembers = () => {
    const sorted = [...membersInSelectedGyms].sort(
      (a, b) => new Date(a.join_date).getTime() - new Date(b.join_date).getTime()
    );
    setSelectedMemberIds(sorted.slice(0, targetSelectMemberCount).map((m) => m.id));
    toast.success(`Selected the ${targetSelectMemberCount} oldest active members.`);
  };

  const selectNewestMembers = () => {
    const sorted = [...membersInSelectedGyms].sort(
      (a, b) => new Date(b.join_date).getTime() - new Date(a.join_date).getTime()
    );
    setSelectedMemberIds(sorted.slice(0, targetSelectMemberCount).map((m) => m.id));
    toast.success(`Selected the ${targetSelectMemberCount} newest active members.`);
  };

  const handleSaveResolution = async () => {
    const requiresGymSelection = hasGymConflict && selectedGymIds.length !== maxGyms;
    const requiresMemberSelection = hasMemberConflict && selectedMemberIds.length !== targetSelectMemberCount;

    if (requiresGymSelection) {
      toast.error(`Please select exactly ${maxGyms} gym(s) to keep active.`);
      return;
    }
    if (requiresMemberSelection) {
      toast.error(`Please select exactly ${targetSelectMemberCount} member(s) to keep active.`);
      return;
    }

    setSubmitting(true);
    try {
      // 1. Gym Updates
      if (ownedGyms.length > 0) {
        const inactiveGymIds = ownedGyms
          .map((g) => g.id)
          .filter((id) => !selectedGymIds.includes(id));

        // Update selected gyms to active
        if (selectedGymIds.length > 0) {
          const { error: err1 } = await supabase
            .from("gyms")
            .update({ is_active: true })
            .in("id", selectedGymIds);
          if (err1) throw err1;
        }

        // Update unselected gyms to inactive
        if (inactiveGymIds.length > 0) {
          const { error: err2 } = await supabase
            .from("gyms")
            .update({ is_active: false })
            .in("id", inactiveGymIds);
          if (err2) throw err2;
        }
      }

      // 2. Member Updates
      if (activeMembers.length > 0) {
        const pausedMemberIds = activeMembers
          .map((m) => m.id)
          .filter((id) => !selectedMemberIds.includes(id));

        // Update selected members to active
        if (selectedMemberIds.length > 0) {
          const { error: err3 } = await supabase
            .from("gym_members")
            .update({ is_active: true, status: "active" })
            .in("id", selectedMemberIds);
          if (err3) throw err3;
        }

        // Update unselected members to paused
        if (pausedMemberIds.length > 0) {
          const { error: err4 } = await supabase
            .from("gym_members")
            .update({ is_active: false, status: "paused" })
            .in("id", pausedMemberIds);
          if (err4) throw err4;
        }
      }

      toast.success("Conflict resolved successfully!");
      setIsOpen(false);

      // Refresh App contexts to load new state
      await refreshGyms();
      await refreshSubscription();
      
      // Force reload to completely clear any loaded UI cache for gyms/members
      window.location.reload();

    } catch (error: any) {
      console.error(error);
      toast.error("Resolution failed: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMembers = membersInSelectedGyms.filter(
    (m) =>
      m.full_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (ownedGyms.find((g) => g.id === m.gym_id)?.name || "")
        .toLowerCase()
        .includes(memberSearch.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[700px] h-[85vh] p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col h-full bg-background">
          <DialogHeader className="p-6 pb-4 bg-muted/20 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
                  Plan Limit Exceeded Resolution
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-muted-foreground mt-1.5 leading-relaxed">
                  Your new plan limits require you to select which gyms and members remain active. Unselected gyms will be inactivated (locked) and unselected members will be paused (read-only), with no data deleted.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Navigation Tabs */}
          <div className="flex border-b border-border bg-muted/40 px-6 py-3 gap-2">
            {hasGymConflict && (
              <button
                onClick={() => setActiveTab("gyms")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                  activeTab === "gyms"
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-[1.02]"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
                }`}
              >
                <Building2 className="h-4 w-4" />
                Select Gyms ({selectedGymIds.length} / {maxGyms})
              </button>
            )}
            {hasMemberConflict && (
              <button
                onClick={() => setActiveTab("members")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                  activeTab === "members"
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-[1.02]"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
                }`}
              >
                <Users className="h-4 w-4" />
                Select Members ({selectedMemberIds.length} / {targetSelectMemberCount})
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden p-6">
            {/* GYM CONFLICT RESOLUTION */}
            {activeTab === "gyms" && hasGymConflict && (
              <div className="flex flex-col flex-1 space-y-4 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-muted-foreground uppercase tracking-wider">
                    Select exactly {maxGyms} gym(s) to keep active
                  </h3>
                  <Badge variant="outline" className="border-primary/20 text-primary font-bold">
                    Limit: {maxGyms}
                  </Badge>
                </div>

                <ScrollArea className="h-[340px] border border-border/60 rounded-xl p-4 bg-muted/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ownedGyms.map((gym) => {
                      const isSelected = selectedGymIds.includes(gym.id);
                      return (
                        <Card
                          key={gym.id}
                          onClick={() => handleGymToggle(gym.id)}
                          className={`cursor-pointer transition-all duration-300 hover:scale-[1.01] bg-card ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/45"
                          }`}
                        >
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-lg ${isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                <Building2 className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-foreground">{gym.name}</h4>
                                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                                  Created: {new Date(gym.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all ${
                              isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                            }`}>
                              {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* MEMBER CONFLICT RESOLUTION */}
            {activeTab === "members" && hasMemberConflict && (
              <div className="flex flex-col flex-1 space-y-4 overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold text-muted-foreground uppercase tracking-wider">
                      Select exactly {targetSelectMemberCount} member(s) to keep active
                    </h3>
                    <p className="text-[10px] font-semibold text-muted-foreground">
                      Unselected members will be paused in read-only mode.
                    </p>
                  </div>
                  
                  {/* Quick Select Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectOldestMembers}
                      className="text-xs h-8 border-primary/20 text-primary hover:bg-primary/5 font-bold"
                    >
                      <Sparkles className="h-3 w-3 mr-1.5" />
                      Auto oldest
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectNewestMembers}
                      className="text-xs h-8 border-primary/20 text-primary hover:bg-primary/5 font-bold"
                    >
                      <Sparkles className="h-3 w-3 mr-1.5" />
                      Auto newest
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search member name or gym..."
                    className="pl-9 h-9"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                  <Badge variant="secondary" className="font-bold py-1 px-2 shrink-0 border border-border">
                    {selectedMemberIds.length} / {targetSelectMemberCount} Selected
                  </Badge>
                </div>

                <ScrollArea className="h-[340px] border border-border/60 rounded-xl bg-muted/20">
                  <div className="divide-y divide-border/40">
                    {filteredMembers.map((member) => {
                      const isSelected = selectedMemberIds.includes(member.id);
                      const gymName = ownedGyms.find((g) => g.id === member.gym_id)?.name || "Gym";
                      return (
                        <div
                          key={member.id}
                          onClick={() => handleMemberToggle(member.id)}
                          className={`flex items-center justify-between p-4 cursor-pointer transition-all duration-200 border-b border-border/40 last:border-b-0 ${
                            isSelected 
                              ? "bg-primary/5 border-l-2 border-l-primary" 
                              : "bg-card hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleMemberToggle(member.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div>
                              <h4 className="font-bold text-sm text-foreground">{member.full_name}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-[9px] py-0 px-1 border-muted text-muted-foreground font-semibold">
                                  {gymName}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  Joined: {new Date(member.join_date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {isSelected ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/10 text-[10px] font-bold py-0.5 px-2">
                              Keep Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] opacity-75 font-semibold py-0.5 px-2">
                              Pause
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                    {filteredMembers.length === 0 && (
                      <div className="p-8 text-center text-sm font-semibold text-muted-foreground">
                        No active members found.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-border bg-muted/20 flex items-center justify-between">
            <div className="text-xs font-semibold text-muted-foreground">
              {hasGymConflict && (
                <div>Gyms: {selectedGymIds.length} of {maxGyms} selected</div>
              )}
              {hasMemberConflict && (
                <div>Members: {selectedMemberIds.length} of {targetSelectMemberCount} selected</div>
              )}
            </div>

            <Button
              onClick={handleSaveResolution}
              disabled={
                submitting ||
                (hasGymConflict && selectedGymIds.length !== maxGyms) ||
                (hasMemberConflict && selectedMemberIds.length !== targetSelectMemberCount)
              }
              className="gradient-primary shadow-glow font-bold min-w-[150px] h-10"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  Resolve Limits
                  <ChevronRight className="h-4 w-4 ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
