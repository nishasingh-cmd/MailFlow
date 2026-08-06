/**
 * MailFlow — Phase 2: WhatsApp Business Embedded Signup
 * Onboarding Service
 *
 * Handles:
 *  1. OAuth code → access token exchange via Meta Graph API
 *  2. Fetching WABA and phone number details
 *  3. Encrypted credential storage in WhatsappConfig
 *  4. Connection verification (GET phone number endpoint)
 *  5. Refresh (re-sync phone/WABA info)
 *  6. Disconnect (clear credentials, preserve history)
 *
 * Security rules:
 *  - Never log access tokens, authorization headers, or secrets
 *  - Encrypt before DB write; decrypt only inside this service for API calls
 *  - Never return raw token in any response
 */
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/crypto';
import { env } from '../../config/env';

const prisma = new PrismaClient();

// ─── Meta API response types ──────────────────────────────────────────────────

interface MetaTokenResponse {
  access_token?: string;
  token_type?: string;
  error?: { message?: string; code?: number; type?: string };
}

interface MetaPhoneNumberResponse {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  status?: string;
  error?: { message?: string; code?: number };
}

interface MetaWabaResponse {
  id?: string;
  name?: string;
  error?: { message?: string; code?: number };
}

// ─── Normalised WhatsappConfig shape returned by service methods ──────────────

export interface WhatsappConfigSnapshot {
  id?: string;
  provider: 'MOCK' | 'META_CLOUD';
  businessAccountId?: string | null;
  businessName?: string | null;
  phoneNumberId?: string | null;
  displayPhone?: string | null;
  hasAccessToken: boolean;
  webhookVerifyToken?: string | null;
  hasAppSecret?: boolean;
  graphApiVersion?: string | null;
  webhookUrl?: string | null;
  status: 'MOCK_ACTIVE' | 'CONNECTED' | 'DISCONNECTED' | 'FAILED';
  errorMessage?: string | null;
  lastTestedAt?: string | null;
  connectedAt?: string | null;
}

// ─── Helper: build normalised snapshot from Prisma record ────────────────────

function buildSnapshot(wa: Record<string, unknown> | null, userId: string): WhatsappConfigSnapshot {
  if (!wa) {
    return {
      provider: 'MOCK',
      businessAccountId: null,
      businessName: null,
      phoneNumberId: null,
      displayPhone: null,
      hasAccessToken: false,
      webhookVerifyToken: 'mailflow_verify_token',
      hasAppSecret: false,
      graphApiVersion: env.WHATSAPP_GRAPH_API_VERSION || 'v25.0',
      webhookUrl: `https://api.mailflow.io/v1/webhooks/whatsapp/${userId}`,
      status: 'MOCK_ACTIVE',
      errorMessage: null,
      lastTestedAt: null,
      connectedAt: null,
    };
  }

  return {
    id: wa.id as string | undefined,
    provider: (wa.provider as 'MOCK' | 'META_CLOUD') || 'MOCK',
    businessAccountId: (wa.businessAccountId as string | null) ?? null,
    businessName: (wa.businessName as string | null) ?? null,
    phoneNumberId: (wa.phoneNumberId as string | null) ?? null,
    displayPhone: (wa.displayPhone as string | null) ?? null,
    hasAccessToken: Boolean(wa.accessToken),
    webhookVerifyToken: (wa.webhookVerifyToken as string | null) ?? 'mailflow_verify_token',
    hasAppSecret: Boolean(wa.appSecret),
    graphApiVersion:
      (wa.graphApiVersion as string | null) ?? env.WHATSAPP_GRAPH_API_VERSION ?? 'v25.0',
    webhookUrl:
      (wa.webhookUrl as string | null) ?? `https://api.mailflow.io/v1/webhooks/whatsapp/${userId}`,
    status: (wa.status as 'MOCK_ACTIVE' | 'CONNECTED' | 'DISCONNECTED' | 'FAILED') ?? 'MOCK_ACTIVE',
    errorMessage: (wa.errorMessage as string | null) ?? null,
    lastTestedAt: wa.lastTestedAt ? new Date(wa.lastTestedAt as string).toISOString() : null,
    connectedAt: wa.connectedAt ? new Date(wa.connectedAt as string).toISOString() : null,
  };
}

