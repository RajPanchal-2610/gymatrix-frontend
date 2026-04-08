import { supabase } from '@/lib/supabase';
import { GymStaff, GymStaffAttendance, GymStaffPayroll, GymRole } from '@/types/gym';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session?.access_token}`
    };
};

export const staffService = {
    // Staff Methods
    async getStaff(gymId: number) {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/staff/${gymId}`, { headers });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch staff');
        }
        return (await response.json()) as GymStaff[];
    },

    async createStaff(staff: Partial<GymStaff>) {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/staff`, {
            method: 'POST',
            headers,
            body: JSON.stringify(staff),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create staff');
        }
        return (await response.json()) as GymStaff;
    },

    async updateStaff(id: number, updates: Partial<GymStaff>) {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/staff/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update staff');
        }
        return (await response.json()) as GymStaff;
    },

    async deleteStaff(id: number) {
        // Soft delete
        const { error } = await supabase
            .from('gym_staff')
            .update({ is_deleted: true })
            .eq('id', id);

        if (error) throw error;
    },

    // Attendance Methods
    async getAttendance(gymId: number, date?: string, staffId?: number, startDate?: string, endDate?: string) {
        const queryParams = new URLSearchParams();
        if (date) queryParams.append('date', date);
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);
        if (staffId) queryParams.append('staffId', staffId.toString());

        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/attendance/staff?${queryParams.toString()}`, { headers });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch staff attendance');
        }
        return await response.json() as GymStaffAttendance[];
    },

    async markAttendance(attendance: Partial<GymStaffAttendance>) {
        // Remove joined fields to prevent "column does not exist" error
        const { gym_staff, ...payload } = attendance;

        const { data, error } = await supabase
            .from('gym_staff_attendance')
            .upsert(payload, { onConflict: 'staff_id,attendance_date' })
            .select()
            .single();

        if (error) throw error;
        return data as GymStaffAttendance;
    },

    // Payroll Methods
    async getPayroll(gymId: number, month?: number, year?: number) {
        let query = supabase
            .from('gym_staff_payroll')
            .select(`
        *,
        gym_staff (
          id,
          full_name,
          role_id,
          gym_roles (name)
        )
      `)
            .eq('gym_id', gymId);

        if (month) query = query.eq('payroll_month', month);
        if (year) query = query.eq('payroll_year', year);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        return data as GymStaffPayroll[];
    },

    async createPayroll(payroll: Partial<GymStaffPayroll>) {
        // Remove joined fields
        const { gym_staff, ...payload } = payroll;

        const { data, error } = await supabase
            .from('gym_staff_payroll')
            .upsert(payload, { onConflict: 'staff_id,payroll_month,payroll_year' })
            .select()
            .single();

        if (error) throw error;
        return data as GymStaffPayroll;
    },

    async updatePayrollStatus(id: number, status: GymStaffPayroll['payment_status']) {
        const { data, error } = await supabase
            .from('gym_staff_payroll')
            .update({ payment_status: status, payment_date: status === 'PAID' ? new Date().toISOString() : null })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as GymStaffPayroll;
    },

    // Role Methods
    async getPermissions() {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/roles/permissions/all`, { headers });
        if (!response.ok) throw new Error('Failed to fetch permissions');
        return await response.json();
    },

    async getFeatures() {
        const { data, error } = await supabase
            .from('features')
            .select('*')
            .order('name');
        if (error) throw error;
        return data;
    },

    async createPermission(permission: { action: string; feature_id: number; description?: string }) {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/roles/permissions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(permission),
        });
        if (!response.ok) throw new Error('Failed to create permission');
        return await response.json();
    },

    async updatePermission(id: number, updates: { action: string; feature_id: number; description?: string }) {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/roles/permissions/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(updates),
        });
        if (!response.ok) throw new Error('Failed to update permission');
        return await response.json();
    },

    async deletePermission(id: number) {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/roles/permissions/${id}`, {
            method: 'DELETE',
            headers,
        });
        if (!response.ok) throw new Error('Failed to delete permission');
    },

    async getRoles(gymId?: number) {
        // if gymId not provided, fallback to 0 or fetch global roles, but usually we need it
        const id = gymId || 0;
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/roles/${id}`, { headers });
        if (!response.ok) throw new Error('Failed to fetch roles');
        return await response.json();
    },

    async createRole(role: Partial<GymRole> & { permission_ids?: number[] }) {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/roles`, {
            method: 'POST',
            headers,
            body: JSON.stringify(role),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create role');
        }
        return await response.json();
    },

    async updateRole(id: number, updates: Partial<GymRole> & { permission_ids?: number[] }) {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/roles/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(updates),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update role');
        }
        return await response.json();
    },

    async getDeleteRole(id: number) {
        const { error } = await supabase
            .from('gym_roles')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async getMyPermissions() {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/roles/me/permissions`, { headers });
        if (!response.ok) throw new Error('Failed to fetch my permissions');
        return await response.json();
    },

    async getMyRole() {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/roles/me/role`, { headers });
        if (!response.ok) throw new Error('Failed to fetch my role');
        return await response.json();
    }
};
