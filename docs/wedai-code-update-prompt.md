# WedAI App - Critical Terminology and Value Proposition Update

## Core Change
Our app currently generates 3 themed portrait images with each generation/click, but our UI and messaging don't make this clear. We need to update all terminology and messaging to emphasize this 3x value proposition.

## Key Concept Change
- **Current**: Users think 1 credit/generation = 1 image
- **Reality**: 1 generation = 3 different themed portrait images
- **New Terminology**: Replace "credits" and "generations" with "photo shoots" throughout the app

## Terminology Updates Needed

**Replace throughout the entire app:**
- "credits" → "photo shoots" 
- "generations" → "photo shoots"
- "3 portraits daily" → "3 photo shoots daily (9 portrait images!)"
- "Generate Portrait" button → "Start Photo Shoot" or "Create Photo Shoot"

## Specific UI Components to Update

### 1. Usage Counter Component
- Show: "3 photo shoots remaining today"
- Add subtext: "= 9 portrait images"
- When at 0: "Daily limit reached! Get photo packs for more"

### 2. Pricing Cards
```
OLD: "Starter Pack: 10 credits - $4.99"
NEW: "Starter Pack: 10 photo shoots (30 images) - $4.99"
     Add: "Just $0.17 per image!"

OLD: "Wedding Pack: 25 credits - $9.99"
NEW: "Wedding Pack: 25 photo shoots (75 images) - $9.99"
     Add: "Just $0.13 per image!" + "MOST POPULAR" badge

OLD: "Party Pack: 75 credits - $24.99"
NEW: "Party Pack: 75 photo shoots (225 images!) - $24.99"
     Add: "Just $0.11 per image!" + "BEST VALUE" badge
```

### 3. Email Capture Modal
- Update: "You've used today's 3 free photo shoots (9 images)!"
- Add value props: "Wedding Pack: 75 images for just $9.99"
- Waitlist bonus: "Get 10 bonus photo shoots (30 images!)"

### 4. Main Generation Button
- Consider changing "Generate Portraits" to "Start Photo Shoot"
- After generation, show: "Photo shoot complete! 3 new portraits created"

### 5. FAQ Section (if exists)
- Add: "What is a photo shoot? Each photo shoot creates 3 unique portraits with different wedding themes"
- Add: "How many images do I get? Free: 9 daily, Starter: 30, Wedding: 75, Party: 225"

## Backend/Database Updates

### 1. Variable Names (if easily refactorable):
- `credits` → `photoShoots` or `shoots`
- `creditsRemaining` → `shootsRemaining`
- `creditsUsed` → `shootsUsed`

### 2. Stripe Product Descriptions:
```javascript
starter: {
  name: 'Starter Pack - 10 Photo Shoots',
  description: '30 unique portrait images'
},
wedding: {
  name: 'Wedding Pack - 25 Photo Shoots',
  description: '75 unique portrait images - Most Popular!'
},
party: {
  name: 'Party Pack - 75 Photo Shoots',
  description: '225 unique portrait images - Best Value!'
}
```

### 3. localStorage Keys (maintain backwards compatibility):
- Can keep technical keys the same, just update display values

## Value Messaging to Add

**Header/Hero Section:**
"Every photo shoot creates 3 unique themed portraits!"

**Pricing Page:**
"Why WedAI is Different: Other apps charge per image. We give you 3 themed portraits with every photo shoot!"

**After Generation:**
"Your photo shoot created 3 beautiful portraits! [X] shoots remaining today."

## Marketing Copy Updates

**Meta descriptions, page titles, etc:**
- OLD: "AI Wedding Portrait Generator - 3 Free Daily"
- NEW: "AI Wedding Portraits - 9 Free Images Daily (3 Photo Shoots)"

## Testing Checklist
- [ ] User clicks "Start Photo Shoot" → sees 3 images → understands value
- [ ] Pricing page clearly shows image counts and per-image pricing
- [ ] Counter shows both shoots and total images remaining
- [ ] Email capture emphasizes 30-image bonus, not just "10 credits"
- [ ] All "credit" terminology replaced with "photo shoot"

## Priority Order
1. **Critical**: Update pricing page with image counts and per-image pricing
2. **Critical**: Change usage counter to show shoots + images
3. **Important**: Update all button and modal text
4. **Nice-to-have**: Refactor backend variable names

## Success Metric
Users should immediately understand that:
- 1 photo shoot = 3 different portraits
- Free tier = 9 images daily
- Wedding Pack = 75 images for $9.99 (incredible value!)

---

## Code Examples for Implementation

### Example: Updated Usage Counter
```jsx
const UsageCounter = () => {
  const { remainingShoots } = getUserLimits();
  const remainingImages = remainingShoots * 3;
  
  return (
    <div className="usage-counter">
      <div className="main-count">{remainingShoots} photo shoots left today</div>
      <div className="sub-count">= {remainingImages} portrait images</div>
    </div>
  );
};
```

### Example: Updated Pricing Card
```jsx
const PricingCard = ({ shoots, price }) => {
  const totalImages = shoots * 3;
  const perImage = (price / totalImages).toFixed(2);
  
  return (
    <div className="pricing-card">
      <h3>{shoots} Photo Shoots</h3>
      <div className="images-count">{totalImages} portrait images</div>
      <div className="price">${price}</div>
      <div className="per-image">Just ${perImage} per image!</div>
      <button>Get This Pack</button>
    </div>
  );
};
```

### Example: Success Message After Generation
```jsx
const GenerationSuccess = ({ shootsRemaining }) => {
  return (
    <div className="success-message">
      <h2>Photo shoot complete!</h2>
      <p>3 beautiful portraits created with different themes</p>
      <p className="remaining">
        {shootsRemaining > 0 
          ? `${shootsRemaining} photo shoots (${shootsRemaining * 3} images) remaining today`
          : 'Daily limit reached - Get a photo pack to continue!'
        }
      </p>
    </div>
  );
};
```

---

This update will significantly improve conversion by making the 3x value proposition crystal clear to users!