// ─── Helper: exchange OAuth code for access token ─────────────────────────────
//
// IMPORTANT — redirect_uri behaviour for the Embedded Signup JS SDK flow:
//
// Even though FB.login() opens a popup (no browser redirect), Meta's SDK
// internally ties the generated authorization code to the URL of the page
// that called FB.login() (window.location.href). This implicit redirect_uri
// MUST be forwarded to /oauth/access_token, or Meta rejects the exchange with
// error_subcode 36008 ("Error validating verification code").
//
// The frontend captures window.location.href before calling FB.login() and
// forwards it here. Authorization codes are single-use — if the exchange
// fails, the code is burned and the user must restart the flow.
async function exchangeCodeForToken(code: string, redirectUri?: string): Promise<string> {
  const appId = env.WHATSAPP_APP_ID;
  const appSecret = env.WHATSAPP_APP_SECRET;
  const graphVersion = env.WHATSAPP_GRAPH_API_VERSION || 'v25.0';

  if (!appId || !appSecret) {
    throw new Error(
      'Meta App ID and App Secret are required for Embedded Signup. Please configure WHATSAPP_APP_ID and WHATSAPP_APP_SECRET in your .env file.'
    );
  }

  const url = `https://graph.facebook.com/${graphVersion}/oauth/access_token`;
  const paramObj: Record<string, string> = {
    client_id: appId,
    client_secret: appSecret,
    code,
  };

  // Include redirect_uri if provided — Meta requires it when the code was
  // generated by FB.login() since the SDK implicitly associates the page URL.
  if (redirectUri) {
    paramObj.redirect_uri = redirectUri;
  }

  const params = new URLSearchParams(paramObj);

  const response = await fetch(`${url}?${params.toString()}`, { method: 'GET' });
  const resData = (await response.json()) as MetaTokenResponse;

  if (!response.ok || !resData.access_token) {
    const errMsg = resData?.error?.message || `Token exchange failed (HTTP ${response.status}).`;
    console.error('[WhatsappOnboardingService] Token exchange failed from Meta:', {
      status: response.status,
      errorCode: resData?.error?.code,
      errorType: resData?.error?.type,
      errorMessage: errMsg,
      fullMetaResponse: resData,
    });
    throw new Error(`Meta OAuth error: ${errMsg}`);
  }

  console.log('[WhatsappOnboardingService] Token exchange completed successfully.');
  return resData.access_token;
}

// ─── Helper: fetch phone number details from Meta ─────────────────────────────

async function fetchPhoneNumberDetails(
  phoneNumberId: string,
  accessToken: string
): Promise<{
  displayPhone: string | null;
  verifiedName: string | null;
  qualityRating: string | null;
}> {
  const graphVersion = env.WHATSAPP_GRAPH_API_VERSION || 'v25.0';
  const url = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,status`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const resData = (await response.json()) as MetaPhoneNumberResponse;

  if (!response.ok || resData.error) {
    const errCode = resData?.error?.code;
    const errMsg = resData?.error?.message || `HTTP ${response.status}`;
    console.error('[WhatsappOnboardingService] Phone number validation failed:', {
      status: response.status,
      errorCode: errCode,
      message: errMsg,
    });

    if (errCode === 190) {
      throw new Error(
        'Access token is invalid or expired. Please generate a new permanent token from Meta Business Manager → System Users and paste it in the Manual Token field.'
      );
    } else if (errCode === 100) {
      throw new Error(
        `The access token does not have permission to access Phone Number ID "${phoneNumberId}". ` +
          'A User Access Token from FB.login cannot manage production WhatsApp Business numbers. ' +
          'Please generate a permanent System User Access Token from Meta Business Manager → Settings → System Users, ' +
          'assign whatsapp_business_management + whatsapp_business_messaging permissions, and paste it in Settings → WhatsApp → Manual Token Setup.'
      );
    }
    throw new Error(`Meta API validation failed (code ${errCode || response.status}): ${errMsg}`);
  }

  return {
    displayPhone: resData.display_phone_number ?? null,
    verifiedName: resData.verified_name ?? null,
    qualityRating: resData.quality_rating ?? null,
  };
}

// ─── Helper: fetch WABA details ───────────────────────────────────────────────

async function fetchWabaDetails(
  wabaId: string,
  accessToken: string
): Promise<{ name: string | null }> {
  const graphVersion = env.WHATSAPP_GRAPH_API_VERSION || 'v25.0';
  const url = `https://graph.facebook.com/${graphVersion}/${wabaId}?fields=id,name`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const resData = (await response.json()) as MetaWabaResponse;

  if (!response.ok || resData.error) {
    // Non-fatal — WABA name is optional for connection
    console.warn('[WhatsappOnboardingService] WABA details fetch warning:', {
      status: response.status,
      errorCode: resData?.error?.code,
    });
    return { name: null };
  }

  return { name: resData.name ?? null };
}

