/**
 * Memoization utility for expensive computations
 * Helps reduce repeated calculations in computed properties
 */

const cache = new Map();

/**
 * Simple memoization function with TTL support
 * @param {Function} fn - Function to memoize
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 * @returns {Function} Memoized function
 */
export function memoize(fn, ttl = 5 * 60 * 1000) {
  return function(...args) {
    const key = JSON.stringify(args);
    const now = Date.now();

    // Check if we have a cached result that's still valid
    if (cache.has(key)) {
      const { value, timestamp } = cache.get(key);
      if (now - timestamp < ttl) {
        return value;
      }
      // Remove expired entry
      cache.delete(key);
    }

    // Calculate new result
    const result = fn.apply(this, args);

    // Cache the result
    cache.set(key, {
      value: result,
      timestamp: now
    });

    return result;
  };
}

/**
 * Clear the memoization cache
 */
export function clearMemoCache() {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getMemoStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}

/**
 * Clean expired entries from cache
 */
export function cleanExpiredMemos(ttl = 5 * 60 * 1000) {
  const now = Date.now();
  const keysToDelete = [];

  for (const [key, { timestamp }] of cache.entries()) {
    if (now - timestamp >= ttl) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach(key => cache.delete(key));

  return keysToDelete.length;
}

// Auto-cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    const cleaned = cleanExpiredMemos();
    if (cleaned > 0) {
      console.log(`Cleaned ${cleaned} expired memo entries`);
    }
  }, 5 * 60 * 1000);
}