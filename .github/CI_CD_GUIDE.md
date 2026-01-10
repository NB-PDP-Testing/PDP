# CI/CD Pipeline Guide

This project uses a comprehensive CI/CD pipeline to ensure code quality, security, and reliability.

## 🔄 Workflows

### 1. **CI Pipeline** (`ci.yml`)

Runs on every push and pull request to `main`.

**Jobs:**

- ✅ **TypeScript Type Check** - Validates all TypeScript types
- ✅ **Linting** - Runs Biome linter for code quality
- ✅ **Build Check** - Ensures production build succeeds
- 🔒 **Security Scan** - Checks for known vulnerabilities
- 📦 **Bundle Size Check** - Monitors JavaScript bundle size
- 🗄️ **Convex Schema Validation** - Validates database schema

### 2. **Dependency Updates** (`dependency-updates.yml`)

Runs weekly on Mondays at 9 AM UTC.

**Features:**

- 📊 Reports outdated packages
- 🔒 Security audit for dependencies
- 📝 Creates summary in GitHub Actions

### 3. **Dependabot** (`dependabot.yml`)

Automatically creates PRs for dependency updates.

**Configuration:**

- Runs weekly on Mondays
- Maximum 10 open PRs at once
- Auto-labels with `dependencies`
- Checks both npm packages and GitHub Actions

### 4. **PR Preview** (`pr-preview.yml`)

Runs on pull request events.

**Features:**

- 💬 Automated PR comments with deployment info
- 📊 Code quality report on each PR
- 📈 Tracks files changed

## 🛡️ Protection Layers

### Layer 1: Local Development

```bash
# Pre-commit hook runs automatically
git commit -m "your changes"
```

### Layer 2: Manual Validation

```bash
npm run validate      # Type check + linting
npm run check-types   # TypeScript only
npm run check         # Linting only
```

### Layer 3: GitHub Actions

- Runs on every push
- Validates types, linting, build
- Security scanning
- Bundle analysis

### Layer 4: Vercel Deployment

- Production build
- Environment variables validated
- Preview deployments for PRs

## 📋 What Gets Checked

| Check         | When                   | Blocks Merge?   |
| ------------- | ---------------------- | --------------- |
| Type Checking | Every commit, push, PR | ✅ Yes          |
| Linting       | Every commit, push, PR | ✅ Yes          |
| Build         | Every push, PR         | ✅ Yes          |
| Security Scan | Every push, PR         | ⚠️ Warning only |
| Bundle Size   | Every PR               | ℹ️ Info only    |
| Dependencies  | Weekly                 | ℹ️ Info only    |

## 🔧 Configuration Files

- `.github/workflows/ci.yml` - Main CI pipeline
- `.github/workflows/dependency-updates.yml` - Dependency monitoring
- `.github/workflows/pr-preview.yml` - PR automation
- `.github/dependabot.yml` - Automated dependency PRs
- `.git/hooks/pre-commit` - Local git hook
- `turbo.json` - Turborepo configuration with env vars

## 🚀 Adding More Checks

### Testing (When you add tests)

```yaml
- name: Run tests
  run: npm test
```

### E2E Testing

```yaml
- name: Run Playwright tests
  run: npx playwright test
```

### Lighthouse Performance

```yaml
- name: Lighthouse CI
  run: npx lighthouse-ci autorun
```

## 📊 Viewing Results

### GitHub Actions Tab

- Go to your repository → Actions tab
- View all workflow runs
- See detailed logs for each job

### PR Checks

- Each PR shows check status
- Click "Details" to view logs
- Must pass before merging

### Local Pre-commit

```bash
# If check fails:
🔍 Running type check before commit...
❌ Type check failed. Please fix errors before committing.

# If check passes:
🔍 Running type check before commit...
✅ Type check passed!
```

## 🎯 Best Practices

1. **Always run `npm run validate` before pushing**
2. **Don't skip pre-commit hooks** (they catch errors early)
3. **Review Dependabot PRs weekly** (keep dependencies updated)
4. **Check CI results** on all PRs before merging
5. **Fix security vulnerabilities** when reported

## 🧪 UAT Testing with Playwright

The UAT (User Acceptance Testing) suite uses Playwright to test the application from a user's perspective with pre-authenticated sessions.

### UAT Test Structure

