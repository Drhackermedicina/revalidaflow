# Authentication & Authorization Middleware - Usage Guide

**Created**: 2025-10-14
**Status**: ✅ Implementation Complete
**Related Files**:
- `backend/middleware/auth.js` - Firebase authentication
- `backend/middleware/adminAuth.js` - Role & permission checks

---

## 📋 Quick Start

### 1. Import Middlewares

```javascript
// At the top of backend/server.js
const { verifyAuth, optionalAuth, requireAuth } = require('./middleware/auth');
const {
  requireAdmin,
  requireModerator,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireOwnershipOrAdmin
} = require('./middleware/adminAuth');
```

### 2. Apply Global Authentication

```javascript
// Apply to all /api/* routes (except health checks)
app.use('/api/', verifyAuth);
```

### 3. Protect Specific Routes

```javascript
// Example: Admin-only endpoint
app.post('/api/admin/upload',
  requireAdmin,
  uploadHandler
);

// Example: Permission-based endpoint
app.delete('/api/messages/:id',
  requirePermission('canDeleteMessages'),
  deleteMessageHandler
);
```

---

## 🔐 Authentication Middlewares

### `verifyAuth` - Main Authentication

**Purpose**: Verify Firebase ID token and attach user info to request

**Usage**: Apply to all protected routes
```javascript
app.use('/api/', verifyAuth);
```

**What it does**:
1. Extracts `Authorization: Bearer <token>` header
2. Verifies token with Firebase Admin SDK
3. Fetches user role & permissions from Firestore
4. Attaches `req.user` object with:
   ```javascript
   req.user = {
     uid: 'user_firebase_uid',
     email: 'user@example.com',
     name: 'João',
     surname: 'Silva',
     role: 'admin', // 'admin' | 'moderator' | 'user'
     permissions: {
       canDeleteMessages: true,
       canManageUsers: true,
       // ...
     },
     emailVerified: true,
     authTime: 1234567890,
     iat: 1234567890,
     exp: 1234571490
   }
   ```

**Error Responses**:
- `401 AUTH_NO_TOKEN` - No Authorization header
- `401 AUTH_INVALID_FORMAT` - Not "Bearer <token>" format
- `401 AUTH_TOKEN_EXPIRED` - Token expired (> 1 hour)
- `401 AUTH_TOKEN_REVOKED` - Token revoked
- `401 AUTH_TOKEN_INVALID` - Invalid/malformed token
- `503 AUTH_SERVICE_UNAVAILABLE` - Firebase not initialized
- `500 AUTH_INTERNAL_ERROR` - Unexpected error

---

### `optionalAuth` - Optional Authentication

**Purpose**: Try to authenticate but don't block if fails

**Usage**: For public endpoints that behave differently when authenticated
```javascript
app.get('/api/stations', optionalAuth, listStationsHandler);
```

**Behavior**:
- If valid token → `req.user` populated
- If invalid/missing token → `req.user = null`
- Never returns error, always calls `next()`

**Use Cases**:
- Public content that shows extra features for authenticated users
- Endpoints that track authenticated vs anonymous usage
- Preview modes for unauthenticated users

---

### `requireAuth` - Simple Auth Check

**Purpose**: Ensure user is authenticated (use after `verifyAuth`)

**Usage**: For routes that need auth but no specific role
```javascript
app.get('/api/profile', verifyAuth, requireAuth, profileHandler);
```

**Error Response**:
- `401 AUTH_REQUIRED` - User not authenticated

---

## 👑 Authorization Middlewares

All authorization middlewares **require `verifyAuth` first**. They check `req.user` which is populated by `verifyAuth`.

### `requireAdmin` - Admin-Only Access

**Purpose**: Block non-admins

**Usage**:
```javascript
app.post('/api/admin/reset-stats', requireAdmin, resetStatsHandler);
app.delete('/api/stations/:id', requireAdmin, deleteStationHandler);
```

**Allowed**: `req.user.role === 'admin'`

**Error Responses**:
- `401 ADMIN_AUTH_REQUIRED` - Not authenticated
- `403 ADMIN_FORBIDDEN` - Not an admin

**Logging**: Logs unauthorized access attempts (always, even in production)

---

### `requireModerator` - Moderator or Admin Access

**Purpose**: Allow moderators and admins

**Usage**:
```javascript
app.delete('/api/messages/:id', requireModerator, deleteMessageHandler);
app.put('/api/reports/:id/status', requireModerator, updateReportStatusHandler);
```

