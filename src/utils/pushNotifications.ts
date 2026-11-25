import { supabase } from '@/lib/supabase';

/**
 * Convert a base64 string to a Uint8Array for the VAPID applicationServerKey
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if Web Push Notifications are supported by the current browser
 */
export function isPushNotificationSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Check if the current browser already has an active push subscription
 */
export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.error('Error checking existing push subscription:', err);
    return null;
  }
}

/**
 * Subscribe the user to Chrome Web Push Notifications
 */
export async function subscribeToPushNotifications(gymId?: number | null): Promise<{
  success: boolean;
  message: string;
  subscription?: PushSubscription;
}> {
  if (!isPushNotificationSupported()) {
    return {
      success: false,
      message: 'Push notifications are not supported by this browser.'
    };
  }

  // 1. Request notification permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      success: false,
      message: permission === 'denied'
        ? 'Notification permission was denied in your browser settings. Please click the padlock or site settings icon in the Chrome URL bar to allow notifications.'
        : 'Notification permission was dismissed.'
    };
  }

  // 2. Resolve VAPID Public Key
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.error('Missing VITE_VAPID_PUBLIC_KEY in environment variables');
    return {
      success: false,
      message: 'VAPID public key is missing. Check VITE_VAPID_PUBLIC_KEY in environment.'
    };
  }

  try {
    // 3. Get ready service worker
    const registration = await navigator.serviceWorker.ready;

    // 4. Check for existing subscription or create new one
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return {
        success: false,
        message: 'Browser generated an invalid push subscription.'
      };
    }

    // 5. Save directly in Supabase table push_subscriptions as well for immediate persistence
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        gym_id: gymId || null,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
        user_agent: navigator.userAgent
      }, { onConflict: 'endpoint' });
    }

    // 6. Send subscription to Gymatrix Backend API
    const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        message: 'User session not found. Please log in first.'
      };
    }

    const res = await fetch(`${backendUrl}/api/notifications/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth
        },
        gymId: gymId || null
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to save subscription on backend');
    }

    return {
      success: true,
      message: 'Chrome Web Push Notifications successfully enabled!',
      subscription
    };
  } catch (err: any) {
    console.error('Failed to subscribe to web push:', err);
    return {
      success: false,
      message: err.message || 'Failed to subscribe to web push notifications.'
    };
  }
}

/**
 * Unsubscribe from Web Push Notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<{ success: boolean; message: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, message: 'Push notifications unsupported' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Notify backend to remove from DB
      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
      await fetch(`${backendUrl}/api/notifications/push/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint })
      }).catch(err => console.warn('Could not remove subscription from backend:', err));
    }

    return {
      success: true,
      message: 'Unsubscribed from web push notifications.'
    };
  } catch (err: any) {
    console.error('Failed to unsubscribe:', err);
    return {
      success: false,
      message: err.message || 'Failed to unsubscribe.'
    };
  }
}

/**
 * Send a test push notification from the backend to verify receipt
 */
export async function sendTestPushNotification(gymId?: number | null): Promise<{ success: boolean; message: string }> {
  try {
    // Always ensure the device is subscribed and registered in database first
    await subscribeToPushNotifications(gymId);

    const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, message: 'Please log in to test notifications.' };
    }

    const res = await fetch(`${backendUrl}/api/notifications/push/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ gymId })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to send test push');
    }

    return {
      success: true,
      message: data.message || 'Test notification dispatched!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to trigger test notification.'
    };
  }
}