// ─── Main Service ─────────────────────────────────────────────────────────────

export class WhatsappOnboardingService {
  /**
   * GET /api/whatsapp/status
   * Returns the current WhatsApp connection status for the user
   */
  static async getStatus(userId: string): Promise<{
    connected: boolean;
    config: WhatsappConfigSnapshot;
    appId: string;
  }> {
    const wa = await prisma.whatsappConfig.findUnique({ where: { userId } });
    const config = buildSnapshot(wa as Record<string, unknown> | null, userId);
    const connected = config.status === 'CONNECTED';
    const appId = env.WHATSAPP_APP_ID || '';

    return { connected, config, appId };
  }

  /**
   * POST /api/whatsapp/connect
   * Returns Meta App config needed for the frontend to initialise the FB SDK
   */
  static async initConnect(): Promise<{
    appId: string;
    configId: string;
    graphApiVersion: string;
  }> {
    if (!env.WHATSAPP_APP_ID) throw new Error('WHATSAPP_APP_ID is not configured.');
    if (!env.WHATSAPP_CONFIG_ID) throw new Error('WHATSAPP_CONFIG_ID is not configured.');
    return {
      appId: env.WHATSAPP_APP_ID,
      configId: env.WHATSAPP_CONFIG_ID,
      graphApiVersion: env.WHATSAPP_GRAPH_API_VERSION || 'v25.0',
    };
  }

  /**
   * POST /api/whatsapp/callback
   * Handles the OAuth code returned by Meta Embedded Signup.
   * 1. Exchange code for access token (forwarding redirectUri to Meta)
   * 2. Fetch WABA + phone number details from Meta
   * 3. Encrypt and upsert WhatsappConfig
   * 4. Return normalised config snapshot
   *
   * `redirectUri` must be the URL of the page that called FB.login() on the
   * frontend (window.location.href). Meta's JS SDK implicitly ties the
   * generated code to that URL — omitting it causes error_subcode 36008.
   *
   * Supports two flows:
   *  - Direct token: frontend provides accessToken from FB.login authResponse
   *    → no code exchange needed, token used directly (preferred for dev)
   *  - Code exchange: frontend provides code → exchanged via /oauth/access_token
   *    (requires matching redirect_uri, works reliably on production domains)
   */
  static async handleCallback(
    userId: string,
    code?: string,
    accessToken?: string,
    wabaId?: string,
    phoneNumberId?: string,
    redirectUri?: string
  ): Promise<WhatsappConfigSnapshot> {
    console.log(
      `[WhatsappOnboardingService] Callback received for user ${userId}. Flow: ${accessToken ? 'direct_token' : 'code_exchange'}`
    );

    if (!code && !accessToken) {
      throw new Error(
        'Either authorization code or access token is required to complete WhatsApp connection.'
      );
    }

    // 1. Get access token — either directly or by exchanging the code
    const resolvedToken = accessToken
      ? accessToken
      : await exchangeCodeForToken(code!, redirectUri);

    console.log('[WhatsappOnboardingService] Access token resolved. Proceeding with WABA setup...');

    // 2. Determine phone number ID — use provided or fall back to env
    const resolvedPhoneNumberId = phoneNumberId || env.WHATSAPP_PHONE_NUMBER_ID;
    const resolvedWabaId = wabaId || env.WHATSAPP_BUSINESS_ACCOUNT_ID;

    if (!resolvedPhoneNumberId) {
      throw new Error(
        'Phone Number ID could not be determined from signup flow. Please re-connect and ensure a phone number is selected.'
      );
    }

    // 3. Fetch phone number details from Meta
    const phoneDetails = await fetchPhoneNumberDetails(resolvedPhoneNumberId, resolvedToken);
    console.log(
      `[WhatsappOnboardingService] Connection verified. Phone: ${phoneDetails.displayPhone || 'N/A'}`
    );

    // 4. Fetch WABA business name (non-fatal)
    let businessName: string | null = null;
    if (resolvedWabaId) {
      const wabaDetails = await fetchWabaDetails(resolvedWabaId, resolvedToken);
      businessName = wabaDetails.name;
    }

    // 5. Encrypt access token before storage
    const encryptedToken = encrypt(resolvedToken);
    const now = new Date();

    // 6. Upsert WhatsappConfig
    const wa = await (
      prisma.whatsappConfig as unknown as Record<
        string,
        (args: unknown) => Promise<Record<string, unknown>>
      >
    ).upsert({
      where: { userId },
      create: {
        userId,
        provider: 'META_CLOUD',
        businessAccountId: resolvedWabaId || null,
        businessName,
        phoneNumberId: resolvedPhoneNumberId,
        displayPhone: phoneDetails.displayPhone,
        accessToken: encryptedToken,
        graphApiVersion: env.WHATSAPP_GRAPH_API_VERSION || 'v25.0',
        webhookVerifyToken: env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'mailflow_verify_token',
        status: 'CONNECTED',
        connectedAt: now,
        lastTestedAt: now,
        errorMessage: null,
      },
      update: {
        provider: 'META_CLOUD',
        businessAccountId: resolvedWabaId || null,
        businessName,
        phoneNumberId: resolvedPhoneNumberId,
        displayPhone: phoneDetails.displayPhone,
        accessToken: encryptedToken,
        graphApiVersion: env.WHATSAPP_GRAPH_API_VERSION || 'v25.0',
        status: 'CONNECTED',
        connectedAt: now,
        lastTestedAt: now,
        errorMessage: null,
      },
    });

    console.log(
      `[WhatsappOnboardingService] Connection successful. Status: CONNECTED | User: ${userId}`
    );
    return buildSnapshot(wa, userId);
  }

