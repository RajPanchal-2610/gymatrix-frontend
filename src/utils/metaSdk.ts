/**
 * Meta Facebook JavaScript SDK Wrapper for WhatsApp Embedded Signup v4
 * Handles singleton SDK loading, session postMessage listeners, and OAuth code retrieval
 */

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

export interface MetaSignupSessionData {
  phone_number_id?: string;
  waba_id?: string;
  current_step?: string;
  error_message?: string;
}

export interface MetaSignupResult {
  code: string;
  sessionData: MetaSignupSessionData;
}

let sdkLoadingPromise: Promise<any> | null = null;

/**
 * Loads and initializes the Facebook JavaScript SDK once.
 */
export function loadMetaSdk(appId: string): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not available'));
  }

  if (window.FB) {
    return Promise.resolve(window.FB);
  }

  if (sdkLoadingPromise) {
    return sdkLoadingPromise;
  }

  sdkLoadingPromise = new Promise((resolve, reject) => {
    // Timeout safeguard
    const timeout = setTimeout(() => {
      reject(new Error('Meta SDK load timed out. Please check your network connection or ad blockers.'));
    }, 15000);

    window.fbAsyncInit = function () {
      clearTimeout(timeout);
      try {
        window.FB.init({
          appId: appId,
          autoLogAppEvents: true,
          xfbml: true,
          version: 'v21.0' // Use current Graph API version
        });
        resolve(window.FB);
      } catch (err) {
        reject(err);
      }
    };

    // Check if script element already exists
    const existingScript = document.getElementById('facebook-jssdk');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load Meta Facebook SDK script. Ensure ad blockers permit connect.facebook.net.'));
      };
      document.head.appendChild(script);
    }
  });

  return sdkLoadingPromise;
}

/**
 * Launches the WhatsApp Embedded Signup flow (v4 with WhatsApp Business App Coexistence support)
 * using Facebook Login for Business config_id.
 */
export async function launchWhatsAppSignup(options: {
  appId: string;
  configId: string;
}): Promise<MetaSignupResult> {
  const { appId, configId } = options;

  if (!appId || !configId) {
    throw new Error('Meta App ID and Configuration ID must be set in your environment variables.');
  }

  const FB = await loadMetaSdk(appId);

  return new Promise((resolve, reject) => {
    let capturedSession: MetaSignupSessionData = {};

    // 1. Listen for postMessage sessionInfo events from the embedded popup
    const messageListener = (event: MessageEvent) => {
      // Validate origin from facebook.com
      if (!event.origin || !event.origin.endsWith('facebook.com')) {
        return;
      }

      try {
        const raw = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (raw?.type === 'WA_EMBEDDED_SIGNUP') {
          console.log('[Meta Embedded Signup Event]:', raw);

          if (raw.event === 'FINISH' && raw.data) {
            capturedSession = {
              phone_number_id: raw.data.phone_number_id,
              waba_id: raw.data.waba_id,
              current_step: raw.data.current_step
            };
          } else if (raw.event === 'CANCEL') {
            capturedSession.current_step = 'CANCELLED';
          } else if (raw.event === 'ERROR') {
            capturedSession.error_message = raw.data?.error_message || 'Embedded signup encountered an error';
          }
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', messageListener);

    // 2. Trigger FB.login with Facebook Login for Business configuration
    FB.login(
      (response: any) => {
        window.removeEventListener('message', messageListener);

        if (response?.authResponse?.code) {
          const authCode = response.authResponse.code;
          resolve({
            code: authCode,
            sessionData: capturedSession
          });
        } else {
          const errMsg =
            capturedSession.error_message ||
            'Signup cancelled or closed before completing WhatsApp authorization.';
          reject(new Error(errMsg));
        }
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          featureType: 'whatsapp_business_app_onboarding', // Meta Coexistence trigger
          sessionInfoVersion: '3',
          setup: {}
        }
      }
    );
  });
}

