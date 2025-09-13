/**
 * Admin Counter Update Script
 * 
 * Run this in the browser console when on your WedAI site to update
 * the counter with real API usage numbers.
 * 
 * Usage:
 * 1. Open browser developer tools (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this entire script
 * 4. Call updateCounterWithAPIData() with your real numbers
 */

// Function to update counter with real API usage data
window.updateCounterWithAPIData = function(apiRequestsToday = 2000, totalApiRequests = null) {
  try {
    // Get the counter service instance
    const counterService = window.counterServiceInstance;
    
    if (!counterService) {
      console.error('Counter service not found. Make sure you are on the WedAI site.');
      return;
    }

    // If total not provided, estimate based on daily usage (assuming ~28 days of usage from dashboard)
    if (!totalApiRequests) {
      totalApiRequests = apiRequestsToday * 15; // Conservative estimate: 28 days with varying usage
    }

    // Sync with API usage
    counterService.syncWithAPIUsage(apiRequestsToday, totalApiRequests);
    
    console.log('✅ Counter updated successfully!');
    console.log('📊 Refresh the page to see the updated numbers.');
    
  } catch (error) {
    console.error('❌ Failed to update counter:', error);
  }
};

// Function to manually set specific counter values
window.setCounterBaseline = function(totalGenerations, dailyGenerations) {
  try {
    const counterService = window.counterServiceInstance;
    
    if (!counterService) {
      console.error('Counter service not found.');
      return;
    }

    counterService.updateBaseline(totalGenerations, dailyGenerations);
    
    console.log(`✅ Counter baseline set: ${totalGenerations} total, ${dailyGenerations} daily`);
    console.log('📊 Refresh the page to see the updated numbers.');
    
  } catch (error) {
    console.error('❌ Failed to set baseline:', error);
  }
};

// Function to check current counter values
window.checkCounterValues = function() {
  try {
    const counterService = window.counterServiceInstance;
    
    if (!counterService) {
      console.error('Counter service not found.');
      return;
    }

    const metrics = counterService.getMetrics();
    console.log('📊 Current Counter Values:');
    console.log(`  Total Generations: ${metrics.totalGenerations.toLocaleString()}`);
    console.log(`  Daily Generations: ${metrics.dailyGenerations.toLocaleString()}`);
    console.log(`  Last Reset: ${metrics.lastResetDate}`);
    
  } catch (error) {
    console.error('❌ Failed to check counter:', error);
  }
};

// Auto-update based on your current API usage
console.log('🚀 WedAI Admin Counter Update Script Loaded');
console.log('');
console.log('📈 Available Commands:');
console.log('  updateCounterWithAPIData(2000) - Update with your API request numbers');
console.log('  setCounterBaseline(25000, 3000) - Set specific counter values');
console.log('  checkCounterValues() - Check current counter state');
console.log('');
console.log('💡 Quick Update Example:');
console.log('  updateCounterWithAPIData(2000, 30000)');
console.log('');
console.log('🔧 Based on your launch (yesterday) + API usage (2k requests today):');

// Calculate realistic values for day-old app
const todayRequests = 2000;  // Today's usage
const requestsPerGeneration = 3; // 3 styles per generation
const todayGenerations = Math.floor(todayRequests / requestsPerGeneration);
const yesterdayGenerations = 200; // Launch day estimate
const recommendedTotal = todayGenerations + yesterdayGenerations;

console.log(`  setCounterBaseline(${recommendedTotal.toLocaleString()}, ${todayGenerations.toLocaleString()})`);
console.log('');
console.log('📊 Realistic Options for Day-Old App:');
console.log(`  setCounterBaseline(500, 400)    // Conservative launch`);
console.log(`  setCounterBaseline(950, 650)    // Current realistic baseline`);
console.log(`  setCounterBaseline(1200, 800)   // Optimistic but believable`);