# File Analysis: backend/routes/aiChat.js

## Overview
- **Path**: `backend/routes/aiChat.js`
- **Type**: Express Router - Gemini AI Chat Integration
- **Purpose**: Virtual patient AI powered by Google Gemini for medical simulations
- **Lines of Code**: ~1126 LOC (VERY LARGE!)
- **Role**: Core simulation feature - AI acts as virtual patient

## Strengths ✅
- Sophisticated AI prompt engineering
- Multiple API key rotation (6 keys)
- Quota management per key
- Off-script detection
- Vague request handling (educational - forces specificity)
- Material release logic
- PEP auto-evaluation
- Comprehensive error handling with fallbacks

## Critical Issues

### P0: No Authentication ❌
- ALL endpoints completely public
- `/chat` (line 738) - anyone can use AI
- `/evaluate-pep` (line 768) - anyone can get evaluations
- `/analyze` (line 1086) - anyone can use Gemini API
- **Cost Impact**: Unlimited AI usage = unlimited bills
- **Action**: Add Firebase Auth middleware IMMEDIATELY

### P0: API Keys in Environment Variables 🔐
- Lines 14-27: Loads 6 Gemini API keys from env
- If .env leaked, $1000s in fraudulent usage possible
- **Solution**: Use Google Secret Manager
- Add key rotation policy
- Monitor usage anomalies

### P1: Massive Single File (1126 lines)
- Class + routes + utilities all mixed
- `AIChatManager` class (lines 5-732) = 727 lines
- Difficult to test, maintain, extend
- **Solution**: Split into:
  - `services/AIChatManager.js`
  - `services/GeminiKeyManager.js`
  - `services/MaterialReleaseLogic.js`
  - `routes/aiChat.js` (thin router)

### P1: No Rate Limiting
- AI requests expensive (~$0.0005-0.002 per request)
- At 10,000 requests/day: $5-20/day = $150-600/month
- Without rate limiting: vulnerable to cost attacks
- **Solution**: Apply aiLimiter from rateLimiter.js

### P1: Complex PEP Evaluation Prompt (lines 777-957)
- 180+ lines of prompt text
- Hardcoded in route handler
- Difficult to test, iterate, version
- **Solution**: Move to external template file
- Use template engine (Handlebars, EJS)
- Enable A/B testing of prompts

### P2: No Caching
- Same questions asked repeatedly in simulations
- Each request hits Gemini API (costs money)
- **Solution**: Cache responses by:
  - `hash(stationId + userMessage + conversationContext)`
  - TTL: 1 hour
  - Estimated savings: 30-50% of API costs

### P2: Error Handling Cascades Errors
- Line 138: Recursive retry on error
- If all keys failing, could cause infinite loop
- No circuit breaker
- **Solution**: Implement retry with backoff
- Max 3 retries total
- Circuit breaker after N failures

## Code Quality

- **Readability**: 6/10 (long, complex, but well-commented)
- **Maintainability**: 4/10 (monolithic, hard to test)
- **Test Coverage**: 0/10 (critical AI logic untested)
- **Cost Efficiency**: 7/10 (good key rotation, but no caching)

## Architecture Analysis

### Excellent Features 🌟
1. **Key Rotation** (lines 31-63): Intelligent quota-aware rotation
2. **Off-Script Detection** (lines 590-629): Prevents AI hallucination
3. **Vague Request Education** (lines 631-686): Forces medical specificity
4. **Material Release Logic** (lines 437-545): Context-aware document release
5. **Fallback Handling** (lines 972-1028): Robust JSON parsing

### Areas for Improvement ⚠️
1. **Prompt Management**: Externalize prompts
2. **Testing**: Add comprehensive test suite
3. **Monitoring**: Track AI performance metrics
4. **Caching**: Reduce API costs
5. **Modularity**: Split into services

## Security Analysis

| Aspect | Status | Risk |
|--------|--------|------|
| Authentication | ❌ None | **Critical** |
| Authorization | ❌ None | **Critical** |
| API Key Security | ⚠️ Env vars | **High** |
| Rate Limiting | ❌ None | **High** |
| Input Validation | ⚠️ Basic | Medium |
| Prompt Injection | ⚠️ Some defense | Medium |

## Cost Analysis

**Without Optimizations:**
- 1000 simulations/day
- Avg 10 messages per simulation = 10k requests
- Gemini 2.0 Flash: ~$0.001/request
- **Cost: $10/day = $300/month**

**With Optimizations:**
- Authentication: Prevent abuse
- Rate limiting: 10 req/min per user
- Caching: 40% hit rate
- **Estimated cost: $180/month (40% savings)**

## Recommendations

### Immediate (This Week)
1. **Add Authentication** (2 hours)
   ```javascript
   const { requireFirebaseAuth } = require('../middleware/auth');
   router.post('/chat', requireFirebaseAuth, async (req, res) => {
   ```

2. **Apply Rate Limiting** (30 min)
   ```javascript
   const { aiLimiter } = require('../config/rateLimiter');
   router.use(aiLimiter);
   ```

3. **Move API keys to Secret Manager** (1 hour)

### Short-term (This Month)
1. **Split into services** (8 hours)
2. **Add response caching** (4 hours)
3. **Externalize prompts** (4 hours)
4. **Add monitoring/alerts** (2 hours)
5. **Write tests** (12 hours)

### Long-term (Next Quarter)
1. **A/B test prompts** for better AI responses
2. **Fine-tune custom model** (if cost-effective)
3. **Add conversation analytics**
4. **Implement AI performance dashboard**

## Testing Strategy

### Critical Tests Needed
```javascript
describe('AIChatManager', () => {
  test('rotates keys when quota exceeded', async () => {
    // Mock key exhaustion
    // Verify rotation to next key
  });

  test('detects off-script questions', () => {
    const offScript = "What's the capital of France?";
    const result = manager.isOffScript(offScript, stationData);
    expect(result).toBe(true);
  });

  test('handles vague requests correctly', () => {
    const vague = "I want exams";
    const result = manager.shouldGiveVagueResponse(vague, [], stationData);
    expect(result.isVague).toBe(true);
    expect(result.shouldAccept).toBe(false); // First time
  });

  test('releases correct material', () => {
    const request = "I want the hemogram results";
    const material = manager.decideMaterialToRelease(stationData, [], request);
    expect(material).toBe('hemogram-id');
  });

  // ... 20+ more tests
});
```

## Production Readiness: 5/10

**Verdict**: Core functionality excellent but lacks security and scalability. Must add authentication and rate limiting before production use. Good AI engineering but needs architectural improvements.

**Priority Actions**:
1. 🔴 **URGENT**: Add authentication (prevent cost attacks)
2. 🟠 **HIGH**: Add rate limiting (prevent abuse)
3. 🟠 **HIGH**: Move keys to Secret Manager (security)
4. 🟡 **MEDIUM**: Split into services (maintainability)
5. 🟡 **MEDIUM**: Add caching (cost optimization)

**Estimated Effort**: 30 hours to production-ready state