**Allowed**: `req.user.role === 'admin' || req.user.role === 'moderator'`

**Error Responses**:
- `401 MODERATOR_AUTH_REQUIRED` - Not authenticated
- `403 MODERATOR_FORBIDDEN` - Not moderator or admin

---

### `requirePermission(permission)` - Single Permission Check

**Purpose**: Check specific permission (granular control)

**Usage**:
```javascript
// Check canDeleteMessages permission
app.delete('/api/chat/:messageId',
  requirePermission('canDeleteMessages'),
  deleteMessageHandler
);

// Check canManageRoles permission
app.put('/api/users/:userId/role',
  requirePermission('canManageRoles'),
  updateRoleHandler
);

// Check canEditStations permission
app.put('/api/stations/:id',
  requirePermission('canEditStations'),
  updateStationHandler
);
```

**Available Permissions**:
- `canDeleteMessages`
- `canManageUsers`
- `canEditStations`
- `canViewAnalytics`
- `canManageRoles`
- `canAccessAdminPanel`

**Error Responses**:
- `401 PERMISSION_AUTH_REQUIRED` - Not authenticated
- `403 PERMISSION_NONE` - No permissions in user object
- `403 PERMISSION_FORBIDDEN` - Missing required permission

---

### `requireAnyPermission([permissions])` - OR Logic

**Purpose**: Require at least ONE of the listed permissions

**Usage**:
```javascript
// Allow users with EITHER canEditStations OR canManageUsers
app.put('/api/stations/:id/metadata',
  requireAnyPermission(['canEditStations', 'canManageUsers']),
  updateMetadataHandler
);

// Content moderation: delete messages OR manage users
app.delete('/api/content/:id',
  requireAnyPermission(['canDeleteMessages', 'canManageUsers']),
  deleteContentHandler
);
```

**Error Responses**:
- `401 PERMISSION_AUTH_REQUIRED` - Not authenticated
- `403 PERMISSION_NONE` - No permissions
- `403 PERMISSION_INSUFFICIENT` - Has none of the required permissions

---

### `requireAllPermissions([permissions])` - AND Logic

**Purpose**: Require ALL listed permissions

**Usage**:
```javascript
// Dangerous operation: needs BOTH canManageUsers AND canManageRoles
app.delete('/api/users/:id',
  requireAllPermissions(['canManageUsers', 'canManageRoles']),
  deleteUserHandler
);

// Critical admin action: needs multiple permissions
app.post('/api/admin/reset-database',
  requireAllPermissions(['canManageUsers', 'canManageRoles', 'canAccessAdminPanel']),
  resetDatabaseHandler
);
```

**Error Responses**:
- `401 PERMISSION_AUTH_REQUIRED` - Not authenticated
- `403 PERMISSION_NONE` - No permissions
- `403 PERMISSION_MISSING` - Missing one or more required permissions (lists which ones)

---

### `requireOwnershipOrAdmin(getResourceOwnerId)` - Resource Ownership

**Purpose**: Allow admin OR resource owner only

**Usage**:
```javascript
// Allow user to edit own profile, or admin to edit any profile
app.put('/api/users/:userId/profile',
  requireOwnershipOrAdmin((req) => req.params.userId),
  updateProfileHandler
);

// Allow station creator or admin to edit station
app.put('/api/stations/:id',
  requireOwnershipOrAdmin(async (req) => {
    const stationDoc = await admin.firestore()
      .collection('estacoes_clinicas')
      .doc(req.params.id)
      .get();
    return stationDoc.data()?.criadoPor;
  }),
  updateStationHandler
);
```

**Parameters**:
- `getResourceOwnerId` - Function that returns the UID of the resource owner
  - Can be synchronous or async
  - Receives `req` as parameter
  - Should return string UID

**Error Responses**:
- `401 OWNERSHIP_AUTH_REQUIRED` - Not authenticated
- `403 OWNERSHIP_FORBIDDEN` - Not owner and not admin
- `500 OWNERSHIP_CHECK_ERROR` - Error fetching owner ID

---

## 📚 Complete Examples

### Example 1: User Profile Endpoints

