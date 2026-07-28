import { supabase } from '@/lib/supabase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const API_BASE_URL = `${BACKEND_URL}/api/tournaments/global`;

const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session?.access_token}`
    };
};

export interface GlobalTournament {
    id: string;
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    rules: {
        allowed_breaks: number;
        break_duration_limit_seconds: number;
        pushup_form_strictness: string;
        minimum_elbow_angle: number;
        plank_angle_tolerance: number;
    };
    entry_criteria: any;
    status: 'DRAFT' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    created_at: string;
}

export interface LeaderboardEntry {
    id: string;
    user_id: string;
    started_at: string;
    ended_at: string;
    pushup_count: number;
    average_form_score: number;
    status: string;
    durationSeconds: number;
    email: string;
    username: string;
}

export interface AuditLogEntry {
    id: string;
    session_id: string;
    timestamp: string;
    pushup_count_at_moment: number;
    face_match_confidence: number;
    pose_confidence: number;
    is_suspicious: boolean;
    suspicious_reason: string;
    created_at: string;
}

export interface AuditMediaEntry {
    id: string;
    session_id: string;
    log_id: string;
    media_url: string;
    is_flagged: boolean;
    flagged_reason: string;
    captured_at: string;
}

export const globalTournamentService = {
    async createTournament(data: Partial<GlobalTournament>) {
        const headers = await getAuthHeaders();
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create global tournament');
        }
        return await response.json() as GlobalTournament;
    },

    async updateTournament(id: string, updates: Partial<GlobalTournament>) {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update tournament');
        }
        return await response.json() as GlobalTournament;
    },

    async deleteTournament(id: string) {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE',
            headers
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete tournament');
        }
        return await response.json();
    },

    async getAllTournaments(status?: string) {
        const headers = await getAuthHeaders();
        const url = status ? `${API_BASE_URL}?status=${status}` : API_BASE_URL;
        const response = await fetch(url, { headers });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch global tournaments');
        }
        return await response.json() as GlobalTournament[];
    },

    async getTournamentDetails(id: string) {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/${id}`, { headers });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch tournament details');
        }
        return await response.json() as GlobalTournament;
    },

    async getLeaderboard(tournamentId: string) {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/${tournamentId}/leaderboard`, { headers });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch tournament leaderboard');
        }
        return await response.json() as LeaderboardEntry[];
    },

    async getSessionAuditLogs(sessionId: string) {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/audit`, { headers });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch session audit logs');
        }
        return await response.json() as { logs: AuditLogEntry[]; media: AuditMediaEntry[] };
    },

    async disqualifySession(sessionId: string, reason: string) {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/disqualify`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ reason })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to disqualify session');
        }
        return await response.json();
    }
};
