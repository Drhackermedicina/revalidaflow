# File Analysis: backend/cache.js

## Overview
- **Path**: `backend/cache.js`
- **Type**: In-Memory Caching Service
- **Purpose**: Cost optimization layer to reduce Firestore read operations and improve response times
- **Lines of Code**: ~296 LOC
- **Role in System**: Performance and cost optimization middleware between backend API and Firestore database

## Architecture Role
This module implements an **intelligent caching layer** to:
- Reduce Firestore read operations (primary cost driver in Firebase)
- Improve API response times with in-memory data access
- Provide configurable TTL (Time To Live) per data type
- Track cache performance metrics (hits, misses, hit rate)
- Support batch operations for efficiency
- Enable cache invalidation for data consistency

## Functions/Methods

### Configuration & Setup

#### `NodeCache` Instance (lines 7-12)
- **Purpose**: Initialize node-cache with configuration
- **Config**:
  - `stdTTL: 300` - 5 minutes default TTL
  - `checkperiod: 60` - Check expiration every minute
  - `maxKeys: 1000` - Memory limit
  - `useClones: false` - ⚠️ Performance optimization but risky
- **Issues**:
  - **P1**: `useClones: false` means cache returns references, not copies
  - If code mutates cached objects, cache gets corrupted
  - **P2**: `maxKeys: 1000` may be too low for production scale

#### `CACHE_CONFIG` Object (lines 15-30)
- **Purpose**: TTL configuration per data type
- **Configuration**:
  - Users: 10 minutes (data changes infrequently)
  - Stations: 5 minutes (moderate change rate)
  - Sessions: 1 minute (volatile data)
  - Edit Status: 30 seconds (critical, needs freshness)
  - Simulation: 3 minutes (session data)
- **Complexity**: Low
- **Issues**: None - well thought out

#### `cacheStats` Object (lines 33-40)
- **Purpose**: Track cache performance metrics
- **Metrics**: hits, misses, sets, deletes, keys, memoryUsage
- **Complexity**: Low
- **Issues**:
  - **P2**: Stats reset on server restart
  - **P3**: No persistence mechanism for long-term analysis

### Utility Functions

#### `generateCacheKey(type, ...params)` (lines 43-45)
- **Purpose**: Create consistent cache keys
- **Parameters**: type (string), ...params (variadic)
- **Returns**: Formatted cache key (e.g., "user:123", "editStatus:abc")
- **Complexity**: Low
- **Issues**: None - simple and effective

#### `getCachedData(key, fetchFunction, ttl)` (lines 48-78)
- **Purpose**: Core caching logic with fallback
- **Parameters**:
  - `key` - Cache key
  - `fetchFunction` - Async function to fetch data on miss
  - `ttl` - Optional TTL override
- **Returns**: Cached or freshly fetched data
- **Complexity**: Medium
- **Issues**:
  - **P2**: Error handling bypasses cache (line 76)
  - On cache error, calls fetchFunction without caching result
  - Could lead to repeated failures and Firestore overload
  - **P3**: No retry logic for transient cache errors

#### `invalidateCache(key)` (lines 81-88)
- **Purpose**: Remove specific cache entry
- **Parameters**: key (string)
- **Returns**: Boolean (true if deleted, false if not found)
- **Complexity**: Low
- **Issues**: None

#### `invalidateCacheByPattern(pattern)` (lines 91-108)
- **Purpose**: Bulk invalidation by key prefix
- **Parameters**: pattern (string) - prefix to match
- **Returns**: Count of deleted keys
- **Complexity**: Low
- **Issues**:
  - **P2**: Iterates all keys - O(n) complexity
  - Could be slow with 1000 keys
  - **P3**: No regex support, only startsWith

#### `cleanupExpiredCache()` (lines 111-124)
- **Purpose**: Manual cleanup of expired entries
- **Returns**: Count of deleted entries
- **Complexity**: Low
- **Issues**:
  - **P2**: Calls `cache.flushStats()` which also resets statistics
  - Function name suggests cleanup, but also affects stats
  - **P3**: Return value parsing fragile (line 114)

#### `getCacheStats()` (lines 127-140)
- **Purpose**: Get cache performance metrics
- **Returns**: Object with custom stats + node-cache stats
- **Complexity**: Low
- **Issues**:
  - **P3**: Hit rate calculation can return NaN if both hits and misses are 0
  - Fixed with `|| 0` but could use safer check

