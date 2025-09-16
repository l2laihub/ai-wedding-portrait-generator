# Authentication Integration Testing Guide

## Overview
This document provides comprehensive test cases for verifying that authentication properly integrates with all existing features of the AI Wedding Portrait Generator. The authentication system must work seamlessly with credits, image generation, admin features, and the overall user experience.

## Integration Points Analysis

### Key Integration Areas
1. **Credits System** - User authentication enables credit tracking and usage
2. **Image Generation** - Authentication controls access to premium features
3. **User Profile Management** - Profile data and settings persistence
4. **Admin Dashboard** - Role-based access control for admin features
5. **Stripe Payment Integration** - Credit purchases tied to user accounts
6. **Session Management** - Persistent login across app sections
7. **Rate Limiting** - Authentication affects usage limits
8. **Analytics & Tracking** - User actions tracked for authenticated users

---

## 1. Credits System Integration Testing

### Test Objective
Verify that authentication properly integrates with the credits system for tracking, consumption, and purchasing.

### Integration Points
- User registration creates credit records
- Credit balance tied to user identity
- Credit consumption requires authentication
- Credit purchases associated with user account

### Test Cases

#### TC-INT-CRE-001: New User Credit Initialization
**Objective**: Verify new users receive initial credits upon registration
**Preconditions**: None
**Steps**:
1. Register new user account
2. Complete email verification (if required)
3. Login successfully
4. Check credit balance in UI
5. Verify database records

**Expected Results**:
- User receives 5 daily free credits
- Credit balance displays correctly in header
- Database `user_credits` record created
- `credit_transactions` table shows initial allocation

**Verification Queries**:
```sql
-- Check user credits record
SELECT * FROM user_credits WHERE user_id = '[new_user_id]';

-- Check initial transaction
SELECT * FROM credit_transactions 
WHERE user_id = '[new_user_id]' 
AND type = 'free_daily'
ORDER BY created_at DESC LIMIT 1;
```

#### TC-INT-CRE-002: Credit Consumption During Generation
**Objective**: Test credit deduction when generating images
**Preconditions**: User logged in with available credits
**Steps**:
1. Note initial credit balance
2. Upload couple photo
3. Generate wedding portraits
4. Wait for generation completion
5. Check updated credit balance
6. Verify generation history

**Expected Results**:
- Credits consumed only after successful generation
- Balance updates in real-time in UI
- Generation history shows credit cost
- No double-charging for failed generations

#### TC-INT-CRE-003: Credit Purchase Integration
**Objective**: Verify Stripe payment integration with credits
**Preconditions**: User logged in, Stripe configured
**Steps**:
1. Navigate to pricing/upgrade section
2. Select credit package
3. Complete Stripe checkout
4. Return to application
5. Verify credit balance updated
6. Check transaction history

**Expected Results**:
- Stripe payment processed successfully
- Credits added to user account immediately
- Payment ID linked to credit transaction
- User can immediately use purchased credits

#### TC-INT-CRE-004: Daily Credit Reset
**Objective**: Test daily credit reset functionality
**Preconditions**: User with expired daily credits
**Steps**:
1. Login with account that used all daily credits yesterday
2. Check credit balance
3. Verify daily reset occurred
4. Attempt portrait generation
5. Confirm credit consumption

**Expected Results**:
- Daily credits reset to 5 at midnight
- Previous day's usage cleared
- Paid/bonus credits preserved
- User can generate portraits with reset credits

### Credits Integration Test Script
```javascript
// Run in browser console for manual testing
async function testCreditsIntegration() {
  console.log('🔍 Testing Credits Integration...');
  
  // Test 1: Check if credits service is available
  if (typeof creditsService !== 'undefined') {
    console.log('✅ Credits service available');
    
    // Get current balance
    const balance = await creditsService.getBalance();
    console.log('Current balance:', balance);
    
    // Test credit consumption
    if (balance.canUseCredits) {
      console.log('Testing credit consumption...');
      const result = await creditsService.consumeCredit('Test consumption');
      console.log('Consumption result:', result);
    }
  } else {
    console.log('❌ Credits service not available');
  }
}

testCreditsIntegration();
```

---

## 2. Image Generation Integration Testing

### Test Objective
Ensure authentication properly controls access to image generation features and maintains user-specific generation history.

### Integration Points
- Authentication required for generation
- User-specific generation limits
- Generation history tied to user account
- Premium features for authenticated users

### Test Cases

