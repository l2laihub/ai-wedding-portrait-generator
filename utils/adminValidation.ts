/**
 * Admin Input Validation and Security Utilities
 * 
 * Comprehensive validation, sanitization, and security utilities
 * for admin dashboard operations
 */

import DOMPurify from 'dompurify';
import { z } from 'zod';

// Validation schemas
export const emailSchema = z.string().email().min(5).max(255);
export const userIdSchema = z.string().uuid();
export const creditsSchema = z.number().int().min(0).max(10000);
export const textSchema = z.string().min(1).max(1000);

export const grantBonusSchema = z.object({
  userId: userIdSchema,
  credits: creditsSchema,
  reason: textSchema,
  csrfToken: z.string().min(64).max(64)
});

export const searchSchema = z.object({
  term: z.string().max(100).optional(),
  page: z.number().int().min(1).max(1000).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  sortField: z.enum(['email', 'created_at', 'converted_at', 'promised_credits']).default('created_at'),
  sortDirection: z.enum(['asc', 'desc']).default('desc')
});

// Input sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  }).trim();
}

export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeInput(email);
  const result = emailSchema.safeParse(sanitized);
  
  if (!result.success) {
    throw new Error('Invalid email format');
  }
  
  return result.data;
}

export function sanitizeUserId(userId: string): string {
  const sanitized = sanitizeInput(userId);
  const result = userIdSchema.safeParse(sanitized);
  
  if (!result.success) {
    throw new Error('Invalid user ID format');
  }
  
  return result.data;
}

// SQL injection prevention
export function sanitizeForDatabase(input: string): string {
  // Remove potentially dangerous characters and patterns
  return input
    .replace(/[';\\--]/g, '') // Remove SQL comment and statement terminators
    .replace(/\b(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|EXEC|UNION|SELECT)\b/gi, '') // Remove SQL keywords
    .replace(/[<>]/g, '') // Remove HTML/XML brackets
    .trim();
}

// XSS prevention
export function sanitizeForHTML(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
}

// Rate limiting utilities
interface RateLimitEntry {
  count: number;
  resetTime: number;
  actions: string[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  identifier: string,
  action: string,
  maxAttempts: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `${identifier}:${action}`;
  
  let entry = rateLimitStore.get(key);
  
  // Reset if window expired
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
      actions: []
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime
    };
  }
  
  // Increment counter
  entry.count++;
  entry.actions.push(new Date(now).toISOString());
  
  // Keep only recent actions for debugging
  entry.actions = entry.actions.slice(-maxAttempts);
  
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: maxAttempts - entry.count,
    resetTime: entry.resetTime
  };
}

// CSRF token validation
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  if (typeof token !== 'string' || typeof sessionToken !== 'string') {
    return false;
  }
  
  if (token.length !== 64 || sessionToken.length !== 64) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ sessionToken.charCodeAt(i);
  }
  
  return result === 0;
}

// Secure query parameter validation
export function validateQueryParams(params: URLSearchParams): {
  search?: string;
  page: number;
  limit: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
} {
  const searchTerm = params.get('search');
  const pageParam = params.get('page');
  const limitParam = params.get('limit');
  const sortFieldParam = params.get('sortField');
  const sortDirectionParam = params.get('sortDirection');
  
  const result = searchSchema.safeParse({
    term: searchTerm ? sanitizeInput(searchTerm) : undefined,
    page: pageParam ? parseInt(pageParam, 10) : 1,
    limit: limitParam ? parseInt(limitParam, 10) : 50,
    sortField: sortFieldParam || 'created_at',
    sortDirection: sortDirectionParam === 'asc' ? 'asc' : 'desc'
  });
  
  if (!result.success) {
    throw new Error('Invalid query parameters');
  }
  
  return {
    search: result.data.term,
    page: result.data.page,
    limit: result.data.limit,
    sortField: result.data.sortField,
    sortDirection: result.data.sortDirection
  };
}

// Data export validation
export function validateExportRequest(params: {
  format: string;
  startDate?: string;
  endDate?: string;
  includeFields: string[];
}): {
  format: 'csv' | 'json';
  startDate?: Date;
  endDate?: Date;
  includeFields: string[];
} {
  // Validate format
  if (!['csv', 'json'].includes(params.format)) {
    throw new Error('Invalid export format');
  }
  
  // Validate dates
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  
  if (params.startDate) {
    startDate = new Date(sanitizeInput(params.startDate));
    if (isNaN(startDate.getTime())) {
      throw new Error('Invalid start date');
    }
  }
  
  if (params.endDate) {
    endDate = new Date(sanitizeInput(params.endDate));
    if (isNaN(endDate.getTime())) {
      throw new Error('Invalid end date');
    }
  }
  
  if (startDate && endDate && startDate > endDate) {
    throw new Error('Start date cannot be after end date');
  }
  
  // Validate fields
  const allowedFields = [
    'id', 'email', 'source', 'created_at', 'converted_at', 
    'promised_credits', 'bonus_granted'
  ];
  
  const includeFields = params.includeFields
    .map(field => sanitizeInput(field))
    .filter(field => allowedFields.includes(field));
  
  if (includeFields.length === 0) {
    throw new Error('At least one valid field must be selected for export');
  }
  
  return {
    format: params.format as 'csv' | 'json',
    startDate,
    endDate,
    includeFields
  };
}

// Audit log entry validation
export function createAuditLogEntry(
  action: string,
  details: Record<string, any>,
  userId?: string
): {
  action_type: string;
  action_details: Record<string, any>;
  admin_user_id?: string;
  ip_address: string;
  user_agent: string;
} {
  // Sanitize action type
  const actionType = sanitizeInput(action);
  if (actionType.length === 0 || actionType.length > 100) {
    throw new Error('Invalid action type');
  }
  
  // Sanitize and validate details
  const sanitizedDetails: Record<string, any> = {};
  for (const [key, value] of Object.entries(details)) {
    const sanitizedKey = sanitizeInput(key);
    if (sanitizedKey.length > 0 && sanitizedKey.length <= 50) {
      if (typeof value === 'string') {
        sanitizedDetails[sanitizedKey] = sanitizeInput(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitizedDetails[sanitizedKey] = value;
      } else if (value instanceof Date) {
        sanitizedDetails[sanitizedKey] = value.toISOString();
      }
    }
  }
  
  // Validate user ID if provided
  let adminUserId: string | undefined;
  if (userId) {
    adminUserId = sanitizeUserId(userId);
  }
  
  return {
    action_type: actionType,
    action_details: sanitizedDetails,
    admin_user_id: adminUserId,
    ip_address: 'client-side', // In production, get from server request
    user_agent: navigator.userAgent.slice(0, 500) // Limit length
  };
}

// Error message sanitization (prevent info leakage)
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Remove potentially sensitive information from error messages
    const message = error.message
      .replace(/\b\w+@\w+\.\w+\b/g, '[email]') // Remove emails
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[uuid]') // Remove UUIDs
      .replace(/password|token|secret|key/gi, '[credential]'); // Remove credential references
    
    return sanitizeInput(message);
  }
  
  return 'An unexpected error occurred';
}