import { Request, Response } from 'express';
import { TrackingService } from './tracking.service';

// 1x1 transparent PNG binary buffer
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

export class TrackingController {
  /**
   * Serve 1x1 transparent PNG pixel and record email open
   */
  static async handleOpen(req: Request, res: Response): Promise<void> {
    const { logId } = req.params;

    // Immediately send transparent pixel back to mail client with aggressive no-cache headers
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', TRANSPARENT_PNG.length.toString());
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(TRANSPARENT_PNG);

    // Asynchronously record open in DB without delaying HTTP response
    if (logId) {
      TrackingService.recordOpen(logId).catch((err) => {
        console.error('[TrackingController] Failed to record open asynchronously:', err);
      });
    }
  }

  /**
   * Handle smart link clicks: record open/engagement and redirect to destination URL
   */
  static async handleClick(req: Request, res: Response): Promise<void> {
    const { logId } = req.params;
    const targetUrl = req.query.url as string;

    if (logId) {
      TrackingService.recordClick(logId, targetUrl).catch((err) => {
        console.error('[TrackingController] Failed to record click asynchronously:', err);
      });
    }

    if (targetUrl) {
      try {
        const decoded = decodeURIComponent(targetUrl);
        const finalUrl =
          decoded.startsWith('http://') || decoded.startsWith('https://')
            ? decoded
            : `https://${decoded}`;
        return res.redirect(302, finalUrl);
      } catch {
        return res.redirect(302, targetUrl);
      }
    }

    res.status(200).send('Verified interaction.');
  }
}