#### TC-INT-GEN-001: Anonymous vs Authenticated Generation
**Objective**: Test generation behavior for different user states
**Test Scenarios**:

**Scenario A: Anonymous User**
```markdown
Steps:
1. Open app without logging in
2. Attempt to upload image
3. Try to generate portraits
4. Note any limitations or prompts

Expected Results:
- Limited functionality or login prompt
- No generation history saved
- Reduced generation limits
```

**Scenario B: Authenticated User**
```markdown
Steps:
1. Login with valid account
2. Upload couple photo
3. Generate wedding portraits
4. Check generation history
5. Verify all features available

Expected Results:
- Full feature access
- Generation history persisted
- Higher generation limits
- Progress saved to account
```

#### TC-INT-GEN-002: Generation History Persistence
**Objective**: Verify user's generation history is properly maintained
**Preconditions**: User with previous generations
**Steps**:
1. Login to account
2. Navigate to generation history (if available)
3. Verify previous generations displayed
4. Generate new portraits
5. Confirm new generation added to history
6. Logout and login again
7. Verify history persists

**Expected Results**:
- All user's generations displayed chronologically
- Thumbnails and metadata preserved
- New generations immediately appear in history
- History survives logout/login cycles

#### TC-INT-GEN-003: Generation Limits by User Type
**Objective**: Test different limits for user tiers
**Test Data**:
- Free user account
- Premium user account (if applicable)
- Admin user account

**Steps for each user type**:
1. Login with test account
2. Perform maximum allowed generations
3. Attempt additional generation
4. Verify limit enforcement
5. Check error messages

**Expected Results**:
- Limits enforced based on user type/credits
- Clear messaging about limits
- Upgrade prompts for free users
- No limits for admin users

#### TC-INT-GEN-004: Failed Generation Credit Handling
**Objective**: Ensure credits not consumed for failed generations
**Setup**: Mock API failure or network interruption
**Steps**:
1. Note initial credit balance
2. Upload image
3. Start generation process
4. Simulate failure (disconnect network)
5. Check credit balance
6. Verify error handling

**Expected Results**:
- Credits not deducted for failed generations
- Clear error message displayed
- User can retry without penalty
- Generation state properly cleaned up

---

## 3. User Profile & Settings Integration

### Test Objective
Verify user profile data, preferences, and settings are properly managed through authentication.

### Test Cases

#### TC-INT-PRO-001: Profile Data Consistency
**Objective**: Test profile data across app components
**Steps**:
1. Login with user account
2. Check profile display in header/menu
3. Navigate to profile/settings page
4. Verify data consistency across views
5. Update profile information
6. Confirm changes reflected everywhere

**Expected Results**:
- Consistent user data across all components
- Real-time updates when profile changes
- Proper avatar/display name handling
- Email and metadata accuracy

#### TC-INT-PRO-002: Settings Persistence
**Objective**: Test user preferences and settings
**Preconditions**: User with custom settings
**Steps**:
1. Login and modify settings (theme, notifications, etc.)
2. Logout and login again
3. Verify settings preserved
4. Test settings across different devices/browsers
5. Confirm cloud sync functionality

**Expected Results**:
- All user preferences preserved
- Settings sync across sessions
- Theme preferences maintained
- Notification settings respected

#### TC-INT-PRO-003: Account Deletion Integration
**Objective**: Test account deletion and data cleanup
**Warning**: Use test account only
**Steps**:
1. Login with test account
2. Generate some portraits
3. Make credit purchases
4. Navigate to account deletion
5. Complete deletion process
6. Verify complete data removal

**Expected Results**:
- All user data completely removed
- Generated images deleted
- Credit records cleared
- Account cannot be used to login

---

## 4. Admin Dashboard Integration

### Test Objective
Verify role-based access control and admin functionality works with authentication.

### Test Cases

#### TC-INT-ADM-001: Admin Access Control
**Objective**: Test admin role verification
**Test Accounts**:
- Regular user account
- Admin user account
- Super admin account (if applicable)

**Steps for each account type**:
1. Login with test account
2. Attempt to access `/admin` routes
3. Try admin-only functions
4. Verify appropriate access levels
5. Test privilege escalation prevention

**Expected Results**:
- Regular users blocked from admin areas
- Admin users access appropriate functions
- Role-based UI differences
- Security logs for access attempts

#### TC-INT-ADM-002: Admin User Management
**Objective**: Test admin capabilities for user management
**Preconditions**: Login as admin user
**Steps**:
1. Access admin dashboard
2. View user list
3. Search for specific users
4. Modify user credits (if permitted)
5. View user generation history
6. Test user account actions

