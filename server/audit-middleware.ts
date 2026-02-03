import type { Request, Response, NextFunction } from 'express';
import { complianceStorage } from './compliance-storage';
import type { InsertAuditLog } from '../shared/compliance-schema';

/**
 * Audit logging middleware for Express
 * Automatically logs all API requests to the audit_logs collection
 */

interface AuditableRequest extends Request {
  user?: {
    id: string;
    email?: string;
    name?: string;
  };
  entityId?: string;
  _auditContext?: {
    beforeData?: any;
    resourceId?: string;
    resourceType?: string;
  };
}

// Paths to exclude from audit logging (health checks, static assets, etc.)
const EXCLUDED_PATHS = [
  '/health',
  '/ping',
  '/favicon.ico',
  '/assets/',
  '/public/',
];

// Sensitive fields to redact from audit logs
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'ssn',
  'socialSecurityNumber',
  'creditCardNumber',
  'cvv',
];

/**
 * Redact sensitive information from an object
 */
function redactSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveData(item));
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/**
 * Parse resource and action from request
 */
function parseResourceAndAction(req: AuditableRequest): { 
  resource: string; 
  action: string; 
  resourceId?: string;
} {
  const path = req.path;
  const method = req.method;

  // Remove /api prefix if present
  const cleanPath = path.replace(/^\/api\//, '');
  
  // Split path into segments
  const segments = cleanPath.split('/').filter(s => s);
  
  // First segment is typically the resource
  const resource = segments[0] || 'unknown';
  
  // Determine action based on HTTP method and path
  let action = 'unknown';
  let resourceId: string | undefined;

  // Check if there's an ID in the path (typically second segment or after specific keywords)
  if (segments.length >= 2) {
    const potentialId = segments[1];
    // If it's not a nested resource name, it's likely an ID
    if (!['list', 'search', 'export', 'import', 'bulk'].includes(potentialId)) {
      resourceId = potentialId;
    }
  }

  switch (method) {
    case 'GET':
      if (resourceId) {
        action = 'read';
      } else if (cleanPath.includes('/search')) {
        action = 'search';
      } else if (cleanPath.includes('/export')) {
        action = 'export';
      } else {
        action = 'list';
      }
      break;
    case 'POST':
      if (cleanPath.includes('/login')) {
        action = 'login';
      } else if (cleanPath.includes('/logout')) {
        action = 'logout';
      } else if (cleanPath.includes('/import')) {
        action = 'import';
      } else if (cleanPath.includes('/approve')) {
        action = 'approve';
      } else if (cleanPath.includes('/reject')) {
        action = 'reject';
      } else if (cleanPath.includes('/bulk')) {
        action = 'bulk_create';
      } else {
        action = 'create';
      }
      break;
    case 'PUT':
    case 'PATCH':
      action = 'update';
      break;
    case 'DELETE':
      action = 'delete';
      break;
    default:
      action = method.toLowerCase();
  }

  return { resource, action, resourceId };
}

/**
 * Get IP address from request
 */
function getIpAddress(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Get user agent from request
 */
function getUserAgent(req: Request): string | undefined {
  return req.headers['user-agent'];
}

/**
 * Middleware to set up audit context for updates
 * Call this in your route handlers before updating data to capture "before" state
 */
export function setAuditContext(
  resourceType: string,
  resourceId: string,
  beforeData: any
) {
  return (req: AuditableRequest, res: Response, next: NextFunction) => {
    req._auditContext = {
      resourceType,
      resourceId,
      beforeData: redactSensitiveData(beforeData),
    };
    next();
  };
}

/**
 * Main audit logging middleware
 */
export function auditMiddleware(
  req: AuditableRequest,
  res: Response,
  next: NextFunction
) {
  // Skip excluded paths
  if (EXCLUDED_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Skip non-API requests
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  const startTime = Date.now();
  const { resource, action, resourceId } = parseResourceAndAction(req);
  
  // Capture request details
  const ipAddress = getIpAddress(req);
  const userAgent = getUserAgent(req);
  const requestBody = redactSensitiveData(req.body);
  const requestQuery = redactSensitiveData(req.query);

  // Store original res.json to intercept response
  const originalJson = res.json.bind(res);
  let responseData: any;
  let responseStatus = 200;

  // Override res.json to capture response
  res.json = function (data: any) {
    responseData = data;
    responseStatus = res.statusCode;
    return originalJson(data);
  };

  // Log after response is sent
  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      const status = responseStatus >= 200 && responseStatus < 300 ? 'success' : 'failure';
      
      // Determine if this is a sensitive operation that should always be logged
      const isSensitiveOperation = [
        'login', 'logout', 'create', 'update', 'delete', 
        'approve', 'reject', 'approve_kyc'
      ].includes(action);

      // Skip logging successful read operations for non-sensitive resources (optional)
      // Comment out these lines if you want to log all operations
      if (action === 'read' && status === 'success' && !isSensitiveOperation) {
        return;
      }

      // Prepare audit log data
      const auditLog: InsertAuditLog = {
        userId: req.user?.id,
        entityId: req.entityId,
        action,
        resource,
        resourceId: resourceId || req._auditContext?.resourceId,
        ipAddress,
        userAgent,
        status,
        metadata: {
          method: req.method,
          path: req.path,
          duration,
          statusCode: responseStatus,
          query: Object.keys(requestQuery).length > 0 ? requestQuery : undefined,
        },
      };

      // Add request body for create/update operations
      if (['create', 'update', 'bulk_create'].includes(action) && requestBody) {
        auditLog.changes = {
          after: requestBody,
        };
      }

      // Add before/after for updates if context was set
      if (action === 'update' && req._auditContext?.beforeData) {
        auditLog.changes = {
          before: req._auditContext.beforeData,
          after: requestBody,
        };
      }

      // Add error details if failed
      if (status === 'failure' && responseData) {
        auditLog.metadata = {
          ...auditLog.metadata,
          error: typeof responseData === 'string' 
            ? responseData 
            : responseData.message || responseData.error,
        };
      }

      // Log to database (fire and forget to not block response)
      await complianceStorage.createAuditLog(auditLog);
      
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to create audit log:', error);
    }
  });

  next();
}

