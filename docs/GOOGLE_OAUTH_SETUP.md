# Google OAuth2 Setup Guide

This guide provides step-by-step instructions for setting up Google OAuth2 authentication for the AI Wedding Portrait Generator.

## Prerequisites

- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Supabase project with authentication enabled
- Domain or localhost for development

## 1. Google Cloud Console Setup

### Step 1: Create or Select a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note the project ID for reference

### Step 2: Enable Google+ API

1. Navigate to **APIs & Services** > **Library**
2. Search for "Google+ API" or "People API"
3. Click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type (unless using Google Workspace)
3. Fill in the required information:
   - **App name**: AI Wedding Portrait Generator
   - **User support email**: Your email
   - **Developer contact information**: Your email
   - **Authorized domains**: Add your production domain
4. Add scopes:
   - `email`
   - `profile`
   - `openid`
5. Save and continue

### Step 4: Create OAuth Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Choose **Web application**
4. Configure:
   - **Name**: AI Wedding Portrait Generator
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (for development)
     - `https://yourdomain.com` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:5173/auth/callback` (development)
     - `https://yourdomain.com/auth/callback` (production)
     - `https://your-project-id.supabase.co/auth/v1/callback` (Supabase)
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

## 2. Supabase Configuration

### Step 1: Configure Google Provider

1. Go to your Supabase dashboard
2. Navigate to **Authentication** > **Providers**
3. Enable **Google** provider
4. Add your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
5. Configure redirect URLs:
   - `https://your-project-id.supabase.co/auth/v1/callback`
6. Save configuration

### Step 2: Update Site URL

1. In Supabase dashboard, go to **Authentication** > **Settings**
2. Update **Site URL** to:
   - Development: `http://localhost:5173`
   - Production: `https://yourdomain.com`
3. Add additional redirect URLs if needed

## 3. Environment Configuration

### Update your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 4. Testing OAuth Flow

### Development Testing

1. Start your development server: `npm run dev`
2. Navigate to the login page
3. Click "Sign in with Google"
4. Complete the OAuth flow
5. Verify user creation in Supabase

### Production Testing

1. Deploy your application
2. Update redirect URIs in Google Cloud Console
3. Update Site URL in Supabase
4. Test OAuth flow on production domain

## 5. Security Considerations

### Redirect URI Validation

- Only add trusted domains to authorized redirect URIs
- Use HTTPS in production
- Validate redirect URIs server-side if needed

### Token Security

- Client secrets should only be used server-side
- Use secure storage for tokens
- Implement token refresh logic
- Set appropriate token expiration times

### Rate Limiting

- Monitor OAuth requests for abuse
- Implement rate limiting on authentication endpoints
- Use Google's quotas and limits appropriately

## 6. Common Issues and Solutions

### Issue: "redirect_uri_mismatch"
**Solution**: Ensure redirect URI in Google Console exactly matches the one in your request

### Issue: "invalid_client"
**Solution**: Verify client ID and secret are correct and properly configured

### Issue: "access_denied"
**Solution**: Check OAuth consent screen configuration and user permissions

### Issue: CORS errors
**Solution**: Ensure authorized JavaScript origins are properly configured

## 7. Production Checklist

- [ ] OAuth consent screen approved for production use
- [ ] Production domain added to authorized origins
- [ ] Production redirect URIs configured
- [ ] Environment variables properly set
- [ ] SSL certificate installed and working
- [ ] Rate limiting implemented
- [ ] Error handling and logging in place
- [ ] User privacy policy accessible
- [ ] Terms of service accessible

## 8. Monitoring and Analytics

### Google Cloud Console Monitoring

- Monitor API usage in Google Cloud Console
- Set up quotas and alerts
- Review OAuth consent metrics

### Application Monitoring

- Track authentication success/failure rates
- Monitor user registration patterns
- Log authentication errors for debugging

## Support and Documentation

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google Cloud Console Help](https://cloud.google.com/docs)

## Security Best Practices

1. **Never expose client secrets** in frontend code
2. **Use state parameters** to prevent CSRF attacks
3. **Validate all tokens** server-side
4. **Implement proper error handling** to avoid information leakage
5. **Use HTTPS everywhere** in production
6. **Regularly rotate secrets** and monitor for suspicious activity