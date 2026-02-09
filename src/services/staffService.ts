import { supabase } from '@/lib/supabase';
import { GymStaff, GymStaffAttendance, GymStaffPayroll, GymRole } from '@/types/gym';

export const staffService = {
    // Staff Methods
    async getStaff(gymId: number) {
        const { data, error } = await supabase
            .from('gym_staff')
            .select(`
        *,
        gym_roles (
          id,
          name
        )
      `)
            .eq('gym_id', gymId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as GymStaff[];
    },

    async createStaff(staff: Partial<GymStaff>) {
        const { data, error } = await supabase
            .from('gym_staff')
            .insert(staff)
            .select()
            .single();

        if (error) throw error;
        return data as GymStaff;
    },

    async updateStaff(id: number, updates: Partial<GymStaff>) {
        const { data, error } = await supabase
            .from('gym_staff')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as GymStaff;
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
        let query = supabase
            .from('gym_staff_attendance')
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

        if (date) {
            query = query.eq('attendance_date', date);
        }
        if (startDate && endDate) {
            query = query.gte('attendance_date', startDate).lte('attendance_date', endDate);
        }
        if (staffId) {
            query = query.eq('staff_id', staffId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        return data as GymStaffAttendance[];
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
    async getRoles() {
        const { data, error } = await supabase
            .from('gym_roles')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return data as GymRole[];
    },

    async createRole(role: Partial<GymRole>) {
        const { data, error } = await supabase
            .from('gym_roles')
            .insert(role)
            .select()
            .single();

        if (error) throw error;
        return data as GymRole;
    },

    async updateRole(id: number, updates: Partial<GymRole>) {
        const { data, error } = await supabase
            .from('gym_roles')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as GymRole;
    },

    async deleteRole(id: number) {
        const { error } = await supabase
            .from('gym_roles')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
