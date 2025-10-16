# REVALIDAFLOW - Master Refactoring Task List

**Created**: 2025-10-14
**Total Technical Debt**: 453.5 hours (~11.5 weeks for 1 developer)
**Backend Debt**: 237.5h | **Frontend Debt**: 216h

---

## 🚨 CRITICAL PATH - MUST DO BEFORE PRODUCTION (P0)

**Total P0 Effort**: 105.5 hours (~2.5 weeks)
**Blocker Status**: 🟡 **PARTIALLY COMPLETE** - Security Phase 100% Done

### Backend Security (Critical Path Item #1)

| Task ID | Task | File(s) | Effort | Dependencies | Status |
|---------|------|---------|--------|--------------|--------|
| **P0-B01** | Implement Firebase Auth middleware | backend/middleware/auth.js (new) | 8h | None | ✅ DONE |
| **P0-B02** | Apply auth middleware to all routes | backend/server.js | 2h | P0-B01 | ✅ DONE |
| **P0-B03** | Apply rate limiters to endpoints | backend/server.js | 1h | P0-B01 | ✅ DONE |
| **P0-B04** | Fix cache collection names | backend/cache.js:148,159,170,213 | 0.5h | None | ✅ DONE |
| **P0-B05** | Delete or rewrite adminReset.js | backend/routes/adminReset.js | 2h | None | ✅ DONE |
| **P0-B06** | Remove unused config/firebase.js | backend/config/firebase.js | 0.25h | None | ✅ DONE |
| **P0-B07** | Remove empty routes/gemini.js | backend/routes/gemini.js | 0.1h | None | ✅ DONE |

**Subtotal Backend P0**: 13.85h (**13.85h complete, 0h remaining**) ✅

---

### Frontend Security & Architecture (Critical Path Item #2)

| Task ID | Task | File(s) | Effort | Dependencies | Status |
|---------|------|---------|----------|--------------|--------|
| **P0-F01** | Create Firestore user roles collection | Firebase Console | 1h | None | ✅ DONE |
| **P0-F02** | Create userStore role property | src/stores/userStore.js | 2h | P0-F01 | ✅ DONE |
| **P0-F03** | Remove hardcoded admin UIDs | src/pages/SimulationView.vue:348-356 | 2h | P0-F02 | ✅ DONE |
| **P0-F04** | Update all admin checks to use roles | Multiple files (8 files) | 8h | P0-F02 | ✅ DONE |
| **P0-F05** | Add backend admin role verification | backend/middleware/adminAuth.js (new) | 3h | P0-B01, P0-F02 | ✅ DONE |

**Subtotal Frontend P0**: 16h (**16h complete, 0h remaining**) ✅

---

### Backend Scalability (Critical Path Item #3)

| Task ID | Task | File(s) | Effort | Dependencies | Status |
|---------|------|---------|--------|--------------|--------|
| **P0-B08** | Design distributed session architecture | Documentation | 8h | None | ❌ TODO |
| **P0-B09** | Implement Firestore session storage | backend/services/sessionManager.js (new) | 24h | P0-B08 | ❌ TODO |
| **P0-B10** | Migrate in-memory sessions to Firestore | backend/server.js:249 | 16h | P0-B09 | ❌ TODO |
| **P0-B11** | Update userIdToSocketId to Firestore | backend/server.js | 8h | P0-B09 | ❌ TODO |
| **P0-B12** | Test multi-instance deployment | Cloud Run config | 8h | P0-B10, P0-B11 | ❌ TODO |
| **P0-B13** | Implement distributed cache (Redis) | backend/cache.js | 16h | P0-B09 | ❌ TODO |

**Subtotal Backend Scalability**: 80h

---

### Testing Infrastructure (Critical Path Item #4)

| Task ID | Task | File(s) | Effort | Dependencies | Status |
|---------|------|---------|--------|--------------|--------|
| **P0-T01** | Set up backend testing framework | backend/tests/ (new) | 4h | None | ✅ DONE |
| **P0-T02** | Write auth middleware tests | backend/tests/middleware/auth.test.js | 4h | P0-B01 | ✅ DONE |
| **P0-T03** | Write critical endpoint tests | backend/tests/routes/ | 8h | P0-B01 | ✅ DONE |
| **P0-T04** | Write frontend composable tests | tests/unit/composables/ | 16h | None | ❌ TODO |
| **P0-T05** | Write Socket.IO integration tests | tests/integration/ | 8h | P0-B09 | ❌ TODO |

