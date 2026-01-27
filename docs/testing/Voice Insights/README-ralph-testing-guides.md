# Ralph Testing Guides - Overview

**Created**: January 27, 2026
**Purpose**: Comprehensive UAT testing guides for all features implemented by Ralph

---

## Overview

This directory contains four comprehensive testing guides covering all major features implemented by Ralph across multiple development phases. Each guide follows a consistent format with test cases, expected results, workflows, and troubleshooting.

---

## Testing Guides

### 1. Platform Staff User Management
**File**: `platform-staff-users-testing-guide.md`
**Phases Covered**: 5 phases (Schema, Backend, Dashboard, Detail UI, Advanced Features)
**Test Cases**: 61
**Estimated Time**: 4-6 hours (full suite), 30 minutes (smoke test)

**Key Features Tested**:
- Platform admin dashboard with health metrics
- User search with multi-criteria filtering
- Comprehensive user detail pages (7+ tabs)
- Impersonation capability with audit trail
- Approval workflow for sensitive actions
- Bulk operations and data export
- Error log monitoring

**Quick Start**:
- Login as platform staff: `neil.B@blablablak.com` / `lien1979`
- Navigate to `/platform/users`
- Run quick smoke test (TC-PS-020 to TC-PS-029, TC-PS-050 to TC-PS-055)

---

### 2. Coach-Parent AI Summaries
**File**: `parent-summaries-testing-guide.md`
**Phases Covered**: 6 phases (Infrastructure, Trust System, Sensitive Topics, UX, Preview Mode, Supervised Auto-Approval)
**Test Cases**: 60+
**Estimated Time**: 6-8 hours (full suite), 45 minutes (smoke test)

**Key Features Tested**:
- AI-generated parent summaries from voice notes
- Coach approval workflow (approve/suppress/edit)
- Sensitivity classification (normal/injury/behavior)
- Trust level progression system
- Preview mode (transparency before automation)
- Supervised auto-approval with 1-hour revoke window
- Parent viewing and notifications
- Shareable images and passport deep links

**Quick Start**:
- Coach: `neil.B@blablablak.com` / `lien1979`
- Parent: `neilparent@skfjkadsfdgsjdgsj.com` / `lien1979`
- Create voice note → Wait for AI → Approve/suppress → Parent views

---

### 3. P5 Trust Levels & Auto-Approval
**File**: `p5-trust-levels-testing-guide.md`
**Phases Covered**: 4 phases (Preview Mode, Supervised Auto-Approval, Cost Optimization, Learning Loop)
**Test Cases**: 36
**Estimated Time**: 5-7 hours (full suite), 1 hour (smoke test)

**Key Features Tested**:
- Preview mode (show what AI would do)
- Trust slider and confidence threshold
- Auto-approval with 1-hour revoke window
- Prompt caching for 90% cost savings
- AI usage tracking and analytics
- Adaptive confidence thresholds per coach
- Override feedback collection
- Learning loop for continuous improvement

**Quick Start**:
- Create coach at Level 0 (manual review)
- Progress through 10 approvals → Level 1
- Progress through 50 approvals → Level 2
- Next summaries auto-approve
- Test revoke within 1 hour

---

### 4. P7 Insight Auto-Apply
**File**: `p7-insight-auto-apply-testing-guide.md`
**Phases Covered**: 3 phases (Preview Mode, Supervised Auto-Apply, Learning Loop with Auto-Triggering)
**Test Cases**: 33
**Estimated Time**: 4-6 hours (full suite), 45 minutes (smoke test)

**Key Features Tested**:
- Preview mode for insights
- Automatic application of skill ratings
- Automatic triggering (no manual action)
- 1-hour undo window
- Per-category preferences (skills, attendance, goals, performance)
- Adaptive confidence thresholds
- Undo reason collection
- Complete audit trail

**Quick Start**:
- Coach at Level 2: `neil.B@blablablak.com` / `lien1979`
- Enable skills preference in settings
- Create voice note with skill insight
- Wait for AI processing
- Insight auto-applies automatically (no manual click)
- View "Auto-Applied" tab
- Test undo within 1 hour

---

## Testing Best Practices

### Before Testing
1. ✅ Dev server running on http://localhost:3000
2. ✅ Convex backend deployed
3. ✅ API keys configured (Anthropic for AI features)
4. ✅ Test accounts created and ready
5. ✅ Test data seeded (organizations, teams, players)

### During Testing
- Use checkboxes in guides to track progress
- Document any failures with screenshots
- Note actual behavior vs expected behavior
- Check Convex dashboard for backend data
- Monitor browser console for errors

### After Testing
- Complete sign-off section in each guide
- Report any bugs or issues
- Verify regression tests pass
- Update documentation if needed

---

