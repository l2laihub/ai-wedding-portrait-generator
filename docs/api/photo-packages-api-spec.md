# Photo Packages API Specification

## Overview
This document defines the API endpoints, database functions, and integration points for the Photo Packages feature.

## Edge Function Endpoints

### 1. Package Management (Admin Only)

#### GET /packages/list
List all photo packages with pagination and filtering.

**Authentication:** Required (Admin role)

**Request:**
```typescript
interface ListPackagesRequest {
  page?: number;
  limit?: number;
  filter?: {
    status?: 'active' | 'inactive' | 'draft';
    tier?: 'free' | 'basic' | 'premium' | 'professional';
  };
  sort?: {
    field: 'created_at' | 'name' | 'order_index' | 'price';
    direction: 'asc' | 'desc';
  };
}
```

**Response:**
```typescript
interface ListPackagesResponse {
  packages: PhotoPackage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PhotoPackage {
  id: string;
  name: string;
  description: string;
  tier: 'free' | 'basic' | 'premium' | 'professional';
  features: string[];
  theme_ids: string[];
  theme_count: number;
  price: number;
  credits_included: number;
  order_index: number;
  status: 'active' | 'inactive' | 'draft';
  stripe_product_id?: string;
  stripe_price_id?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

#### GET /packages/:id
Get a single package by ID.

**Authentication:** Required (Admin role)

**Response:**
```typescript
interface GetPackageResponse {
  package: PhotoPackage;
  themes: Theme[]; // Populated theme details
  usage_stats?: {
    total_users: number;
    active_users: number;
    total_generations: number;
    revenue_generated: number;
  };
}
```

#### POST /packages
Create a new photo package.

**Authentication:** Required (Admin role)

**Request:**
```typescript
interface CreatePackageRequest {
  name: string;
  description: string;
  tier: 'free' | 'basic' | 'premium' | 'professional';
  features: string[];
  theme_ids: string[];
  price: number;
  credits_included: number;
  order_index?: number;
  status?: 'active' | 'inactive' | 'draft';
  stripe_product_id?: string;
  stripe_price_id?: string;
  metadata?: Record<string, any>;
}
```

**Response:**
```typescript
interface CreatePackageResponse {
  package: PhotoPackage;
  stripe_sync_status?: 'synced' | 'pending' | 'failed';
}
```

#### PUT /packages/:id
Update an existing package.

**Authentication:** Required (Admin role)

**Request:**
```typescript
interface UpdatePackageRequest {
  name?: string;
  description?: string;
  features?: string[];
  theme_ids?: string[];
  price?: number;
  credits_included?: number;
  order_index?: number;
  status?: 'active' | 'inactive' | 'draft';
  metadata?: Record<string, any>;
}
```

**Response:**
```typescript
interface UpdatePackageResponse {
  package: PhotoPackage;
  changes: string[]; // List of changed fields
  stripe_sync_status?: 'synced' | 'pending' | 'failed';
}
```

#### DELETE /packages/:id
Soft delete a package (sets status to inactive).

**Authentication:** Required (Admin role)

**Response:**
```typescript
interface DeletePackageResponse {
  success: boolean;
  affected_users: number;
  migration_required: boolean;
}
```

### 2. Theme Management per Package

#### POST /packages/:packageId/themes
Add themes to a package.

**Authentication:** Required (Admin role)

**Request:**
```typescript
interface AddThemesToPackageRequest {
  theme_ids: string[];
  replace?: boolean; // If true, replaces all themes; if false, adds to existing
}
```

**Response:**
```typescript
interface AddThemesToPackageResponse {
  package_id: string;
  theme_ids: string[];
  added_count: number;
  total_themes: number;
}
```

#### DELETE /packages/:packageId/themes/:themeId
Remove a theme from a package.

**Authentication:** Required (Admin role)

**Response:**
```typescript
interface RemoveThemeResponse {
  success: boolean;
  remaining_themes: number;
}
```

### 3. Package Selection for Users

#### GET /packages/available
Get packages available for the current user.

**Authentication:** Required

**Request:**
```typescript
interface GetAvailablePackagesRequest {
  include_current?: boolean; // Include user's current package
  portrait_type?: 'single' | 'couple' | 'family';
}
```

**Response:**
```typescript
interface GetAvailablePackagesResponse {
  current_package?: {
    package: PhotoPackage;
    expires_at?: string;
    credits_remaining: number;
    usage: {
      total_generations: number;
      themes_used: string[];
    };
  };
  available_packages: Array<{
    package: PhotoPackage;
    is_upgrade: boolean;
    is_downgrade: boolean;
    price_difference?: number;
  }>;
  recommended_package?: string; // Package ID based on usage patterns
}
```

#### POST /packages/select
Select/purchase a package for the current user.

**Authentication:** Required

**Request:**
```typescript
interface SelectPackageRequest {
  package_id: string;
  payment_method?: string; // Stripe payment method ID
  promo_code?: string;
}
```

**Response:**
```typescript
interface SelectPackageResponse {
  success: boolean;
  user_package: {
    id: string;
    user_id: string;
    package_id: string;
    expires_at?: string;
    credits_remaining: number;
  };
  payment?: {
    stripe_payment_intent_id: string;
    status: 'succeeded' | 'pending' | 'requires_action';
    client_secret?: string; // For additional authentication
  };
}
```

#### GET /packages/:packageId/themes
Get themes available in a specific package.

**Authentication:** Required

**Request:**
```typescript
interface GetPackageThemesRequest {
  portrait_type?: 'single' | 'couple' | 'family';
  include_previews?: boolean;
}
```

**Response:**
```typescript
interface GetPackageThemesResponse {
  package_id: string;
  themes: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    preview_url?: string;
    is_premium: boolean;
    usage_count?: number; // If user has access
  }>;
  total_themes: number;
}
```

### 4. Migration Endpoints

#### POST /packages/migrate
Migrate users between packages.

**Authentication:** Required (Admin role)

**Request:**
```typescript
interface MigrateUsersRequest {
  from_package_id?: string; // If not provided, migrates all users
  to_package_id: string;
  user_ids?: string[]; // Specific users to migrate
  conditions?: {
    inactive_days?: number;
    credit_threshold?: number;
    tier?: string;
  };
  preserve_credits?: boolean;
  send_notification?: boolean;
}
```

**Response:**
```typescript
interface MigrateUsersResponse {
  migrated_count: number;
  failed_count: number;
  migration_id: string;
  details: Array<{
    user_id: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
}
```

#### GET /packages/migration/:migrationId/status
Check migration status.

**Authentication:** Required (Admin role)

**Response:**
```typescript
interface MigrationStatusResponse {
  migration_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: {
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
  };
  started_at: string;
  completed_at?: string;
  errors?: string[];
}
```

## Database Functions

### 1. get_available_packages_for_user(user_id)
```sql
-- Returns packages available for a specific user
-- Considers user's current tier, usage, and eligibility
CREATE OR REPLACE FUNCTION get_available_packages_for_user(
  p_user_id UUID
)
RETURNS TABLE (
  package_id UUID,
  name TEXT,
  description TEXT,
  tier TEXT,
  features TEXT[],
  theme_count INTEGER,
  price DECIMAL,
  credits_included INTEGER,
  is_current BOOLEAN,
  is_eligible BOOLEAN,
  eligibility_reason TEXT
)
```

### 2. get_themes_by_package(package_id, portrait_type)
```sql
-- Returns themes available in a package, optionally filtered by portrait type
CREATE OR REPLACE FUNCTION get_themes_by_package(
  p_package_id UUID,
  p_portrait_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  theme_id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  portrait_types TEXT[],
  preview_url TEXT,
  is_premium BOOLEAN,
  popularity_score INTEGER
)
```

### 3. get_package_usage_analytics(package_id, date_range)
```sql
-- Returns comprehensive analytics for a package
CREATE OR REPLACE FUNCTION get_package_usage_analytics(
  p_package_id UUID,
  p_start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE (
  total_users INTEGER,
  active_users INTEGER,
  new_users INTEGER,
  total_generations INTEGER,
  avg_generations_per_user DECIMAL,
  popular_themes JSON,
  revenue_generated DECIMAL,
  churn_rate DECIMAL,
  upgrade_rate DECIMAL,
  downgrade_rate DECIMAL,
  daily_usage JSON
)
```

### 4. check_user_package_access(user_id, theme_id)
```sql
-- Checks if user has access to a specific theme through their package
CREATE OR REPLACE FUNCTION check_user_package_access(
  p_user_id UUID,
  p_theme_id UUID
)
RETURNS TABLE (
  has_access BOOLEAN,
  package_id UUID,
  package_name TEXT,
  credits_remaining INTEGER,
  access_reason TEXT
)
```

### 5. calculate_package_recommendations(user_id)
```sql
-- Calculates package recommendations based on user behavior
CREATE OR REPLACE FUNCTION calculate_package_recommendations(
  p_user_id UUID
)
RETURNS TABLE (
  recommended_package_id UUID,
  recommendation_score DECIMAL,
  reasons TEXT[],
  potential_savings DECIMAL,
  usage_prediction JSON
)
```

## Integration Points

### 1. Stripe Product Mapping

```typescript
interface StripePackageMapping {
  package_id: string;
  stripe_product_id: string;
  stripe_price_id: string;
  sync_status: 'synced' | 'pending' | 'failed';
  last_synced_at: string;
}

// Webhook handler for Stripe events
interface StripeWebhookHandler {
  'product.created': (product: Stripe.Product) => Promise<void>;
  'product.updated': (product: Stripe.Product) => Promise<void>;
  'price.created': (price: Stripe.Price) => Promise<void>;
  'price.updated': (price: Stripe.Price) => Promise<void>;
  'subscription.created': (subscription: Stripe.Subscription) => Promise<void>;
  'subscription.updated': (subscription: Stripe.Subscription) => Promise<void>;
  'subscription.deleted': (subscription: Stripe.Subscription) => Promise<void>;
}
```

### 2. Credit Consumption per Package

```typescript
interface CreditConsumption {
  package_id: string;
  portrait_type: 'single' | 'couple' | 'family';
  theme_id: string;
  credits_required: number;
  
  // Consumption rules
  rules: {
    base_cost: number;
    multipliers: {
      portrait_type: number;
      theme_premium: number;
      bulk_discount?: number;
    };
  };
}

// Credit deduction function
async function deductCredits(
  userId: string,
  consumption: CreditConsumption
): Promise<{
  success: boolean;
  remaining_credits: number;
  transaction_id: string;
}> {
  // Implementation
}
```

### 3. Analytics Tracking

```typescript
interface PackageAnalyticsEvent {
  event_type: 
    | 'package_viewed'
    | 'package_selected'
    | 'package_upgraded'
    | 'package_downgraded'
    | 'theme_used'
    | 'credits_exhausted';
  
  user_id: string;
  package_id: string;
  metadata: {
    previous_package_id?: string;
    theme_id?: string;
    portrait_type?: string;
    credits_before?: number;
    credits_after?: number;
    price_paid?: number;
    promo_code_used?: string;
  };
  
  timestamp: string;
  session_id: string;
}

// PostHog tracking integration
interface PostHogIntegration {
  trackPackageEvent(event: PackageAnalyticsEvent): Promise<void>;
  identifyUserPackage(userId: string, packageId: string): Promise<void>;
  trackRevenue(userId: string, amount: number, packageId: string): Promise<void>;
}
```

## Authentication Requirements

### Public Endpoints (No Authentication)
- None (all endpoints require authentication)

### User Authentication Required
- GET /packages/available
- POST /packages/select
- GET /packages/:packageId/themes

### Admin Authentication Required
- All package management endpoints (CRUD)
- Theme management endpoints
- Migration endpoints
- Analytics endpoints

### Authentication Headers
```typescript
interface AuthHeaders {
  'Authorization': `Bearer ${jwt_token}`;
  'X-User-Role'?: 'admin' | 'user';
  'X-API-Version'?: string;
}
```

### Rate Limiting
```typescript
interface RateLimits {
  public: {
    // No public endpoints
  };
  authenticated: {
    '/packages/available': '60/hour';
    '/packages/select': '10/hour';
    '/packages/*/themes': '100/hour';
  };
  admin: {
    '*': '1000/hour'; // Higher limits for admin operations
  };
}
```

## Error Responses

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    request_id: string;
  };
  status: number;
}

// Common error codes
enum ErrorCodes {
  // Authentication
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  
  // Validation
  INVALID_REQUEST = 'invalid_request',
  MISSING_PARAMETER = 'missing_parameter',
  
  // Business Logic
  PACKAGE_NOT_FOUND = 'package_not_found',
  INSUFFICIENT_CREDITS = 'insufficient_credits',
  PACKAGE_NOT_AVAILABLE = 'package_not_available',
  MIGRATION_IN_PROGRESS = 'migration_in_progress',
  
  // Payment
  PAYMENT_FAILED = 'payment_failed',
  STRIPE_ERROR = 'stripe_error',
  
  // System
  INTERNAL_ERROR = 'internal_error',
  RATE_LIMITED = 'rate_limited',
}
```