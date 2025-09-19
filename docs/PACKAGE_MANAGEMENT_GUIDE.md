# Photo Packages Management Guide

## Overview

The Photo Packages system allows administrators to create and manage different photo generation packages with themes, pricing tiers, and usage tracking. This guide explains how to use and manage the system.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Structure](#database-structure)
3. [Admin Interface](#admin-interface)
4. [Setting Up Packages](#setting-up-packages)
5. [Managing Themes](#managing-themes)
6. [Pricing Tiers](#pricing-tiers)
7. [Package Generation Flow](#package-generation-flow)
8. [Troubleshooting](#troubleshooting)

## System Architecture

### Key Components

1. **PhotoPackagesService** (`services/photoPackagesService.ts`): Backend service handling all package operations
2. **PackageManagement** (`src/pages/admin/PackageManagement.tsx`): Admin UI for managing packages
3. **PackageGenerationCoordinator** (`services/packageGenerationCoordinator.ts`): Orchestrates package-based generation
4. **Database Tables**: `photo_packages`, `package_themes`, `package_pricing_tiers`, `package_usage`

## Database Structure

### photo_packages
- **id**: UUID primary key
- **slug**: Unique URL-friendly identifier (e.g., "wedding-portraits")
- **name**: Display name (e.g., "Wedding Portraits")
- **category**: wedding, professional, celebration, artistic, portrait, family
- **images_per_generation**: Number of images to generate (1-5)
- **base_prompt_template**: Template for AI generation
- **is_active**: Whether package is available for use
- **is_featured**: Whether to highlight this package

### package_themes
- **id**: UUID primary key
- **package_id**: References photo_packages
- **name**: Theme name (e.g., "Romantic Garden")
- **setting_prompt**: Main description for the theme
- **clothing_prompt**: What people should wear
- **atmosphere_prompt**: Setting/mood description
- **technical_prompt**: Photography technical details
- **is_active**: Whether theme is available
- **is_premium**: Whether theme requires premium access
- **is_seasonal**: Whether theme is time-limited

### package_pricing_tiers
- **id**: UUID primary key
- **package_id**: References photo_packages
- **name**: Tier name (e.g., "Starter", "Wedding", "Party")
- **shoots_count**: Number of generations included
- **price_cents**: Price in cents (e.g., 999 = $9.99)
- **badge**: Optional badge text (e.g., "MOST POPULAR")
- **features**: JSON array of feature descriptions
- **is_default**: Whether this is the default selection

## Admin Interface

### Accessing Package Management

1. Navigate to `/admin` in your browser
2. Click "Packages" in the left sidebar
3. You'll see the Package Management interface

### Interface Layout

```
┌─────────────────────────────────────────────────────┐
│ Packages List │      Package Details                 │
│               │  ┌─────────────────────────────────┐ │
│ □ Package 1   │  │ Package Info                    │ │
│ □ Package 2   │  ├─────────────────────────────────┤ │
│ [Selected]    │  │ Tabs: Themes | Pricing          │ │
│               │  │ [Content based on selected tab] │ │
│               │  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Setting Up Packages

### Creating a New Package

1. Click "Create New Package" button
2. Fill in the form:
   - **Package Name**: Display name for the package
   - **Description**: What this package offers
   - **Category**: Select from available categories
   - **Images per Generation**: How many images to generate (1-5)
   - **Active**: Whether package is available
   - **Featured**: Whether to highlight this package

3. Click "Create Package"

### Package Prompt Template

The `base_prompt_template` uses placeholders:
- `{portraitType}`: single, couple, or family
- `{theme}`: Selected theme name
- `{themeDescription}`: Theme's setting prompt
- `{clothingDescription}`: Theme's clothing prompt
- `{atmosphereDescription}`: Theme's atmosphere prompt
- `{customPrompt}`: User's custom input

Example template:
```
Create a professional {portraitType} portrait in {theme} style. 
{themeDescription} {clothingDescription} {atmosphereDescription} 
{customPrompt} Maintain exact facial features and ensure high quality output.
```

## Managing Themes

### Creating a Theme

1. Select a package from the list
2. Click the "Themes" tab
3. Click "Add Theme"
4. Fill in the form:
   - **Theme Name**: e.g., "Romantic Garden"
   - **Description**: Brief description
   - **Setting Prompt**: Main theme description
   - **Clothing Prompt**: What subjects should wear
   - **Atmosphere Prompt**: Environment/mood details
   - **Technical Prompt**: Photography specifications
   - **Active**: Whether theme is available
   - **Premium Only**: Requires premium access
   - **Seasonal**: Time-limited availability

### Example Theme Configuration

**Name**: Romantic Garden Wedding
**Setting Prompt**: Beautiful outdoor garden wedding setting with blooming roses and soft natural lighting
**Clothing Prompt**: Elegant white wedding dress for bride, classic black tuxedo for groom
**Atmosphere Prompt**: Golden hour lighting, romantic and dreamy atmosphere, surrounded by flowers
**Technical Prompt**: Professional wedding photography, soft focus background, natural lighting, high-end camera

## Pricing Tiers

### Creating Pricing Tiers

1. Select a package
2. Click the "Pricing" tab
3. Click "Add Tier"
4. Configure:
   - **Tier Name**: e.g., "Starter", "Professional"
   - **Price (cents)**: e.g., 999 for $9.99
   - **Included Generations**: Number of photo shoots
   - **Badge**: Optional text like "MOST POPULAR"
   - **Features**: List features (one per line)
   - **Default Tier**: Pre-select this tier

### Recommended Tier Structure

1. **Starter Tier**
   - Lower price point
   - Limited generations (e.g., 10)
   - Basic features

2. **Popular Tier** (Default)
   - Mid-range price
   - Good value (e.g., 25 generations)
   - Badge: "MOST POPULAR"

3. **Premium Tier**
   - Higher price
   - Many generations (e.g., 75)
   - Badge: "BEST VALUE"
   - Additional features

## Package Generation Flow

### User Flow

1. User uploads photo(s)
2. System shows available packages
3. User selects package and pricing tier
4. User selects themes (based on tier limits)
5. System generates images using package configuration
6. Usage is tracked in database

### Integration with Main App

The `packageGenerationCoordinator` service handles:
- Package validation
- Credit checking
- Theme selection
- Generation orchestration
- Usage tracking

## Troubleshooting

### No Packages Showing

1. Check if migrations have run:
```sql
SELECT * FROM photo_packages;
```

2. If empty, run seed data:
```sql
-- Insert default wedding package
INSERT INTO photo_packages (slug, name, category, description, images_per_generation, base_prompt_template, is_active, is_featured)
VALUES ('wedding-portraits', 'Wedding Portraits', 'wedding', 'Beautiful AI wedding portraits', 3, 'Create a {portraitType} portrait...', true, true);
```

### No Themes Showing

Themes need to be created for each package:

```sql
-- Add sample themes to wedding package
INSERT INTO package_themes (package_id, name, description, setting_prompt, is_active)
SELECT id, 'Romantic Garden', 'Garden wedding theme', 'Beautiful garden setting with flowers', true
FROM photo_packages WHERE slug = 'wedding-portraits';
```

### Package Not Available for Selection

Check:
1. Package is marked as `is_active = true`
2. At least one pricing tier exists and is active
3. At least one theme exists and is active

### Generation Failing

Verify:
1. User has sufficient credits
2. Package and themes are active
3. Gemini API key is configured
4. Check browser console and Supabase logs

## Best Practices

1. **Package Naming**: Use clear, descriptive names
2. **Theme Variety**: Offer 8-12 themes per package
3. **Pricing Strategy**: Three tiers work best (entry, popular, premium)
4. **Prompt Engineering**: Test prompts thoroughly before activating
5. **Feature Flags**: Use is_active to test packages before launch
6. **Analytics**: Monitor package_usage table for insights

## API Reference

### Key Service Methods

```typescript
// Get all active packages
PhotoPackagesService.getPackages({ is_active: true })

// Get package with themes and pricing
PhotoPackagesService.getPackageById(packageId)
PhotoPackagesService.getPackageThemes(packageId)
PhotoPackagesService.getPackagePricingTiers(packageId)

// CRUD Operations (Admin only)
PhotoPackagesService.createPackage(packageData)
PhotoPackagesService.updatePackage(packageId, updates)
PhotoPackagesService.deletePackage(packageId)

// Theme management
PhotoPackagesService.createPackageTheme(themeData)
PhotoPackagesService.updatePackageTheme(themeId, updates)
PhotoPackagesService.deletePackageTheme(themeId)

// Pricing management
PhotoPackagesService.createPricingTier(tierData)
PhotoPackagesService.updatePricingTier(tierId, updates)
PhotoPackagesService.deletePricingTier(tierId)
```

## Security Considerations

1. **Admin Only**: Package management requires admin role
2. **RLS Policies**: Database has row-level security
3. **Input Validation**: All inputs are validated
4. **Rate Limiting**: Package usage is rate-limited
5. **Credit System**: Integrated with payment system

## Future Enhancements

1. **Bulk Import/Export**: CSV import for themes
2. **A/B Testing**: Test different pricing/themes
3. **Analytics Dashboard**: Detailed usage metrics
4. **Theme Preview**: AI-generated preview images
5. **Seasonal Automation**: Auto-enable/disable seasonal themes