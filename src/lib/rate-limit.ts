/**
 * In-memory sliding-window rate limiter utility.
 * Prevents rapid spam clicking and denial-of-service attempts.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Checks if a given identifier exceeds the allowed request limit within the sliding window.
 *
 * @param identifier Unique client key (e.g. IP address or `like:${ip}`)
 * @param limit Maximum allowed requests within the window (default: 10)
 * @param windowMs Time window in milliseconds (default: 10000ms / 10s)
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 10000
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const record = rateLimitStore.get(identifier) ?? { timestamps: [] };

  // Filter out expired timestamps outside the sliding window
  const validTimestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (validTimestamps.length >= limit) {
    const oldest = validTimestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));

    // Update store with pruned timestamps
    rateLimitStore.set(identifier, { timestamps: validTimestamps });

    return {
      success: false,
      limit,
      remaining: 0,
      resetTime: oldest + windowMs,
      retryAfter: retryAfterSeconds,
    };
  }

  // Record this request
  validTimestamps.push(now);
  rateLimitStore.set(identifier, { timestamps: validTimestamps });

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - validTimestamps.length),
    resetTime: now + windowMs,
  };
}

/**
 * Resets the in-memory rate limit store. Useful for testing isolation.
 */
export function resetRateLimit(): void {
  rateLimitStore.clear();
}
