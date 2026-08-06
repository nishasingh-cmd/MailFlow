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
        opts?: {
          config_id?: string;
          scope?: string;
          response_type?: string;
          override_default_response_type?: boolean;
          redirect_uri?: string;
          extras?: Record<string, unknown>;
        }
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
      let configId: string;
      let graphApiVersion: string;

      try {
        const sdkConfig = await whatsappService.initConnect();
        appId = sdkConfig.appId;
        configId = sdkConfig.configId;
        graphApiVersion = sdkConfig.graphApiVersion;
      } catch (err) {
        const msg = (err as Error).message || 'Unable to retrieve WhatsApp App configuration.';
        setStatus('error', msg);
        return;
      }

      if (!appId || !configId) {
        setStatus(
          'error',
          'WhatsApp App ID or Config ID is not configured on the server. Please add WHATSAPP_APP_ID and WHATSAPP_CONFIG_ID to your .env file.'
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

      // Variables to store WABA & Phone ID received from Meta window message
      let metaWabaId: string | undefined;
      let metaPhoneId: string | undefined;

      const messageHandler = (event: MessageEvent) => {
        if (event.origin && event.origin.includes('facebook.com')) {
          try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            if (data?.type === 'WA_EMBEDDED_SIGNUP' || data?.event === 'WA_EMBEDDED_SIGNUP') {
              const info = data.data || data.event_data;
              if (info) {
                metaWabaId = info.waba_id || info.wabaId;
                metaPhoneId = info.phone_number_id || info.phoneNumberId;
              }
            }
          } catch {
            // ignore non-json messages
          }
        }
      };

      window.addEventListener('message', messageHandler);

      // 3. Open the Embedded Signup popup.
      // IMPORTANT: We do NOT use response_type:'code' here. The code exchange
      // flow (FB.login → code → /oauth/access_token) consistently fails with
      // error_subcode 36008 because the SDK popup uses an internal Facebook
      // relay URL as the implicit redirect_uri — one that is not accessible to
      // us and cannot be replicated in the token exchange request.
      //
      // Instead, we request the access token directly from the FB.login
      // authResponse. The config_id ensures the user completes the full
      // WhatsApp Embedded Signup flow and grants the correct WABA permissions.
      // The access token returned is then sent to the backend for storage.
      try {
        await new Promise<void>((resolve, reject) => {
          window.FB.login(
            (response: FacebookLoginResponse) => {
              (async () => {
                try {
                  if (response.status === 'connected' && response.authResponse?.accessToken) {
                    setStatus('processing');

                    const accessToken = response.authResponse.accessToken;

                    const result = await whatsappService.handleCallback({
                      accessToken,
                      wabaId: metaWabaId,
                      phoneNumberId: metaPhoneId,
                    });

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
                } catch (callbackErr: unknown) {
                  const axiosErr = callbackErr as {
                    response?: { data?: { error?: string } };
                    message?: string;
                  };
                  const msg =
                    axiosErr.response?.data?.error ||
                    axiosErr.message ||
                    'Failed to complete WhatsApp connection.';
                  reject(new Error(msg));
                }
              })();
            },
            {
              config_id: configId,
              extras: {
                setup: {},
                featureType: 'whatsapp_embedded_signup',
                sessionInfoVersion: '3',
              },
            }
          );
        });
      } finally {
        window.removeEventListener('message', messageHandler);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      const message =
        axiosErr.response?.data?.error ||
        axiosErr.message ||
        'An unexpected error occurred. Please try again.';
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
