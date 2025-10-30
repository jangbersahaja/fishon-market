/**
 * Rate Limiter Utility
 *
 * Provides in-memory rate limiting for API endpoints.
 * Tracks attempts per identifier (e.g., IP + booking ID) with configurable limits and windows.
 *
 * @example
 * ```typescript
 * const attempts = checkRateLimit(`cancel:${bookingId}:${ip}`, 3, 3600000);
 * if (attempts > 3) {
 *   throw new Error('Too many attempts');
 * }
 * ```
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory store for rate limit tracking
// In production, consider using Redis for distributed rate limiting
const attempts = new Map<string, RateLimitRecord>();

// Cleanup interval (run every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

/**
 * Check and increment rate limit for an identifier
 *
 * @param identifier - Unique identifier for the rate limit (e.g., "cancel:booking-123:192.168.1.1")
 * @param windowMs - Time window in milliseconds (default: 1 hour)
 * @returns Current attempt count for this identifier
 */
export function checkRateLimit(
  identifier: string,
  windowMs = 3600000 // 1 hour default
): number {
  const now = Date.now();
  const record = attempts.get(identifier);

  // No record or expired - create new
  if (!record || now > record.resetAt) {
    attempts.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return 1;
  }

  // Increment existing record
  record.count++;
  return record.count;
}

/**
 * Get current attempt count without incrementing
 *
 * @param identifier - Unique identifier for the rate limit
 * @returns Current attempt count (0 if no record or expired)
 */
export function getRateLimitCount(identifier: string): number {
  const now = Date.now();
  const record = attempts.get(identifier);

  if (!record || now > record.resetAt) {
    return 0;
  }

  return record.count;
}

/**
 * Reset rate limit for an identifier
 *
 * @param identifier - Unique identifier to reset
 */
export function resetRateLimit(identifier: string): void {
  attempts.delete(identifier);
}

/**
 * Get time remaining until rate limit reset (in milliseconds)
 *
 * @param identifier - Unique identifier for the rate limit
 * @returns Milliseconds until reset, or 0 if no active limit
 */
export function getRateLimitResetTime(identifier: string): number {
  const now = Date.now();
  const record = attempts.get(identifier);

  if (!record || now > record.resetAt) {
    return 0;
  }

  return record.resetAt - now;
}

/**
 * Check if identifier has exceeded rate limit
 *
 * @param identifier - Unique identifier for the rate limit
 * @param maxAttempts - Maximum number of attempts allowed
 * @returns true if limit exceeded, false otherwise
 */
export function isRateLimitExceeded(
  identifier: string,
  maxAttempts = 3
): boolean {
  return getRateLimitCount(identifier) >= maxAttempts;
}

/**
 * Cleanup expired rate limit records
 * Called periodically to prevent memory leaks
 */
export function cleanupExpiredRecords(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  for (const [key, record] of attempts.entries()) {
    if (now > record.resetAt) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    attempts.delete(key);
  }
}

/**
 * Get statistics about current rate limit state (for monitoring)
 */
export function getRateLimitStats() {
  const now = Date.now();
  let active = 0;
  let expired = 0;

  for (const record of attempts.values()) {
    if (now > record.resetAt) {
      expired++;
    } else {
      active++;
    }
  }

  return {
    total: attempts.size,
    active,
    expired,
  };
}

// Start cleanup interval
if (typeof window === "undefined") {
  // Only run in server environment
  setInterval(cleanupExpiredRecords, CLEANUP_INTERVAL);
}

/**
 * Helper to get client IP from request
 *
 * @param request - Next.js Request object
 * @returns Client IP address or 'unknown'
 */
export function getClientIP(request: Request): string {
  // Check various headers for client IP
  const headers = request.headers;

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback
  return "unknown";
}
