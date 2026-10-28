const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const TOKEN_KEY = 'gymatrix_member_token';
const DATA_KEY = 'gymatrix_member_data';

export interface MemberSessionData {
  id: number;
  full_name: string;
  phone: string;
  email?: string;
  image_url?: string;
  gym_id: number;
  gym_name: string;
  gym_logo?: string;
  gym_phone?: string;
  gym_address?: string;
  status: string;
  expiry_date?: string;
  plan_name?: string;
}

export const memberAuthService = {
  getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getStoredMember(): MemberSessionData | null {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  isLoggedIn(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  saveSession(token: string, member: MemberSessionData) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(DATA_KEY, JSON.stringify(member));
    window.dispatchEvent(new Event('member-auth-changed'));
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(DATA_KEY);
    window.dispatchEvent(new Event('member-auth-changed'));
  },

  async login(phone: string, password: string): Promise<{ token: string; member: MemberSessionData }> {
    const res = await fetch(`${BACKEND_URL}/api/members/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      const err: any = new Error(data.error || 'Login failed');
      err.needsRegistration = data.needsRegistration;
      throw err;
    }

    this.saveSession(data.token, data.member);
    return data;
  },

  async register(params: {
    phone: string;
    password: string;
    fullName?: string;
    email?: string;
    gymId?: number;
    autoLogin?: boolean;
  }): Promise<{ token: string; member: MemberSessionData }> {
    const res = await fetch(`${BACKEND_URL}/api/members/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    if (params.autoLogin) {
      this.saveSession(data.token, data.member);
    }
    return data;
  },

  async getDashboardData() {
    const token = this.getStoredToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${BACKEND_URL}/api/members/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        this.logout();
      }
      throw new Error(data.error || 'Failed to fetch dashboard data');
    }

    return data;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const token = this.getStoredToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${BACKEND_URL}/api/members/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to change password');
    }

    return data;
  },
};
