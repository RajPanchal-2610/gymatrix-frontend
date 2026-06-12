import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Notification } from '@/types/gym';
import { toast } from 'sonner';

export function useNotifications(gymId: number | null, canViewFinance: boolean = true) {
  const navigate = useNavigate();
  const [rawNotifications, setRawNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState({
    new_member: true,
    payment_received: true,
    membership_expiring: true,
    overdue_payment: true,
  });

  // Keep references to values used in the websocket listener to prevent stale closures and frequent resubscriptions
  const userIdRef = useRef<string | null>(null);
  const preferencesRef = useRef(preferences);
  const canViewFinanceRef = useRef(canViewFinance);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    canViewFinanceRef.current = canViewFinance;
  }, [canViewFinance]);

  // Helper to check if a notification should be visible to this user
  const isNotificationVisible = useCallback((notif: Notification) => {
    // 1. Check role-based permission
    if ((notif.type === 'payment_received' || notif.type === 'overdue_payment') && !canViewFinance) {
      return false;
    }

    // 2. Check user toggle preferences
    if (notif.type === 'new_member' && preferences.new_member === false) return false;
    if (notif.type === 'payment_received' && preferences.payment_received === false) return false;
    if (notif.type === 'membership_expiring' && preferences.membership_expiring === false) return false;
    if (notif.type === 'overdue_payment' && preferences.overdue_payment === false) return false;

    return true;
  }, [canViewFinance, preferences]);

  // Helper using refs for the websocket subscription
  const checkVisibilityWithRefs = useCallback((notif: Notification) => {
    // 1. Check role-based permission
    if ((notif.type === 'payment_received' || notif.type === 'overdue_payment') && !canViewFinanceRef.current) {
      return false;
    }

    // 2. Check user toggle preferences
    const prefs = preferencesRef.current;
    if (notif.type === 'new_member' && prefs.new_member === false) return false;
    if (notif.type === 'payment_received' && prefs.payment_received === false) return false;
    if (notif.type === 'membership_expiring' && prefs.membership_expiring === false) return false;
    if (notif.type === 'overdue_payment' && prefs.overdue_payment === false) return false;

    return true;
  }, []);

  // Fetch initial notifications and user preferences
  const fetchNotifications = useCallback(async () => {
    if (!gymId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get current user ID and preferences
      let currentUserId = userIdRef.current;
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        currentUserId = user.id;
        setUserId(user.id);
        
        // Fetch preferences
        const { data: profile, error: prefError } = await supabase
          .from('profiles')
          .select('notification_preferences')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!prefError && profile?.notification_preferences) {
          setPreferences(prev => ({
            ...prev,
            ...profile.notification_preferences
          }));
        }
      }

      // Query notifications for this gym OR direct notifications for this user
      let query = supabase
        .from('notifications')
        .select('*')
        .or(`gym_id.eq.${gymId}${currentUserId ? `,user_id.eq.${currentUserId}` : ''}`)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      setRawNotifications(data || []);
    } catch (err: any) {
      console.error('Error fetching notifications:', err.message);
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  // Mark a single notification as read
  const markAsRead = async (id: string) => {
    try {
      // Optimistic update
      setRawNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err.message);
      // Revert optimistic update on failure
      fetchNotifications();
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!gymId) return;
    try {
      // Optimistic update
      setRawNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('gym_id', gymId)
        .eq('is_read', false);

      if (error) throw error;
      toast.success('All notifications marked as read');
    } catch (err: any) {
      console.error('Failed to mark all as read:', err.message);
      fetchNotifications();
    }
  };

  // Delete a single notification
  const deleteNotification = async (id: string) => {
    try {
      // Optimistic update
      setRawNotifications(prev => prev.filter(n => n.id !== id));

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err: any) {
      console.error('Failed to delete notification:', err.message);
      fetchNotifications();
    }
  };

  // Helper to trigger a notification from frontend
  const sendNotification = async (data: Omit<Notification, 'id' | 'is_read' | 'created_at'>) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          ...data,
          is_read: false
        });

      if (error) throw error;
    } catch (err: any) {
      console.error('Failed to send notification:', err.message);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    fetchNotifications();

    if (!gymId) return;

    // Subscribe to notification insertions and updates
    const channel = supabase
      .channel(`gym-notifications-${gymId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notifications'
        },
        async (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === 'INSERT') {
            const notif = newRecord as Notification;
            
            // Check scope (matches current gym or matches current user)
            const isForThisGym = notif.gym_id === gymId;
            const currentUserId = userIdRef.current;
            const isForThisUser = currentUserId && notif.user_id === currentUserId;
            
            if (isForThisGym || isForThisUser) {
              setRawNotifications(prev => [notif, ...prev]);
              
              // Only trigger a toast alert on the web dashboard if it matches preferences and wasn't triggered by current user
              if (checkVisibilityWithRefs(notif)) {
                if (!notif.triggered_by || notif.triggered_by !== currentUserId) {
                  toast(notif.title, {
                    description: notif.message,
                    action: {
                      label: 'View',
                      onClick: () => {
                        if (notif.type === 'new_member' || notif.type === 'membership_expiring') {
                          navigate('/members');
                        } else if (notif.type === 'payment_received' || notif.type === 'overdue_payment') {
                          navigate('/payments');
                        } else {
                          navigate('/notifications');
                        }
                      }
                    }
                  });
                }
              }
            }
          } else if (eventType === 'UPDATE') {
            const notif = newRecord as Notification;
            setRawNotifications(prev =>
              prev.map(n => (n.id === notif.id ? notif : n))
            );
          } else if (eventType === 'DELETE') {
            const id = oldRecord.id;
            setRawNotifications(prev => prev.filter(n => n.id !== id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gymId, fetchNotifications, checkVisibilityWithRefs]);

  // Listen to profile/settings updates to refresh preferences in real-time
  useEffect(() => {
    const handleProfileUpdate = () => {
      fetchNotifications();
    };

    window.addEventListener("profile-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, [fetchNotifications]);

  // Filter raw notifications based on the current user's preferences and role
  const filteredNotifications = useMemo(() => {
    return rawNotifications.filter(isNotificationVisible);
  }, [rawNotifications, isNotificationVisible]);

  const unreadCount = filteredNotifications.filter(n => !n.is_read).length;

  return {
    notifications: filteredNotifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendNotification,
    refresh: fetchNotifications
  };
}