## Test Account Reference

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Platform Staff** | neil.B@blablablak.com | lien1979 | Full platform access |
| **Coach (L2+)** | neil.B@blablablak.com | lien1979 | Auto-approval features |
| **Parent** | neilparent@skfjkadsfdgsjdgsj.com | lien1979 | View summaries |

---

## PRD References

### Platform Staff User Management
- `scripts/ralph/prds/platform-users-phase1-schema.prd.json`
- `scripts/ralph/prds/platform-users-phase2-backend.prd.json`
- `scripts/ralph/prds/platform-users-phase3-dashboard-list.prd.json`
- `scripts/ralph/prds/platform-users-phase4-detail.prd.json`
- `scripts/ralph/prds/platform-users-phase5-advanced.prd.json`
- `scripts/ralph/prds/platform-staff-user-management.prd.json`

### Coach-Parent Summaries
- `scripts/ralph/prds/Coaches Voice Insights/coach-parent-summaries-phase1.prd.json` (Phases 1-4)
- `scripts/ralph/prds/Coaches Voice Insights/coach-parent-summaries-phase5-REVISED.prd.json` (Phase 5)
- `scripts/ralph/prds/Coaches Voice Insights/coach-parent-summaries-phase6.1.prd.json` (Phase 6.1)
- `scripts/ralph/prds/Coaches Voice Insights/coach-parent-summaries-phase6.2.prd.json` (Phase 6.2)
- `scripts/ralph/prds/Coaches Voice Insights/coach-parent-summaries-phase6.3.prd.json` (Phase 6.3)
- `scripts/ralph/prds/Coaches Voice Insights/coach-parent-summaries-phase6.4.prd.json` (Phase 6.4)

### P5 Trust Levels
- `scripts/ralph/prds/Coaches Voice Insights/p5-phase1-preview-mode.prd.json`
- `scripts/ralph/prds/Coaches Voice Insights/p5-phase2-auto-approval.prd.json`
- `scripts/ralph/prds/Coaches Voice Insights/p5-phase3-cost-optimization.prd.json`
- `scripts/ralph/prds/Coaches Voice Insights/p5-phase4-learning-loop.prd.json`

### P7 Insight Auto-Apply
- `scripts/ralph/prds/Coaches Voice Insights/p7-phase1-preview-mode.prd.json`
- `scripts/ralph/prds/Coaches Voice Insights/p7-phase2-supervised-auto-apply.prd.json`
- `scripts/ralph/prds/Coaches Voice Insights/p7-phase3-learning-loop.prd.json`

---

## Test Execution Order

### Recommended Testing Sequence

1. **Start with Platform Staff User Management** (foundational)
   - Tests admin controls and user management
   - Required for monitoring other features
   - Estimated: 4-6 hours

2. **Then Coach-Parent AI Summaries** (core feature)
   - Tests AI generation and approval workflow
   - Foundation for trust system
   - Estimated: 6-8 hours

3. **Then P5 Trust Levels** (automation layer)
   - Builds on parent summaries
   - Tests progressive automation
   - Estimated: 5-7 hours

4. **Finally P7 Insight Auto-Apply** (advanced automation)
   - Similar to P5 but for insights
   - Tests automatic triggering
   - Estimated: 4-6 hours

**Total Estimated Time**: 19-27 hours for complete UAT

---

## Success Criteria

### All Guides Pass When:
- ✅ All test cases execute without errors
- ✅ No console errors in browser
- ✅ Expected behavior matches actual behavior
- ✅ Data persists correctly in Convex
- ✅ Audit trails complete
- ✅ Security/authorization enforced
- ✅ Performance targets met
- ✅ Regression tests pass

---

## Troubleshooting Resources

### Common Issues Across All Guides

**API Keys Missing**:
- Check Convex environment variables
- Verify Anthropic API key for AI features

**Database Queries Failing**:
- Run `npx -w packages/backend convex codegen`
- Check indexes exist on tables
- Verify data in Convex dashboard

**UI Not Loading**:
- Clear browser cache
- Check browser console for errors
- Verify dev server running on port 3000
- Check network tab for failed requests

**Permissions/Authorization**:
- Verify user role (platform staff, coach, parent)
- Check isPlatformStaff flag in user record
- Verify organization membership
- Check trust level for automation features

---

## Support

### For Issues During Testing:
1. Check the **Troubleshooting** section in each guide
2. Review **Known Issues & Limitations** sections
3. Check Convex dashboard for backend data
4. Review browser console for errors
5. Check relevant PRD files for implementation details

### Documentation References:
- `docs/architecture/` - System architecture
- `docs/features/` - Feature specifications
- `.ruler/convex_rules.md` - Backend patterns
- `CLAUDE.md` - Project overview

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-27 | Initial creation of all 4 guides | Claude Code |

---

*Generated by Claude Code - January 27, 2026*
