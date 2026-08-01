/**
 * MailFlow — Phase 2: WhatsApp Business Embedded Signup
 * useMetaEmbeddedSignup React Hook
 *
 * Manages the complete Meta Facebook Login SDK lifecycle:
 *  1. Dynamically loads connect.facebook.net/en_US/sdk.js (once per session)
 *  2. Initialises FB with the MailFlow Meta App ID
 *  3. Opens the Embedded Signup OAuth popup
 *  4. Extracts the authorization code from the response
 *  5. Relays the code to the MailFlow backend for token exchange
 */
import { useState, useCallback, useRef } from 'react';
import { whatsappService } from '../services/whatsapp.service';
import { WhatsappConfigData } from '@mailflow/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmbeddedSignupStatus =
  'idle' | 'loading_sdk' | 'ready' | 'signing_up' | 'processing' | 'connected' | 'error';

export interface EmbeddedSignupState {
  status: EmbeddedSignupStatus;
  error: string | null;
  config: WhatsappConfigData | null;
}

// Minimal Facebook SDK type declarations
declare global {
  interface Window {
    FB: {
      init: (params: {
        appId: string;
        autoLogAppEvents?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        opts?: { scope?: string; response_type?: string; extras?: Record<string, unknown> }
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

interface FacebookLoginResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: {
    code?: string;
    accessToken?: string;
    userID?: string;
    expiresIn?: number;
  };
}

// ─── SDK Loader ───────────────────────────────────────────────────────────────

let sdkLoaded = false;
let sdkLoading = false;
const sdkCallbacks: Array<() => void> = [];

function loadFacebookSDK(appId: string, graphVersion: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (sdkLoaded && window.FB) {
      resolve();
      return;
    }

    // If currently loading, queue the callback
    if (sdkLoading) {
      sdkCallbacks.push(resolve);
      return;
    }

    sdkLoading = true;
    sdkCallbacks.push(resolve);

    // FB async init callback — runs when SDK is ready
    window.fbAsyncInit = () => {
      window.FB.init({
        appId,
        autoLogAppEvents: true,
        xfbml: false,
        version: graphVersion,
      });

      sdkLoaded = true;
      sdkLoading = false;

      // Resolve all queued promises
      sdkCallbacks.forEach((cb) => cb());
      sdkCallbacks.length = 0;
    };

    // Dynamically insert the SDK script
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => {
      sdkLoading = false;
      reject(new Error('Failed to load Facebook SDK. Please check your internet connection.'));
    };

    const firstScript = document.getElementsByTagName('script')[0];
    firstScript?.parentNode?.insertBefore(script, firstScript);
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMetaEmbeddedSignup(onSuccess?: (config: WhatsappConfigData) => void) {
  const [state, setState] = useState<EmbeddedSignupState>({
    status: 'idle',
    error: null,
    config: null,
  });

  const processingRef = useRef(false);

  const setStatus = useCallback((status: EmbeddedSignupStatus, error: string | null = null) => {
    setState((prev) => ({ ...prev, status, error }));
  }, []);

  /**
   * Launch the Meta Embedded Signup popup.
   * Call this from a user gesture (button click) to avoid popup blockers.
   */
  const launch = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      // 1. Get App ID from backend
      setStatus('loading_sdk');
      let appId: string;
      let graphApiVersion: string;

      try {
        const sdkConfig = await whatsappService.initConnect();
        appId = sdkConfig.appId;
        graphApiVersion = sdkConfig.graphApiVersion;
      } catch (err) {
        const msg = (err as Error).message || 'Unable to retrieve WhatsApp App configuration.';
        setStatus('error', msg);
        return;
      }

      if (!appId) {
        setStatus(
          'error',
          'WhatsApp App ID is not configured on the server. Please add WHATSAPP_APP_ID to your .env file.'
        );
        return;
      }

      // 2. Load & initialise Facebook SDK
      try {
        await loadFacebookSDK(appId, graphApiVersion);
      } catch {
        setStatus('error', 'Failed to load Facebook SDK. Please check your internet connection.');
        return;
      }

      setStatus('signing_up');

      // 3. Open the Embedded Signup popup
      await new Promise<void>((resolve, reject) => {
        window.FB.login(
          async (response: FacebookLoginResponse) => {
            try {
              if (response.status === 'connected' && response.authResponse?.code) {
                // 4. Got the auth code — relay to backend for token exchange
                setStatus('processing');

                const code = response.authResponse.code;
                const result = await whatsappService.handleCallback({ code });

                setState({
                  status: 'connected',
                  error: null,
                  config: result.config,
                });

                onSuccess?.(result.config);
                resolve();
              } else if (response.status === 'not_authorized') {
                reject(
                  new Error(
                    'WhatsApp Business permissions were not granted. Please allow the required permissions to connect.'
                  )
                );
              } else {
                // User closed the popup or unknown state
                reject(new Error('Connection cancelled. Please try again.'));
              }
            } catch (callbackErr) {
              reject(callbackErr);
            }
          },
          {
            scope: 'whatsapp_business_management,whatsapp_business_messaging,business_management',
            response_type: 'code',
            extras: {
              setup: {},
              featureType: 'whatsapp_embedded_signup',
              sessionInfoVersion: '3',
            },
          }
        );
      });
    } catch (err) {
      const message = (err as Error).message || 'An unexpected error occurred. Please try again.';
      setStatus('error', message);
    } finally {
      processingRef.current = false;
    }
  }, [onSuccess, setStatus]);

  const reset = useCallback(() => {
    setState({ status: 'idle', error: null, config: null });
    processingRef.current = false;
  }, []);

  return { ...state, launch, reset };
}
