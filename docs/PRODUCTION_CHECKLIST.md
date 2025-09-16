# Production Deployment Checklist
## AI Wedding Portrait Generator - Pre-Launch Verification

Complete this checklist before deploying to production with real payments.

## 🔐 Security & Environment Setup

### Environment Variables
- [ ] All production API keys are set (Gemini, Supabase, Stripe)
- [ ] Stripe keys are LIVE keys (pk_live_, sk_live_), not test keys
- [ ] Webhook secrets are correctly configured
- [ ] No test/development keys in production environment
- [ ] `.env` files are not committed to version control
- [ ] Production domain is set in `VITE_APP_URL`

### Supabase Configuration
- [ ] Production Supabase project is created
- [ ] Database migrations are deployed to production
- [ ] Row Level Security (RLS) is enabled on all tables
- [ ] Service role key is secured and not exposed
- [ ] Edge functions are deployed with correct secrets
- [ ] API rate limits are configured appropriately

### Stripe Configuration
- [ ] Production Stripe account is fully verified
- [ ] Business verification is complete
- [ ] Tax settings are configured
- [ ] Payout methods are set up
- [ ] Products and prices are created in live mode
- [ ] Webhook endpoint is configured with correct URL
- [ ] Webhook events include all required types
- [ ] Webhook signing secret is set in Supabase

## 💳 Payment System Verification

### Stripe Products & Pricing
- [ ] Starter Pack ($4.99, 10 credits) is created
- [ ] Wedding Pack ($9.99, 25 credits) is created  
- [ ] Party Pack ($24.99, 75 credits) is created
- [ ] Price IDs in code match Stripe Dashboard
- [ ] Credit amounts match between Stripe and code
- [ ] All prices are in correct currency (USD)

### Webhook Testing
- [ ] Webhook endpoint responds to health checks
- [ ] `checkout.session.completed` events are processed
- [ ] `payment_intent.succeeded` events are logged
- [ ] `payment_intent.payment_failed` events are handled
- [ ] Credits are added correctly after successful payments
- [ ] Webhook events are deduplicated properly
- [ ] Failed webhook deliveries are retried by Stripe

### Payment Flow Testing
- [ ] Test successful payment with Stripe test card
- [ ] Test declined payment handling
- [ ] Test payment requiring authentication (3D Secure)
- [ ] Verify credits are added immediately after payment
- [ ] Test user can generate images with purchased credits
- [ ] Verify payment receipts/confirmations work

## 🎨 Core Functionality

### Image Generation
- [ ] Gemini API integration works in production
- [ ] All wedding themes generate correctly
- [ ] Image quality is consistent
- [ ] Generation time is acceptable (<30 seconds)
- [ ] Error handling works for API failures
- [ ] Rate limiting prevents abuse

### Credit System
- [ ] Daily free credits reset correctly at midnight
- [ ] Paid credits are consumed before free credits
- [ ] Credit balance displays correctly
- [ ] Credit transactions are logged properly
- [ ] Users cannot generate with 0 credits
- [ ] Credit refunds work if needed

### User Authentication
- [ ] User registration works
- [ ] Login/logout functions properly
- [ ] Password reset works
- [ ] User sessions persist correctly
- [ ] User data is secure and private

## 🚀 Infrastructure & Performance

### Frontend Deployment
- [ ] Build process completes without errors
- [ ] Static assets are optimized and compressed
- [ ] CDN is configured for static assets
- [ ] HTTPS is enforced
- [ ] Domain SSL certificate is valid
- [ ] Redirects from HTTP to HTTPS work

### Backend Services
- [ ] Supabase edge functions are responsive
- [ ] Database queries are optimized
- [ ] API response times are acceptable
- [ ] Connection pooling is configured
- [ ] Backup strategy is in place

### Monitoring & Logging
- [ ] Application logging is configured
- [ ] Error tracking is set up (Sentry, etc.)
- [ ] Performance monitoring is active
- [ ] Uptime monitoring is configured
- [ ] Alert notifications are set up
- [ ] Analytics tracking works (PostHog)

## 🧪 Testing & Quality Assurance

### End-to-End Testing
- [ ] Complete user journey tested (signup → purchase → generate)
- [ ] Mobile responsiveness verified
- [ ] Cross-browser compatibility tested
- [ ] Payment flow tested on different devices
- [ ] Error states display properly
- [ ] Loading states work correctly

### Edge Cases
- [ ] Handle network failures gracefully
- [ ] Test with very large/small images
- [ ] Verify rate limiting works
- [ ] Test concurrent user sessions
- [ ] Handle Stripe webhook failures
- [ ] Test credit refund scenarios

### Security Testing
- [ ] No sensitive data exposed in frontend
- [ ] API endpoints require proper authentication
- [ ] SQL injection prevention verified
- [ ] XSS protection is active
- [ ] CSRF protection is implemented
- [ ] Rate limiting prevents abuse

## 📊 Business & Compliance

### Legal & Compliance
- [ ] Terms of Service are published
- [ ] Privacy Policy is published
- [ ] GDPR compliance is implemented (if applicable)
- [ ] Payment processing compliance (PCI DSS via Stripe)
- [ ] User data handling procedures documented

### Business Operations
- [ ] Customer support process defined
- [ ] Refund policy is documented
- [ ] Pricing strategy is finalized
- [ ] Marketing materials are ready
- [ ] Analytics goals are defined

## 🚨 Emergency Procedures

### Rollback Plan
- [ ] Previous stable version is tagged
- [ ] Database rollback procedure documented
- [ ] Rollback can be executed quickly
- [ ] Team knows escalation procedures

### Incident Response
- [ ] On-call rotation is defined
- [ ] Critical alerts are configured
- [ ] Emergency contacts are documented
- [ ] Communication plan for outages

## 📈 Post-Launch Monitoring (First 24 Hours)

### Immediate Monitoring
- [ ] Monitor webhook success rates
- [ ] Track payment success/failure rates
- [ ] Watch for error spikes in logs
- [ ] Monitor API response times
- [ ] Check user registration/login success
- [ ] Verify credit purchases work correctly

### Metrics to Track
- [ ] Payment conversion rate
- [ ] Image generation success rate
- [ ] User session duration
- [ ] Credit purchase amounts
- [ ] Error rates by endpoint
- [ ] Performance metrics

## ✅ Final Sign-Off

### Team Approvals
- [ ] **Developer**: Code review complete, all tests pass
- [ ] **DevOps**: Infrastructure is production-ready
- [ ] **QA**: All test cases pass, no critical bugs
- [ ] **Product**: Feature requirements met
- [ ] **Business**: Pricing and legal requirements satisfied

### Go-Live Decision
- [ ] All checklist items completed
- [ ] Team is available for support during launch
- [ ] Rollback plan is tested and ready
- [ ] Monitoring systems are active
- [ ] Emergency procedures are documented

---

**🎯 Ready for Production**: All items checked and verified

**📅 Launch Date**: _______________

**👥 Launch Team**: _______________

**📞 Emergency Contact**: _______________

---

> **Note**: This checklist should be completed by the appropriate team members and signed off before production deployment. Keep a copy for future reference and post-mortems.