**Expected Results**:
- Complete user list displayed
- Search functionality works
- Credit adjustments reflected immediately
- Audit trail for admin actions

#### TC-INT-ADM-003: Admin Analytics Integration
**Objective**: Test admin analytics and reporting
**Preconditions**: Admin access with analytics data
**Steps**:
1. Access admin analytics dashboard
2. Verify user metrics accuracy
3. Check generation statistics
4. Test filtering and date ranges
5. Export data functionality

**Expected Results**:
- Accurate user and usage metrics
- Real-time or near real-time data
- Filtering works correctly
- Export functionality operational

---

## 5. Payment & Stripe Integration

### Test Objective
Ensure Stripe payment integration works seamlessly with user authentication.

### Test Cases

#### TC-INT-PAY-001: Checkout Flow Integration
**Objective**: Test complete payment flow
**Preconditions**: Test Stripe account configured
**Steps**:
1. Login with user account
2. Navigate to pricing page
3. Select credit package
4. Complete Stripe checkout
5. Return to application
6. Verify credit addition
7. Check payment confirmation

**Expected Results**:
- Smooth checkout experience
- User remains authenticated throughout
- Credits added immediately after payment
- Email confirmation sent
- Payment recorded in Stripe dashboard

#### TC-INT-PAY-002: Payment History Integration
**Objective**: Test payment history display
**Preconditions**: User with payment history
**Steps**:
1. Login to account with payments
2. Navigate to payment/billing history
3. Verify all payments displayed
4. Check payment details accuracy
5. Test refund scenarios (if applicable)

**Expected Results**:
- Complete payment history shown
- Accurate amounts and dates
- Stripe payment IDs linked
- Refund status properly displayed

#### TC-INT-PAY-003: Failed Payment Handling
**Objective**: Test failed payment scenarios
**Setup**: Use test card that will decline
**Steps**:
1. Start credit purchase process
2. Use declining test card
3. Verify payment failure handling
4. Check that no credits were added
5. Confirm user can retry payment

**Expected Results**:
- Clear error message for failed payment
- No credits added for failed payment
- User can immediately retry
- Payment state properly reset

---

## 6. Session Management Integration

### Test Objective
Verify session management works correctly across all app features.

### Test Cases

#### TC-INT-SES-001: Multi-Tab Session Sync
**Objective**: Test session synchronization across browser tabs
**Steps**:
1. Login in Tab A
2. Open app in Tab B
3. Verify user appears logged in Tab B
4. Perform actions in Tab A
5. Check if changes reflect in Tab B
6. Logout from Tab A
7. Verify logout in Tab B

**Expected Results**:
- Session syncs across tabs immediately
- User state consistent in all tabs
- Actions in one tab update others
- Logout affects all tabs

#### TC-INT-SES-002: Session Persistence Across App Sections
**Objective**: Test session maintenance during navigation
**Steps**:
1. Login to account
2. Navigate through different app sections:
   - Home/generation page
   - Profile/settings
   - Credit purchase page
   - Admin dashboard (if admin)
3. Verify login state maintained throughout
4. Test back/forward browser navigation

**Expected Results**:
- User remains logged in across all sections
- Authentication state never lost during navigation
- Protected routes accessible without re-authentication
- Browser navigation works correctly

#### TC-INT-SES-003: Session Expiration Handling
**Objective**: Test session expiration and refresh
**Setup**: Accelerate session expiration for testing
**Steps**:
1. Login to account
2. Wait for session near expiration
3. Perform authenticated action
4. Verify automatic session refresh
5. Test manual session refresh
6. Handle complete session expiration

**Expected Results**:
- Automatic session refresh when possible
- Graceful handling of expired sessions
- Clear re-authentication prompt
- No data loss during session refresh

---

## 7. Error Handling Integration

### Test Objective
Verify error scenarios are handled gracefully across all integrations.

### Test Cases

#### TC-INT-ERR-001: Network Connectivity Issues
**Objective**: Test authentication during network problems
**Simulation**: Use browser dev tools to simulate network conditions
**Steps**:
1. Login to account
2. Simulate network disconnection
3. Attempt various authenticated actions
4. Restore network connection
5. Verify system recovery

**Expected Results**:
- Graceful offline mode handling
- Clear network error messages
- Automatic retry when connection restored
- No data corruption during outages

