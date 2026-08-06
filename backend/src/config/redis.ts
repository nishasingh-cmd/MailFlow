import Redis from 'ioredis';
import { env } from './env';

let _redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!_redis) {
    _redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ when added in a later phase
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (env.NODE_ENV === 'development' && times > 2) {
          return null; // Stop retrying in development if Redis is offline
        }
        return Math.min(times * 200, 3000);
      },
    });

    _redis.on('connect', () => {
      console.log('[redis] Connected successfully');
    });

    _redis.on('error', (err) => {
      // Suppress unhandled error crashes when Redis is offline in dev
      if (env.NODE_ENV === 'development') {
        // Silently swallow reconnect errors in development mode
        return;
      }
      console.error('[redis] Connection error:', err.message);
    });

    _redis.on('reconnecting', () => {
      if (env.NODE_ENV === 'production') {
        console.warn('[redis] Reconnecting...');
      }
    });
  }
  return _redis;
}

export async function checkRedisConnection(): Promise<boolean> {
  try {
    const client = getRedisClient();
    await client.connect();
    const pong = await client.ping();
    if (pong === 'PONG') {
      console.log('[redis] Ping successful — Redis is reachable');
      return true;
    }
    console.error('[redis] Unexpected ping response:', pong);
    return false;
  } catch (err) {
    if (env.NODE_ENV === 'development') {
      console.log('[redis] Development mode — Redis server offline (non-fatal)');
    } else {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[redis] Failed to connect:', message);
    }
    return false;
  }
}

export async function closeRedisConnection(): Promise<void> {
  if (_redis) {
    try {
      await _redis.quit();
    } catch {
      _redis.disconnect();
    }
    _redis = null;
  }
}

export const redis = getRedisClient();
