import { supabase } from '@/lib/supabase';

// ===== TYPES =====

export interface DietPlan {
    id: number;
    gym_id: number;
    member_id: number;
    assigned_staff_id: number;
    title: string;
    start_date: string;
    end_date: string;
    notes?: string;
    status: 'active' | 'inactive' | 'completed';
    is_deleted: boolean;
    created_at?: string;
    updated_at?: string;
    // Joined
    gym_members?: { id: number; full_name: string };
    gym_staff?: { id: number; full_name: string };
    gym_diet_plan_items?: DietPlanItem[];
}

export interface DietPlanItem {
    id?: number;
    diet_plan_id?: number;
    day_of_week: number; // 1=Mon ... 7=Sun
    meal_type: string;
    food_item: string;
    quantity?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    notes?: string;
    sort_order?: number;
}

export interface WorkoutPlan {
    id: number;
    gym_id: number;
    member_id: number;
    assigned_staff_id: number;
    title: string;
    start_date: string;
    end_date: string;
    notes?: string;
    status: 'active' | 'inactive' | 'completed';
    is_deleted: boolean;
    created_at?: string;
    updated_at?: string;
    // Joined
    gym_members?: { id: number; full_name: string };
    gym_staff?: { id: number; full_name: string };
    gym_workout_plan_items?: WorkoutPlanItem[];
}

export interface WorkoutPlanItem {
    id?: number;
    workout_plan_id?: number;
    day_of_week: number;
    exercise_name: string;
    muscle_group?: string;
    sets?: number;
    reps?: string;
    weight?: string;
    duration?: string;
    rest_period?: string;
    notes?: string;
    sort_order?: number;
}

export const DAY_LABELS: Record<number, string> = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    7: 'Sunday',
};

export const MEAL_TYPES = [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'morning_snack', label: 'Morning Snack' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'evening_snack', label: 'Evening Snack' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'pre_workout', label: 'Pre-Workout' },
    { value: 'post_workout', label: 'Post-Workout' },
];

// ===== DIET PLAN SERVICE =====