#### TC-INT-ERR-002: Server Error Handling
**Objective**: Test response to backend service failures
**Simulation**: Mock server errors using dev tools
**Steps**:
1. Login to account
2. Trigger server errors for different services:
   - Credit balance API
   - Image generation API
   - User profile API
3. Verify error handling for each
4. Test error recovery

**Expected Results**:
- User-friendly error messages
- No authentication state corruption
- Proper fallback mechanisms
- Error logging for debugging

#### TC-INT-ERR-003: Concurrent Request Handling
**Objective**: Test system behavior with simultaneous requests
**Steps**:
1. Login to account
2. Trigger multiple concurrent actions:
   - Credit consumption
   - Profile updates
   - Image generations
3. Verify no race conditions
4. Check data consistency

**Expected Results**:
- No race conditions in credit system
- Proper request queuing/throttling
- Data consistency maintained
- No duplicate charges or operations

---

## 8. Performance Integration Testing

### Test Objective
Ensure authentication doesn't negatively impact app performance.

### Test Cases

#### TC-INT-PER-001: Login Performance Impact
**Objective**: Measure performance impact of authentication
**Metrics to Track**:
- Initial page load time
- Time to authentication
- Subsequent page navigation time
- Memory usage with session

**Testing Procedure**:
```javascript
// Performance testing script
const performanceTest = {
  startTime: null,
  metrics: {},
  
  start() {
    this.startTime = performance.now();
    this.metrics = {};
  },
  
  mark(label) {
    this.metrics[label] = performance.now() - this.startTime;
    console.log(`${label}: ${this.metrics[label]}ms`);
  },
  
  testAuthFlow() {
    this.start();
    // Trigger login
    this.mark('login-initiated');
    // Wait for completion
    this.mark('login-completed');
    // Navigate to different section
    this.mark('navigation-completed');
  }
};
```

**Performance Targets**:
- Login completion: < 2 seconds
- Session restoration: < 1 second
- Navigation with auth: < 500ms additional overhead
- Memory usage: < 10MB for auth state

#### TC-INT-PER-002: Credit System Performance
**Objective**: Test performance of credit-related operations
**Steps**:
1. Measure credit balance fetch time
2. Test credit consumption performance
3. Verify UI update responsiveness
4. Test with high concurrent usage

**Expected Results**:
- Credit balance loads in < 500ms
- Credit consumption completes in < 1 second
- UI updates immediately
- No performance degradation under load

---

## 9. Mobile Integration Testing

### Test Objective
Verify authentication works correctly on mobile devices and responsive layouts.

### Test Cases

#### TC-INT-MOB-001: Mobile Authentication Flow
**Objective**: Test complete auth flow on mobile
**Test Devices**: iOS Safari, Android Chrome
**Steps**:
1. Open app on mobile device
2. Trigger login modal
3. Complete authentication
4. Test portrait generation
5. Test credit purchase flow
6. Verify all features work

**Expected Results**:
- Login modal displays correctly on mobile
- Touch interactions work smoothly
- All features accessible on mobile
- Performance acceptable on mobile

#### TC-INT-MOB-002: Mobile Session Management
**Objective**: Test mobile-specific session handling
**Steps**:
1. Login on mobile device
2. Switch to background app
3. Return to app after extended time
4. Test session persistence
5. Verify background refresh behavior

**Expected Results**:
- Session persists through app backgrounding
- Automatic session refresh works on mobile
- No unnecessary re-authentication
- Battery usage reasonable

---

## 10. Integration Test Automation

### Automated Test Suite Setup

#### Cypress Integration Tests
```javascript
// cypress/integration/auth-integration.spec.js
describe('Authentication Integration', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/');
  });

  it('should integrate auth with credits system', () => {
    // Login
    cy.login('test@example.com', 'password123');
    
    // Check credit balance displayed
    cy.get('[data-testid="credit-balance"]').should('be.visible');
    
    // Generate portrait and verify credit consumption
    cy.uploadImage('test-couple.jpg');
    cy.get('[data-testid="generate-button"]').click();
    
    // Verify credit reduction
    cy.get('[data-testid="credit-balance"]').should('contain', '4 credits');
  });

  it('should handle payment integration', () => {
    cy.login('test@example.com', 'password123');
    
    // Navigate to pricing
    cy.get('[data-testid="upgrade-button"]').click();
    
    // Mock Stripe checkout
    cy.intercept('POST', '/api/stripe/checkout', {
      statusCode: 200,
      body: { url: 'https://checkout.stripe.com/test' }
    });
    
    // Test credit purchase flow
    cy.get('[data-testid="buy-credits-10"]').click();
    // Add more payment flow testing
  });
});
```

