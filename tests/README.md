# Test Suite Documentation

## Overview

This directory contains comprehensive automated tests for the Kotokoto Town Outing Plan AI expansion project. All tests are designed to be executed by Claude with zero manual input.

## Test Structure

```
tests/
├── unit/                 # Unit tests (30% of pyramid)
│   └── auth.test.tsx     # Authentication & RBAC tests
├── integration/          # Integration tests (40% of pyramid)
│   ├── api-stores.test.ts        # Store CRUD & RLS policy tests
│   ├── api-likes-reviews.test.ts # Phase 2 feature tests
│   └── api-phase3.test.ts        # Phase 3 low-priority tests
├── e2e/                  # E2E tests (30% of pyramid)
│   ├── scenario-1-store-admin.spec.ts    # Store manager workflow
│   └── scenario-2-user-engagement.spec.ts # User features workflow
├── utils.tsx             # Test utilities & helpers
├── setup.ts              # Jest setup & mocks
└── README.md             # This file
```

## Test Coverage by Phase

### Phase 1: High Priority (MVP) - 60+ Test Cases
**Features:**
- #17: DB Schema Design
- #18: Backend API Implementation (TC_18_1 to TC_18_5)
- #19: Frontend Admin UI
- #20: RBAC Schema Design (TC_20_1 to TC_20_3)
- #21: RLS Policy Implementation (TC_21_1, TC_21_2)
- #22: Frontend Permission Checks (TC_22_1, TC_22_2)
- #23: Map Coordinate UI (TC_23_1)
- #24: Email Delivery Foundation
- #25: Scheduled Email & Button Links (TC_25_1)
- #26: Real-time Crowd Display (TC_26_1)

**Test Files:**
- `unit/auth.test.tsx` - Authentication & role validation
- `integration/api-stores.test.ts` - Store CRUD operations
- `e2e/scenario-1-store-admin.spec.ts` - Store manager workflows

### Phase 2: Medium Priority - 30+ Test Cases
**Features:**
- #27: Likes & Reviews DB & API (TC_27_1-3)
- #28: Likes UI Implementation
- #29: Reviews DB & API (TC_29_1-4)
- #30: Reviews UI Implementation
- #31: Crowd Analytics Batch & API (TC_31_1-2)
- #32: Crowd Analytics Dashboard
- #33: Reservation DB & API (TC_33_1-3)
- #34: Reservation UI

**Test Files:**
- `integration/api-likes-reviews.test.ts` - Likes, reviews, analytics, reservations
- `e2e/scenario-2-user-engagement.spec.ts` - User engagement workflows

### Phase 3: Low Priority - 15+ Test Cases
**Features:**
- #35: Store Media Attachment DB & API (TC_301_1-4)
- #36: Store Media Attachment UI (TC_302_1-4)
- #37: Error Management DB & API (TC_303_1-4)
- #38: Error Management Dashboard (TC_304_1-5)

**Test Files:**
- `integration/api-phase3.test.ts` - Media & error management tests

## Running Tests

### All Tests
```bash
npm run test:all
```

### Unit Tests Only
```bash
npm run test
```

### Unit Tests with Coverage
```bash
npm run test:coverage
```

### E2E Tests Only
```bash
npm run test:e2e
```

### Watch Mode (for development)
```bash
npm run test:watch
```

## Test Execution Strategy

### Automated Test Workflow
1. **Setup** - Jest environment initializes with mocks
2. **Execution** - All test suites run in parallel
3. **Diagnosis** - Failed tests trigger auto-diagnosis
4. **Reporting** - Results aggregated and analyzed
5. **Cleanup** - Test environment cleaned

## Test Coverage Requirements

**Target: ≥ 80% code coverage**

Coverage includes:
- Lines: 80%+
- Functions: 80%+
- Branches: 70%+
- Statements: 80%+

Current coverage tracked per phase:
- Phase 1: Target 85% (MVP critical)
- Phase 2: Target 80% (core features)
- Phase 3: Target 75% (extension features)

## Test Data & Fixtures

### Test Users (utils.tsx)
```typescript
testData.user.admin         // yoshizawa@ai-hackason.example
testData.user.storeManager  // satoh@ai-hackason.example
testData.user.regularUser   // itagaki@ai-hackason.example
```

### Test Stores
```typescript
testData.store.sample       // store-001
```

### Test Data Generators
- `testData.*` - Common test fixtures
- `renderWithAuth()` - Render React component with auth context
- `mockApiResponse()` - Mock successful API response
- `mockApiError()` - Mock API error

## E2E Test Scenarios

### Scenario 1: Store Manager Crowd Updates (TC_25_1)
- Login as store manager
- Receive 30-minute email notification
- Click crowd status button via email link
- Verify real-time update on dashboard
- Validate JWT token in email link

### Scenario 2: User Engagement (TC_28_1)
- Login as regular user
- Like a store
- Write review with rating
- See average rating for stores

### Scenario 3: Crowd Analytics (TC_32_1)
- Login as admin
- Navigate to analytics dashboard
- View crowd distribution charts
- Identify peak hours
- Export data as CSV

### Scenario 4: User Reservation (TC_34_1)
- Login as regular user
- Search stores
- Make reservation
- Validate party size restrictions
- Prevent booking past dates

## Mocking Strategy

### Supabase Mocks (setup.ts)
```typescript
supabase.auth.*              // Auth operations
supabase.from('table').*     // Database queries
supabase.storage.*           // File uploads
```

### Browser APIs
```typescript
localStorage                 // Session persistence
window.matchMedia           // Responsive design
```

### Module Mocks
```typescript
jest.mock('../src/lib/supabase')  // Database client
```

## CI/CD Integration

### GitHub Actions
- Runs on every push and PR
- Timeout: 10 minutes
- Parallel execution: 4 workers
- Reports coverage to GitHub

### Test Execution Flow
```
Event: Push/PR
  ↓
npm install
  ↓
npm run test (unit)
  ↓
npm run test:e2e (if passed)
  ↓
Generate coverage report
  ↓
Report results to GitHub
```

## Debugging Tests

### Run Single Test File
```bash
npm test -- api-stores.test.ts
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="TC_18_1"
```

### Debug Mode
```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

### View Coverage Report
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Performance Targets

- **Unit test suite**: < 30 seconds
- **Integration test suite**: < 20 seconds
- **E2E test suite**: < 25 seconds
- **Total test execution**: < 75 seconds
- **API response time**: < 5 seconds (mocked)

## Known Limitations

1. **API Responses Mocked** - Uses mock data, not real Supabase
2. **File Uploads** - Simulated, no actual file I/O
3. **Email Sending** - Mocked, not sent to real mailbox
4. **Real-time Subscriptions** - Simulated, no actual WebSocket
5. **Payments** - Not tested (on-site only)

## Next Steps

1. **Add Frontend Components** - Build React components tested in E2E
2. **Database Migrations** - Run `002_create_new_features_schema.sql`
3. **Deploy to Supabase** - Replace mock queries with real client
4. **Monitor Coverage** - Maintain ≥80% coverage during development

## Resources

- **Test Config**: `jest.config.ts`, `playwright.config.ts`
- **Test Utilities**: `tests/utils.tsx`, `tests/setup.ts`
- **Database Schema**: `docs/database/002_create_new_features_schema.sql`
- **Issue Details**: GitHub Issues #17-38

## Support

For test failures:
1. Review test case documentation in the issue
2. Check `tests/utils.tsx` for available test utilities
3. Debug with: `npm test -- --verbose --no-coverage`