```javascript
// Get own profile (authenticated users only)
app.get('/api/profile',
  verifyAuth,
  requireAuth,
  (req, res) => {
    res.json({ user: req.user });
  }
);

// Update own profile (owner or admin)
app.put('/api/users/:userId/profile',
  verifyAuth,
  requireOwnershipOrAdmin((req) => req.params.userId),
  async (req, res) => {
    const { name, bio } = req.body;
    // Update logic here
    res.json({ success: true });
  }
);

// Delete user (admin only, needs multiple permissions)
app.delete('/api/users/:userId',
  verifyAuth,
  requireAllPermissions(['canManageUsers', 'canManageRoles']),
  async (req, res) => {
    // Delete logic here
    res.json({ success: true });
  }
);
```

---

### Example 2: Station Management Endpoints

```javascript
// List stations (optional auth for personalized content)
app.get('/api/stations',
  optionalAuth,
  async (req, res) => {
    const stations = await getStations();

    // Show extra data for authenticated users
    if (req.user) {
      stations.forEach(s => s.userProgress = getUserProgress(s.id, req.user.uid));
    }

    res.json(stations);
  }
);

// Create station (authenticated users only)
app.post('/api/stations',
  verifyAuth,
  requireAuth,
  async (req, res) => {
    const stationData = {
      ...req.body,
      criadoPor: req.user.uid
    };
    // Create logic
    res.json({ success: true });
  }
);

// Edit station (creator or admin or anyone with canEditStations)
app.put('/api/stations/:id',
  verifyAuth,
  requireAnyPermission(['canEditStations', 'canManageUsers']),
  async (req, res) => {
    // Update logic
    res.json({ success: true });
  }
);

// Delete station (admin only)
app.delete('/api/stations/:id',
  verifyAuth,
  requireAdmin,
  async (req, res) => {
    // Delete logic
    res.json({ success: true });
  }
);
```

---

### Example 3: Chat/Messaging Endpoints

```javascript
// Send message (authenticated users only)
app.post('/api/messages',
  verifyAuth,
  requireAuth,
  async (req, res) => {
    const messageData = {
      ...req.body,
      senderId: req.user.uid,
      timestamp: new Date()
    };
    // Save message
    res.json({ success: true });
  }
);

// Delete message (owner or moderator/admin)
app.delete('/api/messages/:id',
  verifyAuth,
  requireAnyPermission(['canDeleteMessages', 'canManageUsers']),
  async (req, res) => {
    // Delete logic
    res.json({ success: true });
  }
);

// Ban user from chat (moderator or admin)
app.post('/api/chat/ban/:userId',
  verifyAuth,
  requireModerator,
  async (req, res) => {
    // Ban logic
    res.json({ success: true });
  }
);
```

---

### Example 4: Analytics Endpoints

```javascript
// View analytics (requires permission)
app.get('/api/analytics/dashboard',
  verifyAuth,
  requirePermission('canViewAnalytics'),
  async (req, res) => {
    const analytics = await getAnalytics();
    res.json(analytics);
  }
);

// Export analytics (admin only)
app.get('/api/analytics/export',
  verifyAuth,
  requireAdmin,
  async (req, res) => {
    const data = await exportAnalytics();
    res.json(data);
  }
);
```

---

### Example 5: Admin Panel Endpoints

```javascript
// Access admin panel (requires specific permission)
app.get('/api/admin/dashboard',
  verifyAuth,
  requirePermission('canAccessAdminPanel'),
  async (req, res) => {
    const data = await getAdminDashboard();
    res.json(data);
  }
);

// Manage roles (requires specific permission)
app.put('/api/admin/users/:userId/role',
  verifyAuth,
  requirePermission('canManageRoles'),
  async (req, res) => {
    const { role } = req.body;

    // Validate role
    if (!['admin', 'moderator', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Update role in Firestore
    await admin.firestore()
      .collection('usuarios')
      .doc(req.params.userId)
      .update({
        role,
        roleLastUpdated: new Date(),
        roleUpdatedBy: req.user.uid
      });

    res.json({ success: true });
  }
);
```

---

## 🚀 Migration Path for Existing Endpoints

### Step 1: Apply Global Auth

```javascript
// BEFORE: No authentication
app.use('/api/', express.json());

// AFTER: All /api/* routes require authentication
app.use('/api/', verifyAuth);
```

### Step 2: Add Permission Checks

```javascript
// BEFORE: Admin check via hardcoded UIDs (INSECURE)
app.post('/api/admin/upload', (req, res) => {
  const userId = req.body.userId;
  const adminUIDs = ['RtfNENOqMUdw7pvgeeaBVSuin662', ...];

  if (!adminUIDs.includes(userId)) {
    return res.status(403).json({ error: 'Not admin' });
  }

  // Upload logic
});

// AFTER: Role-based admin check (SECURE)
app.post('/api/admin/upload',
  requireAdmin,
  (req, res) => {
    // Upload logic - req.user already validated
  }
);
```

