# Firestore-Only Implementation

The application now uses **Firestore exclusively** for all data storage including user authentication, RBAC, and business data.

## What Changed

### ✅ Added to Firestore

**New Collections:**
- `users` - User accounts with email/password authentication
- `sessions` - Active user sessions with tokens
- `password_reset_tokens` - Password reset functionality
- `email_verification_tokens` - Email verification tokens

**Updated Files:**
- [`shared/compliance-schema.ts`](shared/compliance-schema.ts) - Added user auth schemas
- [`server/compliance-storage.ts`](server/compliance-storage.ts) - Added 300+ lines of auth methods
- [`package.json`](package.json) - Added bcryptjs, removed pg

### ❌ Removed/Not Needed

These SQL-specific files are **not used** (can be deleted):
- `server/db-sql.ts` - PostgreSQL connection
- `server/auth-storage.ts` - SQL-based auth
- `server/migrations/001_create_auth_tables.sql` - SQL migration
- `server/run-migrations.ts` - Migration runner
- `SQL_SETUP.md` - SQL documentation

## New User Authentication Methods

### User Management
```typescript
// Create user (checks for duplicate email manually)
await complianceStorage.createUser(email, password);

// Get user
await complianceStorage.getUserById(userId);
await complianceStorage.getUserByEmail(email);

// Update user
await complianceStorage.updateUser(userId, { status: 'active' });

// Password operations
await complianceStorage.updatePassword(userId, newPassword);
const user = await complianceStorage.verifyPassword(email, password);
```

### Session Management
```typescript
// Create session (generates random tokens)
const session = await complianceStorage.createSession(
  userId,
  new Date(Date.now() + 24 * 60 * 60 * 1000), // expires in 24 hours
  ipAddress,
  userAgent
);

// Verify session
const session = await complianceStorage.getSessionByToken(token);

// Cleanup
await complianceStorage.deleteSession(token);
await complianceStorage.deleteUserSessions(userId);
await complianceStorage.cleanupExpiredSessions();
```

### Password Reset
```typescript
// Create reset token (valid for 1 hour)
const resetToken = await complianceStorage.createPasswordResetToken(
  userId,
  new Date(Date.now() + 60 * 60 * 1000)
);

// Verify and use
const token = await complianceStorage.getPasswordResetToken(tokenString);
if (token) {
  await complianceStorage.updatePassword(userId, newPassword);
  await complianceStorage.markPasswordResetTokenUsed(tokenString);
}
```

### Email Verification
```typescript
// Create verification token
const verifyToken = await complianceStorage.createEmailVerificationToken(
  userId,
  new Date(Date.now() + 24 * 60 * 60 * 1000)
);

// Verify email
await complianceStorage.markEmailVerified(userId, tokenString);
// This also updates user status to 'active'
```

## Security Features

✅ **Password Hashing** - Uses bcrypt with 10 salt rounds  
✅ **Unique Email Check** - Manual validation before creating users  
✅ **Session Tokens** - 32-byte random hex strings  
✅ **Token Expiration** - All tokens have expiration timestamps  
✅ **Account Locking** - Track failed login attempts  
✅ **MFA Support** - Schema includes MFA secret field  
✅ **Audit Logging** - All auth events logged automatically  

## Trade-offs (vs SQL)

### ❌ What You Lose

- **No referential integrity** - Must manually cascade deletes
- **No unique constraints** - Must check email uniqueness in code
- **Slower permission checks** - Multiple queries instead of SQL JOINs
- **No ACID transactions** - Limited to 500 documents per batch
- **Manual cleanup** - Must delete expired sessions/tokens yourself

### ✅ What You Gain

- **Automatic scaling** - No database server to manage
- **Real-time updates** - Built-in subscriptions
- **No migrations** - Flexible schema
- **Simpler deployment** - One service (Firestore) instead of two
- **Lower fixed costs** - Pay per operation instead of server

## Example: Permission Checking

In SQL, this would be a single JOIN query. In Firestore, it requires multiple queries:

```typescript
async userHasPermission(userId: string, resource: string, action: string): Promise<boolean> {
  // 1. Get user's roles
  const userRolesSnapshot = await db.collection('user_roles')
    .where('userId', '==', userId)
    .get();
  
  const roleIds = userRolesSnapshot.docs.map(d => d.data().roleId);
  if (roleIds.length === 0) return false;

  // 2. Get permissions for those roles
  const permissionPromises = roleIds.map(roleId =>
    db.collection('role_permissions')
      .where('roleId', '==', roleId)
      .get()
  );
  const permissionSnapshots = await Promise.all(permissionPromises);
  
  // 3. Get permission IDs
  const permissionIds = new Set<string>();
  permissionSnapshots.forEach(snap => {
    snap.docs.forEach(doc => permissionIds.add(doc.data().permissionId));
  });

  // 4. Check if permission exists
  for (const permId of permissionIds) {
    const permDoc = await db.collection('permissions').doc(permId).get();
    const perm = permDoc.data();
    if (perm && perm.resource === resource && perm.action === action) {
      return true;
    }
  }

  return false;
}
```

This is already implemented in `complianceStorage.userHasPermission()`.

## Collections Structure

```
Firestore
├── users
│   └── {userId}
│       ├── email
│       ├── passwordHash
│       ├── mfaEnabled
│       ├── status
│       └── ...
├── sessions
│   └── {sessionId}
│       ├── userId
│       ├── token
│       ├── expiresAt
│       └── ...
├── password_reset_tokens
├── email_verification_tokens
├── roles
├── permissions
├── user_roles
├── role_permissions
├── entities
├── documents
├── audit_logs
└── ... (other business collections)
```

## Usage Example

```typescript
import { complianceStorage } from './server/compliance-storage';

// Register new user
const user = await complianceStorage.createUser('user@example.com', 'password123');

// Create email verification token
const verifyToken = await complianceStorage.createEmailVerificationToken(
  user.id,
  new Date(Date.now() + 24 * 60 * 60 * 1000)
);

// Send email with token.token...

// User clicks link, verify email
await complianceStorage.markEmailVerified(user.id, verifyToken.token);

// Login
const authenticatedUser = await complianceStorage.verifyPassword(email, password);
if (authenticatedUser) {
  // Create session
  const session = await complianceStorage.createSession(
    authenticatedUser.id,
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  );
  // Return session.token to client
}

// Check permissions
const canCreateNotes = await complianceStorage.userHasPermission(
  userId,
  'notes',
  'create'
);
```

## Next Steps

1. **Delete SQL files** (optional):
   ```bash
   rm server/db-sql.ts
   rm server/auth-storage.ts
   rm server/run-migrations.ts
   rm -rf server/migrations
   rm SQL_SETUP.md
   ```

2. **Seed default roles/permissions**:
   ```bash
   npm run seed:compliance
   ```

3. **Build auth routes** - Create login/register/logout API endpoints

4. **Add session middleware** - Verify tokens on protected routes

5. **Implement cleanup cron** - Periodically run `cleanupExpiredSessions()`

## Dependencies

Only one new dependency added:
- `bcryptjs` - Password hashing (no native dependencies, works everywhere)
- `@types/bcryptjs` - TypeScript types

No PostgreSQL, no pg driver, no migrations needed!