#### Jest Unit Tests for Integration
```javascript
// tests/integration/auth-credits.test.js
import { authService } from '../../services/authService';
import { creditsService } from '../../services/creditsService';

describe('Auth-Credits Integration', () => {
  beforeEach(() => {
    // Setup test user
    authService.setTestUser({
      id: 'test-user-123',
      email: 'test@example.com'
    });
  });

  test('should get credit balance for authenticated user', async () => {
    const balance = await creditsService.getBalance();
    
    expect(balance).toHaveProperty('totalAvailable');
    expect(balance).toHaveProperty('canUseCredits');
  });

  test('should consume credit for authenticated user', async () => {
    const initialBalance = await creditsService.getBalance();
    const result = await creditsService.consumeCredit('Test generation');
    
    expect(result.success).toBe(true);
    expect(result.newBalance.totalAvailable).toBe(initialBalance.totalAvailable - 1);
  });
});
```

---

## 11. Integration Test Data Management

### Test User Accounts
```javascript
const testUsers = {
  freeUser: {
    email: 'free.user@test.com',
    password: 'FreeUser123!',
    credits: { free: 5, paid: 0, bonus: 0 },
    role: 'user'
  },
  paidUser: {
    email: 'paid.user@test.com', 
    password: 'PaidUser123!',
    credits: { free: 5, paid: 25, bonus: 5 },
    role: 'user'
  },
  adminUser: {
    email: 'admin@test.com',
    password: 'AdminUser123!',
    credits: { free: 5, paid: 0, bonus: 0 },
    role: 'admin'
  }
};
```

### Test Data Cleanup
```javascript
// Cleanup script for integration tests
async function cleanupTestData() {
  const testUserIds = Object.values(testUsers).map(user => user.id);
  
  // Clean up test generations
  await supabase
    .from('generations')
    .delete()
    .in('user_id', testUserIds);
    
  // Clean up test transactions
  await supabase
    .from('credit_transactions')
    .delete()
    .in('user_id', testUserIds);
    
  // Reset test user credits
  for (const userId of testUserIds) {
    await creditsService.resetDailyCredits(userId);
  }
}
```

---

## 12. Integration Test Results Template

### Test Execution Summary
```markdown
# Authentication Integration Test Results

## Test Environment
- **Date**: [Test Date]
- **Environment**: [Development/Staging/Production]
- **Tester**: [QA Engineer Name]
- **Browser**: [Browser and Version]
- **Device**: [Desktop/Mobile Details]

## Test Results Summary
- **Total Test Cases**: [Number]
- **Passed**: [Number] ✅
- **Failed**: [Number] ❌
- **Skipped**: [Number] ⏭️
- **Success Rate**: [Percentage]%

## Critical Issues Found
1. [Issue Description] - Priority: [P1/P2/P3]
2. [Issue Description] - Priority: [P1/P2/P3]

## Integration Points Status
- Credits System: ✅ PASS / ⚠️ ISSUES / ❌ FAIL
- Image Generation: ✅ PASS / ⚠️ ISSUES / ❌ FAIL
- User Profile: ✅ PASS / ⚠️ ISSUES / ❌ FAIL
- Admin Dashboard: ✅ PASS / ⚠️ ISSUES / ❌ FAIL
- Payment Integration: ✅ PASS / ⚠️ ISSUES / ❌ FAIL
- Session Management: ✅ PASS / ⚠️ ISSUES / ❌ FAIL

## Recommendations
1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

## Sign-off
**QA Engineer**: _________________ Date: _______
**Product Owner**: _______________ Date: _______
```

---

## 13. Continuous Integration Setup

### CI Pipeline Integration Tests
```yaml
# .github/workflows/integration-tests.yml
name: Authentication Integration Tests

on:
  pull_request:
    paths:
      - 'services/authService.ts'
      - 'services/creditsService.ts'
      - 'hooks/useAuth.ts'

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Setup test database
        run: |
          npm run db:setup:test
          npm run db:migrate:test
          
      - name: Run integration tests
        run: npm run test:integration
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_TEST_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_TEST_KEY }}
          
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: integration-test-results
          path: test-results/
```

---

*Document Version: 1.0*
*Last Updated: [Current Date]*
*Next Review: [Review Date + 2 weeks]*