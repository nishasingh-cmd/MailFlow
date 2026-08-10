import { useState, useCallback, useRef } from 'react';
import { whatsappService } from '../services/whatsapp.service';
import { WhatsappConfigData } from '@mailflow/shared';

export type EmbeddedSignupStatus =
  'idle' | 'loading_sdk' | 'ready' | 'signing_up' | 'processing' | 'connected' | 'error';

export interface EmbeddedSignupState {
  status: EmbeddedSignupStatus;
  error: string | null;
  config: WhatsappConfigData | null;
}

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

let sdkLoaded = false;
let sdkLoading = false;
const sdkCallbacks: Array<() => void> = [];

function loadFacebookSDK(appId: string, graphVersion: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (sdkLoaded && window.FB) {
      resolve();
      return;
    }

    if (sdkLoading) {
      sdkCallbacks.push(resolve);
      return;
    }

    sdkLoading = true;
    sdkCallbacks.push(resolve);

    window.fbAsyncInit = () => {
      window.FB.init({
        appId,
        autoLogAppEvents: true,
        xfbml: false,
        version: graphVersion,
      });

      sdkLoaded = true;
      sdkLoading = false;

      sdkCallbacks.forEach((cb) => cb());
      sdkCallbacks.length = 0;
    };

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

  const launch = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
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

      try {
        await loadFacebookSDK(appId, graphApiVersion);
      } catch {
        setStatus('error', 'Failed to load Facebook SDK. Please check your internet connection.');
        return;
      }

      setStatus('signing_up');

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
