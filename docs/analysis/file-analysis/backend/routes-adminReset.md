# File Analysis: backend/routes/adminReset.js

## Overview
- **Path**: `backend/routes/adminReset.js`
- **Type**: Express Route Module (Admin User Reset)
- **Purpose**: Admin endpoints for resetting user statistics
- **Lines of Code**: ~233 LOC
- **Status**: ⚠️ **NOT INTEGRATED** - routes not added to server.js

## Critical Findings

### P0: NOT ACTUALLY USED ❌
- **Routes defined but NEVER registered in server.js**
- Comment on line 3 says "Adicione estas rotas ao seu server.js"
- **All admin reset functionality is non-functional**
- Wasted development effort

### P0: Uses SQL Database (Wrong Architecture!) ❌
- Lines 24-42, 120, 148-158, 184-205: SQL queries
- **Project uses Firestore (NoSQL), NOT SQL database!**
- Code references: `usuarios` table, `db.query()`, `UPDATE`, `CREATE TABLE`
- **This code will NEVER work in production**
- Completely wrong database architecture

### P0: Weak Authentication 🔐
- Line 11: `token !== process.env.ADMIN_SECRET_TOKEN`
- Simple token comparison (vulnerable to timing attacks)
- No role validation with Firebase Auth
- No audit logging of admin actions

### P1: Dangerous Operations Without Safeguards
- Bulk reset ALL users (line 19)
- No confirmation mechanism
- No rollback capability (except manual backup)
- Could accidentally wipe production data

## Issues by Priority

### Critical (P0)
- [ ] **NOT USED**: Routes never registered in server.js
- [ ] **WRONG DATABASE**: Uses SQL, project uses Firestore
- [ ] **SECURITY**: Weak admin authentication
- [ ] **NO AUDIT**: Admin actions not logged

### High (P1)
- [ ] **NO VALIDATION**: Missing input validation
- [ ] **NO RATE LIMITING**: Admin endpoints unlimited
- [ ] **DANGEROUS OPS**: Bulk operations without safeguards
- [ ] **NO TESTS**: Zero test coverage for critical operations

### Medium (P2)
- [ ] **NO ERROR RECOVERY**: Failed operations leave inconsistent state
- [ ] **NO NOTIFICATIONS**: No alert when admin resets data
- [ ] **HARDCODED SQL**: Not abstracted, hard to maintain

## What This File SHOULD Be (Firestore Version)

```javascript
const admin = require('firebase-admin');
const { requireFirebaseAuth, requireAdminRole } = require('../middleware/auth');

// Firestore-based reset
router.post('/api/admin/reset-all-user-stats',
  requireFirebaseAuth,
  requireAdminRole,
  async (req, res) => {
    const batch = admin.firestore().batch();
    const usersRef = admin.firestore().collection('usuarios');

    // Create backup first
    const backupId = `backup_${Date.now()}`;
    // ... backup logic

    const snapshot = await usersRef.get();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'offline',
        total_estacoes_feitas: 0,
        media_geral: 0,
        // ... other fields
        resetBy: req.user.email,
        resetAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();

    // Log to Sentry
    // Send admin notification

    res.json({ success: true, usersAffected: snapshot.size });
});
```

## Recommendations

### Immediate
1. **DO NOT USE THIS FILE** - Wrong architecture
2. **Remove or rewrite** for Firestore
3. **Document that SQL version doesn't work**

### If Keeping Admin Reset Functionality
1. Rewrite entirely for Firestore
2. Implement proper Firebase Auth admin verification
3. Add comprehensive audit logging
4. Add confirmation step ("type DELETE to confirm")
5. Implement automatic backups before operations
6. Add rate limiting
7. Send notifications to admin team
8. Create detailed tests

### If Removing
1. Delete file
2. Implement admin panel with UI confirmation
3. Use Firebase Console for manual operations

## Production Readiness: 0/10

**Verdict**: Completely unusable. Wrong database, not integrated, weak security. Either delete or completely rewrite.

**Status**: 🔴 **DO NOT DEPLOY**
