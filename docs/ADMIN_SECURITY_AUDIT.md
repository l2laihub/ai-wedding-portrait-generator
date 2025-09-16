# Admin Dashboard Security Audit & Implementation Plan

## Current Security Assessment

### 🔴 Critical Issues Found

1. **No Admin Authentication System**
   - No admin role or permission system exists
   - `WaitlistDashboard` component has no authentication checks
   - Admin views (`admin_stats`, `waitlist_analytics`) are accessible to all authenticated users
   - No admin-specific routes or middleware

2. **Insufficient Authorization Controls**
   - RLS policies allow any authenticated user to access sensitive data
   - No role-based access control (RBAC) implementation
   - Admin functions like `grant_pending_waitlist_bonuses()` lack proper authorization

3. **Security Vulnerabilities**
   - Direct database queries without proper validation
   - No CSRF protection for admin actions
   - Missing rate limiting on admin endpoints
   - No audit logging for admin actions

## Security Implementation Plan

### 1. Admin Authentication & Authorization

#### Database Schema Changes
```sql
-- Add admin role to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));

-- Create admin_actions audit log
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Update RLS policies for admin access
CREATE POLICY "Only admins can access admin_stats" ON admin_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );
```

#### Authentication Service Updates
```typescript
// Add to authService.ts
async isAdmin(): Promise<boolean> {
  if (!this.currentUser) return false;
  
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', this.currentUser.id)
    .single();
    
  return data?.role === 'admin' || data?.role === 'super_admin';
}

async checkAdminAccess(): Promise<{ isAdmin: boolean; error?: string }> {
  const isAdmin = await this.isAdmin();
  if (!isAdmin) {
    return { isAdmin: false, error: 'Unauthorized: Admin access required' };
  }
  return { isAdmin: true };
}
```

### 2. Admin Route Protection

```typescript
// components/AdminRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/" />;
  
  return <>{children}</>;
};
```

### 3. API Security Middleware

```typescript
// middleware/adminAuth.ts
export async function requireAdminAuth(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw error;

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      return new Response('Forbidden', { status: 403 });
    }

    return null; // Continue processing
  } catch (error) {
    return new Response('Unauthorized', { status: 401 });
  }
}
```

### 4. Input Validation & Sanitization

```typescript
// utils/validation.ts
import DOMPurify from 'dompurify';
import { z } from 'zod';

// Schema for waitlist operations
export const grantBonusSchema = z.object({
  userId: z.string().uuid(),
  credits: z.number().min(1).max(1000),
  reason: z.string().min(1).max(500)
});

// Sanitize user inputs
export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}

// Validate and sanitize query parameters
export function validateQueryParams(params: Record<string, any>) {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'number' && !isNaN(value)) {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}
```

### 5. CSRF Protection

```typescript
// utils/csrf.ts
import crypto from 'crypto';

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  return token === sessionToken && token.length === 64;
}

// Add to admin forms
export function CSRFTokenField({ token }: { token: string }) {
  return <input type="hidden" name="csrf_token" value={token} />;
}
```

### 6. Rate Limiting for Admin Actions

```typescript
// utils/adminRateLimiter.ts
const adminActionLimits = new Map<string, { count: number; resetTime: number }>();

export function checkAdminRateLimit(
  userId: string, 
  action: string, 
  maxAttempts = 10, 
  windowMs = 60000
): boolean {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const limit = adminActionLimits.get(key);

  if (!limit || now > limit.resetTime) {
    adminActionLimits.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (limit.count >= maxAttempts) {
    return false;
  }

  limit.count++;
  return true;
}
```

## Security Testing Checklist

### Authentication Tests
- [ ] Test login with non-admin user cannot access admin routes
- [ ] Test admin user can access admin dashboard
- [ ] Test session timeout and re-authentication
- [ ] Test concurrent admin sessions
- [ ] Test admin role revocation immediately blocks access

### Authorization Tests
- [ ] Test each admin action requires proper role
- [ ] Test RLS policies block non-admin database access
- [ ] Test API endpoints return 403 for non-admin users
- [ ] Test privilege escalation attempts
- [ ] Test direct database manipulation attempts

### Input Validation Tests
- [ ] Test SQL injection on all admin forms
- [ ] Test XSS attempts in text inputs
- [ ] Test file upload validation
- [ ] Test numeric input boundaries
- [ ] Test malformed JSON/data structures

### CSRF Protection Tests
- [ ] Test form submission without CSRF token
- [ ] Test replay attacks with old tokens
- [ ] Test cross-origin requests are blocked
- [ ] Test token rotation on sensitive actions

### Rate Limiting Tests
- [ ] Test rapid admin action attempts
- [ ] Test distributed attack patterns
- [ ] Test rate limit reset timing
- [ ] Test bypass attempts with multiple accounts

### Data Security Tests
- [ ] Test data export includes only authorized data
- [ ] Test no sensitive data in API responses
- [ ] Test proper data encryption at rest
- [ ] Test secure session storage
- [ ] Test logout clears all sensitive data

### Audit Logging Tests
- [ ] Test all admin actions are logged
- [ ] Test log tampering prevention
- [ ] Test log retention policies
- [ ] Test sensitive data is not logged
- [ ] Test log access controls

## Performance Testing

### Load Tests
- [ ] Test dashboard with 10,000+ users
- [ ] Test concurrent admin sessions (10+)
- [ ] Test large data exports (100,000+ records)
- [ ] Test real-time updates with high traffic
- [ ] Test database query optimization

### Response Time Tests
- [ ] Dashboard load time < 2 seconds
- [ ] Data refresh < 1 second
- [ ] Export generation < 5 seconds
- [ ] Search/filter < 500ms
- [ ] Bulk operations < 10 seconds

## Security Best Practices

### Code Security
1. Never trust client-side validation
2. Always use parameterized queries
3. Implement proper error handling without info leakage
4. Use secure random generators for tokens
5. Implement proper secret management

### Infrastructure Security
1. Use HTTPS everywhere
2. Implement proper CORS policies
3. Use secure headers (CSP, X-Frame-Options, etc.)
4. Regular security updates
5. Implement DDoS protection

### Monitoring & Alerting
1. Monitor failed authentication attempts
2. Alert on unusual admin activity patterns
3. Track API response times
4. Monitor database query performance
5. Set up security incident alerts

## Implementation Priority

1. **Immediate (Week 1)**
   - Implement admin role system
   - Add authentication checks to admin routes
   - Update RLS policies
   - Add basic audit logging

2. **High Priority (Week 2)**
   - Implement CSRF protection
   - Add input validation
   - Implement rate limiting
   - Add admin action logging

3. **Medium Priority (Week 3)**
   - Performance optimization
   - Advanced monitoring
   - Security headers
   - Automated testing

4. **Long-term**
   - Penetration testing
   - Security audit by third party
   - Compliance certifications
   - Advanced threat detection