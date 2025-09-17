# Secure Backend Infrastructure

This document describes the secure rate limiting system implemented for the WedAI portrait generator.

## Overview

The secure backend infrastructure moves portrait generation from the client-side to a secure Supabase Edge Function, providing:

- **Rate Limiting**: IP, user, and session-based rate limiting
- **Security**: API keys are stored securely on the backend
- **Analytics**: Comprehensive request tracking and analytics
- **Scalability**: Server-side processing with proper error handling
- **Monitoring**: Real-time metrics and logging

## Architecture

```
Frontend (React) 
    ↓ (User uploads image + prompt)
User Identification Service
    ↓ (Gets user/session/device fingerprint)
Secure Gemini Service
    ↓ (Calls backend with request data)
Supabase Edge Function (portrait-generation)
    ↓ (Rate limiting + validation)
Database (Rate limit tracking)
    ↓ (If allowed, call Gemini API)
Google Gemini API
    ↓ (Returns generated images)
Database (Log results)
    ↓ (Return to frontend)
Frontend (Display results)
```

## Components

### 1. Database Schema (`20250916_rate_limiting_infrastructure.sql`)

#### Tables

- **`rate_limits`**: Tracks rate limiting by identifier (IP/user/session)
- **`generation_requests`**: Complete log of all generation requests
- **`api_keys`**: Secure API keys for backend services

#### Functions

- **`check_rate_limit()`**: Check if identifier can make requests
- **`record_generation_request()`**: Log new generation request
- **`update_generation_request()`**: Update request status/results
- **`generate_api_key()`**: Create new API keys
- **`validate_api_key()`**: Validate API key and return permissions
- **`get_rate_limit_stats()`**: Get usage statistics

### 2. Edge Function (`supabase/functions/portrait-generation/index.ts`)

The secure backend that handles all portrait generation requests.

#### Features

- **Rate Limiting**: Configurable limits per user type
- **Authentication**: API key validation for service calls
- **Gemini Integration**: Secure API key handling
- **Error Handling**: Comprehensive error management
- **Logging**: Request tracking and analytics

#### Rate Limits

- **Anonymous**: 5/hour, 10/day
- **Authenticated**: 30/hour, 100/day  
- **Premium**: 100/hour, 500/day

### 3. User Identification Service (`services/userIdentificationService.ts`)

Provides consistent user identification for rate limiting.

#### Features

- **Device Fingerprinting**: Canvas, WebGL, screen resolution
- **Session Management**: Persistent session IDs
- **User Type Detection**: Anonymous/authenticated/premium
- **Privacy-Focused**: Hashed fingerprints, no PII storage

### 4. Secure Gemini Service (`services/secureGeminiService.ts`)

Frontend service that calls the secure backend.

#### Features

- **Backend Integration**: Calls Edge Function instead of Gemini directly
- **Rate Limit Checking**: Pre-flight rate limit validation
- **Error Handling**: User-friendly error messages
- **Retry Logic**: Exponential backoff for transient errors
- **Multiple Portraits**: Handles batch generation

## Setup Instructions

### 1. Run Database Migration

```bash
supabase db push
```

This creates all necessary tables and functions.

### 2. Deploy Edge Function

```bash
supabase functions deploy portrait-generation --no-verify-jwt
```

### 3. Set Secrets

```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Use Setup Script

```bash
./scripts/setup-secure-backend.sh
```

## Configuration

### Environment Variables

```bash
# Required for frontend
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Required for Edge Function (set as Supabase secret)
GEMINI_API_KEY=your-gemini-api-key
```

### Rate Limit Configuration

Rate limits are configured in the Edge Function:

```typescript
const RATE_LIMITS = {
  anonymous: { hourly: 5, daily: 10 },
  authenticated: { hourly: 30, daily: 100 },
  premium: { hourly: 100, daily: 500 }
}
```

## Usage

### Frontend Integration

The main App.tsx has been updated to use the secure backend:

```typescript
// Old (direct Gemini API call)
const content = await editImageWithNanoBanana(imageFile, prompt)

// New (secure backend)
const result = await secureGeminiService.generatePortrait({
  imageFile,
  prompt,
  style
})
```

### Rate Limit Checking

```typescript
const rateLimitStatus = await secureGeminiService.checkRateLimit()
if (!rateLimitStatus.canProceed) {
  // Show rate limit message
}
```

## Monitoring

### Database Queries

```sql
-- Get rate limit stats
SELECT * FROM get_rate_limit_stats(24);