```
apps/web/uat/
├── playwright.config.ts      # Configuration
├── global-setup.ts           # Creates auth states
├── test-data.json            # Test user credentials
├── fixtures/
│   └── test-fixtures.ts      # Authenticated page fixtures
└── tests/
    ├── auth/                 # Login, signup tests
    ├── admin/                # Admin dashboard tests
    ├── coach/                # Coach feature tests
    ├── flows/                # Flow system tests
    ├── player/               # Player passport tests
    ├── parent/               # Parent dashboard tests
    └── org/                  # Organization tests
```

### Running UAT Tests Locally

```bash
cd apps/web

# Run all UAT tests
npm run test

# Run specific category
npm run test:auth
npm run test:admin
npm run test:coach
npm run test:flows

# Run with UI
npm run test:ui

# View report
npm run test:report
```

### Enabling UAT in CI/CD Pipeline

The UAT workflow (`.github/workflows/uat-tests.yml`) is disabled by default. To enable it:

#### Step 1: Configure GitHub Secrets

Go to **Repository → Settings → Secrets and variables → Actions** and add:

| Secret                   | Description              | Example                          |
| ------------------------ | ------------------------ | -------------------------------- |
| `PLAYWRIGHT_BASE_URL`    | Your staging/preview URL | `https://pdp-staging.vercel.app` |
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL    | `https://xxx.convex.cloud`       |
| `TEST_OWNER_EMAIL`       | Platform owner email     | `owner_pdp@outlook.com`          |
| `TEST_OWNER_PASSWORD`    | Platform owner password  | `Password123!`                   |
| `TEST_ADMIN_EMAIL`       | Org admin email          | `adm1n_pdp@outlook.com`          |
| `TEST_ADMIN_PASSWORD`    | Org admin password       | `Password123!`                   |
| `TEST_COACH_EMAIL`       | Coach email              | `coach_pdp@outlook.com`          |
| `TEST_COACH_PASSWORD`    | Coach password           | `Password123!`                   |
| `TEST_PARENT_EMAIL`      | Parent email             | `parent_pdp@outlook.com`         |
| `TEST_PARENT_PASSWORD`   | Parent password          | `Password123!`                   |

#### Step 2: Ensure Test Users Exist

Run the onboarding setup script on your staging database:

```bash
cd apps/web
npm run test:setup -- --headed
```

This creates all necessary test accounts, organizations, and data.

#### Step 3: Enable the Workflow

Edit `.github/workflows/uat-tests.yml` and remove the `if: false` line from the `uat-tests` job:

```yaml
jobs:
  uat-tests:
    name: Playwright UAT Tests
    runs-on: ubuntu-latest
    timeout-minutes: 45
    # Remove this line to enable:
    # if: false
```

#### Step 4: Choose Trigger Mode

**Option A: Run on all PRs and pushes (default)**

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

**Option B: Manual trigger only**

```yaml
on:
  workflow_dispatch:
```

**Option C: Run on specific paths**

```yaml
on:
  push:
    branches: [main]
    paths:
      - "apps/web/src/**"
      - "apps/web/uat/**"
```

### Manual UAT Test Runs

You can trigger UAT tests manually from GitHub Actions:

1. Go to **Actions** tab
2. Select **UAT Tests** workflow
3. Click **Run workflow**
4. Optionally select a test category (auth, admin, coach, etc.)
5. Click **Run workflow**

### Viewing UAT Results

After each run:

- **Playwright Report**: Download from workflow artifacts
- **Test Summary**: View in GitHub Actions job summary
- **Screenshots**: Available on test failures

### UAT Test Coverage

| Category  | Tests    | Description                            |
| --------- | -------- | -------------------------------------- |
| auth      | ~20      | Login, signup, SSO, session management |
| admin     | ~56      | Dashboard, navigation, teams, users    |
| coach     | ~29      | Assessment, voice notes, injuries      |
| flows     | ~16      | Flow wizard, announcements             |
| player    | ~17      | Passport viewing, self-access          |
| parent    | ~10      | Child management                       |
| org       | ~20      | Dashboard, announcements               |
| **Total** | **~168** |                                        |

---

## 🔮 Future Enhancements

Consider adding:

- [ ] Unit tests with Jest/Vitest
- [x] E2E tests with Playwright ✅ (UAT Suite)
- [ ] Visual regression testing
- [ ] Performance monitoring
- [ ] Code coverage reports
- [ ] Automated changelog generation
- [ ] Semantic versioning and releases
