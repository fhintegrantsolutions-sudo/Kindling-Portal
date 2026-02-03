-- Migration: 001_create_auth_tables
-- Description: Create core authentication and RBAC tables
-- Created: 2026-02-03

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending_verification')),
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create index on role name
CREATE INDEX idx_roles_name ON roles(name);

-- Permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create index on permission key
CREATE INDEX idx_permissions_key ON permissions(key);
CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);

-- User roles junction table
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES users(id),
  PRIMARY KEY (user_id, role_id)
);

-- Create indexes for user_roles
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- Role permissions junction table
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

-- Create indexes for role_permissions
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Sessions table for authentication
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create indexes for sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Password reset tokens table
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create indexes for password_reset_tokens
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);

-- Email verification tokens table
CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create indexes for email_verification_tokens
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default roles
INSERT INTO roles (name, display_name, description, is_system) VALUES
  ('super_admin', 'Super Administrator', 'Full system access with all permissions', true),
  ('admin', 'Administrator', 'Administrative access to manage users, entities, and platform operations', true),
  ('compliance_officer', 'Compliance Officer', 'Can review KYC documents, approve entities, and access audit logs', true),
  ('accountant', 'Accountant', 'Access to financial records, ledger, and accounting functions', true),
  ('lender', 'Lender', 'Can view opportunities, make investments, and manage their portfolio', false),
  ('borrower', 'Borrower', 'Can view their notes, make payments, and manage borrower profile', false);

-- Insert default permissions
INSERT INTO permissions (key, resource, action, description) VALUES
  -- User management
  ('users.read', 'users', 'read', 'View user information'),
  ('users.create', 'users', 'create', 'Create new users'),
  ('users.update', 'users', 'update', 'Update user information'),
  ('users.delete', 'users', 'delete', 'Delete users'),
  
  -- Role management
  ('roles.read', 'roles', 'read', 'View roles and permissions'),
  ('roles.create', 'roles', 'create', 'Create new roles'),
  ('roles.update', 'roles', 'update', 'Update roles'),
  ('roles.delete', 'roles', 'delete', 'Delete roles'),
  ('roles.assign', 'roles', 'assign', 'Assign roles to users'),
  
  -- Entity management
  ('entities.read', 'entities', 'read', 'View entity information'),
  ('entities.create', 'entities', 'create', 'Create new entities'),
  ('entities.update', 'entities', 'update', 'Update entity information'),
  ('entities.delete', 'entities', 'delete', 'Delete entities'),
  ('entities.approve_kyc', 'entities', 'approve_kyc', 'Approve KYC for entities'),
  
  -- System
  ('system.configure', 'system', 'configure', 'Configure system settings'),
  ('audit_logs.read_all', 'audit_logs', 'read_all', 'View all audit logs');

-- Grant all permissions to super_admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin';

-- Grant specific permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.key IN (
    'users.read', 'users.create', 'users.update', 'users.delete',
    'roles.read', 'roles.assign',
    'entities.read', 'entities.create', 'entities.update', 'entities.delete',
    'audit_logs.read_all'
  );

-- Grant specific permissions to compliance_officer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'compliance_officer'
  AND p.key IN (
    'users.read',
    'entities.read', 'entities.update', 'entities.approve_kyc',
    'audit_logs.read_all'
  );

-- Grant specific permissions to accountant role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'accountant'
  AND p.key IN (
    'users.read',
    'entities.read'
  );

-- Comments
COMMENT ON TABLE users IS 'User accounts with authentication credentials';
COMMENT ON TABLE roles IS 'System and custom roles for RBAC';
COMMENT ON TABLE permissions IS 'Granular permissions for resources and actions';
COMMENT ON TABLE user_roles IS 'Junction table linking users to their assigned roles';
COMMENT ON TABLE role_permissions IS 'Junction table linking roles to their permissions';
COMMENT ON TABLE sessions IS 'Active user sessions and tokens';
COMMENT ON TABLE password_reset_tokens IS 'Tokens for password reset functionality';
COMMENT ON TABLE email_verification_tokens IS 'Tokens for email verification';
