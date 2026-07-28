import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Trophy, Calendar, Clock, Eye, Trash2, Edit, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { globalTournamentService, GlobalTournament } from "@/services/globalTournamentService";

const formatDateForInput = (dateString: string) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function GlobalTournaments() {
  const [tournaments, setTournaments] = useState<GlobalTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<GlobalTournament | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(2);
  const [strictness, setStrictness] = useState<"STRICT" | "NORMAL" | "LOOSE">("NORMAL");

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editDurationMinutes, setEditDurationMinutes] = useState(2);
  const [editStrictness, setEditStrictness] = useState<"STRICT" | "NORMAL" | "LOOSE">("NORMAL");

  const handleOpenEdit = (tournament: GlobalTournament) => {
    setEditingTournament(tournament);
    setEditName(tournament.name);
    setEditDescription(tournament.description || "");
    setEditStartDate(formatDateForInput(tournament.start_date));
    setEditEndDate(formatDateForInput(tournament.end_date));
    
    const durationSec = (tournament.rules as any)?.duration_seconds || 120;
    setEditDurationMinutes(Math.round(durationSec / 60));
    
    const strictVal = (tournament.rules?.pushup_form_strictness || "NORMAL") as "STRICT" | "NORMAL" | "LOOSE";
    setEditStrictness(strictVal);
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTournament) return;
    if (!editName || !editStartDate || !editEndDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      await globalTournamentService.updateTournament(editingTournament.id, {
        name: editName,
        description: editDescription,
        start_date: new Date(editStartDate).toISOString(),
        end_date: new Date(editEndDate).toISOString(),
        rules: {
          ...editingTournament.rules,
          duration_seconds: Number(editDurationMinutes) * 60,
          pushup_form_strictness: editStrictness,
          minimum_elbow_angle: editStrictness === "STRICT" ? 85 : editStrictness === "LOOSE" ? 100 : 90,
          plank_angle_tolerance: editStrictness === "STRICT" ? 10 : editStrictness === "LOOSE" ? 20 : 15
        }
      });

      toast.success("Global tournament updated successfully!");
      setEditOpen(false);
      setEditingTournament(null);
      fetchTournaments();
    } catch (error: any) {
      toast.error(error.message || "Failed to update tournament");
    }
  };

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const data = await globalTournamentService.getAllTournaments();
      setTournaments(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load global tournaments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      await globalTournamentService.createTournament({
        name,
        description,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        rules: {
          duration_seconds: Number(durationMinutes) * 60,
          pushup_form_strictness: strictness,
          minimum_elbow_angle: strictness === "STRICT" ? 85 : strictness === "LOOSE" ? 100 : 90,
          plank_angle_tolerance: strictness === "STRICT" ? 10 : strictness === "LOOSE" ? 20 : 15
        }
      });

      toast.success("Global tournament created successfully!");
      setCreateOpen(false);
      // Reset form
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setDurationMinutes(2);
      setStrictness("NORMAL");
      fetchTournaments();
    } catch (error: any) {
      toast.error(error.message || "Failed to create tournament");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tournament?")) return;

    try {
      await globalTournamentService.deleteTournament(id);
      toast.success("Tournament deleted successfully");
      fetchTournaments();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete tournament");
    }
  };

  const handleStatusChange = async (id: string, newStatus: GlobalTournament["status"]) => {
    try {
      await globalTournamentService.updateTournament(id, { status: newStatus });
      toast.success(`Tournament status updated to ${newStatus}`);
      fetchTournaments();
    } catch (error: any) {
      toast.error(error.message || "Failed to update tournament status");
    }
  };

  const getStatusColor = (status: GlobalTournament["status"]) => {
    switch (status) {
      case "DRAFT":
        return "bg-slate-500/10 text-slate-500 border-slate-500/20";
      case "UPCOMING":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "ACTIVE":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 animate-pulse";
      case "COMPLETED":
        return "bg-violet-500/10 text-violet-500 border-violet-500/20";
      case "CANCELLED":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Global Push-Up Tournaments</h1>
          <p className="text-muted-foreground mt-1">Create and manage global fitness challenges and review AI-validated logs.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground font-semibold flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Tournament
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">New Global Tournament</DialogTitle>
              <DialogDescription>
                Define the core timeline and AI rules for the global push-up tournament.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name">Tournament Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Summer Push-up Showdown 2026"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide a detailed description of the tournament..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date & Time *</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date & Time *</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="durationMinutes">Duration (Minutes) *</Label>
                  <Input
                    id="durationMinutes"
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    min={1}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="strictness">Form Strictness *</Label>
                  <Select value={strictness} onValueChange={(value: any) => setStrictness(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select strictness" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOOSE">Loose (Flexibility angle up to 100°)</SelectItem>
                      <SelectItem value="NORMAL">Normal (Standard 90° bend)</SelectItem>
                      <SelectItem value="STRICT">Strict (Deep 85° bend, tight plank tolerance)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="gradient-primary text-primary-foreground font-semibold">
                  Create Tournament
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Edit Global Tournament</DialogTitle>
              <DialogDescription>
                Modify the timeline and AI rules for the global push-up tournament.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="editName">Tournament Name *</Label>
                  <Input
                    id="editName"
                    placeholder="e.g. Summer Push-up Showdown 2026"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="editDescription">Description</Label>
                  <Textarea
                    id="editDescription"
                    placeholder="Provide a detailed description of the tournament..."
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editStartDate">Start Date & Time *</Label>
                  <Input
                    id="editStartDate"
                    type="datetime-local"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editEndDate">End Date & Time *</Label>
                  <Input
                    id="editEndDate"
                    type="datetime-local"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editDurationMinutes">Duration (Minutes) *</Label>
                  <Input
                    id="editDurationMinutes"
                    type="number"
                    value={editDurationMinutes}
                    onChange={(e) => setEditDurationMinutes(Number(e.target.value))}
                    min={1}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editStrictness">Form Strictness *</Label>
                  <Select value={editStrictness} onValueChange={(value: any) => setEditStrictness(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select strictness" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOOSE">Loose (Flexibility angle up to 100°)</SelectItem>
                      <SelectItem value="NORMAL">Normal (Standard 90° bend)</SelectItem>
                      <SelectItem value="STRICT">Strict (Deep 85° bend, tight plank tolerance)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="gradient-primary text-primary-foreground font-semibold">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : tournaments.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <Trophy className="h-16 w-16 text-muted-foreground opacity-30 mb-4 animate-bounce" />
          <h3 className="text-xl font-bold">No global tournaments found</h3>
          <p className="text-muted-foreground mt-1 max-w-sm">Create your first global push-up challenge to engage your users worldwide.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => (
            <Card key={t.id} className="relative overflow-hidden border border-border bg-card hover:shadow-glow transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(t.status)}`}>
                    {t.status}
                  </span>
                  <Trophy className="h-5 w-5 text-amber-500" />
                </div>
                <CardTitle className="line-clamp-1 text-lg font-bold">{t.name}</CardTitle>
                <CardDescription className="line-clamp-2 text-sm text-muted-foreground mt-1 min-h-[40px]">
                  {t.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5 pb-4 text-xs font-semibold">
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0 text-primary" />
                  <span>Start: {new Date(t.start_date).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0 text-primary" />
                  <span>End: {new Date(t.end_date).toLocaleString()}</span>
                </div>
                <div className="bg-muted/50 p-2.5 rounded-lg border text-[11px] space-y-1.5 mt-2">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Strictness:</span>
                    <span className="text-foreground font-bold">{t.rules.pushup_form_strictness}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Duration:</span>
                    <span className="text-foreground font-bold">
                      {t.rules.duration_seconds 
                        ? `${t.rules.duration_seconds / 60}m` 
                        : '2m'}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/20 px-6 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10 shrink-0" onClick={() => handleOpenEdit(t)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Select value={t.status} onValueChange={(val: any) => handleStatusChange(t.id, val)}>
                    <SelectTrigger className="w-[110px] h-8 text-[11px] font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="UPCOMING">Upcoming</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/admin/global-tournaments/${t.id}`} className="flex items-center gap-1.5 font-bold">
                      <Eye className="h-4 w-4" />
                      Leaderboard & Logs
                    </Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
