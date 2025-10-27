# File Analysis: backend/config/sentry.js

## Overview
- **Path**: `backend/config/sentry.js`
- **Type**: Error Monitoring Configuration
- **Purpose**: Initialize Sentry for error tracking and performance monitoring
- **Lines of Code**: ~117 LOC
- **Role**: Observability and error tracking for production debugging

## Key Findings

### Strengths ✅
- Good Sentry initialization with env check
- Performance monitoring (10% sample rate)
- Smart filtering (health checks, normal WebSocket closes)
- Specialized error capture functions (WebSocket, Simulation, Firebase)
- Proper scoping and context
- Graceful degradation if profiling not available

### Issues Found

#### P1: Sample Rate May Be Too Low
- `tracesSampleRate: 0.1` (10%)
- **90% of performance issues won't be captured**
- For a new application, should be 50-100% initially
- Reduce to 10% only after understanding baseline performance

**Recommendation**:
```javascript
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0
// Or make configurable:
tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.5
```

#### P2: Hardcoded Release Version
- Line 24: `release: '1.0.0'`
- Should be dynamic (from package.json or git commit)
- Can't track which version has which bugs

**Fix**:
```javascript
const packageJson = require('../../package.json');
release: `${packageJson.name}@${packageJson.version}`
// Or use git commit SHA:
release: process.env.GIT_COMMIT || '1.0.0'
```

#### P2: Missing Breadcrumbs Configuration
- Breadcrumbs help understand error context
- Not configured means less debugging info

**Add**:
```javascript
Sentry.init({
  // ... existing config
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Console(),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection()
  ],
  maxBreadcrumbs: 50
});
```

#### P3: No Performance Monitoring for Specific Operations
- Could add custom transactions for:
  - Firestore queries
  - AI API calls
  - WebSocket events
  - Cache operations

**Example**:
```javascript
function measureFirestoreQuery(operation, callback) {
  const transaction = Sentry.startTransaction({
    op: 'firestore',
    name: operation
  });

  try {
    const result = await callback();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
}
```

### Medium Issues ⚠️

#### P2: BeforeSend Filter May Be Too Aggressive
- Line 37: Filters ALL `/health` errors
- If health check actually fails, you won't know
- **Solution**: Only filter if status code is 200-299

```javascript
beforeSend(event) {
  // Only filter successful health checks
  if (event.request?.url?.includes('/health') &&
      event.response?.status_code >= 200 &&
      event.response?.status_code < 300) {
    return null;
  }

  // ... rest of filters
}
```

#### P3: No User Context
- Errors don't include user information
- Can't identify if specific users hit more errors
- **Add after authentication**:

```javascript
// In server.js after auth middleware
app.use((req, res, next) => {
  if (req.user) {
    Sentry.setUser({
      id: req.user.uid,
      email: req.user.email,
      username: req.user.displayName
    });
  }
  next();
});
```

#### P3: Missing Tags for Filtering
- Only has `project` and `component` tags
- Could add more useful tags:
  - `serverRegion`
  - `cloudRunInstance`
  - `nodeVersion`

### Specialized Error Capture Functions

#### `captureWebSocketError` ✅
- Good implementation
- Proper context (sessionId, socketId, userId)
- Appropriate error level

#### `captureSimulationError` ✅
- Good context
- Could add: stationId, role (actor/candidate)

#### `captureFirebaseError` ✅
- Good Firestore context
- Includes error code (useful for Firebase-specific errors)

**All three functions are well-designed and useful.**

### Missing Error Captures

Could add:
1. **`captureAuthError`** - Authentication failures
2. **`captureCacheError`** - Cache system issues
3. **`captureAIError`** - Gemini API failures
4. **`capturePaymentError`** - Payment processing issues

## Usage in Codebase

**Currently used in**:
- `server.js` line 33: Initialized
- `server.js` line 1154: captureWebSocketError on disconnect

**NOT used in**:
- Cache operations (should capture cache failures)
- Firebase operations (should capture Firestore errors)
- AI operations (should capture AI API errors)

**Recommendation**: Add more Sentry captures throughout codebase for better observability.

## Configuration Quality

| Aspect | Status | Notes |
|--------|--------|-------|
| Initialization | ✅ Good | Env-based, graceful |
| Performance Monitoring | ⚠️ Limited | 10% may be too low |
| Error Filtering | ✅ Good | Smart filters |
| Context | ⚠️ Missing | No user, some ops missing |
| Breadcrumbs | ❌ Missing | Limits debugging |
| Release Tracking | ⚠️ Static | Hardcoded version |
| Specialized Captures | ✅ Excellent | 3 good functions |

## Code Quality
- **Readability**: 9/10 (very clear)
- **Maintainability**: 8/10 (well-organized)
- **Test Coverage**: N/A (monitoring code)
- **Production Value**: 7/10 (good but underutilized)

## Cost Considerations

**Sentry Pricing** (as of 2024):
- Free tier: 5,000 errors/month
- Team: $26/month - 50,000 errors/month
- Business: $80/month - 500,000 errors/month

**Performance Monitoring**:
- Charged separately per transaction
- 10% sample rate = lower cost
- But also less visibility

**Recommendation**:
- Start with higher sample rate (50%)
- Monitor costs
- Reduce if needed
- Quality debugging info > saving $20/month

## Recommendations

### Immediate (This Week)
1. **Increase trace sample rate to 50%** (5 min)
2. **Fix release version** (10 min)
3. **Add breadcrumbs config** (15 min)

### Short-term (This Month)
1. **Add user context after auth** (30 min)
2. **Use Sentry captures throughout codebase** (4 hours)
3. **Add custom performance transactions** (2 hours)
4. **Test error reporting** (1 hour)

### Long-term (Next Quarter)
1. **Set up alerts** for critical errors
2. **Create Sentry dashboard** for key metrics
3. **Integrate with incident management**
4. **Add source maps** for better stack traces

## Production Readiness: 7/10

**Verdict**: Good foundation, but underutilized. Configuration is solid but could be enhanced. Main issue is low adoption throughout codebase - Sentry is only used in 2 places when it should be used in 20+.

**Priority Actions**:
1. **MEDIUM**: Increase sample rate and fix version (15 min)
2. **MEDIUM**: Add Sentry captures to cache, Firebase, AI operations (4 hours)
3. **LOW**: Add breadcrumbs and user context (1 hour)

**Value**: Once fully implemented, Sentry will be invaluable for production debugging. Worth the investment to enhance configuration and increase usage.
