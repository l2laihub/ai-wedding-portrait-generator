# Photo Packages Feature - Requirements & Implementation Plan

## Executive Summary
Implement an admin-managed photo package system that allows creation of different portrait categories beyond weddings (e.g., Engagement, Professional Headshots, Anniversary). Each package can have its own themes, pricing tiers, and generation settings.

## Feature Overview

### Current State
- Single package type: "Wedding Portraits"
- Fixed 12 wedding themes
- Fixed pricing tiers (Starter/Wedding/Party)
- All generations create 3 images

### Desired State
- Multiple package types (Wedding, Engagement, Professional, Anniversary, etc.)
- Package-specific themes
- Package-specific pricing tiers
- Configurable images per generation (1-5)
- Admin interface to manage packages

---

## Database Schema Changes

### 1. Create `photo_packages` table
```sql
CREATE TABLE photo_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL, -- URL-friendly identifier
  name VARCHAR(100) NOT NULL, -- Display name
  description TEXT,
  category VARCHAR(50), -- 'wedding', 'professional', 'celebration', etc.
  images_per_generation INTEGER DEFAULT 3, -- How many images per shoot
  base_prompt_template TEXT, -- Package-specific prompt template
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false, -- Show on homepage
  sort_order INTEGER DEFAULT 0,
  settings JSONB, -- Additional package-specific settings
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Example entries
INSERT INTO photo_packages (slug, name, category, images_per_generation, description) VALUES
('wedding-portraits', 'Wedding Portraits', 'wedding', 3, 'Beautiful AI wedding portraits in various styles'),
('engagement-photos', 'Engagement Photos', 'wedding', 3, 'Romantic engagement session portraits'),
('professional-headshots', 'Professional Headshots', 'professional', 1, 'High-quality business portraits'),
('anniversary-photos', 'Anniversary Photos', 'celebration', 2, 'Celebrate your love story');
```

### 2. Create `package_themes` table
```sql
CREATE TABLE package_themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID REFERENCES photo_packages(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  setting_prompt TEXT, -- Detailed setting description for AI
  clothing_prompt TEXT, -- Clothing description for AI
  atmosphere_prompt TEXT, -- Atmosphere/mood for AI
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false, -- Premium themes cost extra credits
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Example themes for Professional Headshots
INSERT INTO package_themes (package_id, name, setting_prompt) VALUES
((SELECT id FROM photo_packages WHERE slug = 'professional-headshots'), 
 'Corporate Executive', 
 'Modern office with city skyline, clean desk, professional lighting'),
((SELECT id FROM photo_packages WHERE slug = 'professional-headshots'), 
 'Creative Studio', 
 'Artistic workspace with natural light, creative tools, casual professional environment');
```

### 3. Create `package_pricing_tiers` table
```sql
CREATE TABLE package_pricing_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID REFERENCES photo_packages(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL, -- 'Starter', 'Pro', 'Enterprise'
  shoots_count INTEGER NOT NULL, -- Number of photo shoots
  price_cents INTEGER NOT NULL, -- Price in cents
  original_price_cents INTEGER, -- For showing discounts
  badge VARCHAR(30), -- 'MOST POPULAR', 'BEST VALUE'
  features JSONB, -- Array of feature strings
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Example pricing for Professional Headshots
INSERT INTO package_pricing_tiers (package_id, name, shoots_count, price_cents) VALUES
((SELECT id FROM photo_packages WHERE slug = 'professional-headshots'), 'Single', 1, 999),
((SELECT id FROM photo_packages WHERE slug = 'professional-headshots'), 'Team (5)', 5, 3999),
((SELECT id FROM photo_packages WHERE slug = 'professional-headshots'), 'Company (20)', 20, 12999);
```

### 4. Update `portrait_generations` table
```sql
ALTER TABLE portrait_generations 
ADD COLUMN package_id UUID REFERENCES photo_packages(id),
ADD COLUMN package_theme_id UUID REFERENCES package_themes(id);
```

---

## Admin Interface Requirements

### Admin Dashboard Structure
```
/admin
├── /packages
│   ├── List all packages
│   ├── Create new package
│   └── Edit package
├── /packages/:id/themes
│   ├── List themes for package
│   ├── Add theme
│   └── Edit theme
├── /packages/:id/pricing
│   ├── List pricing tiers
│   ├── Add pricing tier
│   └── Edit tier
└── /analytics
    └── Package performance metrics
```