### Data Access Functions

#### `getCachedUser(userId, firestore)` (lines 143-151)
- **Purpose**: Get user data with caching
- **Parameters**: userId, firestore instance
- **Returns**: User data object or null
- **Complexity**: Low
- **Issues**:
  - **CRITICAL P0**: Uses 'users' collection but Firestore collection is 'usuarios'
  - **This will always fail in production!**
  - Needs collection name verification

#### `getCachedStation(stationId, firestore)` (lines 154-162)
- **Purpose**: Get station data with caching
- **Parameters**: stationId, firestore instance
- **Returns**: Station data object or null
- **Complexity**: Low
- **Issues**:
  - **CRITICAL P0**: Uses 'stations' collection but actual collection is 'estacoes_clinicas'
  - **This will always fail in production!**
  - Hardcoded collection name needs fixing

#### `checkStationEditStatus(stationId, firestore)` (lines 165-183)
- **Purpose**: Check if station has been edited (with cache)
- **Parameters**: stationId, firestore instance
- **Returns**: `{ hasBeenEdited: boolean, lastEdited: timestamp }`
- **Complexity**: Low
- **Issues**:
  - **P0**: Same 'stations' vs 'estacoes_clinicas' issue
  - **P2**: Returns hardcoded object on not found

#### `checkMultipleStationsEditStatus(stationIds, firestore)` (lines 186-253)
- **Purpose**: Batch check edit status for multiple stations
- **Parameters**: Array of station IDs, firestore instance
- **Returns**: Object with stationId keys and edit status values
- **Complexity**: Medium-High
- **Issues**:
  - **P0**: Same collection name issue
  - **P1**: Uses `firestore.getAll()` which is good for batch
  - **P2**: On error, silently returns false for all (line 248)
  - Could hide real issues
  - **P2**: Good optimization - checks cache first, batches misses
  - **P3**: Could use Promise.all for parallel processing

### Cache Invalidation Functions

#### `invalidateUserCache(userId)` (lines 256-259)
- **Purpose**: Invalidate specific user cache
- **Parameters**: userId
- **Returns**: Boolean
- **Complexity**: Low
- **Issues**: None

#### `invalidateStationCache(stationId)` (lines 262-265)
- **Purpose**: Invalidate specific station cache
- **Parameters**: stationId
- **Returns**: Boolean
- **Complexity**: Low
- **Issues**: None

#### `invalidateEditStatusCache(stationId)` (lines 268-271)
- **Purpose**: Invalidate edit status cache
- **Parameters**: stationId
- **Returns**: Boolean
- **Complexity**: Low
- **Issues**: None

### Automatic Cleanup (lines 274-276)
- **Purpose**: Periodic cache cleanup
- **Interval**: Every 5 minutes (300000ms)
- **Issues**:
  - **P2**: Interval not clearable (no reference stored)
  - **P3**: Could cause issues in tests

## Dependencies

### External Packages
- `node-cache` - In-memory caching library (npm package)

### Used By
- `backend/server.js` - Main server imports all cache functions
- API endpoints for users, stations, edit status checks

## Code Quality

- **Readability**: 8/10
  - Clear function names
  - Good comments explaining TTL choices
  - Well-structured with logical groupings
  - Portuguese comments mixed with English code

- **Maintainability**: 6/10
  - Well-organized functions
  - But collection names hardcoded (should be constants)
  - useClones: false is a maintenance trap
  - Error handling could be more robust

- **Test Coverage**: 0/10
  - No tests found
  - Cache logic critical for cost optimization
  - Should have comprehensive test coverage

- **Documentation**: 7/10
  - Good top-level comments
  - TTL choices well explained
  - Missing: API documentation, usage examples

## Issues Found

### Critical (P0) - Must Fix Immediately

- [ ] **CRITICAL BUG: Wrong Firestore collection names** (lines 148, 159, 170, 213)
  - Uses `'users'` but Firestore collection is `'usuarios'`
  - Uses `'stations'` but Firestore collection is `'estacoes_clinicas'`
  - **These functions will ALWAYS fail in production**
  - Immediate fix required:
  ```javascript
  // Create constants for collection names
  const COLLECTIONS = {
    USERS: 'usuarios',
    STATIONS: 'estacoes_clinicas'
  };
  // Then use COLLECTIONS.USERS instead of 'users'
  ```

