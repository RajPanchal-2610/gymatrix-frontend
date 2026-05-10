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
import { Label } from '@/components/ui/label';
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
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [winnerId, setWinnerId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('bracket');
  const hasInitializedTab = React.useRef(false);
  const [tieDetails, setTieDetails] = useState<{ groupLabel: string; tiedPlayers: { id: string; name: string }[]; playersToAdvance: number } | null>(null);
  const [tieBreakerDialogOpen, setTieBreakerDialogOpen] = useState(false);

  const { data: tournament, isLoading } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => tournamentService.getTournamentById(id!),
    enabled: !!id,
  });

  // Handle default tab initialization (once)
  React.useEffect(() => {
    if (tournament && !hasInitializedTab.current) {
      const type = (tournament.format as any)?.type;
      const name = (tournament.format as any)?.name;
      
      if (name === 'Group Stage + Knockout') {
        // If we have knockout matches already, maybe go to bracket, 
        // but usually people want to see groups first or where they left off.
        // If there are NO knockout matches, definitely go to groups.
        const hasKnockout = tournament.matches?.some(m => m.phase === 'KNOCKOUT');
        setActiveTab(hasKnockout ? 'bracket' : 'groups');
      } else {
        setActiveTab(type === 'KNOCKOUT' ? 'bracket' : 'results');
      }
      hasInitializedTab.current = true;
    }
  }, [tournament]);

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

  const submitMatchResultMutation = useMutation({
    mutationFn: () => tournamentService.submitMatchResult(id!, selectedMatch!.id, { winner_id: winnerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
      toast.success('Match result recorded!');
      setSelectedMatch(null);
      setWinnerId('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const advanceMutation = useMutation({
    mutationFn: () => tournamentService.advanceTournamentPhase(id!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
      if (data.tieDetected) {
        setTieDetails({
          groupLabel: data.groupLabel,
          tiedPlayers: data.tiedPlayers,
          playersToAdvance: data.playersToAdvance
        });
        setTieBreakerDialogOpen(true);
        toast.info(`Tie detected in ${data.groupLabel}. Please select a resolution strategy.`);
      } else {
        toast.success('Final rounds generated!');
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resolveTieBreakerMutation = useMutation({
    mutationFn: (strategy: 'STEPLADDER' | 'MINI_LEAGUE') => 
      tournamentService.resolveTieBreaker(id!, {
        groupLabel: tieDetails!.groupLabel,
        participantIds: tieDetails!.tiedPlayers.map(p => p.id),
        strategy
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
      toast.success('Tie-breaker matches generated!');
      setTieBreakerDialogOpen(false);
      setTieDetails(null);
    },
    onError: (err: any) => toast.error(err.message),
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
  const formatName = (tournament.format as any)?.name as string;

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
            <>
              {formatName === 'Group Stage + Knockout' && !tournament.matches?.some(m => m.phase === 'KNOCKOUT') && (
                <Button
                  className="gradient-primary"
                  onClick={() => advanceMutation.mutate()}
                  disabled={advanceMutation.isPending}
                >
                  {advanceMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Swords className="h-4 w-4 mr-2" />}
                  Finalize Groups & Create Final Rounds
                </Button>
              )}
              <Button variant="outline" onClick={() => finalizeMutation.mutate()} disabled={finalizeMutation.isPending}>
                {finalizeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Finalize Tournament
              </Button>
            </>
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

      {/* Filter Bar */}
      {tournament.status !== 'DRAFT' && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            placeholder="Filter by participant name..."
            className="pl-10 bg-sidebar/20 border-sidebar-border/40 focus:ring-primary/20 h-10 shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
            >
              <span className="text-[10px] font-bold uppercase bg-sidebar-accent px-1.5 py-0.5 rounded border border-sidebar-border/50">Clear</span>
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="bg-sidebar/30 border-sidebar-border/50 p-1 mb-6">
          {formatName === 'Group Stage + Knockout' && (
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Group Stage
            </TabsTrigger>
          )}
          {formatType === 'KNOCKOUT' && (
            <TabsTrigger value="bracket" className="flex items-center gap-2">
              <Swords className="h-4 w-4" /> Final Elimination Rounds
            </TabsTrigger>
          )}
          {formatType !== 'KNOCKOUT' && <TabsTrigger value="results"><Target className="h-4 w-4 mr-1.5" />Results</TabsTrigger>}
          {formatType !== 'KNOCKOUT' && <TabsTrigger value="leaderboard"><Medal className="h-4 w-4 mr-1.5" />Leaderboard</TabsTrigger>}
          <TabsTrigger value="participants"><Users className="h-4 w-4 mr-1.5" />Participants ({tournament.participants?.length || 0})</TabsTrigger>
        </TabsList>

        {formatName === 'Group Stage + Knockout' && (
          <TabsContent value="groups">
            <GroupStageView
              matches={tournament.matches?.filter(m => m.phase === 'GROUP' || m.phase === 'TIE_BREAKER') || []}
              onSelectMatch={setSelectedMatch}
              status={tournament.status}
              searchTerm={searchTerm}
            />
          </TabsContent>
        )}
        {formatType === 'KNOCKOUT' && (
          <TabsContent value="bracket">
            <BracketView
              matches={tournament.matches?.filter(m => m.phase === 'KNOCKOUT') || []}
              tournamentId={id!}
              status={tournament.status}
              onSelectMatch={setSelectedMatch}
              searchTerm={searchTerm}
            />
          </TabsContent>
        )}
        {formatType !== 'KNOCKOUT' && (
          <>
            <TabsContent value="results">
              <ScoreTableView 
                attempts={tournament.attempts || []} 
                tournamentId={id!} 
                status={tournament.status} 
                rules={tournament.rules} 
                formatType={formatType} 
                searchTerm={searchTerm}
              />
            </TabsContent>
            <TabsContent value="leaderboard">
              <LeaderboardView 
                leaderboard={tournament.leaderboard || []} 
                rules={tournament.rules} 
                formatType={formatType} 
                searchTerm={searchTerm}
              />
            </TabsContent>
          </>
        )}
        <TabsContent value="participants">
          <ParticipantsTable
            participants={tournament.participants || []}
            isDraft={tournament.status === 'DRAFT'}
            onRemove={(pid) => removeParticipantMutation.mutate(pid)}
            onSelectParticipant={(name) => {
              setSearchTerm(name);
              // Switch to appropriate match tab
              if (formatName === 'Group Stage + Knockout') {
                setActiveTab('groups');
              } else if (formatType === 'KNOCKOUT') {
                setActiveTab('bracket');
              } else {
                setActiveTab('results');
              }
            }}
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
        formatName={formatName}
        rules={tournament.rules}
      />

      {/* Match Result Dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={() => { setSelectedMatch(null); setWinnerId(''); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Match Result</DialogTitle>
            <DialogDescription>Select the winner of this match.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {[selectedMatch?.participant1, selectedMatch?.participant2].filter(Boolean).map((p: any) => (
              <Button
                key={p?.id}
                variant={winnerId === p?.id ? 'default' : 'outline'}
                className={`w-full justify-start h-12 ${winnerId === p?.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setWinnerId(p?.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${winnerId === p?.id ? 'bg-white' : 'bg-primary/40'}`} />
                    <span className="font-medium">{p?.external_name || p?.member?.full_name}</span>
                  </div>
                  {winnerId === p?.id && <CheckCircle2 className="h-4 w-4" />}
                </div>
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMatch(null)}>Cancel</Button>
            <Button
              disabled={!winnerId || submitMatchResultMutation.isPending}
              onClick={() => submitMatchResultMutation.mutate()}
              className="gradient-primary"
            >
              {submitMatchResultMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tie Breaker Dialog */}
      {tieDetails && (
        <TieBreakerDialog
          open={tieBreakerDialogOpen}
          onOpenChange={setTieBreakerDialogOpen}
          groupLabel={tieDetails.groupLabel}
          players={tieDetails.tiedPlayers}
          onConfirm={(strategy) => resolveTieBreakerMutation.mutate(strategy)}
          isPending={resolveTieBreakerMutation.isPending}
        />
      )}
    </div>
  );
};

function BracketView({
  matches,
  status,
  onSelectMatch,
  searchTerm
}: {
  matches: TournamentMatch[];
  tournamentId: string;
  status: string;
  onSelectMatch: (m: TournamentMatch) => void;
  searchTerm?: string;
}) {
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
    return (
      <Card className="bg-sidebar/30 border-sidebar-border/50 backdrop-blur-sm shadow-inner">
        <CardContent className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
          <Trophy className="h-10 w-10 opacity-20" />
          <p className="font-medium">No knockout matches yet. Complete the group stage to advance participants!</p>
        </CardContent>
      </Card>
    );
  }

  const sortedRounds = Array.from(rounds.entries()).sort(([a], [b]) => a - b);

  return (
    <>
      <div className="relative overflow-x-auto pb-8 pt-4">
        <div className="flex gap-12 min-w-max px-4">
          {sortedRounds.map(([round, roundMatches], roundIdx) => (
            <div key={round} className="flex flex-col min-w-[280px]">
              {/* Round Header */}
              <div className="text-center mb-8 relative">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                    {roundLabels(round)}
                  </span>
                </div>
                {roundIdx < sortedRounds.length - 1 && (
                  <div className="absolute top-1/2 -right-6 w-12 h-px bg-gradient-to-r from-border to-transparent z-0" />
                )}
              </div>

              {/* Matches Container */}
              <div
                className="flex flex-col justify-center flex-1 relative py-4"
                style={{
                  gap: `${(Math.pow(2, roundIdx) * (8.5 + 3)) - 8.5}rem`
                }}
              >
                {roundMatches.sort((a, b) => a.match_number - b.match_number).map((match, matchIdx) => {
                  const isEven = matchIdx % 2 === 0;

                  // Highlight logic
                  const isHighlighted = searchTerm && (
                    (match.participant1?.external_name || match.participant1?.member?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (match.participant2?.external_name || match.participant2?.member?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
                  );

                  // Calculate dynamic connector height based on round
                  const centerDistance = Math.pow(2, roundIdx) * (8.5 + 3);
                  const connectorHeight = centerDistance / 2;

                  return (
                    <div key={match.id} className="relative group/match">
                      {/* Bracket Connectors */}
                      {roundIdx < sortedRounds.length - 1 && (
                        <>
                          {/* Horizontal line out of the match */}
                          <div className={`absolute top-1/2 -right-6 w-6 h-0.5 bg-sidebar-border/80 transition-all duration-300 group-hover/match:bg-primary ${match.status === 'COMPLETED' ? 'bg-primary/40' : ''} ${isHighlighted ? 'bg-primary h-[3px]' : ''}`} />

                          {/* Vertical line connecting to the pair's center */}
                          <div
                            className={`absolute w-0.5 bg-sidebar-border/80 transition-all duration-300 group-hover/match:bg-primary ${match.status === 'COMPLETED' ? 'bg-primary/40' : ''} -right-6 ${isHighlighted ? 'bg-primary w-[3px]' : ''}`}
                            style={{
                              height: `calc(${connectorHeight}rem + 2px)`,
                              [isEven ? 'top' : 'bottom']: '50%'
                            }}
                          />

                          {/* Horizontal line into the next round match */}
                          {isEven && (
                            <div
                              className={`absolute -right-12 w-6 h-0.5 bg-sidebar-border/80 transition-all duration-300 group-hover/match:bg-primary ${isHighlighted ? 'bg-primary h-[3px]' : ''}`}
                              style={{ top: `calc(100% + ${(centerDistance - 8.5) / 2}rem)` }}
                            />
                          )}
                        </>
                      )}

                      <Card
                        className={`relative overflow-hidden transition-all duration-300 border-sidebar-border/50 bg-card/40 backdrop-blur-md shadow-lg hover:shadow-xl hover:-translate-y-0.5 h-[136px] w-full
                          ${match.status === 'PENDING' && status === 'ONGOING' ? 'ring-1 ring-primary/20 hover:ring-primary/50 cursor-pointer' : ''}
                          ${match.status === 'COMPLETED' ? 'bg-secondary/10' : ''}
                          ${isHighlighted ? 'ring-2 ring-primary border-primary shadow-[0_0_20px_rgba(255,191,0,0.15)] z-10 scale-[1.02]' : ''}
                        `}
                        onClick={() => {
                          if (match.status === 'PENDING' && status === 'ONGOING') {
                            onSelectMatch(match);
                          }
                        }}
                      >
                        {/* Status Indicator */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${match.status === 'COMPLETED' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-primary/20'} ${isHighlighted ? 'w-2' : ''}`} />

                        <CardContent className="p-0 h-full">
                          <div className="p-4 h-full flex flex-col justify-between">
                            <MatchSlot
                              participant={match.participant1}
                              isWinner={!!match.winner_id && match.winner_id === match.participant1_id}
                              score={match.participant1_score}
                              emptyLabel={match.status === 'COMPLETED' ? 'BYE' : (match.round_number === 1 ? 'BYE' : 'TBC')}
                            />

                            {/* Vs Divider */}
                            <div className="relative flex items-center justify-center py-1">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-sidebar-border/30"></div>
                              </div>
                              <div className="relative bg-background/80 backdrop-blur-sm px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                                Vs
                              </div>
                            </div>

                            <MatchSlot
                              participant={match.participant2}
                              isWinner={!!match.winner_id && match.winner_id === match.participant2_id}
                              score={match.participant2_score}
                              emptyLabel={match.status === 'COMPLETED' ? 'BYE' : (match.round_number === 1 ? 'BYE' : 'TBC')}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Match Number Bubble */}
                      <div className={`absolute -left-2 -top-2 h-6 w-6 rounded-full bg-sidebar-border border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground shadow-md z-20 group-hover/match:border-primary group-hover/match:scale-110 transition-all ${isHighlighted ? 'bg-primary text-primary-foreground border-primary' : ''}`}>
                        {match.match_number}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function MatchSlot({ participant, isWinner, score, emptyLabel = 'TBD' }: { participant: any; isWinner: boolean; score: number | null; emptyLabel?: string }) {
  const name = participant?.external_name || participant?.member?.full_name || emptyLabel;

  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors
      ${isWinner ? 'bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20' : 'hover:bg-sidebar/40'}
      ${!participant ? 'opacity-50 italic text-muted-foreground' : ''}
    `}>
      <div className="flex items-center gap-2 overflow-hidden">
        <div className={`w-1.5 h-1.5 rounded-full ${isWinner ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-sidebar-border'}`} />
        <span className="truncate font-medium text-xs">
          {name}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {score !== null && score !== undefined && (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-bold border-emerald-500/20 text-emerald-500 bg-emerald-500/5">
            {score}
          </Badge>
        )}
        {isWinner && (
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
            <Crown className="h-3 w-3 text-amber-500" />
          </div>
        )}
      </div>
    </div>
  );
}

function GroupStageView({
  matches,
  onSelectMatch,
  status,
  searchTerm
}: {
  matches: TournamentMatch[];
  onSelectMatch: (m: TournamentMatch) => void;
  status: string;
  searchTerm?: string;
}) {
  const filteredMatches = matches.filter(m => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    const p1Name = (m.participant1?.external_name || m.participant1?.member?.full_name || '').toLowerCase();
    const p2Name = (m.participant2?.external_name || m.participant2?.member?.full_name || '').toLowerCase();
    return p1Name.includes(s) || p2Name.includes(s);
  });

  const groups = new Map<string, TournamentMatch[]>();
  filteredMatches.forEach((m) => {
    const label = m.group_label || 'Other';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(m);
  });

  if (matches.length === 0) {
    return (
      <Card className="bg-sidebar/30 border-sidebar-border/50 backdrop-blur-sm shadow-inner">
        <CardContent className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
          <Users className="h-10 w-10 opacity-20" />
          <p className="font-medium">No group matches found.</p>
        </CardContent>
      </Card>
    );
  }

  if (filteredMatches.length === 0 && searchTerm) {
    return (
      <Card className="bg-sidebar/30 border-sidebar-border/50 backdrop-blur-sm shadow-inner">
        <CardContent className="py-12 text-center text-muted-foreground">
          No matches found for "{searchTerm}"
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {Array.from(groups.entries()).sort().map(([label, groupMatches]) => {
        const regularMatches = groupMatches.filter(m => m.phase === 'GROUP');
        const tieBreakerMatches = groupMatches.filter(m => m.phase === 'TIE_BREAKER');

        return (
          <Card key={label} className="bg-sidebar/30 border-sidebar-border/50 overflow-hidden shadow-xl">
            <CardHeader className="bg-primary/5 py-4 border-b border-sidebar-border/50">
              <CardTitle className="text-sm font-bold tracking-[0.2em] uppercase text-primary flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {regularMatches.map((match) => {
                  const canSelectWinner = match.status === 'PENDING' && status === 'ONGOING';
                  return (
                    <Card
                      key={match.id}
                      className={`relative overflow-hidden transition-all duration-300 border-sidebar-border/30 bg-card/40 backdrop-blur-md
                        ${canSelectWinner ? 'hover:border-primary/50 cursor-pointer hover:shadow-lg' : ''}
                        ${match.status === 'COMPLETED' ? 'bg-secondary/5' : ''}
                      `}
                      onClick={() => canSelectWinner && onSelectMatch(match)}
                    >
                      <CardContent className="p-4 space-y-2">
                        <MatchSlot
                          participant={match.participant1}
                          isWinner={!!match.winner_id && match.winner_id === match.participant1_id}
                          score={match.participant1_score}
                        />
                        <div className="relative flex items-center justify-center py-1">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-sidebar-border/20"></div>
                          </div>
                          <span className="relative bg-background/50 backdrop-blur-sm px-2 text-[9px] font-black text-muted-foreground uppercase">VS</span>
                        </div>
                        <MatchSlot
                          participant={match.participant2}
                          isWinner={!!match.winner_id && match.winner_id === match.participant2_id}
                          score={match.participant2_score}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {tieBreakerMatches.length > 0 && (
                <div className="mt-8 pt-6 border-t border-sidebar-border/30">
                  {Array.from(tieBreakerMatches.reduce((acc, m) => {
                    if (!acc.has(m.round_number)) acc.set(m.round_number, []);
                    acc.get(m.round_number)!.push(m);
                    return acc;
                  }, new Map<number, TournamentMatch[]>()).entries()).sort(([a], [b]) => b - a).map(([round, matches]) => (
                    <div key={round} className="mb-8 last:mb-0">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-1 rounded bg-amber-500/10">
                          <Swords className="h-4 w-4 text-amber-500" />
                        </div>
                        <div>
                          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/80">Tie-Breaker Phase</h5>
                          <h4 className="text-sm font-bold">Round {round}</h4>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {matches.map((match) => {
                          const canSelectWinner = match.status === 'PENDING' && status === 'ONGOING';
                          return (
                            <Card
                              key={match.id}
                              className={`relative overflow-hidden transition-all duration-300 border-amber-500/20 bg-amber-500/5 backdrop-blur-md
                                ${canSelectWinner ? 'hover:border-amber-500/50 cursor-pointer hover:shadow-lg' : ''}
                                ${match.status === 'COMPLETED' ? 'bg-amber-500/10 opacity-80' : ''}
                              `}
                              onClick={() => canSelectWinner && onSelectMatch(match)}
                            >
                              <CardContent className="p-4 space-y-2">
                                <MatchSlot
                                  participant={match.participant1}
                                  isWinner={!!match.winner_id && match.winner_id === match.participant1_id}
                                  score={match.participant1_score}
                                />
                                <div className="relative flex items-center justify-center py-1">
                                  <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-amber-500/20"></div>
                                  </div>
                                  <span className="relative bg-amber-500/10 backdrop-blur-sm px-2 text-[8px] font-black text-amber-600 uppercase italic rounded border border-amber-500/20">TIE BREAKER</span>
                                </div>
                                <MatchSlot
                                  participant={match.participant2}
                                  isWinner={!!match.winner_id && match.winner_id === match.participant2_id}
                                  score={match.participant2_score}
                                />
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ======== SCORE TABLE VIEW ========
function ScoreTableView({ attempts, tournamentId, status, rules, formatType, searchTerm }: { attempts: TournamentAttempt[]; tournamentId: string; status: string; rules: any; formatType: string; searchTerm?: string }) {
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
      const name = a.participant?.external_name || a.participant?.member?.full_name || 'Unknown';
      grouped.set(pid, { name, attempts: [] });
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
            {Array.from(grouped.entries())
              .filter(([_, { name }]) => !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(([pid, { name, attempts: pAttempts }]) => {
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
            {searchTerm && Array.from(grouped.entries()).filter(([_, { name }]) => name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
              <TableRow><TableCell colSpan={maxAttempts + 2} className="text-center py-8 text-muted-foreground">No participants found matching "{searchTerm}"</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ======== LEADERBOARD VIEW ========
function LeaderboardView({ leaderboard, rules, formatType, searchTerm }: { leaderboard: LeaderboardEntry[]; rules: any; formatType: string; searchTerm?: string }) {
  const unit = rules?.unit || (formatType === 'TIME_BASED' ? 'sec' : '');
  const medalColors = ['text-amber-400', 'text-zinc-300', 'text-orange-400'];

  const filtered = leaderboard.filter(e => !searchTerm || e.memberName.toLowerCase().includes(searchTerm.toLowerCase()));

  if (leaderboard.length === 0) {
    return <Card className="bg-sidebar/30 border-sidebar-border/50"><CardContent className="py-12 text-center text-muted-foreground">No results available yet. Enter scores in the Results tab.</CardContent></Card>;
  }

  if (filtered.length === 0 && searchTerm) {
    return <Card className="bg-sidebar/30 border-sidebar-border/50"><CardContent className="py-12 text-center text-muted-foreground">No results found for "{searchTerm}"</CardContent></Card>;
  }

  return (
    <div className="space-y-3">
      {filtered.map((entry, idx) => (
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
function ParticipantsTable({ participants, isDraft, onRemove, onSelectParticipant }: { participants: any[]; isDraft: boolean; onRemove: (id: string) => void; onSelectParticipant: (name: string) => void }) {
  return (
    <Card className="bg-sidebar/30 border-sidebar-border/50">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Participant</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Phone / Contact</TableHead>
              <TableHead>Joined</TableHead>
              {isDraft && <TableHead className="w-10 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No participants yet</TableCell></TableRow>
            ) : participants.map((p, idx) => {
              const name = p.external_name || p.member?.full_name || 'Unknown';
              const contact = p.external_contact || p.member?.phone || '-';
              const isExternal = !!p.external_name;

              return (
                <TableRow key={p.id}>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell>
                    <div 
                      className="flex items-center gap-2 cursor-pointer group/name"
                      onClick={() => onSelectParticipant(name)}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${isExternal ? 'bg-amber-500/10 text-amber-500 group-hover/name:bg-amber-500 group-hover/name:text-white' : 'bg-primary/10 text-primary group-hover/name:bg-primary group-hover/name:text-primary-foreground'}`}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium group-hover/name:text-primary transition-colors">{name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isExternal ? "outline" : "secondary"} className="text-[10px] uppercase tracking-wider h-5">
                      {isExternal ? 'External' : 'Member'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{contact}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(p.joined_at).toLocaleDateString()}</TableCell>
                  {isDraft && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => onRemove(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
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
  const [externalParticipants, setExternalParticipants] = useState<{ name: string; contact: string }[]>([]);
  const [newExternal, setNewExternal] = useState({ name: '', contact: '' });
  const [activeTab, setActiveTab] = useState('members');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['gymMembers', gymId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gym_members')
        .select('id, full_name, phone')
        .eq('gym_id', gymId)
        .ilike('status', 'active')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!gymId,
  });

  const availableMembers = members.filter((m: any) => !existingMemberIds.includes(m.id));

  const addMutation = useMutation({
    mutationFn: () => tournamentService.addParticipants(
      tournamentId, 
      selected, 
      externalParticipants.length > 0 ? externalParticipants : undefined
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      toast.success('Participants added successfully');
      setSelected([]);
      setExternalParticipants([]);
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMember = (id: number) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const addExternal = () => {
    if (!newExternal.name.trim()) return;
    setExternalParticipants([...externalParticipants, { ...newExternal }]);
    setNewExternal({ name: '', contact: '' });
  };

  const removeExternal = (index: number) => {
    setExternalParticipants(externalParticipants.filter((_, i) => i !== index));
  };

  const totalToAdd = selected.length + externalParticipants.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Participants</DialogTitle>
          <DialogDescription>Add members or external players to this tournament.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="members">Gym Members</TabsTrigger>
            <TabsTrigger value="external">External Players</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-medium text-muted-foreground">
                {selected.length} selected
              </span>
              {availableMembers.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => {
                    if (selected.length === availableMembers.length) {
                      setSelected([]);
                    } else {
                      setSelected(availableMembers.map((m: any) => m.id));
                    }
                  }}
                >
                  {selected.length === availableMembers.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>
            <ScrollArea className="h-[300px] border rounded-md p-2">
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
          </TabsContent>

          <TabsContent value="external" className="mt-0 space-y-4">
            <div className="space-y-3 p-3 border rounded-lg bg-sidebar/10">
              <div className="space-y-2">
                <Label className="text-xs">Full Name</Label>
                <Input 
                  placeholder="e.g. John Doe" 
                  value={newExternal.name} 
                  onChange={(e) => setNewExternal({ ...newExternal, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addExternal()}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Contact (Phone or Email)</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Optional" 
                    value={newExternal.contact} 
                    onChange={(e) => setNewExternal({ ...newExternal, contact: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && addExternal()}
                  />
                  <Button type="button" size="icon" variant="secondary" onClick={addExternal}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="h-[180px]">
              <div className="space-y-2">
                {externalParticipants.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-xs italic">No external players added yet.</p>
                ) : (
                  externalParticipants.map((ext, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-md bg-sidebar-accent/50 border border-sidebar-border/50">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                          {ext.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-none">{ext.name}</p>
                          {ext.contact && <p className="text-[10px] text-muted-foreground mt-1">{ext.contact}</p>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeExternal(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={totalToAdd === 0 || addMutation.isPending} onClick={() => addMutation.mutate()} className="gradient-primary">
            {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add {totalToAdd} Participant{totalToAdd !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ======== TIE BREAKER DIALOG ========
function TieBreakerDialog({ open, onOpenChange, groupLabel, players, onConfirm, isPending }: { 
  open: boolean; 
  onOpenChange: (v: boolean) => void; 
  groupLabel: string;
  players: { id: string; name: string }[];
  onConfirm: (strategy: 'STEPLADDER' | 'MINI_LEAGUE') => void;
  isPending: boolean;
}) {
  const [strategy, setStrategy] = useState<'STEPLADDER' | 'MINI_LEAGUE'>('STEPLADDER');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-amber-500/20 bg-background/95 backdrop-blur-xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Swords className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Tie Detected: {groupLabel}</DialogTitle>
              <DialogDescription className="text-amber-500 font-medium">
                Settle the tie between {players.map(p => p.name).join(', ')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
          <Card 
            className={`cursor-pointer transition-all duration-300 relative overflow-hidden group
              ${strategy === 'STEPLADDER' ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20' : 'hover:border-amber-500/50 bg-sidebar/20'}
            `}
            onClick={() => setStrategy('STEPLADDER')}
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Target className={`h-6 w-6 ${strategy === 'STEPLADDER' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                {strategy === 'STEPLADDER' && <CheckCircle2 className="h-4 w-4 text-amber-500" />}
              </div>
              <div>
                <p className="font-bold">Stepladder</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                  Randomly pick 2 players for Match 1. Winner faces the 3rd player in Match 2. Fast & efficient (2 matches).
                </p>
              </div>
            </div>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-300 relative overflow-hidden group
              ${strategy === 'MINI_LEAGUE' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'hover:border-primary/50 bg-sidebar/20'}
            `}
            onClick={() => setStrategy('MINI_LEAGUE')}
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Medal className={`h-6 w-6 ${strategy === 'MINI_LEAGUE' ? 'text-primary' : 'text-muted-foreground'}`} />
                {strategy === 'MINI_LEAGUE' && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </div>
              <div>
                <p className="font-bold">Mini-League</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                  Everyone plays everyone again (A vs B, B vs C, C vs A). Most balanced & fair result (3 matches).
                </p>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-red-500/10 hover:text-red-500 transition-colors">
            Cancel
          </Button>
          <Button 
            onClick={() => onConfirm(strategy)} 
            disabled={isPending}
            className={`font-bold transition-all shadow-lg
              ${strategy === 'STEPLADDER' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-primary/90'}
            `}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm {strategy === 'STEPLADDER' ? 'Stepladder' : 'Mini-League'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ======== START TOURNAMENT DIALOG ========
function StartTournamentDialog({ open, onOpenChange, participants, onConfirm, isPending, formatType, formatName, rules }: { open: boolean; onOpenChange: (v: boolean) => void; participants: any[]; onConfirm: (options: { seedingStrategy: 'RANDOM' | 'MANUAL'; orderedParticipantIds?: string[] }) => void; isPending: boolean; formatType: string; formatName?: string; rules?: any }) {
  const [strategy, setStrategy] = useState<'RANDOM' | 'MANUAL'>('RANDOM');
  const [ordered, setOrdered] = useState<any[]>(participants);

  // Warning logic for Multi-Stage
  const isMultiStage = formatName === 'Group Stage + Knockout';
  const participantCount = participants.length;
  const groupSize = rules?.group_size || 4;

  let warnings: string[] = [];
  if (isMultiStage && participantCount > 0) {
    // Uneven groups warning
    const isUneven = participantCount % groupSize !== 0;
    if (isUneven) {
      const smallerGroupSize = participantCount % groupSize;
      warnings.push(`Participant count (${participantCount}) doesn't fit perfectly into groups of ${groupSize}. One group will only have ${smallerGroupSize} players; they will play fewer matches, which increases the chance of a tie.`);
    }

    const groupCount = Math.ceil(participantCount / groupSize);
    const advancingPerGroup = groupCount >= 32 ? 1 : 2;
    const totalWinners = groupCount * advancingPerGroup;
    const nextPower = Math.pow(2, Math.ceil(Math.log2(totalWinners)));

    // Knockout BYE warning
    if (totalWinners !== nextPower && totalWinners > 1) {
      const byes = nextPower - totalWinners;
      warnings.push(`${totalWinners} winners will advance to the knockout stage, resulting in ${byes} "BYEs" in the first round.`);
    }
  }

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
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col border-primary/20 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Start Tournament</DialogTitle>
          <DialogDescription className="font-medium text-muted-foreground italic">
            {formatType === 'KNOCKOUT'
              ? 'Choose how you want to match up the participants.'
              : 'Choose how the participants should be ordered for their attempts.'}
          </DialogDescription>
        </DialogHeader>

        {!isMultiStage && (
          <div className="grid grid-cols-2 gap-4 my-4">
            <Card
              className={`cursor-pointer transition-all duration-300 ${strategy === 'RANDOM' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'hover:border-primary/50 bg-sidebar/20'}`}
              onClick={() => setStrategy('RANDOM')}
            >
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                <Shuffle className={`h-8 w-8 ${strategy === 'RANDOM' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className="font-bold text-sm">Random</p>
                  <p className="text-[10px] text-muted-foreground">Fair & unbiased</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all duration-300 ${strategy === 'MANUAL' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'hover:border-primary/50 bg-sidebar/20'}`}
              onClick={() => setStrategy('MANUAL')}
            >
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                <Settings2 className={`h-8 w-8 ${strategy === 'MANUAL' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className="font-bold text-sm">Manual</p>
                  <p className="text-[10px] text-muted-foreground">You decide</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mb-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3 shadow-inner shadow-amber-500/10">
            <div className="h-5 w-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[10px] font-black text-amber-500">!</span>
            </div>
            <div className="space-y-2">
              {warnings.map((msg, i) => (
                <p key={i} className="text-xs text-amber-600/90 leading-relaxed font-medium italic">
                  • {msg}
                </p>
              ))}
            </div>
          </div>
        )}

        {strategy === 'MANUAL' && !isMultiStage && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <Label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Sequence Management</Label>
            <ScrollArea className="flex-1 pr-4 -mr-4">
              <div className="space-y-2 pb-4">
                {ordered.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-sidebar-border/30 bg-card/40 backdrop-blur-sm group/item hover:border-primary/40 transition-all shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-black text-primary">{idx + 1}</span>
                      </div>
                      <span className="text-sm font-bold truncate text-foreground/80">
                        {p.external_name || p.member?.full_name || 'Guest'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => moveUp(idx)} disabled={idx === 0}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => moveDown(idx)} disabled={idx === ordered.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="mt-6 pt-6 border-t border-sidebar-border/30">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-red-500/10 hover:text-red-500 transition-colors">Cancel</Button>
          <Button 
            disabled={isPending} 
            onClick={() => onConfirm({ 
              seedingStrategy: strategy, 
              orderedParticipantIds: strategy === 'MANUAL' ? ordered.map(p => p.id) : undefined 
            })}
            className="bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 px-8"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {isMultiStage ? 'Initialize Groups' : 'Start Tournament'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TournamentDetailPage;
