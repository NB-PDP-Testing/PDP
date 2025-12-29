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

| Check | When | Blocks Merge? |
|-------|------|---------------|
| Type Checking | Every commit, push, PR | ✅ Yes |
| Linting | Every commit, push, PR | ✅ Yes |
| Build | Every push, PR | ✅ Yes |
| Security Scan | Every push, PR | ⚠️ Warning only |
| Bundle Size | Every PR | ℹ️ Info only |
| Dependencies | Weekly | ℹ️ Info only |

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

## 🔮 Future Enhancements

Consider adding:
- [ ] Unit tests with Jest/Vitest
- [ ] E2E tests with Playwright
- [ ] Visual regression testing
- [ ] Performance monitoring
- [ ] Code coverage reports
- [ ] Automated changelog generation
- [ ] Semantic versioning and releases