### High Priority (P1)

- [ ] **SCALABILITY: In-memory cache doesn't scale horizontally** (entire file)
  - Cache is per-instance, not shared across Cloud Run instances
  - If Cloud Run scales to 2+ instances, each has separate cache
  - Results in cache misses and increased Firestore reads
  - **Solution**: Migrate to distributed cache (Redis or Memorystore)
  - Priority for production deployment at scale

- [ ] **MEMORY SAFETY: useClones: false is dangerous** (line 11)
  - Returns direct references to cached objects
  - If calling code mutates returned object, cache is corrupted
  - All subsequent cache hits return corrupted data
  - **Example of problem**:
  ```javascript
  const user = await getCachedUser('123', firestore);
  user.name = 'Modified'; // ❌ This corrupts the cache!
  // Next call to getCachedUser('123') returns corrupted data
  ```
  - **Solution**: Change to `useClones: true` or use `Object.freeze()`
  - Performance hit acceptable for data integrity

- [ ] **ERROR HANDLING: Cache errors bypass caching** (line 76)
  - On cache error, falls back to fetchFunction without caching result
  - If cache is consistently failing, every request hits Firestore
  - Defeats purpose of cache and increases costs
  - **Solution**: Add retry logic, log errors to monitoring, implement circuit breaker

### Medium Priority (P2)

- [ ] **CAPACITY: maxKeys: 1000 may be too small** (line 10)
  - With users + stations + editStatus + sessions, 1000 keys fills quickly
  - Consider: 1000 users + 500 stations + 500 edit statuses = 2000 keys
  - When limit reached, cache evicts entries (LRU), reducing hit rate
  - **Solution**: Increase to 5000-10000 or make configurable
  - Monitor actual key count in production

- [ ] **STATISTICS: Cache stats reset on restart** (lines 33-40)
  - Stats object lost when server restarts
  - Cannot track long-term cache performance
  - **Solution**: Persist stats to Firestore periodically (every hour)
  - Use for capacity planning and optimization

- [ ] **CLEANUP: flushStats also resets statistics** (line 113)
  - Function named `cleanupExpiredCache` but also affects stats
  - Misleading and causes stat loss
  - **Solution**: Use `cache.flushAll()` or manual cleanup instead

- [ ] **ERROR HANDLING: Silent failures on batch check** (lines 246-249)
  - On error, returns `{ hasBeenEdited: false }` for all stations
  - Hides real problems from calling code
  - Could cause incorrect behavior in UI
  - **Solution**: Throw error or return partial results with error indicator

- [ ] **PERFORMANCE: invalidateCacheByPattern iterates all keys** (lines 95-99)
  - O(n) complexity where n = total cache keys
  - With 1000 keys, checks 1000 keys even if pattern matches 1
  - **Solution**: node-cache doesn't support pattern matching natively
  - Either accept O(n) or switch to Redis (supports pattern matching)

### Low Priority (P3)

- [ ] **CODE STYLE: Mixed language comments** (Portuguese headers, English code)
  - Lines 1-2: Portuguese
  - Rest: English
  - **Solution**: Standardize to English for international collaboration

- [ ] **TESTING: No test coverage** (entire file)
  - Cache logic is critical for cost optimization
  - Should have unit tests for all functions
  - Should have integration tests with mock Firestore
  - **Solution**: Add Jest tests, aim for 80%+ coverage

- [ ] **MONITORING: No external monitoring integration** (missing)
  - Cache stats only available via `/debug/metrics` endpoint
  - No integration with monitoring tools (Sentry, Cloud Monitoring)
  - **Solution**: Export metrics to Cloud Monitoring for alerting

- [ ] **CONFIGURATION: TTL not configurable via environment** (lines 15-30)
  - TTL hardcoded - cannot adjust without code change
  - Different environments may need different TTL
  - **Solution**: Make configurable via environment variables

- [ ] **INTERVAL CLEANUP: No reference to cleanup interval** (line 274)
  - Cannot clear interval (e.g., in tests or graceful shutdown)
  - **Solution**: Store interval ID and export clearInterval function

## Dead Code

- None identified - all functions are used

## Improvement Suggestions

