# 🔧 Maintenance Mode Instructions

## Quick Setup

### Enable Maintenance Mode
```javascript
// In browser console:
toggleMaintenance(true)
// or just:
toggleMaintenance()
```

### Disable Maintenance Mode  
```javascript
// In browser console:
toggleMaintenance(false)
```

### Show Admin Toggle
```javascript
// In browser console:
showMaintenanceToggle()
```

**Or add `?maintenance=toggle` to your URL to show the admin toggle**

## What Happens in Maintenance Mode

✅ **What Users See:**
- Beautiful maintenance overlay with your branding
- "Major Updates in Progress" message
- Expected return time: "Within 24 hours"
- Professional explanation of upgrades
- No access to portrait generation

✅ **What You See:**
- Admin toggle in top-right corner (if enabled)
- Can easily turn maintenance on/off
- Maintenance state persists across page refreshes

## Features Highlighted During Maintenance

🚀 **Higher Limits** - Unlimited daily portrait generation
💕 **New Styles** - More wedding themes and enhanced quality
⚡ **Better Performance** - Enhanced mobile experience
🎯 **Professional Message** - Users know you're actively improving

## Usage Scenarios

### 1. Upgrading API Limits
```javascript
// Enable maintenance while upgrading Gemini API plan
toggleMaintenance(true)
```

### 2. Adding New Features
```javascript
// Enable before deploying new features
toggleMaintenance(true)
// Deploy changes
// Test everything
toggleMaintenance(false)
```

### 3. Emergency Maintenance
```javascript
// Quick maintenance mode for issues
toggleMaintenance(true)
```

## Admin Controls

### Browser Console Commands:
- `toggleMaintenance(true)` - Enable maintenance
- `toggleMaintenance(false)` - Disable maintenance  
- `toggleMaintenance()` - Toggle current state
- `showMaintenanceToggle()` - Show admin toggle UI
- `hideMaintenanceToggle()` - Hide admin toggle UI

### URL Method:
- Add `?maintenance=toggle` to show admin controls
- Perfect for bookmarking: `yoursite.com?maintenance=toggle`

## Current Status

The maintenance banner will automatically:
- Show when `maintenance-mode` = `true` in localStorage
- Hide when `maintenance-mode` = `false` or not set
- Display professional upgrade messaging
- Prevent users from using portrait generation

**Default State: OFF** (users can use the app normally)

## Tips

💡 **Enable Before Issues**: Turn on maintenance before hitting rate limits  
💡 **Professional Messaging**: Users see you're actively improving, not broken  
💡 **Easy Toggle**: One command to enable/disable  
💡 **Persistent**: State survives page refreshes and browser restarts  
💡 **Cross-Tab**: Changes sync across multiple browser tabs