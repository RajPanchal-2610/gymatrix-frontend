import { supabase } from '@/lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session?.access_token}`
    };
};

export interface ContactMessage {
    id: number;
    full_name: string;
    email: string;
    subject: string;
    message: string;
    status: 'unread' | 'read' | 'replied';
    created_at: string;
}

export const contactService = {
    async getAllMessages() {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/contact/all`, { headers });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch contact messages');
        }
        return (await response.json()) as ContactMessage[];
    },

    async updateMessageStatus(id: number, status: 'unread' | 'read' | 'replied') {
        // We can use Supabase directly for updates if RLS allows, 
        // or add an endpoint in the backend. 
        // For now, let's use Supabase directly as it's faster to implement.
        const { data, error } = await supabase
            .from('contact_messages')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as ContactMessage;
    }
};
