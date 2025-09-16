# Admin Dashboard Backend API Documentation

## Overview

This document describes the backend infrastructure for the AI Wedding Portrait Generator Admin Dashboard. The backend is built on Supabase with Edge Functions providing secure API endpoints for admin operations.

## Architecture

### Database Schema

The admin dashboard uses the following main tables:

#### Core Admin Tables
- `admin_users` - Admin user roles and permissions
- `system_metrics` - Performance and system metrics
- `daily_metrics` - Pre-aggregated daily metrics
- `user_activity_logs` - Detailed user activity tracking
- `alert_configs` - Alert configuration
- `alert_history` - Alert history and status
- `export_logs` - Data export tracking

#### Enhanced Payment Tables
- `payment_logs` - Comprehensive payment tracking
- `revenue_analytics` - Revenue breakdown by product/date
- `webhook_events` - Webhook event tracking for idempotency

#### Optimized Views
- `user_summary` - Pre-aggregated user data
- `payment_summary` - Payment data with user info
- `analytics_summary` - Usage analytics by date/theme
- `revenue_summary` - Revenue metrics with fee calculations
- `dashboard_overview` - Materialized view for dashboard metrics

## API Endpoints

### Base URL
All admin endpoints are under: `https://your-project.supabase.co/functions/v1/`

### Authentication
All requests require a valid admin session token in the Authorization header:
```
Authorization: Bearer <session_token>
```

## 1. Admin Authentication (`/admin-auth`)

### POST `/admin-auth/login`
Admin login with email/password.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "admin": {
    "id": "admin_id",
    "user_id": "user_id", 
    "email": "admin@example.com",
    "role": "admin",
    "permissions": {}
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_at": "timestamp"
  }
}
```

### POST `/admin-auth/verify`
Verify current admin session.

**Response:**
```json
{
  "valid": true,
  "admin": {
    "id": "admin_id",
    "role": "admin",
    "permissions": {}
  }
}
```

### POST `/admin-auth/promote`
Promote user to admin (super admin only).

**Request:**
```json
{
  "user_id": "user_id",
  "role": "admin",
  "permissions": {
    "manage_users": true,
    "view_analytics": true
  }
}
```

### POST `/admin-auth/demote`
Remove admin privileges (super admin only).

**Request:**
```json
{
  "user_id": "user_id"
}
```

## 2. Dashboard Data (`/admin-dashboard`)

### GET `/admin-dashboard/overview`
Get dashboard overview with key metrics.

**Response:**
```json
{
  "overview": {
    "total_users": 1234,
    "new_users_today": 45,
    "active_users": 567,
    "total_generations": 8901,
    "today_revenue": 12345,
    "pending_alerts": 3
  },
  "alerts": [...],
  "recentActivity": [...]
}
```

### GET `/admin-dashboard/metrics?range=7d&type=generation_time`
Get metrics data with filtering.

**Query Parameters:**
- `range`: 1d, 7d, 30d, 90d
- `type`: Specific metric type (optional)

**Response:**
```json
{
  "dailyMetrics": [...],
  "systemMetrics": [...]
}
```

### GET `/admin-dashboard/analytics?range=30d`
Get analytics data.

**Response:**
```json
{
  "analytics": [...],
  "conversionFunnel": {
    "signups": 100,
    "first_generation": 80,
    "purchases": 25,
    "conversion_to_purchase": 25.0
  }
}
```

### GET `/admin-dashboard/revenue?range=30d`
Get revenue analytics.

**Response:**
```json
{
  "analytics": [...],
  "recentPayments": [...],
  "summary": {
    "totalRevenue": 50000,
    "netRevenue": 48000,
    "stripeFees": 2000
  }
}
```

## 3. User Management (`/admin-users`)

### GET `/admin-users?page=1&limit=50&search=email&sortBy=created_at`
Get users with pagination and filtering.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)
- `search`: Search email/name/ID
- `sortBy`: Sort field (default: created_at)
- `sortOrder`: asc/desc (default: desc)
- `status`: active/inactive/suspended
- `hasCredits`: true/false
- `dateFrom`: Filter by registration date
- `dateTo`: Filter by registration date

**Response:**
```json
{
  "users": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1234,
    "totalPages": 25
  },
  "stats": {
    "totalUsers": 1234,
    "activeUsers": 567,
    "paidUsers": 234
  }
}
```

### GET `/admin-users/{user_id}`
Get detailed user information.

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "totalCredits": 50,
  "totalSpent": 2499,
  "paymentHistory": [...],
  "usageAnalytics": [...],
  "metrics": {
    "totalPurchases": 3,
    "totalUsage": 25,
    "successfulReferrals": 2
  }
}
```

