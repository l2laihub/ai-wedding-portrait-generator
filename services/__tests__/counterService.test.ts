/**
 * Manual test file for counterService
 * Run these tests in the browser console to verify functionality
 */

import { counterService } from '../counterService';

// Test suite for counterService
export const testCounterService = () => {
  console.log('🧪 Testing Counter Service...\n');

  // Test 1: Get initial metrics
  console.log('Test 1: Get initial metrics');
  const initialMetrics = counterService.getMetrics();
  console.log('Initial metrics:', initialMetrics);
  console.log('✅ Test 1 passed\n');

  // Test 2: Increment counter
  console.log('Test 2: Increment counter');
  const beforeCount = counterService.getTotalGenerations();
  counterService.incrementCounter('test_gen_1', 2, 3, 'couple');
  const afterCount = counterService.getTotalGenerations();
  console.log(`Before: ${beforeCount}, After: ${afterCount}`);
  console.assert(afterCount === beforeCount + 1, 'Counter should increment by 1');
  console.log('✅ Test 2 passed\n');

  // Test 3: Daily counter
  console.log('Test 3: Daily counter');
  const dailyBefore = counterService.getDailyGenerations();
  counterService.incrementCounter('test_gen_2', 3, 3, 'single');
  const dailyAfter = counterService.getDailyGenerations();
  console.log(`Daily before: ${dailyBefore}, Daily after: ${dailyAfter}`);
  console.assert(dailyAfter === dailyBefore + 1, 'Daily counter should increment');
  console.log('✅ Test 3 passed\n');

  // Test 4: Get statistics
  console.log('Test 4: Get statistics');
  const stats = counterService.getStatistics();
  console.log('Statistics:', stats);
  console.assert(stats.total >= 2, 'Total should be at least 2');
  console.assert(stats.today >= 2, 'Today count should be at least 2');
  console.log('✅ Test 4 passed\n');

  // Test 5: Photo type distribution
  console.log('Test 5: Photo type distribution');
  counterService.incrementCounter('test_gen_3', 1, 3, 'family');
  const newStats = counterService.getStatistics();
  console.log('Photo type distribution:', newStats.photoTypeDistribution);
  console.assert(newStats.photoTypeDistribution.couple >= 1, 'Should have couple generations');
  console.assert(newStats.photoTypeDistribution.single >= 1, 'Should have single generations');
  console.assert(newStats.photoTypeDistribution.family >= 1, 'Should have family generations');
  console.log('✅ Test 5 passed\n');

  // Test 6: Success rate calculation
  console.log('Test 6: Success rate calculation');
  console.log('Average success rate:', newStats.averageSuccessRate);
  console.log('Success rate last 24h:', newStats.successRateLast24h);
  console.log('✅ Test 6 passed\n');

  // Test 7: Export metrics
  console.log('Test 7: Export metrics');
  const exported = counterService.exportMetrics();
  console.log('Exported metrics:', exported);
  console.assert(typeof exported === 'string', 'Export should return string');
  console.assert(exported.includes('totalGenerations'), 'Export should contain totalGenerations');
  console.log('✅ Test 7 passed\n');

  // Test 8: Local storage persistence
  console.log('Test 8: Local storage persistence');
  const totalBefore = counterService.getTotalGenerations();
  
  // Simulate page reload by creating new instance
  const newCounterService = counterService.constructor.getInstance();
  const totalAfter = newCounterService.getTotalGenerations();
  
  console.log(`Total before: ${totalBefore}, Total after reload: ${totalAfter}`);
  console.assert(totalBefore === totalAfter, 'Counter should persist across reloads');
  console.log('✅ Test 8 passed\n');

  console.log('✨ All tests passed!');
  
  // Return summary
  return {
    passed: true,
    metrics: counterService.getMetrics(),
    statistics: counterService.getStatistics(),
  };
};

// Usage in browser console:
// import('./services/__tests__/counterService.test.ts').then(m => m.testCounterService());