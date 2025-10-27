# File Analysis: backend/server.js

## Overview
- **Path**: `backend/server.js`
- **Type**: Main Backend Server Entry Point
- **Purpose**: Express/Socket.IO server for real-time medical simulation sessions with Firebase integration
- **Lines of Code**: ~1275 LOC
- **Role in System**: Core backend server handling HTTP API routes, real-time WebSocket communication, session management, and Firebase/Firestore operations

## Architecture Role
This is the **primary backend entry point** that orchestrates:
- HTTP REST API endpoints for station/user data
- Real-time Socket.IO connections for simulation sessions
- Firebase Admin SDK initialization and management
- In-memory session state management
- Cost-optimized caching layer
- CORS configuration for multiple frontend origins
- Monitoring and health check endpoints

## Functions/Methods

### Configuration & Initialization
#### `stripSurroundingQuotes(s)`
- **Purpose**: Utility to clean environment variable values
- **Parameters**: `s` (string) - input string with potential quotes
- **Returns**: Cleaned string without surrounding quotes
- **Complexity**: Low
- **Issues**: None

#### Firebase Admin SDK Initialization (lines 71-152)
- **Purpose**: Initialize Firebase in production, mock mode in development
- **Complexity**: Medium
- **Issues**:
  - Complex conditional logic with nested try-catch
  - Credentials handling could be extracted to separate module
  - Hard process.exit(1) on error (good for production, but no graceful degradation)

### HTTP Endpoints

#### `GET /health` (lines 255-271)
- **Purpose**: Health check endpoint for Cloud Run
- **Returns**: 204 (production) or detailed health data (dev)
- **Complexity**: Low
- **Issues**: None - well optimized for cost reduction

#### `GET /ready` (lines 274-296)
- **Purpose**: Readiness probe for Cloud Run deployment
- **Returns**: Service status with Firebase connection state
- **Complexity**: Low
- **Issues**: None

#### `GET /api/users` (lines 299-324)
- **Purpose**: List all users from Firestore
- **Complexity**: Low
- **Issues**:
  - **CRITICAL P0**: No authentication/authorization check
  - **P1**: No pagination - will fail with large datasets
  - **P1**: Fetches ALL user data - privacy concern
  - **P2**: Debug logging in production (line 315)

