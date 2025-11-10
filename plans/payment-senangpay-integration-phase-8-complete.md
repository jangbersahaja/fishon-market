# Phase 8 Complete: Testing Documentation

Successfully created comprehensive testing documentation and guides for end-to-end Senang Pay integration testing.

**Files created:**

- docs/SENANGPAY_TESTING_GUIDE.md (comprehensive, 600+ lines)
- docs/SENANGPAY_TESTING_QUICKSTART.md (quick reference, 180 lines)

---

## Summary

Phase 8 provides complete testing documentation for validating the Senang Pay integration with real payment gateway using ngrok for local webhook testing.

### Documentation Created

#### 1. Comprehensive Testing Guide (`SENANGPAY_TESTING_GUIDE.md`)

**Sections:**

- Prerequisites (ngrok setup, environment variables)
- Testing Setup (3 steps: dev server, ngrok, Senang Pay config)
- 9 Test Scenarios with detailed steps
- Monitoring & Debugging guide
- Troubleshooting common issues
- Security verification checklist
- After-testing cleanup procedures

**Test Scenarios Covered:**

1. ✅ Successful Payment Flow (happy path)
2. ✅ Failed Payment Flow (graceful handling)
3. ✅ Hash Tampering Detection (security)
4. ✅ Idempotency (duplicate callbacks)
5. ✅ Race Condition (return vs callback timing)
6. ✅ Missing Parameters (validation)
7. ✅ Gateway Configuration Check (missing env)
8. ✅ Guest Booking Payment (no user account)
9. ✅ Concurrent Bookings (availability check)

**Each scenario includes:**

- Objective
- Step-by-step instructions
- Expected log messages
- Database verification queries
- Expected results

#### 2. Quick Start Guide (`SENANGPAY_TESTING_QUICKSTART.md`)

**Fast Setup Section:**

- 3-step setup (dev server, ngrok, Senang Pay config)
- Takes 5 minutes to start testing

**Essential Tests Section:**

- 4 core tests covering 80% of use cases
- Takes 30 minutes to complete
- Each test includes expected logs and outcomes

**Log Monitoring Section:**

- Key success indicators to watch for
- Error indicators to catch issues
- Copy-pasteable log patterns

**Quick Troubleshooting:**

- Common issues with immediate solutions
- No need to search through long guide

**Test Checklist:**

- Simple checkboxes for completion tracking
- Ensures readiness for Phase 9 (production)

---

## Senang Pay Dashboard Configuration

### Production URLs (After Testing)

```
Return URL: https://www.fishon.my/book/payment/return
Callback URL: https://www.fishon.my/api/payment/senangpay-callback
Parameters: (Leave empty - use Senang Pay defaults)
Refund URL: (Leave empty - not implemented yet)
```

### Testing URLs (Temporary)

```
Return URL: https://YOUR_NGROK_ID.ngrok-free.app/book/payment/return
Callback URL: https://YOUR_NGROK_ID.ngrok-free.app/api/payment/senangpay-callback
```

**Important**: Revert to production URLs after testing!

---

## Testing Workflow

### Quick Start (Recommended)

1. Follow `SENANGPAY_TESTING_QUICKSTART.md`
2. Complete 4 essential tests (30 min)
3. Check off test checklist
4. Revert Senang Pay config to production
5. Ready for Phase 9

### Comprehensive Testing (Optional)

1. Follow `SENANGPAY_TESTING_GUIDE.md`
2. Complete all 9 test scenarios (2-3 hours)
3. Document test results
4. Complete security verification checklist
5. Ready for Phase 9

---

## Key Testing Points

### Security Validation

- ✅ Hash verification prevents tampering
- ✅ No payment bypass (mock only with force flag)
- ✅ Authorization checks (user owns booking)
- ✅ Availability checks prevent race conditions
- ✅ All payment attempts logged for audit

### Functional Validation

- ✅ Successful payments update booking to PAID
- ✅ Failed payments allow retry
- ✅ Duplicate callbacks handled (idempotent)
- ✅ Both handlers work (return + callback)
- ✅ Guest bookings supported
- ✅ Side effects trigger (webhook, notification)

