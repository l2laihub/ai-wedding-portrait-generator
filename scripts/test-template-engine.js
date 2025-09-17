#!/usr/bin/env node
/**
 * Template Engine Test Script
 * 
 * Tests the new template engine with existing admin prompts
 * and validates backward compatibility
 */

const { PromptBuilder } = require('../src/services/PromptBuilder.js');
const { ThemeManager } = require('../src/config/themes.config.js');
const { TemplateEngineMigration } = require('../utils/templateEngineMigration.js');

// Mock admin prompt templates (similar to actual ones)
const TEST_TEMPLATES = {
  couple: `Transform the TWO PEOPLE (couple) in this image into a beautiful wedding portrait with a "{style}" theme. This is a COUPLE portrait - there should be TWO people in the result. Keep BOTH their faces EXACTLY identical to the original - preserve their facial features, expressions, and likeness completely. Maintain BOTH subjects' identity while transforming only their clothing and background to match the wedding style. {customPrompt}. Make them look like they are dressed for a wedding in that style, but ensure BOTH faces remain perfectly consistent and unchanged from the original photo.`,
  
  single: `Transform the SINGLE PERSON in this image into a FULL BODY wedding portrait with a "{style}" theme. This is a SINGLE PERSON portrait - NOT a couple. Create a professional bridal/groom portrait showing them ALONE. Keep their face EXACTLY identical to the original - preserve ALL facial features, expressions, and complete likeness. Show the complete wedding outfit from head to toe, including dress/suit details, shoes, and accessories. {customPrompt}. Ensure their face remains perfectly consistent and unchanged from the original photo while creating a stunning full-length INDIVIDUAL portrait.`,
  
  family: `Transform this family of {familyMemberCount} people into a beautiful wedding portrait with a "{style}" theme. Crucially, preserve the exact likeness of EACH and EVERY family member's face and unique facial features. Only transform their clothing and the environment. Ensure all {familyMemberCount} individuals from the original photo are present and their identity is clearly recognizable. {customPrompt}.`,

  // Enhanced template using new variables
  enhanced_couple: `Edit this photo while preserving facial identity:
PRESERVE: {facePreservationInstructions}
TRANSFORM: 
- Setting: {themeDescription}
- Clothing: {clothingDescription}
- Atmosphere: {atmosphereDescription}
{userInput ? ENHANCE: {userInput} : ''}
Output: A {portraitType} wedding portrait in {theme} style`,

  // Conditional template
  conditional: `Transform this {portraitType} photo into a wedding portrait.
{?userInput}SPECIAL REQUEST: {userInput}{/userInput}
Theme: {theme}
{isCouple ? Setting for two people : Setting for individual}
Face preservation is {hasUserInput ? enhanced with user requirements : standard}.`
};

// Test cases
const TEST_CASES = [
  {
    name: 'Legacy Couple Template - Backward Compatibility',
    template: TEST_TEMPLATES.couple,
    params: {
      portraitType: 'couple',
      selectedTheme: 'Classic & Timeless Wedding',
      userInput: 'Make it more romantic',
      familyMemberCount: 2
    }
  },
  {
    name: 'Enhanced Couple Template - New Features',
    template: TEST_TEMPLATES.enhanced_couple,
    params: {
      portraitType: 'couple',
      selectedTheme: ThemeManager.getThemeById('bohemian_beach'),
      userInput: 'Add sunset lighting',
      familyMemberCount: 2
    }
  },
  {
    name: 'Family Template - Variable Substitution',
    template: TEST_TEMPLATES.family,
    params: {
      portraitType: 'family',
      selectedTheme: 'Rustic Barn Wedding',
      userInput: '',
      familyMemberCount: 4
    }
  },
  {
    name: 'Conditional Template - Logic Testing',
    template: TEST_TEMPLATES.conditional,
    params: {
      portraitType: 'single',
      selectedTheme: ThemeManager.getThemeById('vintage_victorian'),
      userInput: 'Add vintage lace details',
      familyMemberCount: 1
    }
  },
  {
    name: 'Theme Object Input - Direct Theme Usage',
    template: TEST_TEMPLATES.enhanced_couple,
    params: {
      portraitType: 'couple',
      selectedTheme: ThemeManager.getThemeById('fairytale_castle'),
      userInput: '',
      familyMemberCount: 2
    }
  }
];

// Color coding for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(color, ...args) {
  console.log(colors[color], ...args, colors.reset);
}

