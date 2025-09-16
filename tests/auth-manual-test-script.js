/**
 * Authentication Manual Testing Script
 * 
 * This script provides automated testing helpers for manual QA testing
 * Run in browser console during manual testing sessions
 * 
 * Usage:
 * 1. Open browser dev tools
 * 2. Navigate to the application
 * 3. Copy and paste this script into console
 * 4. Run individual test functions
 */

window.AuthTestSuite = {
  // Test configuration
  config: {
    testEmail: 'qa.test@example.com',
    testPassword: 'TestPassword123!',
    adminEmail: 'admin@example.com',
    invalidEmails: [
      'invalid-email',
      'test@',
      '@example.com',
      'test..test@example.com',
      'test@.com'
    ],
    weakPasswords: [
      '123',
      'password',
      'admin',
      'test',
      'abc',
      'qwerty'
    ],
    sqlInjectionPayloads: [
      "'; DROP TABLE users; --",
      "' OR '1'='1' --",
      "admin'--",
      "' UNION SELECT * FROM users --"
    ],
    xssPayloads: [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>'
    ]
  },

  // Utility functions
  utils: {
    log: function(message, type = 'info') {
      const timestamp = new Date().toISOString();
      const prefix = `[AUTH-TEST ${timestamp}]`;
      
      switch(type) {
        case 'error':
          console.error(`${prefix} ❌ ${message}`);
          break;
        case 'success':
          console.log(`${prefix} ✅ ${message}`);
          break;
        case 'warning':
          console.warn(`${prefix} ⚠️ ${message}`);
          break;
        default:
          console.log(`${prefix} ℹ️ ${message}`);
      }
    },

    sleep: function(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    waitForElement: function(selector, timeout = 5000) {
      return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }

        const observer = new MutationObserver(() => {
          const element = document.querySelector(selector);
          if (element) {
            observer.disconnect();
            resolve(element);
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });

        setTimeout(() => {
          observer.disconnect();
          reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
      });
    },

    fillInput: function(selector, value) {
      const input = document.querySelector(selector);
      if (input) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    },

    clickButton: function(selector) {
      const button = document.querySelector(selector);
      if (button) {
        button.click();
        return true;
      }
      return false;
    }
  },

  // Authentication state helpers
  auth: {
    getCurrentUser: function() {
      try {
        // Check if authService is available
        if (window.authService) {
          return window.authService.getCurrentUser();
        }
        
        // Fallback to localStorage inspection
        const keys = Object.keys(localStorage);
        const authKeys = keys.filter(key => key.includes('supabase') || key.includes('auth'));
        
        this.utils.log(`Found auth keys: ${authKeys.join(', ')}`);
        return null;
      } catch (error) {
        this.utils.log(`Error getting current user: ${error.message}`, 'error');
        return null;
      }
    }.bind(this),

    getSessionInfo: function() {
      try {
        const sessionData = localStorage.getItem('supabase.auth.token');
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          this.utils.log(`Session expires at: ${new Date(parsed.expires_at * 1000)}`);
          return parsed;
        }
        this.utils.log('No session found in localStorage');
        return null;
      } catch (error) {
        this.utils.log(`Error parsing session: ${error.message}`, 'error');
        return null;
      }
    }.bind(this),

    clearAuthState: function() {
      const keys = Object.keys(localStorage);
      const authKeys = keys.filter(key => 
        key.includes('supabase') || 
        key.includes('auth') || 
        key.includes('user')
      );
      
      authKeys.forEach(key => {
        localStorage.removeItem(key);
        this.utils.log(`Cleared: ${key}`);
      });
      
      this.utils.log('Auth state cleared', 'success');
    }.bind(this)
  },

  // Test functions for manual execution
  tests: {
    // Test login modal opening
    testLoginModalOpen: async function() {
      this.utils.log('Testing login modal opening...');
      
      try {
        // Look for login button or trigger
        const loginTriggers = [
          'button[data-testid="login-button"]',
          'button:contains("Sign In")',
          'button:contains("Login")',
          '.login-btn',
          '[aria-label*="login"]'
        ];

        let triggered = false;
        for (const selector of loginTriggers) {
          if (this.utils.clickButton(selector)) {
            triggered = true;
            break;
          }
        }

        if (!triggered) {
          this.utils.log('Could not find login trigger button', 'warning');
          return false;
        }

        // Wait for modal to appear
        await this.utils.waitForElement('[role="dialog"], .modal, .login-modal');
        this.utils.log('Login modal opened successfully', 'success');
        return true;

      } catch (error) {
        this.utils.log(`Login modal test failed: ${error.message}`, 'error');
        return false;
      }
    }.bind(this),

    // Test invalid email validation
    testInvalidEmailValidation: async function() {
      this.utils.log('Testing invalid email validation...');
      
      const results = [];
      
      for (const email of this.config.invalidEmails) {
        try {
          this.utils.log(`Testing email: ${email}`);
          
          // Fill email field
          if (!this.utils.fillInput('input[type="email"]', email)) {
            this.utils.log('Could not find email input field', 'warning');
            continue;
          }

          // Try to submit (should be prevented)
          this.utils.clickButton('button[type="submit"]');
          
          await this.utils.sleep(500);
          
          // Check for validation error
          const errorElement = document.querySelector('.error, .invalid, [role="alert"]');
          const hasError = errorElement && errorElement.textContent.trim() !== '';
          
          results.push({
            email,
            validated: hasError,
            errorMessage: hasError ? errorElement.textContent.trim() : null
          });

          this.utils.log(`Email ${email}: ${hasError ? 'BLOCKED ✅' : 'ALLOWED ❌'}`);
          
        } catch (error) {
          this.utils.log(`Error testing email ${email}: ${error.message}`, 'error');
        }
      }

      this.utils.log('Email validation test completed');
      console.table(results);
      return results;
    }.bind(this),

    // Test weak password rejection
    testWeakPasswordValidation: async function() {
      this.utils.log('Testing weak password validation...');
      
      const results = [];
      
      for (const password of this.config.weakPasswords) {
        try {
          this.utils.log(`Testing password: ${password}`);
          
          // Switch to signup mode if needed
          const signupButton = document.querySelector('button:contains("Sign up")');
          if (signupButton) {
            signupButton.click();
            await this.utils.sleep(300);
          }
          
          // Fill form fields
          this.utils.fillInput('input[type="email"]', this.config.testEmail);
          this.utils.fillInput('input[type="password"]', password);
          
          // Find confirm password field if it exists
          const confirmPasswordInput = document.querySelector('input[placeholder*="confirm" i]');
          if (confirmPasswordInput) {
            this.utils.fillInput('input[placeholder*="confirm" i]', password);
          }

          // Try to submit
          this.utils.clickButton('button[type="submit"]');
          
          await this.utils.sleep(500);
          
          // Check for validation error
          const errorElement = document.querySelector('.error, .invalid, [role="alert"]');
          const hasError = errorElement && errorElement.textContent.trim() !== '';
          
          results.push({
            password,
            rejected: hasError,
            errorMessage: hasError ? errorElement.textContent.trim() : null
          });

          this.utils.log(`Password ${password}: ${hasError ? 'REJECTED ✅' : 'ACCEPTED ❌'}`);
          
        } catch (error) {
          this.utils.log(`Error testing password ${password}: ${error.message}`, 'error');
        }
      }

      this.utils.log('Password validation test completed');
      console.table(results);
      return results;
    }.bind(this),

    // Test SQL injection protection
    testSQLInjectionProtection: async function() {
      this.utils.log('Testing SQL injection protection...');
      
      const results = [];
      
      for (const payload of this.config.sqlInjectionPayloads) {
        try {
          this.utils.log(`Testing payload: ${payload.substring(0, 30)}...`);
          
          // Fill email field with SQL injection payload
          this.utils.fillInput('input[type="email"]', payload);
          this.utils.fillInput('input[type="password"]', 'testpassword');

          // Submit form
          this.utils.clickButton('button[type="submit"]');
          
          await this.utils.sleep(1000);
          
          // Check for error handling (should not reveal database errors)
          const errorElement = document.querySelector('.error, .invalid, [role="alert"]');
          const errorMessage = errorElement ? errorElement.textContent.trim() : '';
          
          // Check if error message reveals database information
          const dangerousKeywords = ['sql', 'database', 'table', 'syntax', 'mysql', 'postgres'];
          const revealsDatabaseInfo = dangerousKeywords.some(keyword => 
            errorMessage.toLowerCase().includes(keyword)
          );
          
          results.push({
            payload: payload.substring(0, 50),
            errorRevealsDBInfo: revealsDatabaseInfo,
            errorMessage: errorMessage
          });

          this.utils.log(`Payload test: ${revealsDatabaseInfo ? 'VULNERABLE ❌' : 'PROTECTED ✅'}`);
          
        } catch (error) {
          this.utils.log(`Error testing SQL injection: ${error.message}`, 'error');
        }
      }

      this.utils.log('SQL injection test completed');
      console.table(results);
      return results;
    }.bind(this),

    // Test XSS protection
    testXSSProtection: async function() {
      this.utils.log('Testing XSS protection...');
      
      const results = [];
      let alertTriggered = false;
      
      // Override alert to detect XSS
      const originalAlert = window.alert;
      window.alert = function(msg) {
        alertTriggered = true;
        console.log('🚨 XSS ALERT TRIGGERED:', msg);
      };
      
      for (const payload of this.config.xssPayloads) {
        try {
          alertTriggered = false;
          this.utils.log(`Testing XSS payload: ${payload.substring(0, 30)}...`);
          
          // Test in email field
          this.utils.fillInput('input[type="email"]', payload);
          
          // Test in display name field if available
          const displayNameInput = document.querySelector('input[placeholder*="name" i]');
          if (displayNameInput) {
            this.utils.fillInput('input[placeholder*="name" i]', payload);
          }

          // Submit form
          this.utils.clickButton('button[type="submit"]');
          
          await this.utils.sleep(500);
          
          // Check if any script executed
          results.push({
            payload: payload.substring(0, 50),
            scriptExecuted: alertTriggered,
            protected: !alertTriggered
          });

          this.utils.log(`XSS test: ${alertTriggered ? 'VULNERABLE ❌' : 'PROTECTED ✅'}`);
          
        } catch (error) {
          this.utils.log(`Error testing XSS: ${error.message}`, 'error');
        }
      }

      // Restore original alert
      window.alert = originalAlert;
      
      this.utils.log('XSS protection test completed');
      console.table(results);
      return results;
    }.bind(this),

    // Test session persistence
    testSessionPersistence: async function() {
      this.utils.log('Testing session persistence...');
      
      try {
        const initialSession = this.auth.getSessionInfo();
        if (!initialSession) {
          this.utils.log('No active session found to test', 'warning');
          return false;
        }

        this.utils.log('Initial session found, refreshing page...');
        
        // Store current URL
        const currentUrl = window.location.href;
        
        // Refresh page
        window.location.reload();
        
        // Wait for page to load (this will interrupt execution)
        // Manual verification required: check if user remains logged in
        this.utils.log('Please verify manually: Is user still logged in after refresh?', 'warning');
        
        return true;
        
      } catch (error) {
        this.utils.log(`Session persistence test failed: ${error.message}`, 'error');
        return false;
      }
    }.bind(this),

    // Test Google OAuth button
    testGoogleOAuthButton: async function() {
      this.utils.log('Testing Google OAuth button...');
      
      try {
        // Look for Google sign-in button
        const googleButton = document.querySelector('button:contains("Google"), button[aria-label*="Google"], .google-signin-btn');
        
        if (!googleButton) {
          this.utils.log('Google OAuth button not found', 'warning');
          return false;
        }

        this.utils.log('Found Google OAuth button');
        
        // Check button text and styling
        const buttonText = googleButton.textContent.trim();
        this.utils.log(`Button text: "${buttonText}"`);
        
        // Check if button is enabled
        const isDisabled = googleButton.disabled || googleButton.getAttribute('aria-disabled') === 'true';
        this.utils.log(`Button enabled: ${!isDisabled}`);
        
        // Note: Don't actually click as it will redirect
        this.utils.log('Google OAuth button test completed (manual click test required)', 'success');
        
        return true;
        
      } catch (error) {
        this.utils.log(`Google OAuth button test failed: ${error.message}`, 'error');
        return false;
      }
    }.bind(this),

    // Test password reset flow
    testPasswordResetFlow: async function() {
      this.utils.log('Testing password reset flow...');
      
      try {
        // Look for "Forgot password" link
        const forgotPasswordLink = document.querySelector('button:contains("Forgot"), a:contains("Forgot"), [aria-label*="forgot"]');
        
        if (!forgotPasswordLink) {
          this.utils.log('Forgot password link not found', 'warning');
          return false;
        }

        // Click forgot password
        forgotPasswordLink.click();
        this.utils.log('Clicked forgot password link');
        
        await this.utils.sleep(500);
        
        // Check if reset form appeared
        const resetForm = document.querySelector('form, .reset-form, [data-testid="reset-form"]');
        if (!resetForm) {
          this.utils.log('Password reset form not found', 'error');
          return false;
        }

        this.utils.log('Password reset form displayed');
        
        // Fill email field
        const emailInput = resetForm.querySelector('input[type="email"]');
        if (emailInput) {
          this.utils.fillInput('input[type="email"]', this.config.testEmail);
          this.utils.log('Filled reset email field');
        }

        // Submit reset form
        const submitButton = resetForm.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.click();
          this.utils.log('Submitted password reset form');
          
          await this.utils.sleep(1000);
          
          // Check for success message
          const successElement = document.querySelector('.success, [role="status"], .confirmation');
          if (successElement) {
            this.utils.log('Password reset success message displayed', 'success');
            return true;
          }
        }

        return false;
        
      } catch (error) {
        this.utils.log(`Password reset test failed: ${error.message}`, 'error');
        return false;
      }
    }.bind(this)
  },

  // Run all security tests
  runSecurityTestSuite: async function() {
    this.utils.log('🔒 Starting Authentication Security Test Suite');
    
    const results = {
      emailValidation: null,
      passwordValidation: null,
      sqlInjection: null,
      xssProtection: null,
      overallScore: 0
    };

    try {
      // Test email validation
      results.emailValidation = await this.tests.testInvalidEmailValidation();
      
      // Test password validation  
      results.passwordValidation = await this.tests.testWeakPasswordValidation();
      
      // Test SQL injection protection
      results.sqlInjection = await this.tests.testSQLInjectionProtection();
      
      // Test XSS protection
      results.xssProtection = await this.tests.testXSSProtection();
      
      // Calculate overall security score
      let score = 0;
      
      if (results.emailValidation && results.emailValidation.every(r => r.validated)) score += 25;
      if (results.passwordValidation && results.passwordValidation.every(r => r.rejected)) score += 25;
      if (results.sqlInjection && results.sqlInjection.every(r => !r.errorRevealsDBInfo)) score += 25;
      if (results.xssProtection && results.xssProtection.every(r => r.protected)) score += 25;
      
      results.overallScore = score;
      
      this.utils.log(`🔒 Security Test Suite Completed - Score: ${score}/100`, score === 100 ? 'success' : 'warning');
      
      return results;
      
    } catch (error) {
      this.utils.log(`Security test suite failed: ${error.message}`, 'error');
      return results;
    }
  },

  // Helper to generate test report
  generateTestReport: function(results) {
    const report = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      results: results,
      recommendations: []
    };

    // Generate recommendations based on results
    if (results.emailValidation && !results.emailValidation.every(r => r.validated)) {
      report.recommendations.push('Improve email validation to reject invalid formats');
    }
    
    if (results.passwordValidation && !results.passwordValidation.every(r => r.rejected)) {
      report.recommendations.push('Strengthen password validation to reject weak passwords');
    }
    
    if (results.sqlInjection && results.sqlInjection.some(r => r.errorRevealsDBInfo)) {
      report.recommendations.push('Review error messages to prevent database information disclosure');
    }
    
    if (results.xssProtection && results.xssProtection.some(r => !r.protected)) {
      report.recommendations.push('CRITICAL: Fix XSS vulnerabilities immediately');
    }

    console.log('📋 Test Report Generated:');
    console.log(JSON.stringify(report, null, 2));
    
    return report;
  }
};

// Auto-run basic checks when script loads
console.log('🧪 Authentication Test Suite Loaded');
console.log('Available commands:');
console.log('- AuthTestSuite.tests.testLoginModalOpen()');
console.log('- AuthTestSuite.tests.testInvalidEmailValidation()');
console.log('- AuthTestSuite.tests.testWeakPasswordValidation()');
console.log('- AuthTestSuite.tests.testSQLInjectionProtection()');
console.log('- AuthTestSuite.tests.testXSSProtection()');
console.log('- AuthTestSuite.tests.testSessionPersistence()');
console.log('- AuthTestSuite.tests.testGoogleOAuthButton()');
console.log('- AuthTestSuite.tests.testPasswordResetFlow()');
console.log('- AuthTestSuite.runSecurityTestSuite()');
console.log('- AuthTestSuite.auth.getCurrentUser()');
console.log('- AuthTestSuite.auth.getSessionInfo()');
console.log('- AuthTestSuite.auth.clearAuthState()');

// Basic environment check
AuthTestSuite.utils.log('Checking authentication environment...');
AuthTestSuite.auth.getSessionInfo();
AuthTestSuite.utils.log('Ready for manual testing! 🚀');