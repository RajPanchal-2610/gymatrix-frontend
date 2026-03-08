
export interface GymMembershipPlan {
    id: number;
    gym_id: number;
    name: string;
    price: number;
    duration_value: number;
    duration_unit: 'month' | 'year' | 'day';
    description?: string;
    status: 'active' | 'inactive' | 'archived';
    is_active: boolean;
    is_deleted: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface GymMember {
    id: number;
    gym_id: number;
    membership_plan_id?: number;
    full_name: string;
    phone?: string;
    email?: string;
    join_date: string;
    expiry_date?: string;
    image_url?: string | null;
    gender?: string;
    trainer_id?: number | null;
    status: 'active' | 'expired' | 'paused' | 'cancelled';
    is_active: boolean;
    is_deleted: boolean;
    created_at?: string;
    updated_at?: string;

    // Joined fields
    gym_membership_plans?: GymMembershipPlan;
    gym_membership_history?: GymMembershipHistory[];
    gym_membership_payments?: GymMembershipPayment[]; // Array because member has many payments
    gym_staff?: GymStaff; // The assigned trainer
}

export interface GymMembershipHistory {
    id: number;
    gym_id: number;
    member_id: number;
    plan_id: number;
    start_date: string;
    end_date: string;
    renewed_at: string | null;
    payment_status?: 'paid' | 'partial' | 'unpaid';
    created_at?: string;
    updated_at?: string;
    is_active: boolean;
    is_deleted: boolean;

    // Joined fields
    gym_membership_plans?: GymMembershipPlan;
}

export interface GymMembershipPayment {
    id: number;
    membership_history_id: number;
    member_id: number;
    gym_id: number;
    total_amount: number;
    paid_amount: number;
    due_amount: number;
    payment_status: 'paid' | 'partial' | 'unpaid';
    billing_date: string;
    remarks?: string;
    created_at?: string;
    updated_at?: string;
    is_active: boolean;
    is_deleted: boolean;

    // Joined fields
    gym_members?: GymMember;
    gym_membership_history?: GymMembershipHistory & {
        gym_membership_plans?: GymMembershipPlan;
    };
    gym_payment_transactions?: GymPaymentTransaction[];
}

export interface GymPaymentTransaction {
    id: number;
    membership_payment_id: number;
    gym_id: number;
    payment_mode: 'Cash' | 'Online' | 'Card' | 'Cheque';
    amount: number;
    transaction_reference?: string;
    paid_at: string;
    created_at?: string;
    updated_at?: string;
    is_active: boolean;
    is_deleted: boolean;
}

export interface GymRole {
    id: number;
    name: string;
    description?: string;
    created_at?: string;
}

export interface GymStaff {
    id: number;
    gym_id: number;
    user_id?: string;
    role_id?: number;
    full_name: string;
    join_date?: string;
    phone?: string;
    salary?: number;
    status?: string;
    is_active: boolean;
    is_deleted: boolean;
    created_at?: string;
    updated_at?: string;

    // Joined fields
    gym_roles?: GymRole;
    user_email?: string; // Optional helper for display if joined with auth users
}

export interface GymStaffAttendance {
    id: number;
    gym_id: number;
    staff_id: number;
    attendance_date: string;
    status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
    remarks?: string;
    created_at?: string;
    updated_at?: string;

    // Joined fields
    gym_staff?: GymStaff;
}

export interface GymStaffPayroll {
    id: number;
    gym_id: number;
    staff_id: number;
    payroll_month: number;
    payroll_year: number;
    base_salary: number;
    total_working_days: number;
    present_days: number;
    absent_days: number;
    overtime_hours?: number;
    overtime_amount?: number;
    deductions?: number;
    net_salary: number;
    payment_status: 'PENDING' | 'PAID' | 'HOLD';
    payment_date?: string;
    created_at?: string;
    updated_at?: string;

    // Joined fields
    gym_staff?: GymStaff;
}