export const dietWorkoutService = {

    // ---------- DIET PLANS ----------

    async getDietPlans(gymId: number, staffId?: number | null) {
        let query = supabase
            .from('gym_diet_plans')
            .select(`
                *,
                gym_members ( id, full_name ),
                gym_staff ( id, full_name )
            `)
            .eq('gym_id', gymId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

        // Staff scoping — staff only sees their own plans
        if (staffId) {
            query = query.eq('assigned_staff_id', staffId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as DietPlan[];
    },

    async getDietPlanWithItems(planId: number) {
        const { data, error } = await supabase
            .from('gym_diet_plans')
            .select(`
                *,
                gym_members ( id, full_name ),
                gym_staff ( id, full_name ),
                gym_diet_plan_items ( * )
            `)
            .eq('id', planId)
            .single();

        if (error) throw error;
        return data as DietPlan;
    },

    async createDietPlan(
        plan: Omit<DietPlan, 'id' | 'is_deleted' | 'created_at' | 'updated_at' | 'gym_members' | 'gym_staff' | 'gym_diet_plan_items'>,
        items: Omit<DietPlanItem, 'id' | 'diet_plan_id'>[]
    ) {
        // 1. Insert plan
        const { data: planData, error: planError } = await supabase
            .from('gym_diet_plans')
            .insert({
                ...plan,
                is_deleted: false,
            })
            .select()
            .single();

        if (planError) throw planError;

        // 2. Insert items
        if (items.length > 0) {
            const itemsWithPlanId = items.map((item, idx) => ({
                ...item,
                diet_plan_id: planData.id,
                sort_order: item.sort_order ?? idx,
            }));

            const { error: itemsError } = await supabase
                .from('gym_diet_plan_items')
                .insert(itemsWithPlanId);

            if (itemsError) throw itemsError;
        }

        return planData as DietPlan;
    },

    async updateDietPlan(
        planId: number,
        plan: Partial<Omit<DietPlan, 'id' | 'gym_members' | 'gym_staff' | 'gym_diet_plan_items'>>,
        items: Omit<DietPlanItem, 'id' | 'diet_plan_id'>[]
    ) {
        // 1. Update plan
        const { error: planError } = await supabase
            .from('gym_diet_plans')
            .update({ ...plan, updated_at: new Date().toISOString() })
            .eq('id', planId);

        if (planError) throw planError;

        // 2. Replace items: delete old, insert new
        const { error: deleteError } = await supabase
            .from('gym_diet_plan_items')
            .delete()
            .eq('diet_plan_id', planId);

        if (deleteError) throw deleteError;

        if (items.length > 0) {
            const itemsWithPlanId = items.map((item, idx) => ({
                ...item,
                diet_plan_id: planId,
                sort_order: item.sort_order ?? idx,
            }));

            const { error: insertError } = await supabase
                .from('gym_diet_plan_items')
                .insert(itemsWithPlanId);

            if (insertError) throw insertError;
        }
    },

    async deleteDietPlan(planId: number) {
        const { error } = await supabase
            .from('gym_diet_plans')
            .update({ is_deleted: true, updated_at: new Date().toISOString() })
            .eq('id', planId);

        if (error) throw error;
    },

    // ---------- WORKOUT PLANS ----------

    async getWorkoutPlans(gymId: number, staffId?: number | null) {
        let query = supabase
            .from('gym_workout_plans')
            .select(`
                *,
                gym_members ( id, full_name ),
                gym_staff ( id, full_name )
            `)
            .eq('gym_id', gymId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

        if (staffId) {
            query = query.eq('assigned_staff_id', staffId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as WorkoutPlan[];
    },

    async getWorkoutPlanWithItems(planId: number) {
        const { data, error } = await supabase
            .from('gym_workout_plans')
            .select(`
                *,
                gym_members ( id, full_name ),
                gym_staff ( id, full_name ),
                gym_workout_plan_items ( * )
            `)
            .eq('id', planId)
            .single();

        if (error) throw error;
        return data as WorkoutPlan;
    },

    async createWorkoutPlan(
        plan: Omit<WorkoutPlan, 'id' | 'is_deleted' | 'created_at' | 'updated_at' | 'gym_members' | 'gym_staff' | 'gym_workout_plan_items'>,
        items: Omit<WorkoutPlanItem, 'id' | 'workout_plan_id'>[]
    ) {
        const { data: planData, error: planError } = await supabase
            .from('gym_workout_plans')
            .insert({
                ...plan,
                is_deleted: false,
            })
            .select()
            .single();

        if (planError) throw planError;

        if (items.length > 0) {
            const itemsWithPlanId = items.map((item, idx) => ({
                ...item,
                workout_plan_id: planData.id,
                sort_order: item.sort_order ?? idx,
            }));

            const { error: itemsError } = await supabase
                .from('gym_workout_plan_items')
                .insert(itemsWithPlanId);

            if (itemsError) throw itemsError;
        }

        return planData as WorkoutPlan;
    },

    async updateWorkoutPlan(
        planId: number,
        plan: Partial<Omit<WorkoutPlan, 'id' | 'gym_members' | 'gym_staff' | 'gym_workout_plan_items'>>,
        items: Omit<WorkoutPlanItem, 'id' | 'workout_plan_id'>[]
    ) {
        const { error: planError } = await supabase
            .from('gym_workout_plans')
            .update({ ...plan, updated_at: new Date().toISOString() })
            .eq('id', planId);

        if (planError) throw planError;

        const { error: deleteError } = await supabase
            .from('gym_workout_plan_items')
            .delete()
            .eq('workout_plan_id', planId);

        if (deleteError) throw deleteError;

        if (items.length > 0) {
            const itemsWithPlanId = items.map((item, idx) => ({
                ...item,
                workout_plan_id: planId,
                sort_order: item.sort_order ?? idx,
            }));

            const { error: insertError } = await supabase
                .from('gym_workout_plan_items')
                .insert(itemsWithPlanId);

            if (insertError) throw insertError;
        }
    },

    async deleteWorkoutPlan(planId: number) {
        const { error } = await supabase
            .from('gym_workout_plans')
            .update({ is_deleted: true, updated_at: new Date().toISOString() })
            .eq('id', planId);

        if (error) throw error;
    },

    // ---------- HELPERS ----------

    async getStaffMembers(gymId: number, staffId?: number | null) {
        let query = supabase
            .from('gym_members')
            .select('id, full_name, assigned_staff_id')
            .eq('gym_id', gymId)
            .eq('is_deleted', false)
            .order('full_name');

        // If staff, only get their assigned members
        if (staffId) {
            query = query.eq('assigned_staff_id', staffId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },
};