/**
 * Middleware to require authentication and set user context
 * Use this before auditMiddleware to ensure user info is captured
 */
export function setUserContext(
  req: AuditableRequest,
  res: Response,
  next: NextFunction
) {
  // This is a placeholder - integrate with your actual auth system
  // Example: const user = req.session?.user || await verifyToken(req.headers.authorization);
  
  // For now, check if user is already set by auth middleware
  if (req.user) {
    // User already set by auth middleware
    next();
  } else {
    // No user found - this might be an unauthenticated request
    next();
  }
}

/**
 * Helper function to manually log audit events
 * Use this for operations that don't go through HTTP requests
 */
export async function logAuditEvent(data: InsertAuditLog): Promise<void> {
  try {
    await complianceStorage.createAuditLog(data);
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Middleware to log successful authentication
 */
export function logAuthSuccess(userId: string, entityId?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await logAuditEvent({
        userId,
        entityId,
        action: 'login',
        resource: 'auth',
        ipAddress: getIpAddress(req),
        userAgent: getUserAgent(req),
        status: 'success',
        metadata: {
          method: 'POST',
          path: req.path,
        },
      });
    } catch (error) {
      console.error('Failed to log auth success:', error);
    }
    next();
  };
}

/**
 * Middleware to log failed authentication
 */
export function logAuthFailure(reason?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await logAuditEvent({
        action: 'login',
        resource: 'auth',
        ipAddress: getIpAddress(req),
        userAgent: getUserAgent(req),
        status: 'failure',
        metadata: {
          method: 'POST',
          path: req.path,
          error: reason || 'Authentication failed',
        },
      });
    } catch (error) {
      console.error('Failed to log auth failure:', error);
    }
    next();
  };
}

/**
 * Middleware to log logout
 */
export function logLogout(userId: string, entityId?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await logAuditEvent({
        userId,
        entityId,
        action: 'logout',
        resource: 'auth',
        ipAddress: getIpAddress(req),
        userAgent: getUserAgent(req),
        status: 'success',
        metadata: {
          method: 'POST',
          path: req.path,
        },
      });
    } catch (error) {
      console.error('Failed to log logout:', error);
    }
    next();
  };
}