### Package Management Interface

```jsx
// Admin Package Editor Component Structure
const PackageEditor = {
  // Basic Information
  basicInfo: {
    name: "Professional Headshots",
    slug: "professional-headshots", // Auto-generated from name
    category: "professional", // Dropdown selection
    description: "High-quality business portraits",
    imagesPerGeneration: 1, // Slider 1-5
    isActive: true,
    isFeatured: false
  },

  // Prompt Template Editor
  promptTemplate: {
    basePrompt: "Create a professional {portraitType} photo",
    preserveInstructions: "Maintain exact facial features",
    variables: [
      "{theme}",
      "{themeDescription}",
      "{userInput}",
      "{portraitType}"
    ]
  },

  // Theme Management
  themes: [
    {
      name: "Corporate Executive",
      settingPrompt: "Modern office...",
      clothingPrompt: "Business suit...",
      isActive: true,
      isPremium: false
    }
  ],

  // Pricing Tiers
  pricingTiers: [
    {
      name: "Single",
      shoots: 1,
      price: 9.99,
      badge: null,
      features: ["1 headshot", "2 revisions", "High resolution"]
    }
  ]
};
```

---

## API Endpoints

### Package Management Endpoints

```javascript
// Get all active packages
GET /api/packages
Response: {
  packages: [{
    id: "uuid",
    slug: "professional-headshots",
    name: "Professional Headshots",
    description: "...",
    imagesPerGeneration: 1,
    themes: [...],
    pricingTiers: [...]
  }]
}

// Get single package with full details
GET /api/packages/:slug
Response: {
  package: {
    id: "uuid",
    slug: "professional-headshots",
    themes: [{...}],
    pricingTiers: [{...}]
  }
}

// Admin: Create package
POST /api/admin/packages
Body: {
  name: "Anniversary Photos",
  category: "celebration",
  imagesPerGeneration: 2,
  description: "..."
}

// Admin: Update package
PUT /api/admin/packages/:id
Body: { ...updates }

// Admin: Toggle package active status
PATCH /api/admin/packages/:id/toggle-active
```

### Theme Management Endpoints

```javascript
// Add theme to package
POST /api/admin/packages/:packageId/themes
Body: {
  name: "Outdoor Natural",
  settingPrompt: "Natural outdoor lighting...",
  clothingPrompt: "Casual professional attire..."
}

// Update theme
PUT /api/admin/themes/:themeId
Body: { ...updates }

// Delete theme
DELETE /api/admin/themes/:themeId
```

### Pricing Management Endpoints

```javascript
// Add pricing tier
POST /api/admin/packages/:packageId/pricing-tiers
Body: {
  name: "Starter",
  shootsCount: 5,
  priceCents: 1999,
  badge: "MOST POPULAR",
  features: ["5 photos", "All themes", "..."]
}

// Update pricing tier
PUT /api/admin/pricing-tiers/:tierId
Body: { ...updates }
```

---

## Frontend Implementation

### 1. Package Selection Page

```jsx
// New landing page component
const PackageSelection = () => {
  const [packages, setPackages] = useState([]);
  
  return (
    <div className="package-grid">
      {packages.map(pkg => (
        <PackageCard
          key={pkg.id}
          name={pkg.name}
          description={pkg.description}
          startingPrice={pkg.lowestPrice}
          imageCount={pkg.imagesPerGeneration}
          themesCount={pkg.themes.length}
          onClick={() => navigateToPackage(pkg.slug)}
        />
      ))}
    </div>
  );
};

// Example cards display
┌─────────────────────┐ ┌─────────────────────┐
│ Wedding Portraits   │ │ Professional        │
│ 12 themes          │ │ Headshots           │
│ 3 images/shoot     │ │ 6 themes            │
│ From $4.99         │ │ From $9.99          │
└─────────────────────┘ └─────────────────────┘
```

### 2. Dynamic Generation Page