**Subtotal Testing P0**: 40h (**16h complete, 24h remaining**) ✅

---

## ⚠️ HIGH PRIORITY - POST-LAUNCH IMPROVEMENTS (P1)

**Total P1 Effort**: 200 hours (~5 weeks)

### Backend Architecture Refactoring

| Task ID | Task | File(s) | Effort | Dependencies | Status |
|---------|------|---------|--------|--------------|--------|
| **P1-B01** | Extract Socket.IO handlers from server.js | backend/socket/handlers/ (new) | 16h | None | ❌ TODO |
| **P1-B02** | Split aiChat.js into services | backend/services/ai/ | 20h | None | ❌ TODO |
| **P1-B03** | Extract route handlers from server.js | backend/routes/ | 16h | None | ❌ TODO |
| **P1-B04** | Create centralized error handler | backend/middleware/errorHandler.js | 8h | None | ❌ TODO |
| **P1-B05** | Implement structured logging service | backend/services/logger.js | 8h | None | ❌ TODO |
| **P1-B06** | Add input validation layer (Joi/Zod) | backend/middleware/validation.js | 20h | None | ❌ TODO |
| **P1-B07** | Remove duplicate CORS files | backend/fix-cors-cloud-run.js | 1h | None | ✅ DONE |

**Subtotal Backend P1**: 89h (**1h complete, 88h remaining**)

---

### Frontend Architecture & Performance

| Task ID | Task | File(s) | Effort | Dependencies | Status |
|---------|------|---------|--------|--------------|--------|
| **P1-F01** | Extract 3 composables from SimulationView | src/composables/ | 24h | None | ❌ TODO |
| **P1-F02** | Migrate sessionStorage to Pinia | Multiple files | 16h | None | ❌ TODO |
| **P1-F03** | Add Socket.IO reconnection logic | src/composables/useSocket.js | 12h | None | ❌ TODO |
| **P1-F04** | Create centralized error notification | src/services/errorService.js | 8h | None | ❌ TODO |
| **P1-F05** | Memory leak audit (intervals/listeners) | Multiple files | 16h | None | ❌ TODO |
| **P1-F06** | Add consistent loading states | Multiple components | 12h | None | ❌ TODO |
| **P1-F07** | Extract 40h additional composable tests | tests/unit/composables/ | 40h | P0-T04 | ❌ TODO |

**Subtotal Frontend P1**: 128h

---

## 📊 MEDIUM PRIORITY - OPTIMIZATION (P2)

**Total P2 Effort**: 100 hours (~2.5 weeks)

### Performance Optimization

| Task ID | Task | File(s) | Effort | Dependencies | Status |
|---------|------|---------|--------|--------------|--------|
| **P2-B01** | Implement response caching for AI | backend/services/aiCache.js | 8h | P0-B13 | ❌ TODO |
| **P2-B02** | Add monitoring/alerting (Cloud Monitoring) | backend/config/monitoring.js | 12h | None | ❌ TODO |
| **P2-B03** | Optimize Firestore queries (indexes) | firestore.indexes.json | 8h | None | ❌ TODO |
| **P2-F01** | Bundle size analysis & optimization | config/vite.config.js | 16h | None | ❌ TODO |
| **P2-F02** | Implement image optimization pipeline | build scripts | 8h | None | ❌ TODO |
| **P2-F03** | Add service worker for PWA | src/sw.js | 16h | None | ❌ TODO |
| **P2-F04** | Optimize image preloading strategy | src/composables/useImagePreloading.js | 4h | None | ❌ TODO |

**Subtotal Performance P2**: 72h

---

### Code Quality & Developer Experience

| Task ID | Task | File(s) | Effort | Dependencies | Status |
|---------|------|---------|--------|--------------|--------|
| **P2-F05** | CSS consolidation + SCSS variables | src/assets/styles/ | 16h | None | ❌ TODO |
| **P2-F06** | Extract magic numbers to constants | Multiple files | 4h | None | ❌ TODO |
| **P2-F07** | Create production logger utility | src/utils/logger.js | 2h | None | ❌ TODO |
| **P2-F08** | Remove production console.logs | Multiple files | 6h | P2-F07 | ❌ TODO |