### POST `/admin-users`
Create new user (admin only).

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "display_name": "New User",
  "initial_credits": 10
}
```

### PUT `/admin-users/{user_id}`
Update user (admin only).

**Request:**
```json
{
  "display_name": "Updated Name",
  "credits_adjustment": 50,
  "note": "Promotional credits"
}
```

### DELETE `/admin-users/{user_id}`
Delete user (super admin only).

## 4. Metrics Aggregation (`/metrics-aggregator`)

### POST `/metrics-aggregator?action=aggregate`
Trigger daily metrics aggregation.

### POST `/metrics-aggregator?action=real-time`
Get real-time metrics.

**Response:**
```json
{
  "timestamp": "2025-09-16T10:00:00Z",
  "newUsersToday": 45,
  "activeSessionsLastHour": 23,
  "generationsToday": 123,
  "revenueToday": 5000,
  "pendingAlerts": 2
}
```

### POST `/metrics-aggregator?action=record`
Record individual metric.

**Request:**
```json
{
  "metric_type": "generation_time",
  "metric_value": 2.5,
  "endpoint": "/api/generate",
  "user_id": "user_id",
  "metadata": {}
}
```

### POST `/metrics-aggregator?action=alerts`
Check and process alerts.

## 5. Data Export (`/admin-export`)

### GET `/admin-export/templates`
Get available export templates.

**Response:**
```json
{
  "templates": {
    "users": {
      "name": "Users Export",
      "fields": [...],
      "filters": [...]
    }
  }
}
```

### POST `/admin-export/export`
Export data.

**Request:**
```json
{
  "type": "users",
  "format": "csv",
  "filters": {
    "date_from": "2025-01-01",
    "date_to": "2025-09-16",
    "user_status": "active",
    "limit": 1000
  },
  "columns": ["id", "email", "created_at", "total_credits"]
}
```

**Response:** File download with appropriate headers.

### GET `/admin-export/history`
Get export history.

**Response:**
```json
{
  "exports": [
    {
      "id": "export_id",
      "export_type": "users",
      "export_format": "csv",
      "row_count": 1234,
      "created_at": "2025-09-16T10:00:00Z",
      "exported_by_email": "admin@example.com"
    }
  ]
}
```

## Security Features

### Role-Based Access Control
- **Super Admin**: Full access to all features
- **Admin**: User management, metrics viewing, data export
- **Viewer**: Read-only access to metrics and analytics

### Row Level Security (RLS)
All tables have RLS policies that restrict access based on admin roles.

### API Security
- JWT token validation on all endpoints
- Admin role verification for protected operations
- Rate limiting on sensitive operations
- Audit logging for all admin actions

### Data Protection
- Sensitive data is excluded from exports by default
- All admin actions are logged with user attribution
- Payment data access is strictly controlled

## Performance Optimizations

### Database Optimizations
- Materialized views for complex aggregations
- Strategic indexing for common queries
- Cached dashboard metrics (5-minute refresh)
- Optimized search functions with pagination

### Query Patterns
- Pre-aggregated daily metrics
- Efficient user search with trigram indexing
- Batch operations for bulk updates
- Connection pooling for high concurrency

## Monitoring and Alerts

### System Metrics
- API response times
- Generation processing times
- Database query performance
- Error rates

### Business Metrics
- User growth rates
- Revenue trends
- Credit usage patterns
- Conversion metrics

### Alert Types
- Low credit warnings
- High error rates
- Unusual activity patterns
- Payment failures
- System performance issues

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error description",
  "details": "Additional details if available",
  "code": "ERROR_CODE"
}
```

Common HTTP status codes:
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

## Memory Hooks for Frontend Integration

The backend provides specific data structures and endpoints designed for integration with the Frontend Developer's React components:

### Dashboard State Structure
```javascript
{
  overview: { /* overview metrics */ },
  users: { /* user management state */ },
  analytics: { /* analytics data */ },
  revenue: { /* revenue metrics */ },
  alerts: { /* alert configuration and history */ },
  exports: { /* export templates and history */ }
}
```

### Real-time Updates
The backend supports efficient polling for real-time metrics through the `/metrics-aggregator?action=real-time` endpoint.

### Pagination Support
All list endpoints support consistent pagination with `page`, `limit`, `total`, and `totalPages` for frontend table components.

## Deployment Notes

### Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Database Migrations
Run migrations in order:
1. `20250916_admin_dashboard_metrics.sql`
2. `20250916_optimize_admin_queries.sql`

### Edge Functions
Deploy all functions in `/supabase/functions/`:
- `admin-auth`
- `admin-dashboard`
- `admin-users`
- `metrics-aggregator`
- `admin-export`

### Scheduled Tasks
Set up cron jobs for:
- Daily metrics aggregation (daily at midnight)
- Alert checking (every 5 minutes)
- Dashboard metrics refresh (every 5 minutes)

This backend provides a comprehensive, secure, and performant foundation for the admin dashboard with all necessary features for user management, analytics, and system monitoring.