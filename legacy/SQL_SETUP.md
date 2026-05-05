# SQL Database Setup

This project uses PostgreSQL for user authentication and RBAC (Role-Based Access Control) alongside Firestore for business data.

## Database Structure

### Core Tables

- **users** - User accounts with authentication credentials
- **roles** - System and custom roles for RBAC
- **permissions** - Granular permissions for resources and actions
- **user_roles** - Junction table linking users to roles
- **role_permissions** - Junction table linking roles to permissions
- **sessions** - Active user sessions and authentication tokens
- **password_reset_tokens** - Password reset functionality
- **email_verification_tokens** - Email verification

## Setup Instructions

### 1. Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE kindling_portal;

# Create user (optional)
CREATE USER kindling_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE kindling_portal TO kindling_user;

# Exit
\q
```

### 3. Set Environment Variables

Create or update `.env` file:
```env
DATABASE_URL=postgresql://localhost:5432/kindling_portal
# Or with custom user:
# DATABASE_URL=postgresql://kindling_user:your_secure_password@localhost:5432/kindling_portal

# Firebase credentials (existing)
GOOGLE_APPLICATION_CREDENTIALS=./kindling-portal-firebase-adminsdk-fbsvc-72b51e1944.json
```

### 4. Install Dependencies

```bash
npm install
```

This will install:
- `pg` - PostgreSQL client
- `bcryptjs` - Password hashing
- `@types/pg` - TypeScript types for pg
- `@types/bcryptjs` - TypeScript types for bcryptjs

### 5. Run Migrations

```bash
npm run migrate
```

This will:
- Create all tables with proper indexes
- Set up foreign key constraints
- Insert default roles and permissions
- Create triggers for automatic timestamp updates

### 6. Verify Setup

```bash
# Connect to database
psql kindling_portal

# List tables
\dt

# Check roles
SELECT * FROM roles;

# Check permissions
SELECT * FROM permissions;

# Exit
\q
```

## Available Scripts

```bash
# Run database migrations
npm run migrate

# Seed compliance data (Firestore)
npm run seed:compliance

# Run development server
npm run dev
```

## Default Roles

After migration, the following roles are available:

1. **super_admin** - Full system access with all permissions
2. **admin** - Administrative access to manage users and entities
3. **compliance_officer** - KYC review and audit log access
4. **accountant** - Financial records and ledger access
5. **lender** - Investment and portfolio management
6. **borrower** - Note and payment management

## Permission System

Permissions follow the pattern: `{resource}.{action}`

Examples:
- `users.read` - View user information
- `users.create` - Create new users
- `entities.approve_kyc` - Approve KYC for entities
- `audit_logs.read_all` - View all audit logs

## Architecture Notes

- **SQL Database**: Used for user authentication, sessions, and RBAC
- **Firestore**: Used for business entities, notes, investments, audit logs
- **Hybrid Approach**: Combines relational integrity for auth with NoSQL flexibility for business data

## Connection Management

The application uses connection pooling with these defaults:
- Max connections: 20
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

Adjust these in [server/db-sql.ts](server/db-sql.ts) as needed for your environment.

## Security Considerations

1. **Password Hashing**: Uses bcrypt with 10 salt rounds
2. **Session Management**: Tokens are 32-byte hex strings
3. **MFA Support**: Schema includes MFA secret storage
4. **Account Locking**: Failed login attempt tracking
5. **Token Expiration**: All tokens have expiration timestamps

## Troubleshooting

### Connection Errors

If you see "connection refused":
```bash
# Check if PostgreSQL is running
brew services list  # macOS
sudo systemctl status postgresql  # Linux
```

### Permission Denied

```bash
# Grant permissions
psql kindling_portal
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kindling_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kindling_user;
```

### Migration Fails

```bash
# Reset migrations (WARNING: drops all data)
psql kindling_portal
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
\q

# Re-run migrations
npm run migrate
```

## Production Deployment

For production, use:
- Connection pooling with environment-specific limits
- SSL/TLS for database connections
- Managed PostgreSQL service (AWS RDS, Google Cloud SQL, etc.)
- Regular backups and point-in-time recovery
- Read replicas for scaling

Example production connection string:
```
DATABASE_URL=postgresql://user:pass@host:5432/db?ssl=true&sslmode=require
```