-- View recent requests
SELECT * FROM generation_requests 
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check rate limits by IP
SELECT * FROM rate_limits 
WHERE identifier_type = 'ip'
ORDER BY last_request DESC;
```

### Edge Function Logs

```bash
supabase functions logs portrait-generation
```

### Analytics Dashboard

The system tracks:
- Request counts by user type
- Success/failure rates
- Processing times
- Rate limit hits
- Error patterns

## Security Features

### 1. API Key Protection

- Gemini API key stored as Supabase secret
- Never exposed to client-side code
- Secure Edge Function environment

### 2. Rate Limiting

- Multiple identifier types (IP, user, session)
- Sliding window implementation
- Configurable limits per user type
- Automatic reset mechanisms

### 3. Request Validation

- Input sanitization
- File type validation
- Prompt length limits
- Duplicate request detection

### 4. Privacy Protection

- Device fingerprints are hashed
- No PII stored in fingerprints
- Session IDs are random
- IP addresses are handled securely

## Troubleshooting

### Common Issues

1. **"Rate limit exceeded"**
   - Check `rate_limits` table for user's current usage
   - Verify rate limit configuration
   - Consider upgrading user to premium

2. **"Invalid API key"**
   - Ensure GEMINI_API_KEY secret is set
   - Check Supabase secrets: `supabase secrets list`
   - Verify API key format and validity

3. **Edge Function errors**
   - Check logs: `supabase functions logs portrait-generation`
   - Verify function deployment
   - Check CORS configuration

4. **Database connection issues**
   - Verify migration ran successfully
   - Check RLS policies
   - Ensure service role permissions

### Performance Optimization

1. **Database Indexes**
   - All necessary indexes are created in migration
   - Monitor query performance with `EXPLAIN ANALYZE`

2. **Edge Function**
   - Connection pooling handled by Supabase
   - Proper error handling prevents timeouts
   - Retry logic for transient failures

3. **Rate Limiting**
   - Efficient queries with proper indexing
   - Sliding window implementation
   - Cleanup of expired data

## Future Enhancements

### Planned Features

1. **Advanced Analytics**
   - User behavior tracking
   - Performance metrics
   - Cost optimization

2. **Caching Layer**
   - Redis for rate limit caching
   - Result caching for common requests
   - CDN integration

3. **Multi-Region Support**
   - Edge deployment
   - Regional rate limiting
   - Latency optimization

4. **Enhanced Security**
   - Request signing
   - Advanced bot detection
   - IP reputation checking

## API Reference

### Edge Function Endpoint

```
POST /functions/v1/portrait-generation
```

#### Request Body

```typescript
{
  imageData: string,      // base64 encoded image
  imageType: string,      // mime type
  prompt: string,         // generation prompt
  style: string,          // style name
  userId?: string,        // authenticated user ID
  sessionId?: string,     // anonymous session ID
  apiKey?: string         // service API key (optional)
}
```

#### Response

```typescript
{
  success: boolean,
  data?: {
    imageUrl: string,
    text: string,
    style: string
  },
  error?: string,
  rateLimitInfo?: {
    hourly_remaining: number,
    daily_remaining: number,
    reset_at: string
  },
  processing_time_ms?: number
}
```

#### Error Codes

- **400**: Bad Request (missing fields)
- **401**: Unauthorized (invalid API key)
- **429**: Rate Limit Exceeded
- **500**: Internal Server Error

## Migration Guide

### From Client-Side to Secure Backend

1. **Update imports**:
   ```typescript
   // Replace
   import { editImageWithNanoBanana } from './services/geminiService'
   
   // With
   import { secureGeminiService } from './services'
   ```

2. **Update generation calls**:
   ```typescript
   // Old
   const result = await editImageWithNanoBanana(file, prompt)
   
   // New
   const result = await secureGeminiService.generatePortrait({
     imageFile: file,
     prompt,
     style
   })
   ```

3. **Handle rate limiting**:
   ```typescript
   if (!result.success && result.error?.includes('Rate limit')) {
     // Show rate limit UI
   }
   ```

4. **Environment cleanup**:
   - Remove client-side `GEMINI_API_KEY`
   - Add as Supabase secret instead
   - Update build configuration

### Testing

1. **Unit Tests**: Test individual components
2. **Integration Tests**: Test full generation flow
3. **Load Tests**: Verify rate limiting works
4. **Security Tests**: Verify API key protection