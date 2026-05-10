import { supabase } from '@/lib/supabase';
import type {
  TournamentMasterData,
  Tournament,
  TournamentDetail,
  TournamentParticipant,
  TournamentAttempt,
  LeaderboardEntry,
} from '@/types/tournament';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = async () => {
  const { data } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.session?.access_token}`,
  };
};

export const tournamentService = {
  // =========================================
  // Master Data
  // =========================================
  async getMasterData(): Promise<TournamentMasterData> {
    const response = await fetch(`${API_BASE_URL}/tournaments/master-data`);
    if (!response.ok) throw new Error('Failed to fetch master data');
    return response.json();
  },

  // =========================================
  // Tournament CRUD
  // =========================================
  async getTournaments(status?: string): Promise<Tournament[]> {
    const headers = await getAuthHeaders();
    const params = status ? `?status=${status}` : '';
    const response = await fetch(`${API_BASE_URL}/tournaments${params}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch tournaments');
    return response.json();
  },

  async getTournamentById(id: string): Promise<TournamentDetail> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tournaments/${id}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch tournament');
    return response.json();
  },

  async createTournament(data: {
    name: string;
    description?: string;
    start_date: string;
    end_date: string;
    category_id: string;
    format_id: string;
    rules?: Record<string, any>;
  }): Promise<Tournament> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tournaments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to create tournament');
    }
    return response.json();
  },

  async updateTournament(id: string, updates: Partial<Tournament>): Promise<Tournament> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tournaments/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to update tournament');
    }
    return response.json();
  },

  async deleteTournament(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tournaments/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to delete tournament');
    }
  },

  // =========================================
  // Participants
  // =========================================
  async addParticipants(
    tournamentId: string, 
    memberIds: number[],
    externalParticipants?: { name: string; contact?: string }[]
  ): Promise<TournamentParticipant[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}/participants`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        member_ids: memberIds,
        external_participants: externalParticipants
      }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to add participants');
    }
    return response.json();
  },

  async removeParticipant(tournamentId: string, participantId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/tournaments/${tournamentId}/participants/${participantId}`,
      { method: 'DELETE', headers }
    );
    if (!response.ok) throw new Error('Failed to remove participant');
  },

  // =========================================
  // Structure & Results
  // =========================================
  async generateStructure(tournamentId: string, options?: { seedingStrategy: 'RANDOM' | 'MANUAL'; orderedParticipantIds?: string[] }): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(options || {}),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to generate structure');
    }
    return response.json();
  },

  async advanceTournamentPhase(tournamentId: string): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}/advance`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to advance tournament phase');
    }
    return response.json();
  },

  async resolveTieBreaker(tournamentId: string, data: { groupLabel: string; participantIds: string[]; strategy: 'STEPLADDER' | 'MINI_LEAGUE' }): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}/resolve-tie`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to resolve tie-breaker');
    }
    return response.json();
  },

  async submitMatchResult(
    tournamentId: string,
    matchId: string,
    data: { winner_id: string; participant1_score?: number; participant2_score?: number }
  ): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/tournaments/${tournamentId}/matches/${matchId}/result`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to submit match result');
    }
    return response.json();
  },

  async updateAttempt(
    tournamentId: string,
    attemptId: string,
    data: { score?: number; status?: string }
  ): Promise<TournamentAttempt> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/tournaments/${tournamentId}/attempts/${attemptId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to update attempt');
    }
    return response.json();
  },

  async getLeaderboard(tournamentId: string): Promise<LeaderboardEntry[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}/leaderboard`, {
      headers,
    });
    if (!response.ok) throw new Error('Failed to fetch leaderboard');
    return response.json();
  },

  async finalizeTournament(tournamentId: string): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}/finalize`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to finalize tournament');
    }
    return response.json();
  },
};
