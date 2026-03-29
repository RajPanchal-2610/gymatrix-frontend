import { supabase } from '@/lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session?.access_token}`
    };
};

export const attendanceService = {
    async getMemberAttendance(date?: string, startDate?: string, endDate?: string) {
        const headers = await getAuthHeaders();
        const queryParams = new URLSearchParams();
        if (date) queryParams.append('date', date);
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);

        const response = await fetch(`${API_BASE_URL}/attendance/members?${queryParams.toString()}`, { headers });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch member attendance');
        }
        return await response.json();
    },

    async getStaffAttendance(date?: string, startDate?: string, endDate?: string, staffId?: number) {
        const headers = await getAuthHeaders();
        const queryParams = new URLSearchParams();
        if (date) queryParams.append('date', date);
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);
        if (staffId) queryParams.append('staffId', staffId.toString());

        const response = await fetch(`${API_BASE_URL}/attendance/staff?${queryParams.toString()}`, { headers });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch staff attendance');
        }
        return await response.json();
    },

    async manualPunch(data: { user_type: 'member' | 'staff', user_id: number, punch_type: 'IN' | 'OUT', time?: string }) {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/attendance/manual-punch`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to perform manual punch');
        }
        return await response.json();
    },

    async getMapping(userType: 'member' | 'staff', userId: number) {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/attendance/mapping/${userType}/${userId}`, { headers });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch device mapping');
        }
        return await response.json();
    },

    async saveMapping(data: { user_type: 'member' | 'staff', user_id: number, device_user_id: string }) {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/attendance/mapping`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save device mapping');
        }
        return await response.json();
    }
};
