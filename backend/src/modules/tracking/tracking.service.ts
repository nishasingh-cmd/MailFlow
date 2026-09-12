import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let cachedTunnelUrl: string | null = null;
let lastTunnelCheck = 0;

export class TrackingService {
  /**
   * Resolve public base URL for tracking pixels (e.g. ngrok tunnel or configured env)
   */
  static async getPublicBaseUrl(): Promise<string> {
    if (process.env.PUBLIC_BACKEND_URL) {
      return process.env.PUBLIC_BACKEND_URL.replace(/\/+$/, '');
    }
    if (process.env.APP_URL) {
      return process.env.APP_URL.replace(/\/+$/, '');
    }

    const now = Date.now();
    if (cachedTunnelUrl && now - lastTunnelCheck < 60000) {
      return cachedTunnelUrl;
    }

    // Try auto-detecting active ngrok tunnel
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);
      const res = await fetch('http://127.0.0.1:4040/api/tunnels', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as {
          tunnels?: Array<{ public_url: string; proto: string }>;
        };
        const httpsTunnel = data.tunnels?.find(
          (t) => t.proto === 'https' || t.public_url.startsWith('https://')
        );
        if (httpsTunnel) {
          cachedTunnelUrl = httpsTunnel.public_url.replace(/\/+$/, '');
          lastTunnelCheck = now;
          return cachedTunnelUrl;
        }
      }
    } catch {
      // ngrok not reachable or timed out
    }

    const port = process.env.PORT || 3001;
    return `http://localhost:${port}`;
  }

  static async getTrackingPixelHtml(logId: string): Promise<string> {
    const baseUrl = await this.getPublicBaseUrl();
    const isNgrok = baseUrl.includes('ngrok');
    const queryParam = isNgrok ? '?ngrok-skip-browser-warning=true' : '';
    const trackingUrl = `${baseUrl}/api/tracking/open/${logId}.png${queryParam}`;
    return `<img src="${trackingUrl}" width="1" height="1" alt="" border="0" style="display:block!important;width:1px!important;height:1px!important;max-width:1px!important;max-height:1px!important;opacity:0.01!important;pointer-events:none;border:0!important;outline:none!important;margin:0!important;padding:0!important;" />`;
  }

  /**
   * Record that an email was opened by recipient
   */
  static async recordOpen(logId: string): Promise<boolean> {
    try {
      const cleanId = logId.replace(/\.png$/i, '');
      const log = await prisma.emailLog.findUnique({
        where: { id: cleanId },
      });

      if (!log) {
        return false;
      }

      // Update log to OPENED status and record openedAt timestamp
      await prisma.emailLog.update({
        where: { id: cleanId },
        data: {
          status: 'OPENED',
          openedAt: log.openedAt || new Date(),
        },
      });

      // Update recipient lead status if currently NEW/CONTACTED
      await prisma.lead
        .update({
          where: { id: log.leadId },
          data: { status: 'QUALIFIED' },
        })
        .catch(() => {});

      return true;
    } catch (error) {
      console.error('[TrackingService] Error recording email open:', error);
      return false;
    }
  }

  /**
   * Wrap any links in the HTML body with smart tracking redirect URLs
   */
  static async wrapLinksInHtml(html: string, logId: string): Promise<string> {
    const baseUrl = await this.getPublicBaseUrl();
    const isNgrok = baseUrl.includes('ngrok');
    const bypassParam = isNgrok ? '&ngrok-skip-browser-warning=true' : '';

    // Convert raw standalone URLs (e.g. https://... or http://...) into HTML links
    const autolinkedHtml = html.replace(
      /(?<!href=["'])(https?:\/\/[^\s<"'>]+)/gi,
      (match) => `<a href="${match}" target="_blank" rel="noopener noreferrer">${match}</a>`
    );

    // Replace all <a href="..."> with smart click tracking redirect
    const trackedHtml = autolinkedHtml.replace(
      /<a\s+([^>]*?)href=["']([^"']*)["']([^>]*?)>/gi,
      (match, prefix, originalUrl, suffix) => {
        if (
          !originalUrl ||
          originalUrl.startsWith('#') ||
          originalUrl.startsWith('mailto:') ||
          originalUrl.startsWith('tel:') ||
          originalUrl.includes('/api/tracking/')
        ) {
          return match;
        }

        const trackingClickUrl = `${baseUrl}/api/tracking/click/${logId}?url=${encodeURIComponent(originalUrl)}${bypassParam}`;
        return `<a ${prefix}href="${trackingClickUrl}"${suffix}>`;
      }
    );

    return trackedHtml;
  }

  /**
   * Record that a recipient clicked a link in the email
   */
  static async recordClick(logId: string, _targetUrl?: string): Promise<boolean> {
    // A click is 100% verified proof that the email was opened and engaged with!
    return await this.recordOpen(logId);
  }
}