### Immediate Fixes (This Week)

1. **Fix Collection Names**
   ```javascript
   // Add at top of file
   const COLLECTIONS = {
     USERS: process.env.USERS_COLLECTION || 'usuarios',
     STATIONS: process.env.STATIONS_COLLECTION || 'estacoes_clinicas'
   };

   // Update all functions
   async function getCachedUser(userId, firestore) {
     const key = generateCacheKey('user', userId);
     const ttl = CACHE_CONFIG.users.ttl;

     return getCachedData(key, async () => {
       const userDoc = await firestore.collection(COLLECTIONS.USERS).doc(userId).get();
       return userDoc.exists ? userDoc.data() : null;
     }, ttl);
   }
   ```

2. **Enable Safe Cloning**
   ```javascript
   const cache = new NodeCache({
     stdTTL: 300,
     checkperiod: 60,
     maxKeys: 5000, // Increased
     useClones: true // ✅ Safe but slower - worth it for data integrity
   });
   ```

3. **Improve Error Handling**
   ```javascript
   async function getCachedData(key, fetchFunction, ttl = null) {
     try {
       const cached = cache.get(key);
       if (cached !== undefined) {
         cacheStats.hits++;
         return cached;
       }

       cacheStats.misses++;
       const data = await fetchFunction();

       // Try to cache, but don't fail if cache.set fails
       try {
         cache.set(key, data, ttl);
         cacheStats.sets++;
       } catch (cacheError) {
         // Log but continue - data is still valid
         console.error('[CACHE SET ERROR]', cacheError);
       }

       return data;
     } catch (error) {
       // Critical error - rethrow to calling code
       console.error(`[CACHE ERROR] ${key}:`, error.message);
       throw error;
     }
   }
   ```

### Medium-term Improvements (Next Month)

1. **Migrate to Distributed Cache (Redis)**
   - Use Google Cloud Memorystore (managed Redis)
   - Or use Firestore itself as a cache layer with short TTL
   - Enables horizontal scaling
   - Shared cache across all backend instances

2. **Add Comprehensive Testing**
   ```javascript
   // tests/cache.test.js
   describe('Cache Module', () => {
     test('getCachedData returns cached value on hit', async () => {
       const key = 'test:123';
       const mockFetch = jest.fn(() => Promise.resolve({ data: 'test' }));

       // First call - cache miss
       const result1 = await getCachedData(key, mockFetch);
       expect(mockFetch).toHaveBeenCalledTimes(1);

       // Second call - cache hit
       const result2 = await getCachedData(key, mockFetch);
       expect(mockFetch).toHaveBeenCalledTimes(1); // Not called again
       expect(result2).toEqual(result1);
     });

     test('invalidateCache removes entry', () => {
       cache.set('test:abc', { data: 'test' });
       const deleted = invalidateCache('test:abc');
       expect(deleted).toBe(1);
       expect(cache.get('test:abc')).toBeUndefined();
     });

     // Add 10+ more tests...
   });
   ```

3. **Add Metrics Export**
   ```javascript
   // Export metrics to Cloud Monitoring every minute
   const { Monitoring } = require('@google-cloud/monitoring');
   const monitoring = new Monitoring.MetricServiceClient();

   setInterval(async () => {
     const stats = getCacheStats();
     // Send metrics to Cloud Monitoring
     // Set up alerts for:
     // - Hit rate < 70%
     // - Miss rate > 30%
     // - High memory usage
   }, 60000);
   ```

### Long-term Improvements (Next Quarter)

1. **Multi-layer Caching**
   - Layer 1: In-memory (node-cache) - fastest, 100-200 most accessed items
   - Layer 2: Redis (Memorystore) - fast, shared across instances
   - Layer 3: Firestore - source of truth
   - Implement cache warming on server start

2. **Intelligent TTL**
   - Track access patterns
   - Increase TTL for frequently accessed, rarely changed data
   - Decrease TTL for frequently changed data
   - Implement adaptive TTL algorithm

3. **Cache Preloading**
   - On server start, preload most common data
   - Prevents cold start penalty
   - Reduces initial Firestore reads

4. **Advanced Monitoring**
   - Real-time dashboard for cache performance
   - Alerting on anomalies (sudden hit rate drop)
   - Cost savings tracking (estimated Firestore reads prevented)
   - A/B testing different cache strategies