  /**
   * POST /api/whatsapp/manual-connect
   * Directly saves a permanent System User Access Token + Phone Number ID.
   * Use this when the FB.login embedded signup token lacks the required
   * whatsapp_business_management / whatsapp_business_messaging permissions.
   *
   * Steps to get a valid token:
   *  1. Meta Business Manager → Settings → System Users
   *  2. Create/select a System User with Admin role
   *  3. Assign your WhatsApp app (whatsapp_business_management + whatsapp_business_messaging)
   *  4. Generate Token → copy it here
   */
  static async manualConnect(
    userId: string,
    accessToken: string,
    phoneNumberId: string,
    wabaId?: string
  ): Promise<WhatsappConfigSnapshot> {
    console.log(
      `[WhatsappOnboardingService] Manual connect initiated for user ${userId} | Phone ID: ${phoneNumberId}`
    );

    if (!accessToken?.trim()) throw new Error('Access token is required.');
    if (!phoneNumberId?.trim()) throw new Error('Phone Number ID is required.');

    // Validate token + phone ID against Meta before storing
    const phoneDetails = await fetchPhoneNumberDetails(phoneNumberId.trim(), accessToken.trim());
    console.log(
      `[WhatsappOnboardingService] Manual connect validated. Phone: ${phoneDetails.displayPhone}`
    );

    let businessName: string | null = null;
    const resolvedWabaId = wabaId?.trim() || env.WHATSAPP_BUSINESS_ACCOUNT_ID || null;
    if (resolvedWabaId) {
      try {
        const wabaDetails = await fetchWabaDetails(resolvedWabaId, accessToken.trim());
        businessName = wabaDetails.name;
      } catch {
        // Non-fatal: WABA name is optional
      }
    }

    const encryptedToken = encrypt(accessToken.trim());
    const now = new Date();

    const wa = await (
      prisma.whatsappConfig as unknown as Record<
        string,
        (args: unknown) => Promise<Record<string, unknown>>
      >
    ).upsert({
      where: { userId },
      create: {
        userId,
        provider: 'META_CLOUD',
        businessAccountId: resolvedWabaId,
        businessName,
        phoneNumberId: phoneNumberId.trim(),
        displayPhone: phoneDetails.displayPhone,
        accessToken: encryptedToken,
        graphApiVersion: env.WHATSAPP_GRAPH_API_VERSION || 'v25.0',
        webhookVerifyToken: env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'mailflow_verify_token',
        status: 'CONNECTED',
        connectedAt: now,
        lastTestedAt: now,
        errorMessage: null,
      },
      update: {
        provider: 'META_CLOUD',
        businessAccountId: resolvedWabaId,
        businessName,
        phoneNumberId: phoneNumberId.trim(),
        displayPhone: phoneDetails.displayPhone,
        accessToken: encryptedToken,
        graphApiVersion: env.WHATSAPP_GRAPH_API_VERSION || 'v25.0',
        status: 'CONNECTED',
        connectedAt: now,
        lastTestedAt: now,
        errorMessage: null,
      },
    });

    console.log(
      `[WhatsappOnboardingService] Manual connect successful. Status: CONNECTED | User: ${userId}`
    );
    return buildSnapshot(wa, userId);
  }