### Error Handling

- ✅ Missing parameters rejected
- ✅ Invalid hash detected
- ✅ Missing config shows clear error
- ✅ Concurrent bookings prevented
- ✅ All errors logged with context

---

## Tools & Resources

### Required Tools

- **ngrok** - Expose local webhooks to Senang Pay
  - Install: `brew install ngrok`
  - Free tier: sufficient for testing
  - Web inspector: http://127.0.0.1:4040

### Environment Variables

```bash
# Required for testing
SENANGPAY_MERCHANT_ID=your_merchant_id
SENANGPAY_SECRET_KEY=your_secret_key
SENANGPAY_MODE=production

# Do NOT set during testing
# SENANGPAY_FORCE_MOCK=1

# Optional (for side effects testing)
CAPTAIN_WEBHOOK_URL=https://captain.fishon.my/api/webhooks/market
CAPTAIN_API_SECRET=your_secret
```

### Monitoring Tools

- Dev server terminal (payment logs)
- ngrok terminal (HTTP traffic)
- ngrok web inspector (detailed requests)
- Database client (verify updates)
- Captain app dashboard (webhook confirmation)

---

## Troubleshooting Reference

### Common Issues

**Issue: ngrok URL not working**

- Solution: Check ngrok is running, verify HTTPS URL, update Senang Pay config

**Issue: Callback not received**

- Solution: Check ngrok inspector (http://127.0.0.1:4040), verify callback URL in Senang Pay

**Issue: Hash verification fails**

- Solution: Verify SECRET_KEY and MERCHANT_ID match Senang Pay dashboard

**Issue: Mock payment shows**

- Solution: Remove SENANGPAY_FORCE_MOCK, ensure merchant ID/secret set, restart server

**Issue: Side effects not triggering**

- Solution: Check CAPTAIN_WEBHOOK_URL set, verify captain app reachable

See `SENANGPAY_TESTING_GUIDE.md` for complete troubleshooting section.

---

## Next Steps

### Immediate Actions

1. **Install ngrok**: `brew install ngrok`
2. **Configure ngrok**: Add auth token from https://dashboard.ngrok.com
3. **Review Quick Start**: Read `SENANGPAY_TESTING_QUICKSTART.md`
4. **Run Essential Tests**: Complete 4 core tests (30 min)
5. **Verify Checklist**: Ensure all tests pass

### Before Phase 9

- [ ] All essential tests passing
- [ ] Security verification complete
- [ ] Test results documented
- [ ] Senang Pay config reverted to production URLs
- [ ] ngrok stopped

### Phase 9 Preview

- Deploy to Vercel production
- Verify production environment variables
- Test one small real payment (RM 1.00)
- Monitor first few production payments
- Set up error alerting

---

## Documentation Quality

### Comprehensive Guide

- **Length**: 600+ lines
- **Detail Level**: Step-by-step with logs and SQL queries
- **Coverage**: 9 complete test scenarios
- **Time**: 2-3 hours to complete all tests
- **Audience**: Thorough testing for production readiness

### Quick Start Guide

- **Length**: 180 lines
- **Detail Level**: Essential steps only
- **Coverage**: 4 core test scenarios
- **Time**: 30 minutes to complete
- **Audience**: Fast validation before deployment

Both guides complement each other:

- Start with Quick Start for fast validation
- Use Comprehensive Guide for thorough testing
- Refer to Troubleshooting as needed

---

**Review Status:** APPROVED - Complete testing documentation ready for Phase 8 execution

**Git Commit Message:**
docs: add comprehensive Senang Pay testing guides

- Create SENANGPAY_TESTING_GUIDE.md (600+ lines comprehensive guide)
- Create SENANGPAY_TESTING_QUICKSTART.md (180 lines quick reference)
- Cover 9 test scenarios: success, failure, security, idempotency, race conditions
- Include ngrok setup and Senang Pay dashboard configuration
- Add log monitoring patterns and troubleshooting guide
- Provide test checklists for production readiness
- Document production vs testing URL configuration
- Include security verification checklist
