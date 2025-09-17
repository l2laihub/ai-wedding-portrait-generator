# Theme UI Components Integration Guide

This guide explains how to integrate the new theme selection and preview components into the main application.

## Components Overview

### 1. ThemeSelector
A comprehensive theme selection interface that allows users to:
- Browse all available wedding themes with visual previews
- Filter themes by category (outdoor, vintage, modern, etc.)
- Search themes by name or tags
- View seasonal recommendations
- See theme details including color palette, mood, and setting
- Select up to 3 themes for portrait generation

### 2. ThemePreview
A versatile component for displaying theme information:
- Compact mode for lists and selections
- Full mode with complete theme details
- Color palette visualization
- Mood and atmosphere tags
- Category and popularity indicators
- Premium/featured badges

### 3. EnhancedPromptInput
An upgraded prompt input component that includes:
- Toggle between random and manual theme selection
- Display of selected themes with preview cards
- Custom instruction textarea
- Smart generation button with validation

### 4. EnhancedImageDisplay
An improved image display that shows:
- Theme name in header with appropriate icon
- Real-time generation progress per theme
- Theme details modal on info click
- Download and share functionality
- Failed generation handling

### 5. ThemePreferences
A settings component for user preferences:
- Preferred categories selection
- Mood preferences
- General theme selection settings
- Persistence via localStorage

### 6. EnhancedSettingsModal
An upgraded settings modal with tabs:
- General settings (theme, notifications)
- Theme preferences tab
- Advanced settings (cache management)

## Integration Steps

### Step 1: Update App.tsx imports

```tsx
// Add these imports
import EnhancedPromptInput from './components/EnhancedPromptInput';
import EnhancedImageDisplay from './components/EnhancedImageDisplay';
import EnhancedSettingsModal from './components/EnhancedSettingsModal';
import { themeManager } from './services/templateEngine/ThemeManager';
import { UserThemePreferences } from './components/ThemePreferences';
```

### Step 2: Add state for theme preferences

```tsx
// Add to App component state
const [userThemePreferences, setUserThemePreferences] = useState<UserThemePreferences | null>(null);
const [useManualThemeSelection, setUseManualThemeSelection] = useState(false);
```

### Step 3: Update handleGenerate function

```tsx
const handleGenerate = async (selectedThemes?: string[]) => {
  // ... existing validation code ...

  // Get styles based on selection mode
  let stylesToGenerate: string[];
  
  if (selectedThemes && selectedThemes.length > 0) {
    // Manual selection
    stylesToGenerate = selectedThemes.map(id => {
      const style = themeManager.getStyle(id);
      return style?.name || id;
    });
  } else {
    // Random selection with preferences
    const randomStyles = themeManager.getRandomStyles(3, {
      favorFeatured: userThemePreferences?.autoSelectFeatured,
      onlyEnabled: true
    });
    stylesToGenerate = randomStyles.map(style => style.name);
  }
  
  setCurrentStyles(stylesToGenerate);
  
  // ... rest of generation logic ...
};
```

### Step 4: Replace components in render

```tsx
// Replace existing PromptInput
{sourceImageUrl && (
  <EnhancedPromptInput 
    onSubmit={handleGenerate}
    isLoading={isLoading}
    customPrompt={customPrompt}
    onCustomPromptChange={handleCustomPromptChange}
  />
)}

// Replace existing ImageDisplay
{generatedContents && (
  <EnhancedImageDisplay 
    contents={generatedContents} 
    generationId={currentGenerationId}
    photoType={photoType}
    familyMemberCount={familyMemberCount}
    generationProgress={generationProgress}
  />
)}

// Replace SettingsModal
<EnhancedSettingsModal
  isOpen={showSettingsModal}
  onClose={() => setShowSettingsModal(false)}
  onThemePreferencesChange={setUserThemePreferences}
/>
```

### Step 5: Update theme showcase section

```tsx
// Update the "How It Works" section to show available themes
<div className="mt-8 pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
  <h4 className="font-semibold text-center text-gray-900 dark:text-white mb-4 transition-colors duration-300">
    Featured Wedding Themes
  </h4>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
    {themeManager.getAvailableStyles({ featured: true }).slice(0, 8).map(style => (
      <div key={style.id} className="text-center">
        <div className="w-16 h-16 mx-auto mb-2 bg-gradient-to-br from-blue-400 to-teal-500 rounded-full flex items-center justify-center text-white text-2xl">
          {/* Add theme icon */}
        </div>
        <span className="text-xs text-gray-700 dark:text-gray-300">{style.name}</span>
      </div>
    ))}
  </div>
</div>
```

## Mobile Considerations

All components are designed with mobile-first principles:

1. **Responsive Grid Layouts**: Automatically adjust columns based on viewport
2. **Touch-Friendly Interactions**: Large tap targets and swipe gestures
3. **Optimized Performance**: Lazy loading and virtualization for large lists
4. **Adaptive UI**: Simplified layouts on smaller screens
5. **Bottom Sheets**: Mobile-native patterns for modals

## Styling Guidelines

The components follow the existing design system:

```scss
// Primary gradient
bg-gradient-to-r from-blue-500 to-teal-500

// Dark mode support
bg-white dark:bg-gray-800
text-gray-900 dark:text-white

// Shadows and borders
shadow-lg hover:shadow-xl
border-gray-200 dark:border-gray-700

// Transitions
transition-all duration-300
animate-in fade-in zoom-in-95
```

## Performance Optimizations

1. **Theme Caching**: Theme data is cached in the ThemeManager
2. **Lazy Component Loading**: Use React.lazy for theme components
3. **Memoization**: UseMemo for filtered theme lists
4. **Debounced Search**: Search input is debounced to reduce computations
5. **Virtual Scrolling**: For long theme lists (future enhancement)

## Accessibility Features

- Keyboard navigation support
- ARIA labels for all interactive elements
- Focus trapping in modals
- Screen reader announcements
- High contrast mode support
- Reduced motion preferences

## Future Enhancements

1. **Theme Collections**: Curated theme sets for specific seasons/styles
2. **AI Recommendations**: Smart theme suggestions based on uploaded photo
3. **Theme Customization**: Allow users to modify theme parameters
4. **Share Themes**: Share custom theme combinations with others
5. **Theme Analytics**: Track popular themes and combinations
6. **Theme Marketplace**: Premium theme packs from designers

## Testing Checklist

- [ ] Theme selector opens and closes properly
- [ ] Search and filters work correctly
- [ ] Theme selection limits are enforced
- [ ] Selected themes appear in prompt input
- [ ] Theme names show in generated images
- [ ] Theme preferences persist across sessions
- [ ] Mobile layouts work correctly
- [ ] Dark mode styling is consistent
- [ ] Performance is acceptable with many themes
- [ ] Accessibility requirements are met