# PlayerARC Documentation

Welcome to the PlayerARC (PDP) documentation. This folder contains all project documentation organized by category.

## Quick Links

- **[CLAUDE.md](../CLAUDE.md)** - Start here! Canonical AI agent context and project overview
- **[README.md](../README.md)** - Project setup and getting started

---

## Documentation Structure

### [architecture/](./architecture/)
System design, data models, and architectural decisions.

| Document | Description |
|----------|-------------|
| [system-overview.md](./architecture/system-overview.md) | Comprehensive architecture analysis |
| [multi-team-system.md](./architecture/multi-team-system.md) | Multi-team player assignment system |
| [flow-wizard-system.md](./architecture/flow-wizard-system.md) | Modular wizard/flow system design |
| [identity-system.md](./architecture/identity-system.md) | Platform-level identity architecture (planned) |
| [player-passport.md](./architecture/player-passport.md) | Player passport system architecture |
| [season-management.md](./architecture/season-management.md) | Season management analysis |
| [knowledge-graph.md](./architecture/knowledge-graph.md) | Knowledge graph architecture for player development insights |

### [features/](./features/)
Feature documentation explaining how things work.

| Document | Description |
|----------|-------------|
| [admin-panel.md](./features/admin-panel.md) | Admin panel setup and features |
| [organization-theming.md](./features/organization-theming.md) | Organization branding/colors system |
| [organization-join-requests.md](./features/organization-join-requests.md) | Join request workflow |
| [user-management.md](./features/user-management.md) | User/member management features |
| [functional-roles.md](./features/functional-roles.md) | Custom functional roles (Coach, Parent, Admin) |
| [first-user-onboarding.md](./features/first-user-onboarding.md) | First user onboarding wizard |
| [parent-dashboard.md](./features/parent-dashboard.md) | Parent features and dashboard |
| [player-self-access.md](./features/player-self-access.md) | Adult player self-access system |
| [guardian-identity.md](./features/guardian-identity.md) | Guardian identity claiming system |
| [voice-notes.md](./features/voice-notes.md) | Voice notes with AI transcription |
| [invitations.md](./features/invitations.md) | Invitation system and flows |
| [player-passport-analysis.md](./features/player-passport-analysis.md) | Player passport feature analysis |

### [setup/](./setup/)
Setup and configuration guides.

| Document | Description |
|----------|-------------|
| [microsoft-auth.md](./setup/microsoft-auth.md) | Microsoft Azure Entra ID setup |
| [ai-api.md](./setup/ai-api.md) | AI API routes setup (Anthropic) |
| [posthog-analytics.md](./setup/posthog-analytics.md) | PostHog analytics integration |
| [POSTHOG_DASHBOARD_SETUP.md](./setup/POSTHOG_DASHBOARD_SETUP.md) | PostHog dashboard configuration |
| [vercel-deployment.md](./setup/vercel-deployment.md) | Vercel deployment guide |
| [invitation-emails.md](./setup/invitation-emails.md) | Email notifications setup |
| [branding-guide.md](./setup/branding-guide.md) | Rebranding guide (PDP → PlayerARC) |

### [testing/](./testing/)
Test plans and UAT documentation.

| Document | Description |
|----------|-------------|
| [master-test-plan.md](./testing/master-test-plan.md) | Master UAT test plan (166 test cases) |
| [flow-system-tests.md](./testing/flow-system-tests.md) | Flow system UAT tests (67 cases) |
| [identity-migration-tests.md](./testing/identity-migration-tests.md) | Identity migration test checklist |
| [role-based-test-cases.md](./testing/role-based-test-cases.md) | Role-based workflow test cases |

### [development/](./development/)
Developer guides and code quality.

| Document | Description |
|----------|-------------|
| [linting-guide.md](./development/linting-guide.md) | Biome/Ultracite linting guide |
| [typescript-guide.md](./development/typescript-guide.md) | TypeScript patterns and fixes |
| [ci-cd-guide.md](./development/ci-cd-guide.md) | CI/CD pipeline documentation |
| [convex-troubleshooting.md](./development/convex-troubleshooting.md) | Convex & Vercel troubleshooting |

### [research/](./research/)
UX research, competitive analysis, and design studies.

| Document | Description |
|----------|-------------|
| [mobile-quick-actions-research-2025.md](./research/mobile-quick-actions-research-2025.md) | Mobile quick actions research (7 platforms, 2025 patterns) |
| [mobile-quick-actions-summary.md](./research/mobile-quick-actions-summary.md) | Executive summary of mobile quick actions research |
| [coach-dashboard-mobile-spec.md](./research/coach-dashboard-mobile-spec.md) | Coach dashboard mobile implementation specification |

### [reference/](./reference/)
Schema, data models, and comparisons.

| Document | Description |
|----------|-------------|
| [database-schema.md](./reference/database-schema.md) | Current database schema |
| [mvp-comparison.md](./reference/mvp-comparison.md) | MVP vs current feature comparison |
| [legacy-tables.md](./reference/legacy-tables.md) | Legacy table analysis |

### [scripts/](./scripts/)
Convex scripts for seeding data, migrations, and utilities.

| Document | Description |
|----------|-------------|
| [seed-rugby-team.md](./scripts/seed-rugby-team.md) | Seed a rugby team with 35 players and assessments |

### [status/](./status/)
Current implementation status.

| Document | Description |
|----------|-------------|
| [current-status.md](./status/current-status.md) | Current implementation status |
| [outstanding-features.md](./status/outstanding-features.md) | Features not yet implemented |
| [identity-migration-progress.md](./status/identity-migration-progress.md) | Identity migration progress |

### [archive/](./archive/)
Historical documentation kept for reference.

| Folder | Contents |
|--------|----------|
| [session-logs/](./archive/session-logs/) | Daily work session logs |
| [planning/](./archive/planning/) | Superseded planning documents |
| [bug-fixes/](./archive/bug-fixes/) | Completed bug fix documentation |
| [auth/](./archive/auth/) | Authentication implementation history |
| [features/](./archive/features/) | Completed feature implementation docs |
| [content/](./archive/content/) | Marketing/content strategy docs |

---

## Other Documentation Locations

| Location | Purpose |
|----------|---------|
| `.ruler/` | Development rules (Convex, Ultracite, project patterns) |
| `.github/` | GitHub-specific docs (CI/CD, Copilot) |
| `packages/backend/convex/README.md` | Convex backend documentation |
| `packages/backend/data-exports/` | Data export documentation |
| `apps/web/uat/README.md` | UAT-specific documentation |

---

## Contributing to Documentation

1. **New features** → Add to `features/`
2. **Architecture decisions** → Add to `architecture/`
3. **Setup guides** → Add to `setup/`
4. **Test plans** → Add to `testing/`
5. **Session logs** → Add to `archive/session-logs/`

Use lowercase with hyphens for filenames (e.g., `my-new-feature.md`).
