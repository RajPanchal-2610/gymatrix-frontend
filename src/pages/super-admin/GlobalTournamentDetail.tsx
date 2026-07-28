import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Trophy,
  ArrowLeft,
  Users,
  Camera,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Activity,
  UserCheck,
  XOctagon,
  CheckCircle,
  ChevronRight,
  X,
  ZoomIn,
  Flag,
  Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  globalTournamentService,
  GlobalTournament,
  LeaderboardEntry,
  AuditLogEntry,
  AuditMediaEntry
} from "@/services/globalTournamentService";

export default function GlobalTournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<GlobalTournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Session Audit State
  const [selectedSession, setSelectedSession] = useState<LeaderboardEntry | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditMedia, setAuditMedia] = useState<AuditMediaEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [disqualifyOpen, setDisqualifyOpen] = useState(false);
  const [disqualifyReason, setDisqualifyReason] = useState("");

  // Screenshot lightbox state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [tData, lData] = await Promise.all([
        globalTournamentService.getTournamentDetails(id),
        globalTournamentService.getLeaderboard(id)
      ]);
      setTournament(tData);
      setLeaderboard(lData);
    } catch (error: any) {
      toast.error(error.message || "Failed to load tournament details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const loadSessionAudit = async (session: LeaderboardEntry) => {
    setSelectedSession(session);
    setAuditLoading(true);
    try {
      const { logs, media } = await globalTournamentService.getSessionAuditLogs(session.id);
      setAuditLogs(logs);
      setAuditMedia(media);
    } catch (error: any) {
      toast.error(error.message || "Failed to load session audits");
    } finally {
      setAuditLoading(false);
    }
  };

  const handleDisqualify = async () => {
    if (!selectedSession || !disqualifyReason) {
      toast.error("Please enter a disqualification reason.");
      return;
    }

    try {
      await globalTournamentService.disqualifySession(selectedSession.id, disqualifyReason);
      toast.success("Participant disqualified successfully!");
      setDisqualifyOpen(false);
      setDisqualifyReason("");
      setSelectedSession(null);
      fetchData(); // Refresh list
    } catch (error: any) {
      toast.error(error.message || "Failed to disqualify participant");
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h2 className="text-xl font-bold">Tournament not found</h2>
        <Button className="mt-4" asChild>
          <Link to="/admin/global-tournaments">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Tournaments
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header breadcrumb */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <Link to="/admin/global-tournaments" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to Tournaments
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            {tournament.name}
          </h1>
          <p className="text-xs text-muted-foreground">Status: <span className="font-bold">{tournament.status}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Leaderboard Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Live Standings
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time leaderboard sorted by total reps, session speed, and form accuracy.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {leaderboard.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  No participation sessions completed yet for this tournament.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12 text-center">Rank</TableHead>
                      <TableHead>Participant</TableHead>
                      <TableHead className="text-center">Total Reps</TableHead>
                      <TableHead className="text-center">Start Time</TableHead>
                      <TableHead className="text-center">Duration</TableHead>
                      <TableHead className="text-center">Form Score</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((entry, index) => (
                      <TableRow
                        key={entry.user_id}
                        className={`transition-colors ${entry.id ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed opacity-85'} ${selectedSession?.id === entry.id ? 'bg-muted/70' : ''}`}
                        onClick={() => { if (entry.id) loadSessionAudit(entry); }}
                      >
                        <TableCell className="text-center font-bold text-sm text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{entry.username}</span>
                            <span className="text-xs text-muted-foreground">{entry.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-extrabold text-base text-emerald-500">{entry.pushup_count}</TableCell>
                        <TableCell className="text-center text-xs font-semibold text-muted-foreground">
                          {entry.started_at ? new Date(entry.started_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-xs text-muted-foreground">
                          {formatDuration(entry.durationSeconds)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${entry.average_form_score >= 85 ? 'bg-success/10 text-success' :
                              entry.average_form_score >= 70 ? 'bg-amber-500/10 text-amber-500' :
                                'bg-destructive/10 text-destructive'
                            }`}>
                            {Math.round(entry.average_form_score)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Participant Details & Audit Logs */}
        <div className="space-y-6">
          {selectedSession ? (
            <Card className="shadow-md border-primary/20 bg-muted/10">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold">Audit: {selectedSession.username}</CardTitle>
                  <CardDescription className="text-[11px] mt-0.5">{selectedSession.email}</CardDescription>
                </div>
                <Dialog open={disqualifyOpen} onOpenChange={setDisqualifyOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="font-bold flex items-center gap-1">
                      <XOctagon className="h-4 w-4" />
                      Disqualify
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-lg font-bold">Disqualify Participant</DialogTitle>
                      <DialogDescription>
                        State the cheating action or form failure that occurred. This will nullify their tournament score.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2.5 mt-4">
                      <Label htmlFor="reason">Reason for Disqualification</Label>
                      <Textarea
                        id="reason"
                        placeholder="e.g. Swapped with another person after calibration, pre-recorded video loop feed detected..."
                        value={disqualifyReason}
                        onChange={(e) => setDisqualifyReason(e.target.value)}
                        rows={3}
                        required
                      />
                    </div>
                    <DialogFooter className="mt-4">
                      <Button variant="outline" onClick={() => setDisqualifyOpen(false)}>Cancel</Button>
                      <Button variant="destructive" onClick={handleDisqualify}>Confirm Disqualification</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-4 space-y-5">
                {auditLoading ? (
                  <div className="flex flex-col items-center justify-center p-12 text-muted-foreground text-xs font-semibold">
                    <Activity className="h-8 w-8 text-primary animate-spin mb-2" />
                    Fetching logs and screenshots...
                  </div>
                ) : (
                  <>
                    {/* Session Quick Stats */}
                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div className="bg-card border p-2 rounded-lg">
                        <span className="block text-[10px] text-muted-foreground uppercase font-bold">Reps</span>
                        <span className="text-base font-extrabold text-emerald-500">{selectedSession.pushup_count}</span>
                      </div>
                      <div className="bg-card border p-2 rounded-lg">
                        <span className="block text-[10px] text-muted-foreground uppercase font-bold">Form</span>
                        <span className="text-base font-extrabold text-primary">{Math.round(selectedSession.average_form_score)}%</span>
                      </div>
                      <div className="bg-card border p-2 rounded-lg">
                        <span className="block text-[10px] text-muted-foreground uppercase font-bold">Status</span>
                        <span className="text-xs font-extrabold block mt-0.5">{selectedSession.status}</span>
                      </div>
                    </div>

                    {(() => {
                      const videos = auditMedia.filter(m => m.media_url.endsWith('.mp4') || m.media_url.endsWith('.mov') || m.media_url.includes('session_videos'));
                      const screenshots = auditMedia.filter(m => !m.media_url.endsWith('.mp4') && !m.media_url.endsWith('.mov') && !m.media_url.includes('session_videos'));

                      return (
                        <>
                          {/* Verification Video */}
                          {videos.length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-xs font-extrabold flex items-center gap-1.5 text-muted-foreground uppercase">
                                <Video className="h-4 w-4 text-primary" />
                                Manual Verification Video
                              </Label>
                              <div className="rounded-lg overflow-hidden border border-border bg-black">
                                <video 
                                  src={videos[0].media_url} 
                                  controls 
                                  className="w-full max-h-60 object-contain" 
                                />
                              </div>
                            </div>
                          )}

                          {/* Screenshot Feed */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-extrabold flex items-center gap-1.5 text-muted-foreground uppercase">
                                <Camera className="h-4 w-4 text-primary" />
                                Verification Gallery (10s intervals)
                              </Label>
                              {screenshots.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                    {screenshots.length} captures
                                  </span>
                                  {screenshots.filter(m => m.is_flagged).length > 0 && (
                                    <span className="text-[10px] font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <Flag className="h-2.5 w-2.5" />
                                      {screenshots.filter(m => m.is_flagged).length} flagged
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {screenshots.length === 0 ? (
                              <div className="text-center text-xs text-muted-foreground border border-dashed p-4 rounded-lg">
                                No screenshots captured for this session.
                              </div>
                            ) : (
                              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto p-0.5">
                                {screenshots.map((media, idx) => (
                                  <button
                                    key={media.id}
                                    onClick={() => { setLightboxUrl(media.media_url); setLightboxIndex(idx); }}
                                    className={`relative block rounded-lg overflow-hidden border bg-background hover:scale-95 transition-transform group ${
                                      media.is_flagged ? 'border-destructive' : 'border-border'
                                    }`}
                                  >
                                    <img 
                                      src={media.media_url} 
                                      alt={`Capture ${idx + 1}`} 
                                      className="h-20 w-full object-cover" 
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=200&h=150&fit=crop';
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                      <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 flex items-center justify-between">
                                      <span className="text-[9px] text-white/80 font-mono">
                                        T+{idx * 10}s
                                      </span>
                                      {media.is_flagged && (
                                        <ShieldAlert className="h-3 w-3 text-destructive" />
                                      )}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}

                    {/* Log Timeline */}
                    <div className="space-y-2">
                      <Label className="text-xs font-extrabold flex items-center gap-1.5 text-muted-foreground uppercase">
                        <Clock className="h-4 w-4 text-primary" />
                        Session Audit Timeline
                      </Label>
                      {auditLogs.length === 0 ? (
                        <div className="text-center text-xs text-muted-foreground border border-dashed p-4 rounded-lg">
                          No logging packets received.
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                          {auditLogs.map((log, idx) => (
                            <div
                              key={log.id}
                              className={`p-2.5 border rounded-lg flex flex-col gap-1 text-[11px] leading-tight ${log.is_suspicious
                                  ? 'bg-destructive/5 border-destructive/20 text-destructive'
                                  : 'bg-card border-border'
                                }`}
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span>T +{idx * 10}s</span>
                                <span>Reps: {log.pushup_count_at_moment}</span>
                              </div>
                              <div className="flex justify-between text-muted-foreground">
                                <span>Face Confidence: {Math.round(log.face_match_confidence)}%</span>
                                <span>Pose Confidence: {Math.round(log.pose_confidence)}%</span>
                              </div>
                              {log.is_suspicious && (
                                <div className="flex items-start gap-1 font-bold mt-1 text-[10px]">
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                  <span>Flagged: {log.suspicious_reason}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm border-dashed flex flex-col items-center justify-center p-8 text-center h-[360px]">
              <UserCheck className="h-10 w-10 text-muted-foreground opacity-30 mb-2.5" />
              <h4 className="font-bold text-sm">Review Participant</h4>
              <p className="text-xs text-muted-foreground max-w-[200px] mt-1">Select a competitor from the standings table to view their camera feeds and audit verification logs.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Lightbox Modal for fullscreen screenshot view */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          {(() => {
            const screenshots = auditMedia.filter(m => !m.media_url.endsWith('.mp4') && !m.media_url.endsWith('.mov') && !m.media_url.includes('session_videos'));
            return (
              <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-primary" />
                    <span className="text-white text-sm font-bold">
                      Screenshot {lightboxIndex + 1} of {screenshots.length}
                      <span className="text-white/50 font-normal ml-2">— T+{lightboxIndex * 10}s</span>
                    </span>
                    {screenshots[lightboxIndex]?.is_flagged && (
                      <span className="bg-destructive/80 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3" /> FLAGGED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="text-white/70 hover:text-white text-xs border border-white/20 rounded px-2 py-1 disabled:opacity-30"
                      disabled={lightboxIndex === 0}
                      onClick={() => setLightboxIndex(i => i - 1)}
                    >← Prev</button>
                    <button
                      className="text-white/70 hover:text-white text-xs border border-white/20 rounded px-2 py-1 disabled:opacity-30"
                      disabled={lightboxIndex === screenshots.length - 1}
                      onClick={() => setLightboxIndex(i => i + 1)}
                    >Next →</button>
                    <button 
                      className="text-white/70 hover:text-white ml-2" 
                      onClick={() => setLightboxUrl(null)}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <img 
                  src={screenshots[lightboxIndex]?.media_url || lightboxUrl}
                  alt="Screenshot verification"
                  className="w-full rounded-lg border border-white/10 max-h-[75vh] object-contain bg-black"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&h=600&fit=crop';
                  }}
                />
                {screenshots[lightboxIndex]?.is_flagged && screenshots[lightboxIndex]?.flagged_reason && (
                  <div className="mt-2 px-1 text-xs text-destructive font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {screenshots[lightboxIndex].flagged_reason}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
