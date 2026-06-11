/**
 * Simple sliding-window rate limiter.
 * Tracks request counts per key within a configurable time window.
 */

import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from './constants.js';
import type { RateLimitEntry } from './types.js';

const store = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string = 'global'): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  // No existing entry or window expired — allow
  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }

  // Within window — check count
  if (entry.count < RATE_LIMIT_MAX_REQUESTS) {
    entry.count++;
    return { allowed: true, retryAfterMs: 0 };
  }

  // Rate limit exceeded
  return { allowed: false, retryAfterMs: entry.resetAt - now };
}

/**
 * Periodic cleanup of expired entries to prevent unbounded memory growth.
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW_MS * 2);
