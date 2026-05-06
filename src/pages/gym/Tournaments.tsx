import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Trophy,
  Plus,
  Calendar,
  Users,
  Swords,
  Timer,
  Target,
  ChevronRight,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { tournamentService } from '@/services/tournamentService';
import type { Tournament, TournamentMasterData, TournamentFormat } from '@/types/tournament';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  ONGOING: { label: 'Ongoing', variant: 'default' },
  COMPLETED: { label: 'Completed', variant: 'outline' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
};

const formatIcons: Record<string, React.ElementType> = {
  SCORE_BASED: Target,
  TIME_BASED: Timer,
  KNOCKOUT: Swords,
};

const Tournaments = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch tournaments
  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => tournamentService.getTournaments(),
  });

  // Fetch master data for create dialog
  const { data: masterData } = useQuery({
    queryKey: ['tournamentMasterData'],
    queryFn: () => tournamentService.getMasterData(),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => tournamentService.deleteTournament(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      toast.success('Tournament deleted');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredTournaments = filterStatus === 'all'
    ? tournaments
    : tournaments.filter((t: Tournament) => t.status === filterStatus);

  // Stats
  const stats = [
    {
      title: 'Total Tournaments',
      value: tournaments.length,
      icon: Trophy,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      title: 'Active Now',
      value: tournaments.filter((t: Tournament) => t.status === 'ONGOING').length,
      icon: Swords,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      title: 'Completed',
      value: tournaments.filter((t: Tournament) => t.status === 'COMPLETED').length,
      icon: Target,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Total Participants',
      value: tournaments.reduce((sum: number, t: Tournament) => sum + (t.participant_count || 0), 0),
      icon: Users,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-500" />
            Tournaments
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage gym competitions, challenges, and knockout events.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="gradient-primary shadow-glow"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Tournament
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="bg-sidebar/30 backdrop-blur-sm border-sidebar-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{stat.title}</p>
                  <h3 className="text-2xl font-bold mt-1">{isLoading ? '...' : stat.value}</h3>
                </div>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Filter:</span>
        {['all', 'DRAFT', 'ONGOING', 'COMPLETED', 'CANCELLED'].map((s) => (
          <Button
            key={s}
            variant={filterStatus === s ? 'default' : 'outline'}
            size="sm"
            className="text-xs"
            onClick={() => setFilterStatus(s)}
          >
            {s === 'all' ? 'All' : statusConfig[s]?.label}
          </Button>
        ))}
      </div>

      {/* Tournament Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTournaments.length === 0 ? (
        <Card className="bg-sidebar/30 backdrop-blur-sm border-sidebar-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Trophy className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">No tournaments found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {filterStatus !== 'all' ? 'Try a different filter or ' : ''}Create your first tournament to get started!
            </p>
            <Button className="mt-4 gradient-primary" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Tournament
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTournaments.map((tournament: Tournament) => {
            const FormatIcon = formatIcons[(tournament.format as any)?.type] || Target;
            const config = statusConfig[tournament.status];
            return (
              <Card
                key={tournament.id}
                className="bg-sidebar/30 backdrop-blur-sm border-sidebar-border/50 hover:border-primary/50 transition-all cursor-pointer group"
                onClick={() => navigate(`/tournaments/${tournament.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <FormatIcon className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base truncate max-w-[180px]">
                          {tournament.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {(tournament.category as any)?.name}
                        </p>
                      </div>
                    </div>
                    <Badge variant={config?.variant}>{config?.label}</Badge>
                  </div>

                  {tournament.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {tournament.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(tournament.start_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {tournament.participant_count || 0} participants
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-sidebar-border/50">
                    <Badge variant="outline" className="text-[10px] px-2 py-0">
                      {(tournament.format as any)?.name}
                    </Badge>
                    <div className="flex-1" />
                    <span className="text-xs text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                      View Details
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Tournament Dialog */}
      <CreateTournamentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        masterData={masterData}
      />
    </div>
  );
};

// =========================================
// Create Tournament Dialog
// =========================================
function CreateTournamentDialog({
  open,
  onOpenChange,
  masterData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  masterData?: TournamentMasterData;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    category_id: '',
    format_id: '',
    attempts: 3,
    unit: 'kg',
    time_limit_seconds: 60,
    measurement: 'time',
  });

  const selectedFormat = masterData?.formats.find((f) => f.id === formData.format_id);
  const allowedFormatIds = formData.category_id
    ? masterData?.categoryFormats[formData.category_id] || []
    : [];
  const allowedFormats = masterData?.formats.filter((f) => allowedFormatIds.includes(f.id)) || [];

  const createMutation = useMutation({
    mutationFn: () => {
      const rules: Record<string, any> = {};
      if (selectedFormat?.type === 'SCORE_BASED') {
        rules.attempts = formData.attempts;
        rules.unit = formData.unit;
      } else if (selectedFormat?.type === 'TIME_BASED') {
        rules.attempts = formData.attempts;
        rules.time_limit_seconds = formData.time_limit_seconds;
        rules.measurement = formData.measurement;
      } else if (selectedFormat?.type === 'KNOCKOUT') {
        // Knockout doesn't need extra rules; bracket is auto-generated
      }
      return tournamentService.createTournament({
        name: formData.name,
        description: formData.description || undefined,
        start_date: formData.start_date,
        end_date: formData.end_date,
        category_id: formData.category_id,
        format_id: formData.format_id,
        rules,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      toast.success('Tournament created successfully!');
      onOpenChange(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setFormData({
      name: '', description: '', start_date: '', end_date: '',
      category_id: '', format_id: '', attempts: 3, unit: 'kg',
      time_limit_seconds: 60, measurement: 'time',
    });
  };

  const canSubmit =
    formData.name && formData.start_date && formData.end_date &&
    formData.category_id && formData.format_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Create Tournament
          </DialogTitle>
          <DialogDescription>
            Set up a new competition for your gym members.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="tourney-name">Tournament Name *</Label>
              <Input
                id="tourney-name"
                placeholder="e.g., Summer Deadlift Championship"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="tourney-desc">Description</Label>
              <Textarea
                id="tourney-desc"
                placeholder="Describe the tournament..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date *</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(val) =>
                  setFormData({ ...formData, category_id: val, format_id: '' })
                }
              >
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {masterData?.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Format (filtered by category) */}
            <div className="space-y-2">
              <Label>Format *</Label>
              <Select
                value={formData.format_id}
                onValueChange={(val) => setFormData({ ...formData, format_id: val })}
                disabled={!formData.category_id}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      formData.category_id
                        ? 'Select format'
                        : 'Select a category first'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {allowedFormats.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic Rules */}
            {selectedFormat?.type === 'SCORE_BASED' && (
              <Card className="border-dashed">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Score-Based Rules</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Attempts</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={formData.attempts}
                        onChange={(e) =>
                          setFormData({ ...formData, attempts: parseInt(e.target.value) || 3 })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unit</Label>
                      <Select
                        value={formData.unit}
                        onValueChange={(val) => setFormData({ ...formData, unit: val })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">Kilograms (kg)</SelectItem>
                          <SelectItem value="reps">Reps</SelectItem>
                          <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedFormat?.type === 'TIME_BASED' && (
              <Card className="border-dashed">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Time-Based Rules</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Time Limit (seconds)</Label>
                      <Input
                        type="number"
                        min={10}
                        value={formData.time_limit_seconds}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            time_limit_seconds: parseInt(e.target.value) || 60,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Attempts</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={formData.attempts}
                        onChange={(e) =>
                          setFormData({ ...formData, attempts: parseInt(e.target.value) || 1 })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedFormat?.type === 'KNOCKOUT' && (
              <Card className="border-dashed">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-muted-foreground">Knockout Format</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The bracket will be auto-generated based on the number of participants you add.
                    Byes are handled automatically.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit || createMutation.isPending}
            className="gradient-primary"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Tournament
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Tournaments;