## Performance Analysis

### Current Performance

**Estimated Cost Savings:**
- Firestore reads: $0.06 per 100,000 reads
- With 70% hit rate and 10,000 requests/day:
  - Without cache: 10,000 Firestore reads = $0.006/day = $1.80/month
  - With cache: 3,000 Firestore reads = $0.0018/day = $0.54/month
  - **Savings: ~70% = $1.26/month per 10k requests**

**At scale (100k requests/day):**
- Without cache: $18/month
- With cache (70% hit rate): $5.40/month
- **Savings: $12.60/month**

### Performance Bottlenecks

1. **useClones: false** - Fast but unsafe
2. **invalidateCacheByPattern** - O(n) iteration
3. **No distributed caching** - Each instance separate cache

### Optimization Opportunities

1. **Increase hit rate to 85%+**:
   - Longer TTL for stable data
   - Preloading common queries
   - Better cache key design

2. **Reduce memory usage**:
   - Store only essential fields
   - Compress large objects
   - Implement smarter eviction (LFU instead of LRU)

3. **Faster cache lookups**:
   - Current: O(1) with node-cache ✅
   - Keep it simple, it's already fast

## Testing Strategy

### Unit Tests Needed
- `generateCacheKey()` - various inputs
- `getCachedData()` - hit, miss, error scenarios
- `invalidateCache()` - exists, not exists
- `invalidateCacheByPattern()` - matches, no matches
- All data access functions with mock Firestore

### Integration Tests Needed
- Full cache lifecycle (set → get → invalidate)
- TTL expiration
- Max keys eviction
- Concurrent access (race conditions)
- Firestore integration (with emulator)

### Performance Tests Needed
- Cache hit rate under various loads
- Memory usage with 1000, 5000, 10000 keys
- Lookup time (should be <1ms)
- Pattern invalidation time with 1000 keys

## Migration to Redis (Recommended)

### Why Redis?

1. **Distributed**: Shared across all Cloud Run instances
2. **Persistence**: Survives server restarts (optional)
3. **Advanced Features**: Pattern matching, pub/sub, sorted sets
4. **Managed**: Google Cloud Memorystore handles operations
5. **Scalable**: Can handle millions of keys

### Migration Path

```javascript
// cache-redis.js
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

async function getCachedData(key, fetchFunction, ttl = 300) {
  try {
    const cached = await redis.get(key);
    if (cached) {
      cacheStats.hits++;
      return JSON.parse(cached);
    }

    cacheStats.misses++;
    const data = await fetchFunction();
    await redis.setex(key, ttl, JSON.stringify(data));
    cacheStats.sets++;
    return data;
  } catch (error) {
    console.error('[REDIS ERROR]', error);
    return await fetchFunction();
  }
}

// Pattern invalidation is MUCH faster with Redis
async function invalidateCacheByPattern(pattern) {
  const keys = await redis.keys(`${pattern}*`);
  if (keys.length > 0) {
    await redis.del(...keys);
    cacheStats.deletes += keys.length;
  }
  return keys.length;
}
```

### Cost Estimate

- **Cloud Memorystore (Redis)**: ~$50/month for basic tier (1GB)
- **Firestore savings**: ~$100/month with proper caching
- **Net savings**: ~$50/month + improved performance

## Final Assessment

### Strengths
- ✅ Well-designed TTL configuration per data type
- ✅ Statistics tracking for monitoring
- ✅ Batch operations support
- ✅ Clear, readable code
- ✅ Good cost-optimization intent

### Critical Weaknesses
- ❌ **CRITICAL**: Wrong Firestore collection names - will fail in production
- ❌ In-memory only - doesn't scale horizontally
- ❌ useClones: false - data corruption risk
- ❌ No test coverage

### Production Readiness Score: 4/10

**Verdict**: Good caching design but CRITICAL bugs (collection names) and scalability issues prevent production use. Fix collection names immediately, then plan Redis migration for scale.

**Recommended Actions**:
1. **URGENT**: Fix collection name bugs (15 minutes)
2. **HIGH**: Enable useClones: true (5 minutes)
3. **HIGH**: Add basic tests (2 hours)
4. **MEDIUM**: Plan Redis migration (1-2 weeks)
5. **MEDIUM**: Add monitoring integration (1 week)