**Subtotal Code Quality P2**: 28h

---

## 🎨 LOW PRIORITY - POLISH (P3)

**Total P3 Effort**: 48 hours (~1 week)

### Accessibility & UX

| Task ID | Task | File(s) | Effort | Dependencies | Status |
|---------|------|---------|--------|--------------|--------|
| **P3-F01** | WCAG 2.1 AA accessibility audit | All components | 16h | None | ❌ TODO |
| **P3-F02** | Add aria-labels where missing | Multiple components | 8h | P3-F01 | ❌ TODO |
| **P3-F03** | Implement error boundary components | src/components/ErrorBoundary.vue | 8h | None | ❌ TODO |
| **P3-F04** | Add keyboard navigation support | Multiple components | 8h | None | ❌ TODO |
| **P3-F05** | Mobile responsive testing on real devices | All pages | 8h | None | ❌ TODO |

**Subtotal Polish P3**: 48h

---

## 📋 IMPLEMENTATION ROADMAP

### Sprint 1: Security Emergency (Week 1) - 30h
**Goal**: Make backend safe to deploy
**Blockers Resolved**: Authentication, rate limiting, critical bugs

```
✓ P0-B04 (0.5h) - Fix cache collection names [NO DEPENDENCIES - START HERE]
✓ P0-B06 (0.25h) - Remove unused firebase.js
✓ P0-B07 (0.1h) - Remove empty gemini.js
✓ P0-B01 (8h) - Implement Firebase Auth middleware
✓ P0-B02 (2h) - Apply auth to all routes [depends on P0-B01]
✓ P0-B03 (1h) - Apply rate limiters [depends on P0-B01]
✓ P0-B05 (2h) - Delete/rewrite adminReset.js
✓ P0-F01 (1h) - Create Firestore user roles collection
✓ P0-F02 (2h) - Update userStore with roles [depends on P0-F01]
✓ P0-F03 (2h) - Remove hardcoded admin UIDs [depends on P0-F02]
✓ P0-B05 (3h) - Add backend admin role verification
✓ P0-T01 (4h) - Set up backend testing framework
✓ P0-T02 (4h) - Write auth middleware tests [depends on P0-B01]
```

**Deliverable**: Backend can be deployed without catastrophic security issues

---

### Sprint 2-3: Scalability Foundation (Weeks 2-3) - 80h
**Goal**: Enable horizontal scaling
**Blockers Resolved**: In-memory sessions, multi-instance support

```
✓ P0-B08 (8h) - Design distributed session architecture
✓ P0-B09 (24h) - Implement Firestore session storage [depends on P0-B08]
✓ P0-B13 (16h) - Implement Redis cache [depends on P0-B09]
✓ P0-B10 (16h) - Migrate in-memory sessions [depends on P0-B09]
✓ P0-B11 (8h) - Update userIdToSocketId [depends on P0-B09]
✓ P0-B12 (8h) - Test multi-instance deployment [depends on P0-B10, P0-B11]
```

**Deliverable**: Backend can scale horizontally on Cloud Run

---

### Sprint 4-5: Frontend Critical Path (Weeks 4-5) - 80h
**Goal**: Complete frontend security & testing
**Blockers Resolved**: Admin checks, testing infrastructure

```
✓ P0-F04 (8h) - Update all admin checks to use roles
✓ P0-T04 (16h) - Write frontend composable tests
✓ P0-T05 (8h) - Write Socket.IO integration tests
✓ P0-T03 (8h) - Write critical endpoint tests
✓ P1-F02 (16h) - Migrate sessionStorage to Pinia
✓ P1-F03 (12h) - Add Socket.IO reconnection logic
✓ P1-F04 (8h) - Create centralized error notification
✓ P1-F05 (16h) - Memory leak audit
```

**Deliverable**: Frontend production-ready with 70%+ test coverage

---

### Sprint 6-8: Architecture Refactoring (Weeks 6-8) - 120h
**Goal**: Clean up monolithic files
**Blockers Resolved**: Maintainability issues

```
✓ P1-B01 (16h) - Extract Socket.IO handlers
✓ P1-B02 (20h) - Split aiChat.js into services
✓ P1-B03 (16h) - Extract route handlers
✓ P1-F01 (24h) - Extract composables from SimulationView
✓ P1-B04 (8h) - Create centralized error handler
✓ P1-B05 (8h) - Implement structured logging
✓ P1-B06 (20h) - Add input validation layer
✓ P1-F06 (12h) - Add consistent loading states
✓ P1-F07 (40h) - Complete composable test suite
```

