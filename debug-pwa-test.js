/**
 * PWA Install Testing Script
 * 
 * Add this script to your page temporarily to test PWA install functionality
 * Remove after testing!
 */

// 1. Test if your app meets PWA criteria
console.log('🔍 PWA Install Debug Info:');
console.log('- User Agent:', navigator.userAgent);
console.log('- Is Standalone:', window.navigator.standalone);
console.log('- Display Mode:', window.matchMedia('(display-mode: standalone)').matches);

// 2. Check manifest
fetch('/manifest.json')
  .then(res => res.json())
  .then(manifest => {
    console.log('✅ Manifest loaded:', manifest);
  })
  .catch(err => {
    console.error('❌ Manifest error:', err);
  });

// 3. Force show install prompt (for testing)
window.debugShowInstallPrompt = function() {
  console.log('🔧 Forcing install prompt display...');
  
  // Create fake beforeinstallprompt event for testing
  const fakeEvent = new Event('beforeinstallprompt');
  fakeEvent.prompt = () => {
    console.log('📱 Install prompt would show here');
    return Promise.resolve();
  };
  fakeEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
  
  window.dispatchEvent(fakeEvent);
};

// 4. Test iOS detection
window.debugTestIOS = function() {
  console.log('🍎 Testing iOS mode...');
  
  // Temporarily modify user agent check
  Object.defineProperty(navigator, 'userAgent', {
    get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    configurable: true
  });
  
  // Refresh to see iOS behavior
  console.log('🔄 Refresh the page to see iOS install behavior');
};

// 5. Check install button visibility
setTimeout(() => {
  const installButtons = document.querySelectorAll('[class*="Install"], button[class*="purple-600"]');
  console.log('🔘 Install buttons found:', installButtons.length);
  installButtons.forEach((btn, i) => {
    console.log(`  Button ${i + 1}:`, btn.textContent, btn.className);
  });
}, 2000);

// 6. Monitor install events
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('🎉 beforeinstallprompt event fired!', e);
});

window.addEventListener('appinstalled', (e) => {
  console.log('✅ App installed!', e);
});

console.log('');
console.log('🧪 PWA Testing Commands:');
console.log('  debugShowInstallPrompt() - Force show install prompt');
console.log('  debugTestIOS() - Test iOS behavior');
console.log('');
console.log('💡 Also check:');
console.log('  - Address bar for install icon');
console.log('  - Header for "Install App" button');
console.log('  - Console for install events');