  /**
   * POST /api/whatsapp/refresh
   * Re-fetches latest phone number details from Meta without requiring re-auth.
   * Updates displayPhone, qualityRating, businessName in DB.
   */
  static async refresh(userId: string): Promise<WhatsappConfigSnapshot> {
    console.log(`[WhatsappOnboardingService] Refresh started for user ${userId}`);

    const wa = await prisma.whatsappConfig.findUnique({ where: { userId } });
    const waAny = wa as Record<string, unknown> | null;

    if (!wa || !wa.phoneNumberId || !wa.accessToken) {
      throw new Error(
        'No active Meta WhatsApp connection found. Please connect your WhatsApp Business Account first.'
      );
    }

    // Decrypt access token for API call
    let rawToken: string;
    try {
      rawToken = decrypt(wa.accessToken);
    } catch {
      rawToken = wa.accessToken;
    }

    const phoneDetails = await fetchPhoneNumberDetails(wa.phoneNumberId, rawToken);

    let businessName = (waAny?.businessName as string | null) ?? null;
    if (wa.businessAccountId) {
      const wabaDetails = await fetchWabaDetails(wa.businessAccountId, rawToken);
      businessName = wabaDetails.name ?? businessName;
    }

    const now = new Date();
    const updated = await (
      prisma.whatsappConfig as unknown as Record<
        string,
        (args: unknown) => Promise<Record<string, unknown>>
      >
    ).update({
      where: { userId },
      data: {
        displayPhone: phoneDetails.displayPhone,
        businessName,
        status: 'CONNECTED',
        lastTestedAt: now,
        errorMessage: null,
      },
    });

    console.log(`[WhatsappOnboardingService] Refresh completed for user ${userId}`);
    return buildSnapshot(updated, userId);
  }

  /**
   * POST /api/whatsapp/disconnect
   * Clears all Meta credentials, sets status to DISCONNECTED.
   * PRESERVES: WhatsappLog, WhatsappQueue, WhatsappDraft (historical records).
   */
  static async disconnect(userId: string): Promise<void> {
    console.log(`[WhatsappOnboardingService] Disconnecting WhatsApp for user ${userId}`);

    await (
      prisma.whatsappConfig as unknown as Record<
        string,
        (args: unknown) => Promise<Record<string, unknown>>
      >
    ).upsert({
      where: { userId },
      create: {
        userId,
        provider: 'MOCK',
        status: 'DISCONNECTED',
        businessAccountId: null,
        businessName: null,
        phoneNumberId: null,
        displayPhone: null,
        accessToken: null,
        appSecret: null,
        connectedAt: null,
        errorMessage: null,
        webhookVerifyToken: env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'mailflow_verify_token',
      },
      update: {
        provider: 'MOCK',
        status: 'DISCONNECTED',
        businessAccountId: null,
        businessName: null,
        phoneNumberId: null,
        displayPhone: null,
        accessToken: null,
        appSecret: null,
        connectedAt: null,
        errorMessage: null,
      },
    });

    console.log(`[WhatsappOnboardingService] Disconnected successfully for user ${userId}`);
  }
}