**Deliverable**: Codebase maintainable, onboarding easier

---

### Sprint 9-10: Performance & Polish (Weeks 9-10) - 80h
**Goal**: Optimize performance, reduce costs
**Blockers Resolved**: Bundle size, accessibility

```
✓ P2-B01 (8h) - Implement AI response caching
✓ P2-B02 (12h) - Add monitoring/alerting
✓ P2-F01 (16h) - Bundle size optimization
✓ P2-F02 (8h) - Image optimization pipeline
✓ P2-F03 (16h) - Service worker for PWA
✓ P2-F05 (16h) - CSS consolidation
✓ P3-F01 (16h) - Accessibility audit
✓ P3-F03 (8h) - Error boundary components
```

**Deliverable**: Production-optimized, accessible, cost-efficient

---

## 🎯 CRITICAL SUCCESS METRICS

### After Sprint 1 (Week 1):
- [ ] All API endpoints require authentication
- [ ] Rate limiters applied (10 req/min per user)
- [ ] Cache using correct Firestore collections
- [ ] No hardcoded admin UIDs in frontend
- [ ] Basic auth tests passing (>50 tests)

### After Sprint 3 (Week 3):
- [ ] Sessions stored in Firestore
- [ ] Backend can run 3+ instances simultaneously
- [ ] Cache distributed (Redis)
- [ ] Zero data loss on deployment

### After Sprint 5 (Week 5):
- [ ] Frontend test coverage >70%
- [ ] Socket.IO auto-reconnects with state restoration
- [ ] No memory leaks in 24h stress test
- [ ] All admin checks use backend role verification

### After Sprint 8 (Week 8):
- [ ] No files >600 lines
- [ ] server.js <400 lines (from 1275)
- [ ] SimulationView.vue <500 lines (from 1175)
- [ ] Code climate maintainability A

### After Sprint 10 (Week 10):
- [ ] Bundle size <2MB (tree-shaken)
- [ ] Lighthouse score >90
- [ ] WCAG 2.1 AA compliant
- [ ] 40% reduction in Gemini API costs

---

## 💰 COST IMPACT ANALYSIS

### Current State (Before P0 Fixes):
- **AI Abuse Vulnerability**: Unlimited Gemini API usage
- **Potential Daily Cost**: $100-1000 if discovered
- **Firestore**: Inefficient queries, full collection scans
- **Cloud Run**: In-memory sessions prevent autoscaling

### After Sprint 1 (Security Fixed):
- **AI Protection**: Rate limited to 10 req/min per user
- **Daily Cost Cap**: ~$20-50 for normal usage
- **Risk**: Reduced from CRITICAL to LOW
- **ROI**: Potential savings of $30k-300k/year

### After Sprint 3 (Scalability Fixed):
- **Cloud Run**: Autoscaling works correctly
- **Traffic**: Can handle 100x current load
- **Cost Efficiency**: Pay only for actual usage
- **Availability**: 99.9% uptime achievable

### After Sprint 10 (Full Optimization):
- **AI Caching**: 40% reduction in Gemini API calls
- **Bundle Size**: 50% reduction in bandwidth costs
- **Image Optimization**: 60% reduction in storage/transfer
- **Total Estimated Savings**: $150-400/month

---

## 🔥 QUICK WINS - ✅ COMPLETED (Total: 3.85h)

**Status**: All Quick Wins implemented! Production readiness improved from 4.5/10 to 4.8/10.

### 1. ✅ Fix Cache Collection Names (15 min) - DONE
```javascript
// backend/cache.js - Lines 148, 159, 170, 213
- const userDoc = await firestore.collection('users').doc(userId).get();
+ const userDoc = await firestore.collection('usuarios').doc(userId).get();

- const stationDoc = await firestore.collection('stations').doc(stationId).get();
+ const stationDoc = await firestore.collection('estacoes_clinicas').doc(stationId).get();
```
**Impact**: Cache will actually work (currently 100% miss rate)

