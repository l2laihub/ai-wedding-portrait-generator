# Admin Dashboard Requirements Analysis

## Executive Summary

This document presents a comprehensive analysis of the requirements for implementing an Admin Dashboard for the AI Wedding Portrait Generator application. The analysis covers existing database structure, current systems, API integration points, required data models, and security considerations.

## 1. Existing Database Structure

### Core Tables

#### User Management
- **users** - Extended user profiles linked to auth.users
  - id (UUID, references auth.users)
  - email (TEXT, unique)
  - display_name (TEXT)
  - created_at (TIMESTAMP)
  - last_login (TIMESTAMP)
  - referral_code (TEXT, unique)

- **user_credits** - Credit balance tracking
  - user_id (UUID, references users)
  - free_credits_used_today (INTEGER)
  - paid_credits (INTEGER)
  - bonus_credits (INTEGER)
  - last_free_reset (DATE)

#### Payment & Billing
- **stripe_customers** - Maps Stripe customer IDs to users
  - user_id (UUID)
  - stripe_customer_id (TEXT, unique)
  - created_at (TIMESTAMP)

- **payment_logs** - Comprehensive payment audit trail
  - stripe_payment_id (TEXT)
  - customer_id (TEXT)
  - user_id (UUID)
  - amount (INTEGER, in cents)
  - status (TEXT)
  - event_type (TEXT)
  - error_code/message (TEXT)
  - metadata (JSONB)

- **credit_transactions** - Credit movement history
  - user_id (UUID)
  - type (TEXT: 'free_daily', 'purchase', 'bonus', 'usage', 'refund')
  - amount (INTEGER)
  - balance_after (INTEGER)
  - description (TEXT)
  - stripe_payment_id (TEXT)
  - created_at (TIMESTAMP)

#### Analytics & Tracking
- **usage_analytics** - Portrait generation tracking
  - session_id (TEXT)
  - portrait_type (TEXT)
  - theme (TEXT)
  - timestamp (TIMESTAMP)

- **waitlist** - Pre-launch email capture
  - email (TEXT, unique)
  - source (TEXT)
  - promised_credits (INTEGER)
  - ip_address (TEXT)
  - converted_user_id (UUID)
  - converted_at (TIMESTAMP)
  - bonus_granted (BOOLEAN)

- **webhook_events** - Stripe webhook idempotency
  - stripe_event_id (TEXT, unique)
  - event_type (TEXT)
  - processed_at (TIMESTAMP)
  - success (BOOLEAN)
  - error_message (TEXT)

### Existing Views
- **admin_stats** - Basic statistics aggregation
- **waitlist_analytics** - Waitlist conversion metrics

## 2. Current User & Payment Systems

### Authentication Service (authService.ts)
- Implements Supabase Auth for user authentication
- Supports email/password and Google OAuth
- Manages user sessions and profiles
- Handles user registration with referral tracking
- Provides password reset functionality

### Credits Service (creditsService.ts)
- Manages user credit balances (free, paid, bonus)
- Implements atomic credit consumption
- Provides transaction history
- Handles daily free credit reset (5 credits/day)
- Supports credit addition from payments

### Stripe Service (stripeService.ts)
- Manages Stripe payment integration
- Defines pricing tiers:
  - Starter: $4.99 for 10 credits
  - Wedding: $9.99 for 25 credits
  - Party: $24.99 for 75 credits
- Handles checkout session creation
- Supports coupon validation (EARLYBIRD = 50% off)

### Database Service (databaseService.ts)
- Provides waitlist management
- Tracks usage analytics
- Offers fallback to localStorage for development
- Includes basic analytics summary methods

## 3. API Integration Points

### Existing API Endpoints
1. **/api/webhooks/stripe.ts** - Stripe webhook handler
   - Processes payment events
   - Updates user credits after successful payments
   - Implements signature verification
   - Maintains idempotency

2. **/api/checkout/create.ts** - Checkout session creation (referenced but not found)

### Supabase Edge Functions
1. **stripe-checkout** - Creates Stripe checkout sessions
2. **stripe-webhook** - Processes Stripe webhooks
3. **test-webhook** - Testing endpoint

### External APIs
1. **Stripe API** - Payment processing
2. **Gemini API** - AI image generation
3. **PostHog** - Analytics and tracking

## 4. Required Data Models for Dashboard

### Dashboard Metrics Models