```jsx
// Update generation page to handle different packages
const GenerationPage = ({ packageSlug }) => {
  const [package, setPackage] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(null);
  
  useEffect(() => {
    fetchPackageDetails(packageSlug);
  }, [packageSlug]);
  
  const generatePhotos = async () => {
    const prompt = buildPromptForPackage(
      package.promptTemplate,
      selectedTheme,
      userInput,
      portraitType
    );
    
    // Generate based on package.imagesPerGeneration
    const results = await generateImages(
      prompt, 
      package.imagesPerGeneration
    );
  };
  
  return (
    <div>
      <h1>{package?.name}</h1>
      <ThemeSelector themes={package?.themes} />
      <GenerateButton onClick={generatePhotos} />
      <PricingDisplay tiers={package?.pricingTiers} />
    </div>
  );
};
```

### 3. Admin Interface Components

```jsx
// Package admin dashboard
const PackageAdmin = () => {
  return (
    <AdminLayout>
      <PackageList />
      <CreatePackageModal />
      <PackageAnalytics />
    </AdminLayout>
  );
};

// Package editor form
const PackageEditorForm = ({ package }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'wedding',
    imagesPerGeneration: 3,
    basePromptTemplate: '',
    themes: [],
    pricingTiers: []
  });
  
  return (
    <form>
      <Section title="Basic Information">
        <Input label="Package Name" value={formData.name} />
        <Select label="Category" options={categories} />
        <Slider 
          label="Images per Generation" 
          min={1} 
          max={5} 
          value={formData.imagesPerGeneration}
        />
      </Section>
      
      <Section title="Themes">
        <ThemeManager themes={formData.themes} />
        <AddThemeButton />
      </Section>
      
      <Section title="Pricing Tiers">
        <PricingTierManager tiers={formData.pricingTiers} />
        <AddTierButton />
      </Section>
      
      <SaveButton onClick={savePackage} />
    </form>
  );
};
```

---

## Implementation Steps

### Phase 1: Database & Backend (Day 1-2)
1. [ ] Create database migrations for new tables
2. [ ] Implement Package model and service layer
3. [ ] Create CRUD API endpoints for packages
4. [ ] Add theme management endpoints
5. [ ] Implement pricing tier endpoints
6. [ ] Update generation endpoint to handle package types

### Phase 2: Admin Interface (Day 3-4)
1. [ ] Create admin route protection/authentication
2. [ ] Build package list view
3. [ ] Implement package creation form
4. [ ] Add theme management interface
5. [ ] Create pricing tier editor
6. [ ] Add validation and error handling

### Phase 3: User-Facing Changes (Day 5-6)
1. [ ] Create package selection landing page
2. [ ] Update generation flow to use package data
3. [ ] Modify prompt builder for package templates
4. [ ] Update pricing display for dynamic tiers
5. [ ] Adjust credit system for variable image counts
6. [ ] Update UI counters for different packages

### Phase 4: Migration & Testing (Day 7)
1. [ ] Migrate existing wedding data to new structure
2. [ ] Test all package types
3. [ ] Verify pricing calculations
4. [ ] Test admin CRUD operations
5. [ ] Load testing with multiple packages
6. [ ] User acceptance testing

---

## Code Examples

### Prompt Builder for Different Packages

```javascript
class PackagePromptBuilder {
  constructor(package, theme, userInput) {
    this.package = package;
    this.theme = theme;
    this.userInput = userInput;
  }
  
  buildPrompt(portraitType) {
    let prompt = this.package.basePromptTemplate;
    
    // Replace variables
    const variables = {
      '{portraitType}': portraitType,
      '{theme}': this.theme.name,
      '{themeDescription}': this.theme.settingPrompt,
      '{clothingDescription}': this.theme.clothingPrompt,
      '{atmosphereDescription}': this.theme.atmospherePrompt,
      '{userInput}': this.userInput || '',
      '{imageCount}': this.package.imagesPerGeneration
    };
    
    Object.keys(variables).forEach(key => {
      prompt = prompt.replace(new RegExp(key, 'g'), variables[key]);
    });
    
    return prompt;
  }
}

// Usage
const builder = new PackagePromptBuilder(
  professionalPackage,
  corporateTheme,
  "wearing glasses"
);
const prompt = builder.buildPrompt('single');
```

### Dynamic Pricing Calculation