// Test runner
async function runTests() {
  console.log('🧪 Template Engine Test Suite\n');
  
  // Test 1: System Initialization
  log('blue', '📋 Test 1: System Initialization');
  
  try {
    const promptBuilder = new PromptBuilder();
    const migrationStatus = TemplateEngineMigration.validateMigration();
    
    log('green', '✅ PromptBuilder initialized successfully');
    log('green', `✅ Theme system status: ${migrationStatus.migrationReady ? 'Ready' : 'Partial'}`);
    log('green', `✅ Available themes: ${migrationStatus.themesValidated}`);
    
    if (migrationStatus.errors.length > 0) {
      log('yellow', '⚠️  Errors:', migrationStatus.errors.join(', '));
    }
    
  } catch (error) {
    log('red', '❌ System initialization failed:', error.message);
    return;
  }
  
  console.log('');
  
  // Test 2: Template Processing
  log('blue', '📋 Test 2: Template Processing');
  
  const promptBuilder = new PromptBuilder();
  let passedTests = 0;
  let totalTests = TEST_CASES.length;
  
  for (const testCase of TEST_CASES) {
    try {
      log('cyan', `\n🔍 Testing: ${testCase.name}`);
      
      const result = promptBuilder.buildPrompt({
        template: testCase.template,
        ...testCase.params
      });
      
      // Validate result
      if (result && result.length > 0) {
        log('green', '✅ Prompt generated successfully');
        log('white', `📝 Length: ${result.length} characters`);
        
        // Check if template variables were replaced
        const remainingVariables = result.match(/\{[^}]+\}/g);
        if (remainingVariables) {
          log('yellow', `⚠️  Unresolved variables: ${remainingVariables.join(', ')}`);
        } else {
          log('green', '✅ All variables resolved');
        }
        
        // Show preview
        const preview = result.length > 200 ? result.substring(0, 200) + '...' : result;
        log('white', `📖 Preview: "${preview}"`);
        
        passedTests++;
      } else {
        log('red', '❌ Empty or invalid result');
      }
      
    } catch (error) {
      log('red', '❌ Test failed:', error.message);
    }
  }
  
  console.log('');
  log('blue', `📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  // Test 3: Migration Compatibility
  log('blue', '\n📋 Test 3: Migration Compatibility');
  
  try {
    const legacyStyles = [
      'Classic & Timeless Wedding',
      'Bohemian Beach Wedding',
      'Rustic Barn Wedding'
    ];
    
    const migrationResult = await TemplateEngineMigration.performSafeMigration(legacyStyles);
    
    if (migrationResult.success) {
      log('green', '✅ Migration successful');
      log('green', `✅ Migrated ${migrationResult.themes.length} themes`);
      
      // Test migrated themes
      for (const theme of migrationResult.themes) {
        const testPrompt = promptBuilder.buildPrompt({
          template: TEST_TEMPLATES.enhanced_couple,
          selectedTheme: theme,
          portraitType: 'couple',
          userInput: 'Test migration'
        });
        
        if (testPrompt.length > 0) {
          log('green', `✅ Theme "${theme.name}" works correctly`);
        } else {
          log('red', `❌ Theme "${theme.name}" failed`);
        }
      }
    } else {
      log('yellow', '⚠️  Migration used fallback mode');
      log('yellow', `⚠️  Error: ${migrationResult.error}`);
    }
    
  } catch (error) {
    log('red', '❌ Migration test failed:', error.message);
  }
  
  // Test 4: Performance Test
  log('blue', '\n📋 Test 4: Performance Test');
  
  try {
    const startTime = Date.now();
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      promptBuilder.buildPrompt({
        template: TEST_TEMPLATES.enhanced_couple,
        selectedTheme: ThemeManager.getRandomThemes(1)[0],
        portraitType: 'couple',
        userInput: 'Performance test'
      });
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    
    log('green', `✅ Performance test completed`);
    log('green', `✅ ${iterations} generations in ${totalTime}ms`);
    log('green', `✅ Average: ${avgTime.toFixed(2)}ms per generation`);
    
    if (avgTime < 10) {
      log('green', '🚀 Excellent performance!');
    } else if (avgTime < 50) {
      log('yellow', '⚡ Good performance');
    } else {
      log('red', '🐌 Performance may need optimization');
    }
    
  } catch (error) {
    log('red', '❌ Performance test failed:', error.message);
  }
  
  // Test 5: Error Handling
  log('blue', '\n📋 Test 5: Error Handling');
  
  try {
    // Test invalid template
    try {
      promptBuilder.buildPrompt({
        template: null,
        selectedTheme: 'test',
        portraitType: 'couple'
      });
      log('red', '❌ Should have failed with null template');
    } catch (error) {
      log('green', '✅ Correctly handled null template');
    }
    
    // Test invalid theme
    const invalidThemeResult = promptBuilder.buildPrompt({
      template: TEST_TEMPLATES.couple,
      selectedTheme: 'NonexistentTheme',
      portraitType: 'couple'
    });
    
    if (invalidThemeResult.length > 0) {
      log('green', '✅ Gracefully handled invalid theme with fallback');
    } else {
      log('red', '❌ Failed to handle invalid theme');
    }
    
  } catch (error) {
    log('red', '❌ Error handling test failed:', error.message);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  log('magenta', '📊 TEMPLATE ENGINE TEST SUMMARY');
  console.log('='.repeat(60));
  
  const overallStatus = passedTests === totalTests ? 'PASS' : 'PARTIAL';
  const statusColor = passedTests === totalTests ? 'green' : 'yellow';
  
  log(statusColor, `Overall Status: ${overallStatus}`);
  log('white', `Template Tests: ${passedTests}/${totalTests}`);
  log('white', `System Ready: ${TemplateEngineMigration.validateMigration().migrationReady ? 'Yes' : 'Partial'}`);
  log('white', `Available Themes: ${ThemeManager.getEnabledThemes().length}`);
  
  if (passedTests === totalTests) {
    log('green', '\n🎉 Template engine is ready for production!');
  } else {
    log('yellow', '\n⚠️  Template engine has some issues but can run in fallback mode.');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  TEST_TEMPLATES,
  TEST_CASES
};