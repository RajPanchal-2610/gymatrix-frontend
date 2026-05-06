// =========================================
// Tournament Module - TypeScript Types
// =========================================

export interface TournamentCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface TournamentFormat {
  id: string;
  name: string;
  type: 'SCORE_BASED' | 'TIME_BASED' | 'KNOCKOUT';
  created_at: string;
}

export interface TournamentMasterData {
  categories: TournamentCategory[];
  formats: TournamentFormat[];
  categoryFormats: Record<string, string[]>; // category_id → format_id[]
}

export interface TournamentRules {
  attempts?: number;
  unit?: string;      // kg, reps
  time_limit_seconds?: number;
  measurement?: string; // time, reps
  max_participants?: number;
}

export interface Tournament {
  id: string;
  gym_id: number;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  category_id: string;
  format_id: string;
  category?: TournamentCategory;
  format?: TournamentFormat;
  rules: TournamentRules;
  status: 'DRAFT' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  winner_participant_id: string | null;
  winner?: TournamentParticipant | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  participant_count?: number;
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  member_id: number;
  seed_number: number | null;
  joined_at: string;
  member?: {
    id: number;
    full_name: string;
    phone?: string;
    email?: string;
  };
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  round_number: number;
  match_number: number;
  participant1_id: string | null;
  participant2_id: string | null;
  winner_id: string | null;
  participant1_score: number | null;
  participant2_score: number | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  next_match_id: string | null;
  participant1?: { id: string; member?: { id: number; full_name: string } } | null;
  participant2?: { id: string; member?: { id: number; full_name: string } } | null;
  winner?: { id: string; member?: { id: number; full_name: string } } | null;
}

export interface TournamentAttempt {
  id: string;
  tournament_id: string;
  participant_id: string;
  attempt_number: number;
  score: number | null;
  status: 'PENDING' | 'VALID' | 'INVALID';
  participant?: { id: string; member?: { id: number; member_name: string } };
}

export interface LeaderboardEntry {
  rank: number;
  participantId: string;
  memberName: string;
  bestScore: number;
  attempts: { attemptNumber: number; score: number | null; status: string }[];
}

export interface TournamentDetail extends Tournament {
  participants: TournamentParticipant[];
  matches: TournamentMatch[] | null;
  attempts: TournamentAttempt[] | null;
  leaderboard: LeaderboardEntry[] | null;
}
