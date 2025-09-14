# Supabase Setup Guide
## WedAI Monetization Database Setup

This guide walks you through setting up Supabase for the WedAI monetization features.

## Prerequisites

- A [Supabase](https://supabase.com) account
- Supabase CLI installed (optional, for migrations)

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `wedai-production` (or `wedai-dev` for development)
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be created (2-3 minutes)

## Step 2: Get API Keys

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update your `.env.local` file:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## Step 4: Run Database Migration

### Option A: Using Supabase Dashboard (Recommended)

1. Go to **SQL Editor** in your Supabase dashboard
2. Create a new query
3. Copy the contents of `supabase/migrations/20250914210000_initial_schema.sql`
4. Paste it into the SQL editor
5. Click "Run" to execute the migration

### Option B: Using Supabase CLI

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Initialize Supabase in your project:
   ```bash
   supabase init
   ```

3. Link to your project:
   ```bash
   supabase link --project-ref your-project-id
   ```

4. Push migrations:
   ```bash
   supabase db push
   ```

## Step 5: Verify Setup

1. In your Supabase dashboard, go to **Table Editor**
2. You should see these tables:
   - `waitlist` - Email capture for pre-launch signups
   - `usage_analytics` - Track portrait generation usage
   - `users` - Extended user profiles
   - `user_credits` - User credit balances
   - `credit_transactions` - Log of credit transactions
   - `referrals` - Referral tracking

## Step 6: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Try uploading an image and generating portraits
3. Use up your daily limit (3 portraits)
4. When the limit modal appears, enter an email
5. Check the `waitlist` table in Supabase - the email should appear

## Database Schema Overview

### Tables

- **waitlist**: Stores email signups with promised bonus credits
- **usage_analytics**: Tracks each portrait generation for analytics
- **users**: Extended user profiles (linked to auth.users)
- **user_credits**: Credit balances and daily usage tracking
- **credit_transactions**: Complete audit log of credit changes
- **referrals**: Referral system tracking

### Key Features

- **Row Level Security (RLS)**: Enabled on all tables with appropriate policies
- **Auto-reset**: Daily credit limits reset automatically at midnight PT
- **Referral System**: Built-in referral tracking with credit rewards
- **Analytics**: Track usage patterns and popular themes
- **Audit Trail**: Complete transaction history for all credit operations

## Security Configuration

The migration includes Row Level Security policies:

- **Public access**: Waitlist signup and usage analytics (anonymous)
- **User data**: Users can only access their own profiles and credits
- **Admin access**: Use service role key for admin operations

## Admin Queries

Common admin queries for monitoring:

```sql
-- Get waitlist count
SELECT COUNT(*) FROM waitlist;

-- Today's usage
SELECT COUNT(*) FROM usage_analytics 
WHERE timestamp >= CURRENT_DATE;

-- Popular themes
SELECT theme, COUNT(*) as count 
FROM usage_analytics 
WHERE theme IS NOT NULL 
GROUP BY theme 
ORDER BY count DESC 
LIMIT 10;

-- User credit balances
SELECT 
  u.email,
  uc.paid_credits,
  uc.bonus_credits,
  uc.free_credits_used_today
FROM users u
JOIN user_credits uc ON u.id = uc.user_id
ORDER BY uc.paid_credits + uc.bonus_credits DESC;
```

## Troubleshooting

### Common Issues

1. **"Supabase not configured" errors**:
   - Check your environment variables are correctly set
   - Verify the URL and key are correct
   - Make sure the file is named `.env.local` (not `.env`)

2. **Migration fails**:
   - Check you have proper permissions
   - Try running smaller parts of the migration
   - Check for syntax errors in the SQL

3. **RLS policies block operations**:
   - Check you're using the correct authentication context
   - For admin operations, use the service role key
   - Review the policy conditions

### Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

## Next Steps

After completing this setup:

1. ✅ Phase 1 Complete: Rate limiting and email capture working
2. ➡️ **Phase 2**: Implement user authentication and Stripe integration
3. ➡️ **Phase 3**: Build admin dashboard and email automation
4. ➡️ **Phase 4**: Performance optimization and scaling