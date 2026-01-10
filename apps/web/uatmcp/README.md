# PlayerARC UAT MCP Tests

Comprehensive User Acceptance Testing suite for PlayerARC using Playwright.

## Overview

This test suite validates all major user journeys and functionality of the PlayerARC application based on the gaps identified in `docs/testing/UAT_MCP_TESTS.MD`.

## Test Structure

```
uatmcp/
├── README.md              # This file
├── test-data.json         # Test data configuration
├── playwright.config.ts   # Playwright configuration
├── tests/
│   ├── auth/             # Authentication tests
│   │   ├── login.spec.ts
│   │   ├── signup.spec.ts
│   │   └── password-reset.spec.ts
│   ├── admin/            # Admin dashboard tests
│   │   ├── dashboard.spec.ts
│   │   ├── players.spec.ts
│   │   ├── teams.spec.ts
│   │   ├── users.spec.ts
│   │   ├── benchmarks.spec.ts
│   │   ├── analytics.spec.ts
│   │   └── settings.spec.ts
│   ├── coach/            # Coach features tests
│   │   ├── dashboard.spec.ts
│   │   └── players.spec.ts
│   ├── parent/           # Parent dashboard tests
│   │   └── dashboard.spec.ts
│   ├── org/              # Organization tests
│   │   ├── create.spec.ts
│   │   └── join.spec.ts
│   └── e2e/              # End-to-end flow tests
│       ├── onboarding.spec.ts
│       └── player-development.spec.ts
├── fixtures/
│   └── test-fixtures.ts  # Shared test fixtures
└── utils/
    ├── auth.ts           # Authentication helpers
    └── helpers.ts        # General test helpers
```

## Test Categories

| Category | Test ID Prefix | Description              |
| -------- | -------------- | ------------------------ |
| AUTH     | AUTH-xxx       | Authentication flows     |
| ADMIN    | ADMIN-xxx      | Admin dashboard features |
| COACH    | COACH-xxx      | Coach features           |
| PARENT   | PARENT-xxx     | Parent dashboard         |
| ORG      | ORG-xxx        | Organization management  |
| E2E      | E2E-xxx        | End-to-end flows         |
| HOME     | HOME-xxx       | Homepage tests           |

## Running Tests

```bash
# Run all tests
npx playwright test --config=apps/web/uatmcp/playwright.config.ts

# Run specific category
npx playwright test --config=apps/web/uatmcp/playwright.config.ts tests/auth/

# Run with UI mode
npx playwright test --config=apps/web/uatmcp/playwright.config.ts --ui

# Run headed (visible browser)
npx playwright test --config=apps/web/uatmcp/playwright.config.ts --headed
```

## Test Data

All test accounts and data are defined in `test-data.json`. Key accounts:

| Role   | Email                  | Description                     |
| ------ | ---------------------- | ------------------------------- |
| Owner  | owner_pdp@outlook.com  | Platform staff with full access |
| Admin  | adm1n_pdp@outlook.com  | Organization administrator      |
| Coach  | coach_pdp@outlook.com  | Team coach                      |
| Parent | parent_pdp@outlook.com | Player guardian                 |

## Prerequisites

1. Development server running on `http://localhost:3000`
2. Database seeded with test data
3. Playwright browsers installed (`npx playwright install`)

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Clear Naming**: Test IDs follow the convention `CATEGORY-NNN: Description`
3. **Data-Driven**: Test data comes from `test-data.json`
4. **Page Objects**: Use page object patterns for maintainability
5. **Assertions**: Clear assertions with descriptive error messages

## Coverage Mapping

Tests are mapped to requirements in `docs/testing/UAT_MCP_TESTS.MD`.
