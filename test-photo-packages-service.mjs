/**
 * Photo Packages Service Test
 * Tests the PhotoPackagesService functionality
 */

import { PhotoPackagesService } from './services/photoPackagesService.ts';

async function testPhotoPackagesService() {
  console.log('🧪 Testing Photo Packages Service...\n');

  try {
    // Test 1: Get all packages
    console.log('1️⃣ Testing getPackages()...');
    const packages = await PhotoPackagesService.getPackages();
    console.log(`   ✅ Found ${packages.length} packages`);
    
    if (packages.length > 0) {
      console.log(`   📦 Package: ${packages[0].name} (${packages[0].slug})`);
    }

    // Test 2: Get featured packages
    console.log('\n2️⃣ Testing getFeaturedPackages()...');
    const featuredPackages = await PhotoPackagesService.getFeaturedPackages();
    console.log(`   ✅ Found ${featuredPackages.length} featured packages`);

    // Test 3: Get specific package by ID
    if (packages.length > 0) {
      console.log('\n3️⃣ Testing getPackageById()...');
      const packageDetails = await PhotoPackagesService.getPackageById(packages[0].id);
      console.log(`   ✅ Package details: ${packageDetails?.name}`);
      console.log(`   📊 Themes: ${packageDetails?.themes?.length || 0}`);
      console.log(`   💰 Pricing tiers: ${packageDetails?.pricing_tiers?.length || 0}`);
    }

    // Test 4: Get pricing tiers
    if (packages.length > 0) {
      console.log('\n4️⃣ Testing getPackagePricingTiers()...');
      const pricingTiers = await PhotoPackagesService.getPackagePricingTiers(packages[0].id);
      console.log(`   ✅ Found ${pricingTiers.length} pricing tiers`);
      
      pricingTiers.forEach(tier => {
        const price = PhotoPackagesService.formatPackagePrice(tier.price_amount_cents);
        console.log(`   💵 ${tier.display_name}: ${price} (${tier.included_generations} generations)`);
      });
    }

    // Test 5: Rate limiting check (anonymous user)
    if (packages.length > 0) {
      console.log('\n5️⃣ Testing checkPackageRateLimit()...');
      const rateLimitCheck = await PhotoPackagesService.checkPackageRateLimit(
        'test-user-qa-123',
        packages[0].id,
        'anonymous'
      );
      console.log(`   ✅ Rate limit check - Allowed: ${rateLimitCheck.allowed}`);
      console.log(`   ⏰ Hourly remaining: ${rateLimitCheck.hourly_remaining}`);
      console.log(`   📅 Daily remaining: ${rateLimitCheck.daily_remaining}`);
    }

    // Test 6: Package statistics
    console.log('\n6️⃣ Testing getPackageStatistics()...');
    const stats = await PhotoPackagesService.getPackageStatistics();
    console.log(`   ✅ Total packages: ${stats.total_packages}`);
    console.log(`   📈 Active packages: ${stats.active_packages}`);
    console.log(`   🎨 Total themes: ${stats.total_themes}`);

    console.log('\n🎉 All Photo Packages Service tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testPhotoPackagesService();