### 2. Remove Unused Files (20 min)
```bash
rm backend/config/firebase.js        # Redundant
rm backend/routes/gemini.js          # Empty file
rm backend/fix-cors-cloud-run.js     # Duplicate (keep utils/ version)
```
**Impact**: Reduced confusion, cleaner codebase

### 3. Apply Rate Limiters (1 hour)
```javascript
// backend/server.js - Add after line 100
const { generalLimiter, aiLimiter, uploadLimiter } = require('./config/rateLimiter');

app.use('/api/', generalLimiter);
app.use('/api/ai-chat/', aiLimiter);
app.use('/api/admin/upload/', uploadLimiter);
```
**Impact**: Immediate abuse protection (still needs auth!)

### 4. Production Logger (2 hours)
```javascript
// src/utils/logger.js (new file)
export const logger = {
  log: (...args) => import.meta.env.DEV && console.log(...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => import.meta.env.DEV && console.warn(...args)
};

// Find-replace: console.log → logger.log (50+ files)
```
**Impact**: Clean production console, better debugging

---

## 📊 TEAM ALLOCATION RECOMMENDATIONS

### Single Developer Timeline: **11.5 weeks**
- Week 1: Security (P0 critical)
- Weeks 2-3: Scalability (P0)
- Weeks 4-5: Frontend & Testing (P0-P1)
- Weeks 6-8: Architecture Refactoring (P1)
- Weeks 9-10: Performance & Polish (P2)
- Week 11: Buffer for issues
- Week 12: Final QA & deployment

### Two Developer Timeline: **6 weeks**
- **Developer A (Backend-focused)**: P0-B01 → P0-B13, P1-B01 → P1-B07
- **Developer B (Frontend-focused)**: P0-F01 → P1-F07, P2-F01 → P3-F05
- **Overlap**: Both work on testing (P0-T01 → P0-T05)

### Three Developer Timeline: **4 weeks**
- **Backend Engineer**: All P0-B* + P1-B* tasks
- **Frontend Engineer**: All P0-F* + P1-F* tasks
- **QA/DevOps Engineer**: All P0-T* + P2-B02 + P2-F03 (monitoring/testing)

---

## 🚨 RISK ASSESSMENT

### High Risk - Must Monitor Closely

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Session migration breaks active simulations | CRITICAL | Medium | Implement feature flag, gradual rollout |
| Multi-instance deployment loses websockets | HIGH | Medium | Test thoroughly, implement sticky sessions |
| Auth breaks existing user flows | HIGH | Medium | Add feature flag, test with staging users |
| Refactoring introduces new bugs | MEDIUM | High | Comprehensive test suite first (P0-T04) |

### Medium Risk - Standard Precautions

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Redis adds infrastructure costs | MEDIUM | High | Start with Firestore cache, add Redis if needed |
| Bundle optimization breaks imports | MEDIUM | Medium | Gradual optimization, test after each change |
| Accessibility changes break UI | LOW | Medium | Visual regression testing |

---

## 📚 DOCUMENTATION REQUIREMENTS

As part of this refactoring, maintain/create:

- [ ] **API Documentation**: OpenAPI/Swagger spec for all endpoints
- [ ] **Architecture Decision Records (ADRs)**: For P0-B08 session design
- [ ] **Testing Guide**: How to run/write tests for new contributors
- [ ] **Deployment Guide**: Updated for multi-instance Cloud Run
- [ ] **Security Audit Report**: After Sprint 1 completion
- [ ] **Performance Benchmarks**: Before/after optimization metrics
- [ ] **Incident Runbook**: How to handle common production issues

---

## 🎯 DEFINITION OF DONE

Each task is only complete when:

1. ✅ **Code written** and passing linting
2. ✅ **Tests written** with >80% coverage
3. ✅ **Code reviewed** by another developer
4. ✅ **Documentation updated** (JSDoc, README, etc.)
5. ✅ **Deployed to staging** and manually tested
6. ✅ **Performance validated** (no regressions)
7. ✅ **Security reviewed** (if auth/validation changes)

---

## 🏁 FINAL DEPLOYMENT CHECKLIST

Before deploying to production after all tasks:

### Security
- [ ] All endpoints require authentication
- [ ] Admin endpoints verify backend role
- [ ] Rate limiters active on all routes
- [ ] API keys in Secret Manager (not .env)
- [ ] CSP headers configured
- [ ] Firestore rules restrictive
- [ ] Security audit passed

