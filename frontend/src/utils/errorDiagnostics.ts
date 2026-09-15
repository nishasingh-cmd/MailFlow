export interface ErrorDiagnostic {
  code?: string;
  badge: string;
  title: string;
  summary: string;
  solution: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Parses raw WhatsApp (Meta Cloud API) and SMTP delivery error messages,
 * extracts error codes, and returns human-actionable diagnosis and solutions.
 */
export function resolveDeliveryError(errorMessage?: string | null): ErrorDiagnostic {
  if (!errorMessage || !errorMessage.trim()) {
    return {
      badge: 'Unknown Error',
      title: 'Unknown Delivery Failure',
      summary: 'Delivery attempt failed without a specific error message from the provider.',
      solution:
        'Click "Retry" to re-dispatch. If it fails again, verify API configuration in Settings.',
      severity: 'warning',
    };
  }

  const msg = errorMessage.trim();

  // 1. Meta 132001: Template does not exist in translation
  if (/132001|Template name does not exist in the translation/i.test(msg)) {
    return {
      code: '#132001',
      badge: 'Meta #132001 • Template Not Found',
      title: 'Template Name or Language Mismatch',
      summary: 'The template name or language code does not exist in Meta WhatsApp Manager.',
      solution:
        'Verify the template is approved in Meta WhatsApp Manager and that the language code (e.g. "en" vs "en_US") matches your Campaign template configuration.',
      severity: 'error',
    };
  }

  // 2. Meta 131049: Healthy ecosystem engagement
  if (/131049|healthy ecosystem engagement/i.test(msg)) {
    return {
      code: '#131049',
      badge: 'Meta #131049 • Ecosystem Limit',
      title: 'Meta Delivery Protection Limit',
      summary: 'Meta throttled messages to this recipient to maintain ecosystem quality.',
      solution:
        'Meta marketing rate limit reached for this recipient. Wait 24–48 hours before retrying, or reach out to this contact via Email outreach.',
      severity: 'warning',
    };
  }

  // 3. Meta 131047: 24-hour window expired / Re-engagement message
  if (/131047|24 hours|customer service window|re-engagement/i.test(msg)) {
    return {
      code: '#131047',
      badge: 'Meta #131047 • 24h Window Closed',
      title: 'Customer Service Window Expired',
      summary: 'More than 24 hours have passed since the customer last messaged your business.',
      solution:
        'Free-form messages are blocked after 24 hours. Send an approved Meta WhatsApp Template message to re-open the conversation.',
      severity: 'error',
    };
  }

  // 4. Meta 131026: Message undeliverable / not on WhatsApp
  if (/131026|Message undeliverable/i.test(msg)) {
    return {
      code: '#131026',
      badge: 'Meta #131026 • Undeliverable',
      title: 'Recipient Not on WhatsApp',
      summary: 'The phone number cannot receive WhatsApp messages.',
      solution:
        'Verify the recipient has an active WhatsApp account and their phone number includes the correct international country code without dashes or spaces.',
      severity: 'error',
    };
  }

  // 5. Meta 130429: Rate limit hit / Throughput exceeded
  if (/130429|rate limit|throughput limit/i.test(msg)) {
    return {
      code: '#130429',
      badge: 'Meta #130429 • Rate Limit',
      title: 'Meta Cloud API Rate Limit Exceeded',
      summary: 'Sent too many messages in a short timeframe for your current account tier.',
      solution:
        'Set Campaign Sending Speed to "NORMAL" or "SLOW" in Settings, wait 5–10 minutes, and click "Retry".',
      severity: 'warning',
    };
  }

  // 6. Meta 132000: Template does not exist
  if (/132000|template.*does not exist/i.test(msg)) {
    return {
      code: '#132000',
      badge: 'Meta #132000 • Missing Template',
      title: 'Template Does Not Exist in Meta',
      summary: 'The requested template was not found in your WhatsApp Business Account.',
      solution:
        'Create and submit the template for approval in Meta WhatsApp Manager before dispatching.',
      severity: 'error',
    };
  }

  // 7. Meta 132007: Template parameter mismatch / variable count
  if (/132007|parameter.*mismatch|variable.*count/i.test(msg)) {
    return {
      code: '#132007',
      badge: 'Meta #132007 • Variable Mismatch',
      title: 'Template Variables Mismatched',
      summary: 'Template parameter count does not match the required variables.',
      solution:
        'Ensure dynamic variables like {{1}} (Lead Name) and {{2}} (Company) are properly mapped and that the lead has non-empty values.',
      severity: 'error',
    };
  }

  // 8. Meta 132015: Template paused / disabled
  if (/132015|template.*paused|template.*disabled/i.test(msg)) {
    return {
      code: '#132015',
      badge: 'Meta #132015 • Template Paused',
      title: 'Template Paused by Meta',
      summary: 'Meta paused this template due to low quality rating or high recipient block rate.',
      solution:
        'Check template quality in Meta WhatsApp Manager. Switch the campaign to another active approved template.',
      severity: 'error',
    };
  }

  // 9. Meta 190 / OAuth token expired
  if (/190|OAuthException|access token|token.*expired|invalid.*token/i.test(msg)) {
    return {
      code: '#190',
      badge: 'Meta #190 • Auth Expired',
      title: 'Meta Access Token Expired',
      summary: 'Your Meta Cloud API access token is expired or invalid.',
      solution:
        'Go to Settings > WhatsApp API and generate a permanent System User Token with whatsapp_business_messaging permissions.',
      severity: 'error',
    };
  }

  // 10. Meta 100: Invalid parameter
  if (/\b100\b|invalid parameter/i.test(msg)) {
    return {
      code: '#100',
      badge: 'Meta #100 • Invalid Parameter',
      title: 'Invalid Request Parameter',
      summary: 'Phone Number ID or message structure is rejected by Meta API.',
      solution:
        'Check Settings > WhatsApp API to verify your Phone Number ID and WhatsApp Business Account ID.',
      severity: 'error',
    };
  }

  // 11. Invalid Phone / Country Code
  if (/country code|phone.*invalid|not registered|missing prefix|E164/i.test(msg)) {
    return {
      badge: 'Phone Format Error',
      title: 'Missing or Invalid Country Code',
      summary: 'Phone number format must follow international E.164 standard.',
      solution:
        'Add country code with leading "+" (e.g., +91 for India, +1 for US). Edit lead phone number and retry.',
      severity: 'error',
    };
  }

  // 12. SMTP 535: Authentication failed
  if (/535|authentication failed|bad credentials|login failed/i.test(msg)) {
    return {
      code: 'SMTP 535',
      badge: 'SMTP 535 • Auth Error',
      title: 'SMTP Authentication Failed',
      summary: 'The email server rejected the username or password credentials.',
      solution:
        'Update SMTP credentials in Settings. For Gmail, use an App Password (requires 2-Step Verification enabled).',
      severity: 'error',
    };
  }

  // 13. SMTP Connection Timeout / Network
  if (/ETIMEDOUT|ECONNREFUSED|connection timed out|getaddrinfo/i.test(msg)) {
    return {
      badge: 'SMTP Timeout',
      title: 'SMTP Connection Timed Out',
      summary: 'Unable to connect to the SMTP server host or port.',
      solution:
        'Verify SMTP Host and Port in Settings (Port 465 for SSL, 587 for TLS). Ensure firewall permits outbound connections.',
      severity: 'warning',
    };
  }

  // 14. SMTP 550 / 552: Mailbox unavailable
  if (/550|552|554|mailbox.*unavailable|user not found|recipient rejected/i.test(msg)) {
    return {
      code: 'SMTP 550',
      badge: 'SMTP 550 • Undeliverable',
      title: 'Recipient Mailbox Unavailable',
      summary: 'Recipient email address was rejected by the receiving mail server.',
      solution:
        'Check the lead’s email address for typos or verify the inbox is active and not over quota.',
      severity: 'error',
    };
  }

  // Default fallback:
  return {
    badge: 'Delivery Error',
    title: 'Provider Delivery Failure',
    summary: msg,
    solution:
      'Check recipient contact details and click "Retry". If the error persists, review API credentials in Settings.',
    severity: 'error',
  };
}