```javascript
const calculatePackagePrice = (packageId, shootCount) => {
  const tiers = await getPricingTiers(packageId);
  
  // Find best matching tier
  const tier = tiers.find(t => t.shootsCount === shootCount) ||
                tiers.find(t => t.shootsCount > shootCount) ||
                tiers[tiers.length - 1];
  
  const images = shootCount * package.imagesPerGeneration;
  const pricePerImage = tier.priceCents / (tier.shootsCount * package.imagesPerGeneration);
  
  return {
    tier: tier.name,
    totalPrice: tier.priceCents / 100,
    totalImages: images,
    pricePerImage: pricePerImage / 100
  };
};
```

### Package Analytics Query

```sql
-- Get package performance metrics
SELECT 
  p.name as package_name,
  COUNT(DISTINCT pg.user_id) as unique_users,
  COUNT(pg.id) as total_generations,
  COUNT(pg.id) * p.images_per_generation as total_images,
  AVG(pt.price_cents) / 100 as avg_transaction_value
FROM photo_packages p
LEFT JOIN portrait_generations pg ON pg.package_id = p.id
LEFT JOIN credit_transactions ct ON ct.user_id = pg.user_id
LEFT JOIN package_pricing_tiers pt ON pt.package_id = p.id
WHERE pg.created_at > NOW() - INTERVAL '30 days'
GROUP BY p.id, p.name;
```

---

## Migration Plan

### Migrating Existing Wedding Package

```javascript
// Migration script
const migrateExistingToPackages = async () => {
  // 1. Create wedding package
  const weddingPackage = await createPackage({
    slug: 'wedding-portraits',
    name: 'Wedding Portraits',
    category: 'wedding',
    imagesPerGeneration: 3,
    description: 'Original wedding portrait package'
  });
  
  // 2. Migrate themes
  const existingThemes = [
    "Bohemian Beach Wedding",
    "Classic & Timeless Wedding",
    // ... all 12 themes
  ];
  
  for (const theme of existingThemes) {
    await createTheme({
      packageId: weddingPackage.id,
      name: theme,
      settingPrompt: themeSettings[theme],
      isActive: true
    });
  }
  
  // 3. Create pricing tiers
  await createPricingTiers(weddingPackage.id, [
    { name: 'Starter', shoots: 10, priceCents: 499 },
    { name: 'Wedding', shoots: 25, priceCents: 999 },
    { name: 'Party', shoots: 75, priceCents: 2499 }
  ]);
  
  // 4. Update existing generations
  await db.query(`
    UPDATE portrait_generations 
    SET package_id = $1 
    WHERE package_id IS NULL
  `, [weddingPackage.id]);
};
```

---

## Testing Requirements

### Unit Tests
- [ ] Package CRUD operations
- [ ] Theme management
- [ ] Pricing calculations
- [ ] Prompt template building
- [ ] Credit deduction for variable image counts

### Integration Tests
- [ ] Complete package creation flow
- [ ] Generation with different packages
- [ ] Pricing tier selection and checkout
- [ ] Admin authentication and permissions

### E2E Tests
- [ ] User selects package → generates photos → purchases credits
- [ ] Admin creates new package → user can access it
- [ ] Migration doesn't break existing users

---

## Security Considerations

1. **Admin Authentication**: Implement proper role-based access
2. **Input Validation**: Sanitize all prompt templates
3. **Rate Limiting**: Package-specific generation limits
4. **Pricing Security**: Validate prices server-side only
5. **SQL Injection**: Use parameterized queries

---

## Performance Optimizations

1. **Cache package data**: Redis cache for package details (5 min TTL)
2. **Lazy load themes**: Only load when package selected
3. **CDN for package images**: Cache sample images
4. **Database indexes**: On package_id, slug, is_active

---

## Future Enhancements

1. **Package Bundles**: Combine multiple packages at discount
2. **Seasonal Packages**: Auto-enable/disable by date
3. **Custom Packages**: Let users create their own theme sets
4. **B2B Packages**: White-label options for businesses
5. **Subscription Model**: Monthly unlimited for specific package

---

## Success Metrics

- Number of packages created by admin
- Conversion rate per package type
- Average revenue per package
- Most popular themes per package
- User engagement across different packages

---

## Rollback Plan

If issues occur:
1. Feature flag to disable new package system
2. Fallback to hardcoded wedding package
3. Database migrations are reversible
4. Keep original endpoints active during transition