### Step 3: Granular Permissions

```javascript
// BEFORE: Binary admin/not admin
if (isAdmin) {
  // Can do everything
}

// AFTER: Granular permissions
app.delete('/api/messages/:id',
  requirePermission('canDeleteMessages'),
  deleteHandler
);

app.put('/api/users/:id',
  requirePermission('canManageUsers'),
  updateHandler
);
```

---

## 🧪 Testing with Postman/Thunder Client

### 1. Get Firebase ID Token

```javascript
// In frontend or Firebase console
const user = firebase.auth().currentUser;
const token = await user.getIdToken();
console.log(token);
```

### 2. Set Authorization Header

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjFmODhiODE0MjljYzQ1M...
```

### 3. Test Endpoints

**Authenticated Endpoint**:
```bash
GET /api/profile
Headers:
  Authorization: Bearer <your_token>

Response: 200 OK
{
  "user": {
    "uid": "abc123",
    "email": "user@example.com",
    "role": "user",
    ...
  }
}
```

**Admin Endpoint**:
```bash
POST /api/admin/upload
Headers:
  Authorization: Bearer <admin_token>

Response (if not admin): 403 Forbidden
{
  "error": "Admin access required",
  "code": "ADMIN_FORBIDDEN",
  "currentRole": "user"
}
```

---

## ⚠️ Important Security Notes

### 1. Never Trust Frontend Auth Alone

```javascript
// ❌ BAD: Frontend checks can be bypassed
// Frontend: if (isAdmin) showAdminPanel();
// Backend: No auth check - ANYONE can call endpoint

// ✅ GOOD: Backend enforces auth
// Frontend: if (isAdmin) showAdminPanel();
// Backend: requireAdmin middleware - enforces server-side
```

### 2. Always Apply verifyAuth First

```javascript
// ❌ BAD: No authentication
app.delete('/api/messages/:id', requirePermission('canDeleteMessages'), handler);

// ✅ GOOD: Verify auth, then check permission
app.delete('/api/messages/:id', verifyAuth, requirePermission('canDeleteMessages'), handler);

// ✅ ALSO GOOD: Global auth for all /api/*
app.use('/api/', verifyAuth);
app.delete('/api/messages/:id', requirePermission('canDeleteMessages'), handler);
```

### 3. Token Expiration

- Firebase ID tokens expire after 1 hour
- Frontend must refresh tokens automatically
- Use Firebase SDK's `onIdTokenChanged` or `getIdToken(true)`

### 4. Firestore Security Rules

Backend auth is not enough! Also set Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read
    match /{document=**} {
      allow read: if request.auth != null;
    }

    // Only admins can write
    match /estacoes_clinicas/{station} {
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

## 📊 Monitoring & Logging

### Development Mode
- All auth events logged with `console.log`
- Permission checks logged
- Errors logged with details

### Production Mode
- Only critical errors logged
- Unauthorized access attempts logged (security)
- No verbose logging (cost optimization)

### Log Formats

**Success (dev only)**:
```
[AUTH] ✅ User authenticated: user@example.com (admin)
[PERMISSION] ✅ Permission granted: user@example.com has 'canDeleteMessages' → DELETE /api/messages/123
```

**Failures (always logged)**:
```
[ADMIN AUTH] ⚠️ Unauthorized access attempt: user@example.com (user) tried to access admin endpoint: POST /api/admin/upload
[PERMISSION] ⚠️ Permission denied: user@example.com (moderator) lacks 'canManageRoles' for PUT /api/users/456/role
```

---

## 🎯 Next Steps

1. **Apply Global Auth**: Add `app.use('/api/', verifyAuth)` to server.js
2. **Protect Admin Routes**: Add `requireAdmin` to existing admin endpoints
3. **Add Permission Checks**: Use `requirePermission` for granular control
4. **Update Frontend**: Remove hardcoded UID checks, use role-based UI
5. **Test Thoroughly**: Test all endpoints with different roles
6. **Deploy Firestore Rules**: Update security rules to match backend logic
7. **Monitor Logs**: Watch for unauthorized access attempts

---

**Status**: ✅ Implementation Complete
**Integration Pending**: Apply to server.js routes (P0-B02)
**Related Documentation**: `docs/architecture/FIRESTORE_ROLES_STRUCTURE.md`
