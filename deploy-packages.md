# Photo Packages System Deployment Guide

## 🚀 **Safe Production Deployment**

The photo packages system is now ready for production deployment. Follow these steps:

### **Phase 1: Deploy Code (Already Done ✅)**
- ✅ Code committed and pushed to main branch
- ✅ AdminProtectedRoute fixed for production
- ✅ Environment configured for production Supabase

### **Phase 2: Database Migration**

**Option A: Using Supabase CLI (Recommended)**
```bash
# Navigate to project directory
cd /home/l2laihub/Projects/ai-wedding-portrait-generator

# Deploy the migration (will prompt for confirmation)
npx supabase db push
```

**Option B: Manual SQL Execution**
If the CLI doesn't work, apply this SQL directly in Supabase Studio:

```sql
-- Apply the photo packages migration
-- (Run the contents of supabase/migrations/20250918000002_photo_packages_corrected_final.sql)
```

### **Phase 3: Create Production Admin User**

Run this in Supabase SQL Editor:
```sql
-- Create admin user with proper permissions
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'your-admin-email@domain.com',  -- CHANGE THIS
    '$2a$10$N9qo8uLOickgx2ZMRZoMye3D6jF8pTdXgqT6FhA9yUJJPmzxN9uFW', -- Password: admin123
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    NOW(),
    NOW()
);

-- Get the user ID that was just created
-- Then insert into admin_users table:
INSERT INTO admin_users (
    user_id,
    role,
    permissions
) VALUES (
    (SELECT id FROM auth.users WHERE email = 'your-admin-email@domain.com'),
    'admin',
    '{"packages": ["read", "write", "delete"], "themes": ["read", "write", "delete"]}'
);
```

### **Phase 4: Add Sample Data**

Apply the engagement themes data:
```sql
-- First, create the engagement package
INSERT INTO photo_packages (
    name, 
    slug, 
    description, 
    category, 
    is_active, 
    is_featured, 
    base_prompt_template, 
    images_per_generation, 
    sort_order
) VALUES (
    'Engagement Portraits',
    'engagement-portraits',
    'Beautiful engagement portraits with romantic themes for couples preparing for their wedding day',
    'engagement',
    true,
    true,
    'Professional engagement portrait photography of a loving couple, {setting_prompt}, {clothing_prompt}, {atmosphere_prompt}, {technical_prompt}, romantic and joyful expressions, intimate connection between partners, natural candid moments',
    3,
    2
);

-- Then run the contents of supabase/seed/engagement_themes_corrected.sql
```

### **Phase 5: Test Production**

1. **Access Admin Dashboard**: Go to your-domain.com/admin
2. **Login**: Use the admin account you created
3. **Verify Package Management**: Check /admin/packages shows engagement package
4. **Test Theme Management**: Check /admin/themes shows Package Themes tab
5. **Test User Flow**: Try generating portraits with package selection

## 🛡️ **Safety Notes**

- ✅ **Non-breaking**: All existing functionality continues to work
- ✅ **Additive only**: No existing tables modified
- ✅ **Optional feature**: Users can still use regular generation
- ✅ **Admin gated**: Package management requires admin access
- ✅ **Rollback ready**: Can disable features via is_active flags

## 🔍 **Verification Checklist**

After deployment, verify:
- [ ] Admin dashboard accessible
- [ ] Package Management page shows packages
- [ ] Theme Management shows Package Themes tab
- [ ] Prompt Management shows integration info
- [ ] Regular wedding portrait generation still works
- [ ] Package selection UI appears for users
- [ ] No errors in browser console

## 📞 **Support**

If any issues occur:
1. Check Supabase logs for database errors
2. Check browser console for frontend errors
3. Verify RLS policies are not blocking access
4. Confirm admin user has correct permissions

The system is designed to be safe and non-disruptive. Existing users won't notice any changes unless they specifically use the new package selection feature.