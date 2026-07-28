/**
 * Redis client singleton using ioredis.
 * BullMQ queues will be wired in a later phase (per the Technical Architecture Document).
 * This module establishes the connection and exports a connectivity check helper.
 */
import Redis from 'ioredis';
import { env } from './env';

let _redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!_redis) {
    _redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ when added in a later phase
      lazyConnect: true,
    });

    _redis.on('connect', () => {
      console.log('[redis] Connected successfully');
    });

    _redis.on('error', (err) => {
      console.error('[redis] Connection error:', err.message);
    });

    _redis.on('reconnecting', () => {
      console.warn('[redis] Reconnecting...');
    });
  }
  return _redis;
}

/**
 * Verify Redis connectivity at startup.
 * Sends a PING and logs the result.
 */
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
    const message = err instanceof Error ? err.message : String(err);
    console.error('[redis] Failed to connect:', message);
    return false;
  }
}

// Export singleton for use in routes/services
export const redis = getRedisClient();