```typescript
// Revenue Metrics
interface RevenueMetrics {
  todayRevenue: number;
  yesterdayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
}

// User Metrics
interface UserMetrics {
  totalUsers: number;
  activeUsersToday: number;
  activeUsersWeek: number;
  activeUsersMonth: number;
  newUsersToday: number;
  userGrowthRate: number;
}

// Generation Metrics
interface GenerationMetrics {
  portraitsCreatedToday: number;
  portraitsCreatedWeek: number;
  portraitsCreatedMonth: number;
  averagePerUser: number;
  popularThemes: Array<{
    theme: string;
    count: number;
    percentage: number;
  }>;
}

// Conversion Metrics
interface ConversionMetrics {
  conversionRate: number; // Free to paid conversion
  averageOrderValue: number;
  lifetimeValue: number;
  churnRate: number;
}

// Alert System
interface SystemAlert {
  id: string;
  type: 'error_rate' | 'low_credits' | 'fraud' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
}

// User Management
interface UserDetails {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
  lastLogin: Date;
  status: 'active' | 'suspended' | 'banned';
  credits: {
    free: number;
    paid: number;
    bonus: number;
    total: number;
  };
  lifetime: {
    spent: number;
    generations: number;
    referrals: number;
  };
}

interface GenerationHistory {
  id: string;
  userId: string;
  timestamp: Date;
  theme: string;
  creditsUsed: number;
  status: 'completed' | 'failed';
}
```

### New Database Tables Needed

```sql
-- Admin users table for dashboard access
CREATE TABLE admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'support')),
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  active BOOLEAN DEFAULT true
);

-- System metrics cache for performance
CREATE TABLE system_metrics_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL,
  metric_date DATE NOT NULL,
  data JSONB NOT NULL,
  calculated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(metric_type, metric_date)
);

-- Admin audit log
CREATE TABLE admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES admin_users(id),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES users(id),
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- System alerts table
CREATE TABLE system_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES admin_users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 5. Security Requirements

### Authentication & Authorization
1. **Admin Role System**
   - Super Admin: Full system access
   - Admin: User management, credits, refunds
   - Support: Read-only access, basic user support

2. **Authentication Requirements**
   - Separate admin authentication from regular users
   - Multi-factor authentication (MFA) for admin accounts
   - Session timeout after inactivity
   - IP whitelist option for admin access

3. **Row Level Security (RLS)**
   - Admin tables should only be accessible by service role
   - Implement policies for admin role-based access
   - Audit log should be append-only

### API Security
1. **Admin API Endpoints**
   - Require admin authentication token
   - Implement rate limiting
   - Log all admin actions
   - Validate all inputs

2. **CORS Configuration**
   - Restrict admin dashboard to specific origins
   - Implement proper CORS headers

### Data Protection
1. **Sensitive Data Handling**
   - Mask credit card information
   - Encrypt sensitive user data
   - Implement data retention policies
   - GDPR compliance for data export

2. **Audit Trail**
   - Log all admin actions
   - Track data modifications
   - Monitor suspicious activities
   - Regular security audits

## 6. Implementation Recommendations

### Phase 1: Core Infrastructure
1. Create admin authentication system
2. Implement admin user management
3. Set up basic dashboard layout
4. Create metrics aggregation functions

### Phase 2: Dashboard Features
1. Implement real-time metrics display
2. Create revenue tracking and charts
3. Build user management interface
4. Add generation history viewing

### Phase 3: Advanced Features
1. Implement alert system
2. Add fraud detection
3. Create automated reporting
4. Build data export functionality

### Phase 4: Optimization
1. Implement caching for metrics
2. Add real-time updates via WebSockets
3. Optimize database queries
4. Create dashboard performance monitoring

## 7. Technical Considerations

### Performance
- Use materialized views for complex metrics
- Implement Redis caching for frequently accessed data
- Create database indexes for admin queries
- Use pagination for large datasets

### Scalability
- Design for horizontal scaling
- Implement proper connection pooling
- Use background jobs for heavy computations
- Consider read replicas for analytics

### Monitoring
- Set up error tracking (Sentry/PostHog)
- Monitor API performance
- Track dashboard usage metrics
- Implement uptime monitoring

## 8. Integration Requirements

### PostHog Integration
- Track admin dashboard usage
- Monitor feature adoption
- Analyze user management patterns
- Create admin-specific dashboards

### Stripe Integration
- Real-time payment updates
- Subscription management
- Refund processing
- Dispute handling

### Email Integration
- Admin alerts and notifications
- User communication templates
- Automated reports
- System status updates

## Conclusion

The existing codebase provides a solid foundation for implementing the Admin Dashboard. The database structure supports most requirements, with only a few additional tables needed for admin-specific functionality. The current services (auth, credits, payments) are well-structured and can be extended for admin use.

Key priorities for implementation:
1. Establish secure admin authentication
2. Create efficient metrics aggregation
3. Build intuitive user management interface
4. Implement comprehensive audit logging
5. Ensure scalability and performance

The modular architecture allows for incremental development, enabling the team to deliver value quickly while building toward the complete feature set.