### Performance
- [ ] Bundle size <2MB
- [ ] Lighthouse score >90
- [ ] Load test passed (1000 concurrent users)
- [ ] AI response time <2s (p95)
- [ ] Cache hit rate >60%

### Scalability
- [ ] Multi-instance deployment tested
- [ ] Sessions persisted across restarts
- [ ] Horizontal autoscaling configured
- [ ] Database connection pooling active

### Reliability
- [ ] Test coverage >70%
- [ ] E2E tests passing
- [ ] Error tracking configured (Sentry)
- [ ] Monitoring/alerting active
- [ ] Graceful shutdown works
- [ ] Backup/restore tested

### Compliance
- [ ] WCAG 2.1 AA compliant
- [ ] LGPD/GDPR data handling reviewed
- [ ] User data minimization implemented
- [ ] Audit logging active

---

## 📞 SUPPORT & ESCALATION

**For questions about this task list:**
- Technical Lead: Review backend/frontend executive summaries
- Architecture Questions: See `docs/architecture/`
- Implementation Details: See individual file analyses in `docs/analysis/file-analysis/`

**Critical Blockers:**
1. Authentication design decisions → Escalate immediately
2. Session storage choice (Firestore vs Redis) → Research & document ADR
3. Budget concerns (Redis costs) → Calculate ROI before proceeding

---

## 📈 SUCCESS METRICS DASHBOARD

Track these weekly:

```
┌─────────────────────────────────────────────────────────┐
│ REVALIDAFLOW Refactoring Progress Dashboard            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Security Status:          🟡 [#######___] 70%          │
│ - Auth implemented:       ✅ 7/7 backend tasks         │
│ - Rate limits active:     ✅ All applied              │
│ - Admin roles fixed:      ⚠️  1/5 tasks (docs done)    │
│ - Cache fixed:            ✅ Collections corrected      │
│                                                          │
│ Scalability Status:       🔴 [#_________] 10%          │
│ - Sessions distributed:   ❌ In-memory                  │
│ - Multi-instance ready:   ❌ Not tested                 │
│ - Cache distributed:      ⚠️  Local working, not Redis  │
│                                                          │
│ Testing Status:           🔴 [##________] 20%          │
│ - Backend tests:          ❌ 0/60h completed            │
│ - Frontend tests:         ⚠️  3 files only              │
│ - Integration tests:      ❌ None                       │
│                                                          │
│ Architecture Quality:     ⚠️  [####______] 42%          │
│ - Files >1000 lines:      🔴 3 files                    │
│ - Code duplication:       ⚠️  High                      │
│ - Separation of concerns: ⚠️  Partial                   │
│ - Unused files removed:   ✅ 3 files cleaned            │
│                                                          │
│ Performance:              ⚠️  [#####_____] 52%          │
│ - Bundle size:            ⚠️  Not optimized             │
│ - Image optimization:     ❌ None                       │
│ - Caching strategy:       ✅ Fixed & working            │
│                                                          │
│ OVERALL PRODUCTION READINESS: ⚠️  4.8/10                │
│                                                          │
│ Target after 11 weeks: ✅ 9/10                          │
│ Quick Wins Complete: ✅ 3.85h/3.5h (110%)               │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 CONCLUSION

**Current State**: Functional MVP with critical security gaps
**Target State**: Production-ready, scalable, maintainable application
**Path Forward**: 11.5 weeks of focused refactoring (453.5 hours)

**Priority Order**:
1. **Security First** (Sprint 1) - Block all attacks
2. **Scalability Second** (Sprints 2-3) - Handle growth
3. **Quality Third** (Sprints 4-8) - Maintainable codebase
4. **Performance Last** (Sprints 9-10) - Optimize costs

**Bottom Line**: 🔴 **DO NOT DEPLOY TO PRODUCTION** until Sprint 1 (30h) complete. After Sprint 1, can deploy with limitations and continue improving in production.

---

**Related Documentation**:
- Backend Analysis: `docs/analysis/BACKEND_EXECUTIVE_SUMMARY.md`
- Frontend Analysis: `docs/analysis/FRONTEND_EXECUTIVE_SUMMARY.md`
- Individual File Analyses: `docs/analysis/file-analysis/`
- Project Overview: `docs/guides/PROJECT_OVERVIEW.md`
