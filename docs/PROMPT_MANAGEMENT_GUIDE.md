# Prompt Management Guide

## Overview

The Admin Dashboard now includes a comprehensive Prompt Management system that allows administrators to customize, test, and manage AI prompts for different portrait types.

## Features

### 🎨 Prompt Templates
- **Three Portrait Types**: Single, Couple, and Family portraits
- **Version Control**: Track changes with version numbers and timestamps
- **Default Templates**: Built-in fallback prompts for reliability

### ✏️ Edit & Customize
- **Visual Editor**: Easy-to-use interface for editing prompt templates
- **Variable Substitution**: Support for dynamic variables:
  - `{style}` - Wedding style theme
  - `{customPrompt}` - User's custom prompt text
  - `{familyMemberCount}` - Number of family members (family portraits only)
- **Reset to Default**: Quickly restore original prompts

### 🧪 Testing & Preview
- **Live Testing**: Generate sample prompts with different parameters
- **Style Selection**: Test with any available wedding style
- **Parameter Customization**: Adjust custom prompts and family member counts
- **Copy to Clipboard**: Easy sharing and debugging

### 💾 Import/Export
- **JSON Export**: Download all prompts as a JSON file
- **JSON Import**: Upload and restore prompt configurations
- **Backup & Restore**: Easy configuration management
- **Validation**: Automatic validation of imported prompt formats

## How to Use

### Accessing Prompt Management
1. Navigate to the Admin Dashboard
2. Click on "Prompts" in the sidebar navigation
3. Select a prompt template to view/edit

### Editing Prompts
1. Select a prompt template from the list
2. Click the "Edit" button
3. Modify the template text using the textarea
4. Use available variables: `{style}`, `{customPrompt}`, `{familyMemberCount}`
5. Click "Save Changes" to apply

### Testing Prompts
1. Select a prompt template
2. Click the "Test" button
3. Choose a wedding style from the dropdown
4. Add a custom prompt (optional)
5. Set family member count (for family portraits)
6. View the generated prompt and copy if needed

### Export/Import
- **Export**: Click "Export" button to download all prompts as JSON
- **Import**: Click "Import" button and select a JSON file to upload

## Technical Details

### Storage
- Prompts are stored in localStorage under the key `wedai_admin_prompts`
- Automatic fallback to default prompts if storage fails
- Version tracking for change management

### Integration
- The `promptService` handles all prompt operations
- `secureGeminiService` uses the prompt service for generation
- Automatic fallback to hardcoded prompts if service fails

### Default Prompts

#### Single Person
```
Transform the SINGLE PERSON in this image into a FULL BODY wedding portrait with a "{style}" theme. This is a SINGLE PERSON portrait - NOT a couple. Create a professional bridal/groom portrait showing them ALONE. Keep their face EXACTLY identical to the original - preserve ALL facial features, expressions, and complete likeness. Show the complete wedding outfit from head to toe, including dress/suit details, shoes, and accessories. {customPrompt}. Ensure their face remains perfectly consistent and unchanged from the original photo while creating a stunning full-length INDIVIDUAL portrait.
```

#### Couple
```
Transform the TWO PEOPLE (couple) in this image into a beautiful wedding portrait with a "{style}" theme. This is a COUPLE portrait - there should be TWO people in the result. Keep BOTH their faces EXACTLY identical to the original - preserve their facial features, expressions, and likeness completely. Maintain BOTH subjects' identity while transforming only their clothing and background to match the wedding style. {customPrompt}. Make them look like they are dressed for a wedding in that style, but ensure BOTH faces remain perfectly consistent and unchanged from the original photo.
```

#### Family
```
Transform this family of {familyMemberCount} people into a beautiful wedding portrait with a "{style}" theme. Crucially, preserve the exact likeness of EACH and EVERY family member's face and unique facial features. Only transform their clothing and the environment. Ensure all {familyMemberCount} individuals from the original photo are present and their identity is clearly recognizable. {customPrompt}.
```

## Best Practices

### Writing Effective Prompts
1. **Be Specific**: Clearly specify the number of people expected
2. **Preserve Identity**: Emphasize maintaining facial features and likeness
3. **Include Variables**: Use `{style}` and `{customPrompt}` for flexibility
4. **Full Body Context**: Specify when full-body portraits are desired
5. **Style Integration**: Explain how the wedding style should be applied

### Testing and Validation
1. **Test with Multiple Styles**: Ensure prompts work across different wedding themes
2. **Verify Variables**: Check that all variables are properly substituted
3. **Edge Cases**: Test with extreme family sizes (2, 10+ members)
4. **Custom Prompts**: Test with various custom prompt inputs

### Backup and Versioning
1. **Regular Exports**: Download prompt configurations regularly
2. **Version Tracking**: Monitor version numbers for change tracking
3. **Testing Before Deployment**: Test modified prompts before saving
4. **Document Changes**: Keep notes on why prompts were modified

## Troubleshooting

### Common Issues
- **Variables Not Substituting**: Check variable names match exactly `{style}`, `{customPrompt}`, `{familyMemberCount}`
- **Import Failures**: Ensure JSON format is valid and contains required fields
- **Storage Issues**: Clear localStorage if prompts appear corrupted
- **Fallback Behavior**: System automatically uses hardcoded prompts if service fails

### Error Messages
- `"Invalid format: expected array of prompts"` - JSON file is not an array
- `"Invalid prompt format: missing required fields"` - Prompt objects missing id, type, or template
- `"Invalid prompt type"` - Type must be 'single', 'couple', or 'family'

## API Reference

### PromptService Methods
- `getPrompts()` - Get all prompt templates
- `getPromptByType(type)` - Get prompt template for specific type
- `updatePrompt(prompt)` - Update a prompt template
- `generatePrompt(type, style, customPrompt, familyMemberCount)` - Generate final prompt
- `exportPrompts()` - Export as JSON string
- `importPrompts(json)` - Import from JSON string

## Future Enhancements

### Planned Features
- **A/B Testing**: Compare different prompt versions
- **Analytics**: Track prompt performance and success rates
- **Templates Library**: Shared prompt templates across teams
- **Batch Operations**: Edit multiple prompts simultaneously
- **Prompt History**: View and restore previous versions
- **Performance Metrics**: Track generation success rates by prompt

---

*This feature enables powerful customization of AI prompts while maintaining reliability through fallback mechanisms and version control.*