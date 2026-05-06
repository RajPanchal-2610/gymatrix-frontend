import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, ArrowLeft, Users, Play, CheckCircle2, Loader2, UserPlus, Trash2, Swords, Target, Timer, Crown, Medal, ArrowUp, ArrowDown, Shuffle, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { tournamentService } from '@/services/tournamentService';
import { supabase } from '@/lib/supabase';
import { useGym } from '@/hooks/useGym';
import type { TournamentDetail as TournamentDetailType, TournamentMatch, TournamentAttempt, LeaderboardEntry } from '@/types/tournament';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
  ONGOING: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  COMPLETED: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const TournamentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { gymId } = useGym();
  const [addParticipantsOpen, setAddParticipantsOpen] = useState(false);
  const [startDialogOpen, setStartDialogOpen] = useState(false);

  const { data: tournament, isLoading } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => tournamentService.getTournamentById(id!),
    enabled: !!id,
  });

  const generateMutation = useMutation({
    mutationFn: (options?: { seedingStrategy: 'RANDOM' | 'MANUAL'; orderedParticipantIds?: string[] }) => 
        tournamentService.generateStructure(id!, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
      toast.success('Tournament started! Structure generated.');
      setStartDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => tournamentService.finalizeTournament(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
      toast.success('Tournament finalized!');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeParticipantMutation = useMutation({
    mutationFn: (participantId: string) => tournamentService.removeParticipant(id!, participantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
      toast.success('Participant removed');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tournament) {
    return <div className="text-center py-20 text-muted-foreground">Tournament not found</div>;
  }

  const formatType = (tournament.format as any)?.type as string;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tournaments')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{tournament.name}</h1>
            <Badge className={statusColors[tournament.status]}>{tournament.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {(tournament.category as any)?.name} • {(tournament.format as any)?.name} •{' '}
            {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          {tournament.status === 'DRAFT' && (
            <>
              <Button variant="outline" onClick={() => setAddParticipantsOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" /> Add Participants
              </Button>
              <Button
                className="gradient-primary"
                onClick={() => setStartDialogOpen(true)}
                disabled={generateMutation.isPending || (tournament.participants?.length || 0) < 2}
              >
                {generateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Start Tournament
              </Button>
            </>
          )}
          {tournament.status === 'ONGOING' && (
            <Button onClick={() => finalizeMutation.mutate()} disabled={finalizeMutation.isPending}>
              {finalizeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Finalize
            </Button>
          )}
        </div>
      </div>

      {/* Winner Banner */}
      {tournament.status === 'COMPLETED' && tournament.winner && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-yellow-500/5">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="h-14 w-14 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Crown className="h-7 w-7 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-amber-500 font-medium uppercase tracking-wider">Tournament Winner</p>
              <h2 className="text-xl font-bold">{(tournament.winner as any)?.member?.full_name || 'TBD'}</h2>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue={formatType === 'KNOCKOUT' ? 'bracket' : 'results'}>
        <TabsList>
          {formatType === 'KNOCKOUT' && <TabsTrigger value="bracket"><Swords className="h-4 w-4 mr-1.5" />Bracket</TabsTrigger>}
          {formatType !== 'KNOCKOUT' && <TabsTrigger value="results"><Target className="h-4 w-4 mr-1.5" />Results</TabsTrigger>}
          {formatType !== 'KNOCKOUT' && <TabsTrigger value="leaderboard"><Medal className="h-4 w-4 mr-1.5" />Leaderboard</TabsTrigger>}
          <TabsTrigger value="participants"><Users className="h-4 w-4 mr-1.5" />Participants ({tournament.participants?.length || 0})</TabsTrigger>
        </TabsList>

        {formatType === 'KNOCKOUT' && (
          <TabsContent value="bracket">
            <BracketView matches={tournament.matches || []} tournamentId={id!} status={tournament.status} />
          </TabsContent>
        )}
        {formatType !== 'KNOCKOUT' && (
          <>
            <TabsContent value="results">
              <ScoreTableView attempts={tournament.attempts || []} tournamentId={id!} status={tournament.status} rules={tournament.rules} formatType={formatType} />
            </TabsContent>
            <TabsContent value="leaderboard">
              <LeaderboardView leaderboard={tournament.leaderboard || []} rules={tournament.rules} formatType={formatType} />
            </TabsContent>
          </>
        )}
        <TabsContent value="participants">
          <ParticipantsTable
            participants={tournament.participants || []}
            isDraft={tournament.status === 'DRAFT'}
            onRemove={(pid) => removeParticipantMutation.mutate(pid)}
          />
        </TabsContent>
      </Tabs>

      {/* Add Participants Dialog */}
      <AddParticipantsDialog
        open={addParticipantsOpen}
        onOpenChange={setAddParticipantsOpen}
        tournamentId={id!}
        gymId={gymId!}
        existingMemberIds={tournament.participants?.map((p) => p.member_id) || []}
      />

      {/* Start Tournament Dialog */}
      <StartTournamentDialog
        open={startDialogOpen}
        onOpenChange={setStartDialogOpen}
        participants={tournament.participants || []}
        onConfirm={(options) => generateMutation.mutate(options)}
        isPending={generateMutation.isPending}
        formatType={formatType}
      />
    </div>
  );
};

// ======== BRACKET VIEW ========
function BracketView({ matches, tournamentId, status }: { matches: TournamentMatch[]; tournamentId: string; status: string }) {
  const queryClient = useQueryClient();
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [winnerId, setWinnerId] = useState('');

  const submitMutation = useMutation({
    mutationFn: () => tournamentService.submitMatchResult(tournamentId, selectedMatch!.id, { winner_id: winnerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      toast.success('Match result recorded!');
      setSelectedMatch(null);
      setWinnerId('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rounds = new Map<number, TournamentMatch[]>();
  matches.forEach((m) => {
    if (!rounds.has(m.round_number)) rounds.set(m.round_number, []);
    rounds.get(m.round_number)!.push(m);
  });
  const totalRounds = rounds.size;
  const roundLabels = (round: number) => {
    if (round === totalRounds) return 'Final';
    if (round === totalRounds - 1) return 'Semi-Final';
    if (round === totalRounds - 2) return 'Quarter-Final';
    return `Round ${round}`;
  };

  if (matches.length === 0) {
    return <Card className="bg-sidebar/30 border-sidebar-border/50"><CardContent className="py-12 text-center text-muted-foreground">Start the tournament to generate the bracket.</CardContent></Card>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <div className="flex gap-8 min-w-max p-4">
          {Array.from(rounds.entries()).sort(([a], [b]) => a - b).map(([round, roundMatches]) => (
            <div key={round} className="flex flex-col gap-4 min-w-[240px]">
              <h3 className="text-sm font-semibold text-center text-muted-foreground uppercase tracking-wider mb-2">
                {roundLabels(round)}
              </h3>
              <div className="flex flex-col justify-around flex-1 gap-4">
                {roundMatches.sort((a, b) => a.match_number - b.match_number).map((match) => (
                  <Card
                    key={match.id}
                    className={`border transition-all ${match.status === 'PENDING' && match.participant1_id && match.participant2_id && status === 'ONGOING'
                      ? 'border-primary/50 hover:border-primary cursor-pointer' : 'border-sidebar-border/50'
                    } ${match.status === 'COMPLETED' ? 'opacity-80' : ''}`}
                    onClick={() => {
                      if (match.status === 'PENDING' && match.participant1_id && match.participant2_id && status === 'ONGOING') {
                        setSelectedMatch(match);
                      }
                    }}
                  >
                    <CardContent className="p-3 space-y-1.5">
                      <MatchSlot participant={match.participant1} isWinner={match.winner_id === match.participant1_id} score={match.participant1_score} />
                      <div className="border-t border-sidebar-border/30" />
                      <MatchSlot participant={match.participant2} isWinner={match.winner_id === match.participant2_id} score={match.participant2_score} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Winner Selection Dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={() => { setSelectedMatch(null); setWinnerId(''); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Winner</DialogTitle>
            <DialogDescription>Choose the winner of this match.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {[selectedMatch?.participant1, selectedMatch?.participant2].filter(Boolean).map((p: any) => (
              <Button
                key={p?.id}
                variant={winnerId === p?.id ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => setWinnerId(p?.id)}
              >
                {winnerId === p?.id && <CheckCircle2 className="h-4 w-4 mr-2" />}
                {p?.member?.full_name || 'TBD'}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMatch(null)}>Cancel</Button>
            <Button disabled={!winnerId || submitMutation.isPending} onClick={() => submitMutation.mutate()} className="gradient-primary">
              {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Winner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MatchSlot({ participant, isWinner, score }: { participant: any; isWinner: boolean; score: number | null }) {
  const name = participant?.member?.full_name || 'BYE';
  return (
    <div className={`flex items-center justify-between px-2 py-1.5 rounded text-sm ${isWinner ? 'bg-emerald-500/10 text-emerald-400 font-semibold' : ''}`}>
      <span className="truncate max-w-[150px]">{name}</span>
      <div className="flex items-center gap-2">
        {score !== null && score !== undefined && <span className="text-xs text-muted-foreground">{score}</span>}
        {isWinner && <Crown className="h-3.5 w-3.5 text-amber-500" />}
      </div>
    </div>
  );
}

// ======== SCORE TABLE VIEW ========
function ScoreTableView({ attempts, tournamentId, status, rules, formatType }: { attempts: TournamentAttempt[]; tournamentId: string; status: string; rules: any; formatType: string }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState('');

  const updateMutation = useMutation({
    mutationFn: ({ attemptId, score }: { attemptId: string; score: number }) =>
      tournamentService.updateAttempt(tournamentId, attemptId, { score, status: 'VALID' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      setEditingId(null);
      toast.success('Score saved');
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Group attempts by participant
  const grouped = new Map<string, { name: string; attempts: TournamentAttempt[] }>();
  attempts.forEach((a) => {
    const pid = a.participant_id;
    if (!grouped.has(pid)) {
      grouped.set(pid, { name: a.participant?.member?.full_name || 'Unknown', attempts: [] });
    }
    grouped.get(pid)!.attempts.push(a);
  });

  const unit = rules?.unit || (formatType === 'TIME_BASED' ? 'sec' : '');
  const maxAttempts = rules?.attempts || 3;

  if (attempts.length === 0) {
    return <Card className="bg-sidebar/30 border-sidebar-border/50"><CardContent className="py-12 text-center text-muted-foreground">Start the tournament to generate attempt entries.</CardContent></Card>;
  }

  return (
    <Card className="bg-sidebar/30 border-sidebar-border/50">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Participant</TableHead>
              {Array.from({ length: maxAttempts }, (_, i) => (
                <TableHead key={i} className="text-center">Attempt {i + 1} {unit && `(${unit})`}</TableHead>
              ))}
              <TableHead className="text-center">Best</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from(grouped.entries()).map(([pid, { name, attempts: pAttempts }]) => {
              const validScores = pAttempts.filter((a) => a.status === 'VALID' && a.score !== null).map((a) => a.score as number);
              const best = validScores.length > 0 ? Math.max(...validScores) : '-';
              return (
                <TableRow key={pid}>
                  <TableCell className="font-medium">{name}</TableCell>
                  {pAttempts.sort((a, b) => a.attempt_number - b.attempt_number).map((att) => (
                    <TableCell key={att.id} className="text-center">
                      {editingId === att.id ? (
                        <div className="flex items-center gap-1 justify-center">
                          <Input
                            type="number"
                            className="w-20 h-7 text-center text-xs"
                            value={editScore}
                            onChange={(e) => setEditScore(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') updateMutation.mutate({ attemptId: att.id, score: parseFloat(editScore) }); }}
                          />
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => updateMutation.mutate({ attemptId: att.id, score: parseFloat(editScore) })}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className={`cursor-pointer hover:text-primary transition-colors ${att.status === 'VALID' ? 'text-emerald-400 font-semibold' : 'text-muted-foreground'} ${status !== 'ONGOING' ? 'cursor-default' : ''}`}
                          onClick={() => {
                            if (status === 'ONGOING') {
                              setEditingId(att.id);
                              setEditScore(att.score?.toString() || '');
                            }
                          }}
                        >
                          {att.score !== null ? att.score : '—'}
                        </span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold text-primary">{best}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ======== LEADERBOARD VIEW ========
function LeaderboardView({ leaderboard, rules, formatType }: { leaderboard: LeaderboardEntry[]; rules: any; formatType: string }) {
  const unit = rules?.unit || (formatType === 'TIME_BASED' ? 'sec' : '');
  const medalColors = ['text-amber-400', 'text-zinc-300', 'text-orange-400'];

  if (leaderboard.length === 0) {
    return <Card className="bg-sidebar/30 border-sidebar-border/50"><CardContent className="py-12 text-center text-muted-foreground">No results available yet. Enter scores in the Results tab.</CardContent></Card>;
  }

  return (
    <div className="space-y-3">
      {leaderboard.map((entry, idx) => (
        <Card key={entry.participantId} className={`bg-sidebar/30 border-sidebar-border/50 ${idx < 3 ? 'border-amber-500/20' : ''}`}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg ${idx < 3 ? 'bg-amber-500/10' : 'bg-sidebar-accent'}`}>
              {idx < 3 ? <Medal className={`h-5 w-5 ${medalColors[idx]}`} /> : <span className="text-muted-foreground">{entry.rank}</span>}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{entry.memberName}</p>
              <p className="text-xs text-muted-foreground">
                {entry.attempts.length} valid attempt{entry.attempts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-primary">{entry.bestScore} <span className="text-xs text-muted-foreground">{unit}</span></p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Best Score</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ======== PARTICIPANTS TABLE ========
function ParticipantsTable({ participants, isDraft, onRemove }: { participants: any[]; isDraft: boolean; onRemove: (id: string) => void }) {
  return (
    <Card className="bg-sidebar/30 border-sidebar-border/50">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Joined</TableHead>
              {isDraft && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No participants yet</TableCell></TableRow>
            ) : participants.map((p, idx) => (
              <TableRow key={p.id}>
                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                <TableCell className="font-medium">{p.member?.full_name || 'Unknown'}</TableCell>
                <TableCell className="text-muted-foreground">{p.member?.phone || '-'}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{new Date(p.joined_at).toLocaleDateString()}</TableCell>
                {isDraft && (
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => onRemove(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ======== ADD PARTICIPANTS DIALOG ========
function AddParticipantsDialog({ open, onOpenChange, tournamentId, gymId, existingMemberIds }: { open: boolean; onOpenChange: (v: boolean) => void; tournamentId: string; gymId: number; existingMemberIds: number[] }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['gymMembers', gymId],
    queryFn: async () => {
      const { data, error } = await supabase.from('gym_members').select('id, full_name, phone').eq('gym_id', gymId).eq('status', 'active').order('full_name');
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!gymId,
  });

  const availableMembers = members.filter((m: any) => !existingMemberIds.includes(m.id));

  const addMutation = useMutation({
    mutationFn: () => tournamentService.addParticipants(tournamentId, selected),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      toast.success(`${selected.length} participant(s) added`);
      setSelected([]);
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMember = (id: number) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Participants</DialogTitle>
          <DialogDescription>Select members to add to this tournament.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh]">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : availableMembers.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No available members to add.</p>
          ) : (
            <div className="space-y-1">
              {availableMembers.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sidebar-accent cursor-pointer" onClick={() => toggleMember(m.id)}>
                  <Checkbox checked={selected.includes(m.id)} />
                  <div>
                    <p className="text-sm font-medium">{m.full_name}</p>
                    <p className="text-xs text-muted-foreground">{m.phone || 'No phone'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={selected.length === 0 || addMutation.isPending} onClick={() => addMutation.mutate()} className="gradient-primary">
            {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add {selected.length} Member{selected.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ======== START TOURNAMENT DIALOG ========
function StartTournamentDialog({ open, onOpenChange, participants, onConfirm, isPending, formatType }: { open: boolean; onOpenChange: (v: boolean) => void; participants: any[]; onConfirm: (options: { seedingStrategy: 'RANDOM' | 'MANUAL'; orderedParticipantIds?: string[] }) => void; isPending: boolean; formatType: string; }) {
  const [strategy, setStrategy] = useState<'RANDOM' | 'MANUAL'>('RANDOM');
  const [ordered, setOrdered] = useState<any[]>([]);

  // Initialize order when opened
  React.useEffect(() => {
    if (open) setOrdered([...participants]);
  }, [open, participants]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...ordered];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setOrdered(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === ordered.length - 1) return;
    const newOrder = [...ordered];
    [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    setOrdered(newOrder);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Start Tournament</DialogTitle>
          <DialogDescription>
            {formatType === 'KNOCKOUT' 
              ? 'Choose how you want to match up the participants.' 
              : 'Choose how the participants should be ordered for their attempts.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 my-4">
          <Card 
            className={`cursor-pointer transition-all ${strategy === 'RANDOM' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
            onClick={() => setStrategy('RANDOM')}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
              <Shuffle className={`h-8 w-8 ${strategy === 'RANDOM' ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <p className="font-semibold">Random</p>
                <p className="text-xs text-muted-foreground">Fair & unbiased</p>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${strategy === 'MANUAL' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
            onClick={() => setStrategy('MANUAL')}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
              <Settings2 className={`h-8 w-8 ${strategy === 'MANUAL' ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <p className="font-semibold">Manual</p>
                <p className="text-xs text-muted-foreground">You choose</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {strategy === 'MANUAL' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <h4 className="text-sm font-semibold mb-2">Participant Order</h4>
            {formatType === 'KNOCKOUT' && (
              <p className="text-xs text-muted-foreground mb-3">
                Participants will be matched sequentially: #1 vs #2, #3 vs #4, etc.
              </p>
            )}
            <ScrollArea className="flex-1 border rounded-md">
              <div className="p-2 space-y-1">
                {ordered.map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded bg-sidebar/50 border border-sidebar-border/50">
                    <div className="w-6 text-center text-xs font-bold text-muted-foreground">{idx + 1}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{p.member?.full_name || 'Unknown'}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveUp(idx)} disabled={idx === 0}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveDown(idx)} disabled={idx === ordered.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            disabled={isPending} 
            onClick={() => onConfirm({ 
              seedingStrategy: strategy, 
              orderedParticipantIds: strategy === 'MANUAL' ? ordered.map(p => p.id) : undefined 
            })} 
            className="gradient-primary"
          >
            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Generate & Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TournamentDetailPage;
