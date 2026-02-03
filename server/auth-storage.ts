import { pool } from './db-sql';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  emailVerified: boolean;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  key: string;
  resource: string;
  action: string;
  description?: string;
  createdAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  createdAt: Date;
}

export class AuthStorage {
  // ============================================================================
  // User Management
  // ============================================================================

  async createUser(email: string, password: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, status)
       VALUES ($1, $2, 'pending_verification')
       RETURNING *`,
      [email, passwordHash]
    );
    return this.mapUser(result.rows[0]);
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(updates.email);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }
    if (updates.emailVerified !== undefined) {
      fields.push(`email_verified = $${paramCount++}`);
      values.push(updates.emailVerified);
    }
    if (updates.mfaEnabled !== undefined) {
      fields.push(`mfa_enabled = $${paramCount++}`);
      values.push(updates.mfaEnabled);
    }
    if (updates.mfaSecret !== undefined) {
      fields.push(`mfa_secret = $${paramCount++}`);
      values.push(updates.mfaSecret);
    }
    if (updates.lastLoginAt !== undefined) {
      fields.push(`last_login_at = $${paramCount++}`);
      values.push(updates.lastLoginAt);
    }
    if (updates.failedLoginAttempts !== undefined) {
      fields.push(`failed_login_attempts = $${paramCount++}`);
      values.push(updates.failedLoginAttempts);
    }
    if (updates.lockedUntil !== undefined) {
      fields.push(`locked_until = $${paramCount++}`);
      values.push(updates.lockedUntil);
    }

    if (fields.length === 0) {
      return this.getUserById(id);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, userId]
    );
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    if (!result.rows[0]) return false;
    return bcrypt.compare(password, result.rows[0].password_hash);
  }

  // ============================================================================
  // Role Management
  // ============================================================================

  async getRoles(): Promise<Role[]> {
    const result = await pool.query('SELECT * FROM roles ORDER BY name');
    return result.rows.map(this.mapRole);
  }

  async getRoleById(id: string): Promise<Role | null> {
    const result = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
    return result.rows[0] ? this.mapRole(result.rows[0]) : null;
  }

  async getRoleByName(name: string): Promise<Role | null> {
    const result = await pool.query('SELECT * FROM roles WHERE name = $1', [name]);
    return result.rows[0] ? this.mapRole(result.rows[0]) : null;
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const result = await pool.query(
      `SELECT r.* FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );
    return result.rows.map(this.mapRole);
  }

  async assignRole(userId: string, roleId: string, assignedBy?: string): Promise<void> {
    await pool.query(
      'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [userId, roleId, assignedBy]
    );
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    await pool.query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId]
    );
  }

  // ============================================================================
  // Permission Management
  // ============================================================================

  async getPermissions(): Promise<Permission[]> {
    const result = await pool.query('SELECT * FROM permissions ORDER BY key');
    return result.rows.map(this.mapPermission);
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const result = await pool.query(
      `SELECT p.* FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = $1`,
      [roleId]
    );
    return result.rows.map(this.mapPermission);
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const result = await pool.query(
      `SELECT DISTINCT p.* FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       INNER JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );
    return result.rows.map(this.mapPermission);
  }

  async userHasPermission(userId: string, permissionKey: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT EXISTS(
         SELECT 1 FROM permissions p
         INNER JOIN role_permissions rp ON p.id = rp.permission_id
         INNER JOIN user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = $1 AND p.key = $2
       ) as has_permission`,
      [userId, permissionKey]
    );
    return result.rows[0]?.has_permission || false;
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  async createSession(
    userId: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Session> {
    const token = randomBytes(32).toString('hex');
    const refreshToken = randomBytes(32).toString('hex');
    
    const result = await pool.query(
      `INSERT INTO sessions (user_id, token, refresh_token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, token, refreshToken, ipAddress, userAgent, expiresAt]
    );
    return this.mapSession(result.rows[0]);
  }

  async getSessionByToken(token: string): Promise<Session | null> {
    const result = await pool.query(
      'SELECT * FROM sessions WHERE token = $1 AND expires_at > now()',
      [token]
    );
    return result.rows[0] ? this.mapSession(result.rows[0]) : null;
  }

  async deleteSession(token: string): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  }

  async cleanupExpiredSessions(): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE expires_at < now()');
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      mfaEnabled: row.mfa_enabled,
      mfaSecret: row.mfa_secret,
      status: row.status,
      emailVerified: row.email_verified,
      lastLoginAt: row.last_login_at,
      failedLoginAttempts: row.failed_login_attempts,
      lockedUntil: row.locked_until,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRole(row: any): Role {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      isSystem: row.is_system,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapPermission(row: any): Permission {
    return {
      id: row.id,
      key: row.key,
      resource: row.resource,
      action: row.action,
      description: row.description,
      createdAt: row.created_at,
    };
  }

  private mapSession(row: any): Session {
    return {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      refreshToken: row.refresh_token,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }
}

// Export singleton instance
export const authStorage = new AuthStorage();