#### `GET /api/users/:userId` (lines 329-343)
- **Purpose**: Get specific user data with caching
- **Complexity**: Low
- **Issues**:
  - **CRITICAL P0**: No authentication check - anyone can access any user data
  - **P1**: No ownership validation (users can access other users' data)

#### `GET /api/stations/:stationId/edit-status` (lines 346-356)
- **Purpose**: Check if station is being edited (with cache)
- **Complexity**: Low
- **Issues**:
  - **P0**: No authentication
  - **P2**: Could benefit from rate limiting

#### `POST /api/stations/batch-edit-status` (lines 359-377)
- **Purpose**: Batch check edit status for multiple stations
- **Parameters**: `{ stationIds: string[] }` (max 50)
- **Complexity**: Low
- **Issues**:
  - **P0**: No authentication
  - **P1**: Max limit validation present (good) but arbitrary

#### `POST /api/cache/invalidate` (lines 380-412)
- **Purpose**: Admin endpoint to invalidate cache entries
- **Complexity**: Low
- **Issues**:
  - **CRITICAL P0**: NO AUTHENTICATION - anyone can invalidate cache!
  - **P0**: No admin role validation
  - **P0**: Could be used for DoS attack

#### `POST /api/create-session` (lines 415-429)
- **Purpose**: Create new simulation session (legacy, rarely used)
- **Complexity**: Low
- **Issues**:
  - **P1**: No authentication
  - **P2**: Comment says "pouco usado" - consider deprecating
  - **P2**: Session ID generation could use crypto.randomUUID()

#### `GET /debug/metrics` (lines 432-451)
- **Purpose**: Debug endpoint exposing internal metrics
- **Complexity**: Low
- **Issues**:
  - **CRITICAL P0**: Exposes sensitive internal metrics publicly
  - **P0**: No authentication or IP whitelist
  - **P0**: Should be protected or disabled in production

#### `POST /debug/cache/cleanup` (lines 454-469)
- **Purpose**: Manual cache cleanup trigger
- **Complexity**: Low
- **Issues**:
  - **P0**: No authentication
  - **P1**: Should be admin-only

#### `GET /api/stations/download-json` (lines 472-615)
- **Purpose**: Download all clinical stations as JSON
- **Complexity**: Medium
- **Issues**:
  - **CRITICAL P0**: No authentication - exposes all station data publicly
  - **P1**: No pagination - will fail/timeout with large datasets
  - **P1**: Loads entire collection into memory
  - **P2**: Mock data implementation good for dev
  - **P2**: Debug logging in production (line 592)

#### `GET /api/stations/:stationId/download-json` (lines 618-778)
- **Purpose**: Download specific station as JSON
- **Complexity**: Medium
- **Issues**:
  - **P0**: No authentication
  - **P1**: Verbose logging even in production (lines 623, 712, 760, 764)
  - **P2**: Explicit CORS headers redundant with middleware
  - **P2**: Good mock mode implementation

### Utility Functions

#### `startSessionTimer(sessionId, durationSeconds, onTick, onEnd)` (lines 782-797)
- **Purpose**: Start countdown timer for simulation session
- **Parameters**: sessionId, duration, tick callback, end callback
- **Complexity**: Low
- **Issues**:
  - **P2**: Timers stored in memory - lost on server restart
  - **P2**: No cleanup if session ends early
  - **P3**: Could use more robust timer library

#### `stopSessionTimer(sessionId, reason)` (lines 798-804)
- **Purpose**: Stop and clear session timer
- **Complexity**: Low
- **Issues**: None

### Socket.IO Event Handlers

#### `io.on('connection')` (lines 811-1196)
- **Purpose**: Main Socket.IO connection handler - manages all real-time simulation logic
- **Complexity**: **VERY HIGH** - 385 lines of nested event handlers
- **Issues**:
  - **CRITICAL P0**: Massive function - violates single responsibility principle
  - **P0**: Should be broken into separate handler modules
  - **P1**: Complex nested logic hard to test and maintain
  - **P1**: Multiple concerns mixed (session management, sequential mode, scoring, PEP release, etc.)
  - **P2**: Global state mutations (userIdToSocketId, sessions)

#### Socket Event: `INTERNAL_INVITE` (lines 836-849)
- **Purpose**: Send simulation invite to another user
- **Complexity**: Low
- **Issues**:
  - **P1**: No validation of toUserId/fromUserId
  - **P2**: No spam protection

#### Socket Event: `INTERNAL_INVITE_ACCEPTED` (lines 852-865)
- **Purpose**: Handle accepted invite and create session
- **Complexity**: Low
- **Issues**:
  - **P1**: Session ID generation could be more secure
  - **P2**: No validation that users exist

#### Socket Event: `INTERNAL_INVITE_DECLINED` (lines 867-872)
- **Purpose**: Handle declined invite notification
- **Complexity**: Low
- **Issues**: None

#### Socket Event: `SERVER_SEND_INTERNAL_INVITE` (lines 875-892)
- **Purpose**: Server-initiated invite with simulation link
- **Complexity**: Low
- **Issues**:
  - **P1**: Frontend URL construction should be centralized
  - **P2**: Uses handshake.query.userName which could be spoofed

#### Session Join Logic (lines 896-977)
- **Purpose**: Handle user joining simulation session with role assignment
- **Complexity**: High
- **Issues**:
  - **P0**: No validation of query parameters
  - **P0**: Query params can be spoofed (userId, role, displayName)
  - **P1**: Session participant limit (2) hardcoded
  - **P1**: Large nested conditional blocks
  - **P2**: Good sequential mode support
  - **P2**: Good participant list broadcasting

#### Socket Event: `CLIENT_IM_READY` (lines 983-1010)
- **Purpose**: Mark participant as ready and check if all ready
- **Complexity**: Medium
- **Issues**:
  - **P2**: Good implementation with proper state sync
  - **P3**: Could extract participant update logic to helper

#### Socket Event: `CLIENT_START_SIMULATION` (lines 1013-1038)
- **Purpose**: Start simulation timer and voice call
- **Complexity**: Medium
- **Issues**:
  - **P1**: No validation that caller is actor/evaluator
  - **P1**: Anyone in session can start simulation
  - **P2**: Duration defaults to 10 minutes (good)
  - **P3**: Voice call initiation commented out (needs implementation)

#### Socket Event: `CLIENT_MANUAL_END_SIMULATION` (lines 1041-1045)
- **Purpose**: Manual simulation end trigger
- **Complexity**: Low
- **Issues**:
  - **P1**: No role validation - anyone can end simulation
  - **P2**: No confirmation before ending

#### Socket Event: `ACTOR_RELEASE_DATA` (lines 1048-1056)
- **Purpose**: Actor releases printed materials to candidate
- **Complexity**: Low
- **Issues**:
  - **P1**: Role check present (good)
  - **P2**: No validation that dataItemId exists

#### Socket Event: `ACTOR_RELEASE_PEP` (lines 1059-1085)
- **Purpose**: Release PEP (evaluation form) to candidate
- **Complexity**: Medium
- **Issues**:
  - **P1**: Good role validation (actor or evaluator)
  - **P2**: Good session ID validation
  - **P2**: Excellent logging for debugging
  - **P3**: Could extract to separate handler

#### Socket Event: `EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE` (lines 1088-1098)
- **Purpose**: Real-time score updates to candidate
- **Complexity**: Low
- **Issues**:
  - **P1**: Good role validation
  - **P2**: No validation of score data structure
  - **P2**: Good real-time feedback feature

#### Socket Event: `ACTOR_ADVANCE_SEQUENTIAL` (lines 1102-1146)
- **Purpose**: Sequential mode - advance to next station
- **Complexity**: High
- **Issues**:
  - **P1**: Good role validation
  - **P1**: Complex emission logic with individual targeting
  - **P2**: Good sequential mode metadata tracking
  - **P2**: Excellent debugging logs
  - **P2**: Emits to individual sockets (good for reliability)

#### Socket Event: `disconnect` (lines 1150-1195)
- **Purpose**: Handle client disconnection and cleanup
- **Complexity**: Medium
- **Issues**:
  - **P1**: Good Sentry error capture
  - **P2**: Proper cleanup of global state
  - **P2**: Good partner notification
  - **P2**: Automatic session cleanup when empty
  - **P3**: Could extract cleanup logic to helper

### Background Jobs & Maintenance

#### Cache Cleanup Interval (lines 1202-1211)
- **Purpose**: Auto-cleanup expired cache every 5 minutes
- **Complexity**: Low
- **Issues**:
  - **P2**: Good optimization feature
  - **P3**: Interval could be configurable

#### Session Cleanup Interval (lines 1214-1234)
- **Purpose**: Remove sessions inactive for 2+ hours
- **Complexity**: Low
- **Issues**:
  - **P2**: Good memory management
  - **P2**: 2 hour threshold reasonable
  - **P3**: Could notify users before cleanup

#### Graceful Shutdown (lines 1237-1260)
- **Purpose**: Handle SIGTERM/SIGINT for clean shutdown
- **Complexity**: Low
- **Issues**:
  - **P2**: Excellent implementation
  - **P2**: Proper resource cleanup
  - **P3**: Could add timeout for forced shutdown

### Server Initialization (lines 1266-1274)
- **Purpose**: Start HTTP server
- **Complexity**: Low
- **Issues**:
  - **P2**: Good configuration with HOST and PORT
  - **P2**: Informative startup logs
  - **P3**: Port 3000 default reasonable

## Dependencies

### External Packages
- `dotenv` - Environment variables
- `express` - HTTP server framework
- `http` - Node.js HTTP module
- `socket.io` (Server) - Real-time WebSocket communication
- `cors` - CORS middleware
- `firebase-admin` - Firebase Admin SDK

### Internal Dependencies
- `./config/sentry` - Error tracking configuration
- `./cache` - Cost-optimization caching layer
- `./fix-cors-cloud-run` - Cloud Run CORS fixes

### Used By
- All frontend components connecting to backend API
- Socket.IO clients (SimulationView.vue, etc.)
- Health check monitors
- Cloud Run infrastructure

## Global State

### Critical Global Variables
1. **`sessions`** (Map) - In-memory session storage
   - **Issue**: Lost on server restart
   - **Issue**: Not scalable across multiple instances
   - **Recommendation**: Move to Firestore or Redis

2. **`userIdToSocketId`** (Map) - User to socket mapping
   - **Issue**: Same scalability concerns
   - **Recommendation**: Use Redis for distributed sessions

3. **`debugStats`** (Object) - Debug metrics collection
   - **Issue**: Grows unbounded (500 item limit per array)
   - **Issue**: Memory leak potential

## Code Quality

- **Readability**: 6/10
  - Well-commented with clear section headers
  - But massive file size reduces readability
  - Portuguese and English mixed in comments
  - Some excellent documentation blocks (lines 3-27)

- **Maintainability**: 4/10
  - Single file handles too many concerns
  - Difficult to test individual features
  - Hard to extend without breaking existing features
  - Global state makes parallel development difficult

- **Test Coverage**: 0/10
  - No tests found for backend
  - Complex Socket.IO logic untested
  - Critical authentication gaps untested

- **Documentation**: 7/10
  - Excellent cost-optimization guidelines (lines 3-27)
  - Good inline comments
  - Clear section markers
  - Missing: API documentation, Socket event documentation

## Issues Found

### Critical (P0) - Must Fix Immediately

- [ ] **SECURITY: No authentication on user data endpoints** (lines 299, 329, 346, 359)
  - Anyone can access any user's data
  - Implement Firebase Auth token verification middleware
  - Add before ALL `/api/*` routes

- [ ] **SECURITY: Admin endpoints exposed publicly** (lines 380, 432, 454)
  - `/api/cache/invalidate` - anyone can DoS by clearing cache
  - `/debug/metrics` - exposes internal system state
  - `/debug/cache/cleanup` - public cache manipulation
  - Add admin role verification or remove from production

- [ ] **SECURITY: Station data endpoints unprotected** (lines 472, 618)
  - All clinical station content downloadable without auth
  - Educational content should require subscription/authentication
  - Potential IP theft issue

- [ ] **SCALABILITY: In-memory session storage** (line 249)
  - Sessions lost on restart/deployment
  - Cannot scale horizontally
  - Migrate to Firestore or Redis immediately

- [ ] **SECURITY: Socket.IO query parameters trusted** (lines 896-963)
  - userId, role, displayName from client query (line 896)
  - Can be spoofed - anyone can impersonate anyone
  - Implement socket authentication with Firebase tokens

- [ ] **SECURITY: Anyone can start/end simulation** (lines 1013, 1041)
  - No role validation before starting simulation
  - Candidate could end their own evaluation
  - Add strict role checks

### High Priority (P1)

- [ ] **MODULARITY: 1275-line monolithic file** (entire file)
  - Split into modules:
    - `routes/` - API route handlers
    - `socket/handlers/` - Socket event handlers
    - `middleware/` - Auth, CORS, error handling
    - `services/` - Business logic
  - Improves testability and maintainability

- [ ] **SCALABILITY: userIdToSocketId Map not distributed** (line 809)
  - Won't work with multiple backend instances
  - Use Redis or Firestore for distributed mapping
  - Critical for horizontal scaling

- [ ] **ERROR HANDLING: Inconsistent error responses** (throughout)
  - Some endpoints return `{error: msg}`, others return `{message: msg}`
  - Standardize error response format
  - Add proper HTTP status codes

- [ ] **VALIDATION: No input validation middleware** (most endpoints)
  - Use express-validator or joi for input validation
  - Validate all query params, body params, URL params
  - Prevent injection attacks

- [ ] **LOGGING: Production logs still present** (lines 315, 592, 623, etc.)
  - Despite excellent cost guidelines (lines 3-27), logs remain
  - Audit ALL console.log statements
  - Use proper logging levels (error, warn, info, debug)

- [ ] **PERFORMANCE: /api/users loads all users** (line 301)
  - No pagination - will timeout with 1000+ users
  - No field selection - sends all user data
  - Add pagination, filtering, field projection

- [ ] **SECURITY: Sentry error logging might expose sensitive data** (lines 1154-1160)
  - Socket disconnection sends session/user data to Sentry
  - Scrub sensitive data before sending
  - Review what gets logged

### Medium Priority (P2)

- [ ] **CODE ORGANIZATION: Socket handlers in main file** (lines 811-1196)
  - 385 lines of Socket.IO logic in one connection handler
  - Extract to separate files:
    - `socket/handlers/invite.js`
    - `socket/handlers/session.js`
    - `socket/handlers/simulation.js`
    - `socket/handlers/sequential.js`

- [ ] **TESTING: Zero test coverage** (entire file)
  - Add unit tests for utility functions
  - Add integration tests for API endpoints
  - Add Socket.IO event tests
  - Target: 70%+ coverage

- [ ] **CONFIGURATION: Hardcoded values** (various)
  - Cache cleanup interval: 300000ms (line 1202)
  - Session cleanup: 7200000ms (line 1221)
  - Max batch stations: 50 (line 367)
  - Move to environment variables or config file

- [ ] **CORS: Redundant CORS handling** (lines 160-225, 626-629, 767-769)
  - Multiple places setting CORS headers
  - Middleware + inline headers + fix-cors-cloud-run module
  - Consolidate to single CORS configuration

- [ ] **MONITORING: Debug stats arrays grow unbounded** (lines 232-241)
  - `debugStats.http`, `firestoreReads`, `socketConnections`
  - 500-1000 item limits but never fully cleaned
  - Either remove or implement proper circular buffers

- [ ] **PERFORMANCE: Sequential foreach emission** (lines 1124-1140)
  - Good pattern for reliability
  - Could be optimized with Promise.all for parallel emission
  - Not critical but worth considering

- [ ] **DOCUMENTATION: Missing API docs** (entire file)
  - No OpenAPI/Swagger documentation
  - Socket events not documented
  - Add comprehensive API documentation

### Low Priority (P3)

- [ ] **CODE STYLE: Mixed language comments** (Portuguese + English)
  - Standardize to English for international collaboration
  - Or fully Portuguese if team prefers
  - Consistency improves readability

- [ ] **NAMING: Some inconsistent event names** (throughout)
  - `CLIENT_IM_READY` vs `ACTOR_RELEASE_PEP`
  - Inconsistent prefixing (CLIENT_, ACTOR_, SERVER_)
  - Document and standardize event naming convention

- [ ] **SECURITY: Session ID generation** (lines 420, 854)
  - Uses `Date.now() + Math.random()`
  - Not cryptographically secure
  - Use `crypto.randomUUID()` instead

- [ ] **LOGGING: Emoji in logs** (lines 131-135, 1238, etc.)
  - May not display correctly in all log viewers
  - Consider removing or using only in development
  - Not critical but professional consideration

- [ ] **PERFORMANCE: Timer implementation** (lines 782-804)
  - Simple setInterval approach
  - Could use more robust scheduler
  - Consider node-schedule or agenda

- [ ] **CLEANUP: Legacy code comments** (lines 243-244)
  - "Agente removido" - remove dead code references
  - Clean up commented code
  - Keep git history clean

## Dead Code

- Line 201: `const tunnelOrigin = ""` - empty string never used
- Line 243-244: Reference to removed agent feature
- Line 1025: Commented voice call link implementation
- Line 1273: Commented Cloudflare tunnel log

## Improvement Suggestions

### Immediate Actions (Next Sprint)

1. **Implement Authentication Middleware**
   ```javascript
   // middleware/auth.js
   async function authenticateFirebase(req, res, next) {
     const token = req.headers.authorization?.split('Bearer ')[1];
     if (!token) return res.status(401).json({error: 'Unauthorized'});

     try {
       const decodedToken = await admin.auth().verifyIdToken(token);
       req.user = decodedToken;
       next();
     } catch (error) {
       res.status(401).json({error: 'Invalid token'});
     }
   }
   ```
   Apply to ALL `/api/*` routes

2. **Implement Role-Based Access Control**
   ```javascript
   function requireRole(role) {
     return (req, res, next) => {
       if (req.user.role !== role) {
         return res.status(403).json({error: 'Forbidden'});
       }
       next();
     };
   }
   ```

3. **Extract Socket Handlers**
   - Create `socket/handlers/` directory
   - One file per event category
   - Export handler functions
   - Import and register in server.js

4. **Add Input Validation**
   ```javascript
   const { body, param, validationResult } = require('express-validator');

   app.post('/api/cache/invalidate', [
     body('type').isIn(['user', 'station', 'editStatus']),
     body('key').isString().notEmpty(),
     authenticateFirebase,
     requireRole('admin')
   ], handler);
   ```

### Medium-term Improvements (Next Month)

1. **Migrate to Distributed Session Storage**
   - Evaluate Redis vs Firestore for session storage
   - Implement session manager service
   - Migrate all session operations
   - Test multi-instance deployment

2. **Add Comprehensive Testing**
   - Unit tests: utility functions, helpers
   - Integration tests: API endpoints with supertest
   - Socket.IO tests: socket.io-client for event testing
   - E2E tests: Playwright for full simulation flow

3. **Implement API Documentation**
   - Add Swagger/OpenAPI spec
   - Document all endpoints, parameters, responses
   - Add Socket.IO event documentation
   - Generate interactive API docs

4. **Add Monitoring & Observability**
   - Structured logging (winston or bunyan)
   - Performance metrics (response times, error rates)
   - Business metrics (active sessions, concurrent users)
   - Dashboard for real-time monitoring

### Long-term Architectural Improvements (Next Quarter)

1. **Microservices Architecture**
   - Separate API server from Socket.IO server
   - Dedicated session management service
   - Dedicated authentication service
   - Use message queue (Cloud Pub/Sub) for inter-service communication

2. **Database Optimization**
   - Implement read replicas for Firestore
   - Add full-text search (Algolia or ElasticSearch)
   - Implement database connection pooling
   - Add query performance monitoring

3. **Advanced Caching Strategy**
   - Multi-layer caching (in-memory + Redis)
   - Cache invalidation events via Pub/Sub
   - Implement cache warming strategies
   - Add cache hit rate monitoring

4. **Security Hardening**
   - Add rate limiting per user (not just IP)
   - Implement CSRF protection
   - Add request signing for critical operations
   - Security audit and penetration testing
   - Add WAF (Web Application Firewall)

## Performance Considerations

### Current Optimizations ✅
- Health check returns 204 in production (line 258)
- Caching layer for frequently accessed data
- Graceful shutdown prevents connection drops
- Batch endpoint for edit status checks
- Auto-cleanup of old sessions and cache

### Performance Issues ⚠️
- No database connection pooling
- No query optimization monitoring
- Single-threaded (Node.js default)
- No load balancing configuration
- In-memory storage doesn't scale

### Recommendations
- Implement Redis for distributed caching
- Add database query profiling
- Consider clustering for multi-core utilization
- Implement rate limiting to prevent abuse
- Add CDN for static assets (if any)

## Security Audit Summary

| Category | Status | Priority |
|----------|--------|----------|
| Authentication | ❌ Missing | P0 Critical |
| Authorization | ❌ Missing | P0 Critical |
| Input Validation | ⚠️ Partial | P1 High |
| Rate Limiting | ❌ Not configured | P1 High |
| CORS | ✅ Configured | - |
| HTTPS | ✅ (Cloud Run enforces) | - |
| Secrets Management | ✅ Good (env vars) | - |
| Error Handling | ⚠️ Inconsistent | P2 Medium |
| Logging Security | ⚠️ Potential leaks | P1 High |
| Session Security | ❌ No encryption | P1 High |

## Cost Optimization Notes

### Excellent Cost Awareness ✅
- Lines 3-27: Comprehensive cost optimization guidelines
- Health check optimization (204 response)
- Cache layer reduces Firestore reads
- Removed debug logs in production
- Auto-cleanup prevents resource waste

### Cost Concerns ⚠️
- Debug metrics endpoint could be expensive if abused
- No rate limiting allows unlimited requests
- Firestore reads not optimized with field selection
- Socket connections not limited (could scale costs)

### Recommendations
- Add rate limiting (10 req/sec per IP, 100 req/min per user)
- Implement field projection in Firestore queries
- Add connection limits for Socket.IO
- Monitor and alert on unusual cost spikes
- Consider reserved capacity for predictable costs

## Testing Strategy Recommendations

### Unit Tests
- Utility functions (timer, session ID generation)
- Cache operations
- CORS header application
- Error handling functions

### Integration Tests
- All API endpoints with various inputs
- Authentication flows
- Cache hit/miss scenarios
- Firestore operations

### Socket.IO Tests
- Connection/disconnection flows
- Session join/leave
- Simulation start/end
- Sequential mode navigation
- Score updates
- PEP release

### E2E Tests
- Complete simulation flow (invite → join → simulate → score → end)
- Sequential mode full flow
- Error scenarios and recovery
- Multi-user concurrency

### Load Tests
- Concurrent simulations
- Connection spike handling
- Firestore read load
- Memory usage under load

## Migration Path to Production-Ready

### Phase 1: Critical Security (1-2 weeks)
1. Implement Firebase Auth middleware
2. Add role-based access control
3. Protect admin endpoints
4. Add input validation
5. Security audit

### Phase 2: Scalability (2-3 weeks)
1. Migrate sessions to Firestore/Redis
2. Distribute userIdToSocketId mapping
3. Extract Socket.IO handlers to modules
4. Add horizontal scaling support
5. Load testing

### Phase 3: Observability (1-2 weeks)
1. Structured logging
2. Performance monitoring
3. Error tracking improvements
4. Business metrics dashboard
5. Alerting setup

### Phase 4: Testing & Documentation (2-3 weeks)
1. Unit test suite
2. Integration test suite
3. Socket.IO test suite
4. API documentation
5. Architecture documentation

### Phase 5: Polish & Optimization (1-2 weeks)
1. Code cleanup and refactoring
2. Performance optimization
3. Final security review
4. Cost optimization review
5. Deployment automation

## Estimated Technical Debt

- **Critical**: ~40 hours (authentication, session storage migration)
- **High**: ~60 hours (modularity, testing, error handling)
- **Medium**: ~40 hours (monitoring, documentation, optimization)
- **Low**: ~20 hours (code cleanup, naming, comments)
- **Total**: ~160 hours (~4 weeks for 1 developer, ~2 weeks for 2 developers)

## Final Assessment

### Strengths
- ✅ Excellent cost-awareness and optimization mindset
- ✅ Comprehensive Socket.IO implementation for simulations
- ✅ Good Firebase integration
- ✅ Graceful shutdown handling
- ✅ Cache layer for optimization
- ✅ Sequential mode support

### Critical Weaknesses
- ❌ No authentication/authorization (CRITICAL SECURITY ISSUE)
- ❌ In-memory session storage (NOT PRODUCTION-READY)
- ❌ Monolithic file structure (MAINTAINABILITY ISSUE)
- ❌ No testing (QUALITY RISK)
- ❌ Global state prevents horizontal scaling

### Production Readiness Score: 3/10

**Verdict**: This server needs significant work before production deployment at scale. The Socket.IO logic is solid, but lack of authentication is a critical blocker. Immediate priority should be authentication middleware and session storage migration.

**Recommended Action**: Do NOT deploy to production without addressing P0 security issues. Begin Phase 1 (Critical Security) immediately.
