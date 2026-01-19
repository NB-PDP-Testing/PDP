# Git Stash Inventory - Outstanding Work

**Date**: 2026-01-18
**Current Branch**: main
**Last Integrated**: Coach Passport Sharing (stash@{3}) - ✅ Complete

---

## Summary

| Stash | Status | Files | Description | Priority |
|-------|--------|-------|-------------|----------|
| stash@{0} | Minor | 1 | Enhanced User Menu fix | Low |
| stash@{1} | Generated | 1 | Auto-generated API types | Skip |
| stash@{2} | Generated | 1 | Auto-generated API types | Skip |
| stash@{3} | ✅ DONE | - | Coach passport sharing | Complete |
| stash@{4} | Minor | - | Enhanced User Menu cleanup | Low |
| stash@{5} | Duplicate | - | Same as stash@{3} | Skip |
| **stash@{6}** | **🔴 MAJOR** | **55** | **Parent passport sharing + UX** | **HIGH** |
| stash@{7} | Docs | 1 | Session history text file | Skip |
| stash@{8} | Old | - | Stashed before pull | Skip |

---

## 🔴 HIGH PRIORITY: stash@{6} - Parent-Side Passport Sharing

**Size**: 55 files changed, +6,958 insertions, -1,623 deletions
**Branch**: ralph/passport-sharing-phase-1
**Description**: Complete parent-side passport sharing implementation with backend enhancements

### Features Included

#### 1. Parent Passport Sharing UI (Frontend)

**Enhanced Sharing Wizard** (`enable-sharing-wizard.tsx`)
- **Coach Request Approval Flow**: Parents can approve coach access requests
  - Pre-select child when coming from request approval
  - Pass sourceRequestId to track which request triggered the consent
  - Set initiationType: "coach_requested" vs "parent_initiated"
- **Receiving Organization Selection**: Parents choose WHO to share data with
  - Not just "from all orgs" but also "to specific org"
  - Separate receivingOrgId from current orgId
- **Source Organization Mode**: Choose which orgs' data to share
  - "all_enrolled": Share data from all organizations child is enrolled in
  - "specific_orgs": Select specific organizations' data to share

**Child Sharing Card** (`child-sharing-card.tsx`)
- 452+ line additions
- Enhanced display of active shares per child
- Management of consent records

**Pending Requests** (`pending-requests.tsx`)
- 199+ line additions
- Display incoming access requests from coaches
- Approve/decline workflow
- Request details and context

**Parent Sharing Dashboard** (`parent-sharing-dashboard.tsx`)
- 53+ line additions
- Overview of all sharing activity
- Active consents
- Pending requests

**Access Audit Log** (`access-audit-log.tsx`)
- Track who accessed what data and when
- Consent history
- Transparency for parents

#### 2. Backend Enhancements

**Passport Sharing Model** (`passportSharing.ts`)
- **+1,750 lines of additions**
- Coach request access flow
- Consent creation with source tracking
- Receiving org vs source org distinction
- Enhanced queries for pending requests
- Audit logging

**Consent Gateway** (`consentGateway.ts`)
- **+791 lines of additions**
- Authorization layer for passport access
- Fine-grained permission checking
- Element-level access control (which fields can coach see)
- Time-based expiration enforcement

**Schema Updates** (`schema.ts`)
- **+79 lines of changes**
- New tables or fields for:
  - passportShareRequests (coach-initiated requests)
  - Enhanced passportShareConsents fields
  - Audit logging tables
  - Source/receiving org tracking

**User Model** (`users.ts`)
- **+180 lines of new code**
- User lookup and search functions
- Cross-org user queries (for discovering coaches/parents)

#### 3. UX Mockups & Design

**Demo UX Mockups Page** (`demo/ux-mockups/page.tsx`)
- **+1,319 lines**
- Mockup 23: Enhanced Profile Button (6 options)
- Mobile org/role switching mockups
- Design patterns for new features

**Smart Coach Dashboard** (`smart-coach-dashboard.tsx`)
- Enhanced coach dashboard component
- Possibly AI/smart features

**Org Role Switcher** (`org-role-switcher.tsx`)
- **+317 lines of changes**
- Improved organization and role switching UX
- Better multi-org navigation

#### 4. Layout & Navigation Updates

**Coach Layout** (`coach/layout.tsx`)
- 65+ line changes
- Navigation improvements
- Layout consistency

**Admin Layout** (`admin/layout.tsx`)
- 71+ line changes
- Admin-specific navigation
- Sharing management access

**Parent Layout** (`parents/layout.tsx`)
- Layout updates for sharing features
- Navigation to new sharing pages

#### 5. Player Profile Enhancements

**Shared Passport View** (`players/[playerId]/shared/page.tsx`)
- **+1,052 line additions (major rewrite)**
- Coach viewing shared passport with consent-based access
- Element-level filtering (only show what parent consented to)
- Consent metadata display
- Time-based expiration handling

**Request Access Modal** (`request-access-modal.tsx`)
- **+210 line additions**
- Enhanced request form
- Reason field
- Organization context

**Share Modal** (`share-modal.tsx`)
- Updated sharing options
- Integration with new consent flow

#### 6. Organization & Page Updates

**Organization Pages**
- `/orgs/page.tsx`: 96+ line changes
- `/orgs/current/page.tsx`: 174+ line changes
- `/orgs/accept-invitation/[invitationId]/page.tsx`: 284+ line changes
- Better org selection and navigation

**Landing Page** (`page.tsx`)
- 70+ line changes
- Updated home page

---

## Key Features Summary (stash@{6})

### What's New

1. **Bi-Directional Passport Sharing**
   - Coaches can REQUEST access (not just parents initiating)
   - Parents receive requests and can approve/decline
   - Request includes reason/justification from coach

2. **Fine-Grained Consent Control**
   - Parents choose WHICH organization to share WITH (receiving org)
   - Parents choose WHICH organizations' data to share (source orgs)
   - Element-level selection (which fields: skills, medical, etc.)

3. **Audit Trail & Transparency**
   - Access audit log shows who viewed what and when
   - Consent history tracking
   - Request/approval workflow tracking

4. **Enhanced Parent Experience**
   - Unified sharing dashboard
   - Pending requests view
   - Child-by-child consent management
   - Active consent overview

5. **Enhanced Coach Experience**
   - Smart coach dashboard
   - Better request access UX
   - Consent-aware data viewing (only see permitted fields)

6. **Backend Authorization Layer**
   - consentGateway enforces permissions
   - Time-based expiration
   - Element-level access control
   - Query-level filtering based on consents

---

## Integration Complexity Assessment

### High Complexity

**stash@{6}** is a **major integration** with high complexity:

**Challenges:**
1. **Schema Changes**: 79 lines of schema updates
   - May require data migration
   - Need to verify against current main branch schema

2. **Backend Rewrites**: 2,451 insertions in critical files
   - passportSharing.ts almost completely rewritten
   - consentGateway.ts has major additions
   - Need careful merge to avoid breaking existing functionality

3. **Breaking Changes**: Shared passport viewing completely rewritten
   - May conflict with recent changes in main
   - Need to test existing coach/parent workflows

4. **Multi-File Dependencies**: 55 files changed
   - Many interdependent components
   - All-or-nothing integration (can't cherry-pick easily)

**Risks:**
- Schema conflicts with main branch
- Breaking existing passport sharing in production
- TypeScript type mismatches
- Query performance with new authorization layer
- User experience regressions

**Benefits:**
- Complete, production-ready parent-side sharing
- Request/approval workflow (critical user story)
- Audit trail (compliance/transparency)
- Fine-grained consent control (privacy requirement)
- Backend authorization layer (security best practice)

---

## Other Stashes (Low Priority)

### stash@{0} - Enhanced User Menu Fix
**Files**: 1 (profile-settings-dialog.tsx)
**Changes**: 3 insertions, 1 deletion
**Assessment**: Minor fix, likely already resolved in current main or not critical

### stash@{4} - Enhanced User Menu Cleanup
**Assessment**: Cleanup commit, likely already resolved

### stash@{7} - Session History
**Files**: 1 (scripts/ralph/session-history.txt)
**Assessment**: Documentation only, not code

### stash@{8} - Old Stash
**Assessment**: Stashed before a pull, likely outdated

---

## Recommendations

### Immediate Action: Integrate stash@{6}

**Why**: This completes the passport sharing feature end-to-end
- Coach-side features ✅ (just integrated)
- Parent-side features 🔴 (in stash@{6})
- Backend authorization ⚠️ (in stash@{6}, needed for security)

### Integration Strategy

**Option 1: Full Integration (Recommended)**
1. Create feature branch from current main
2. Apply stash@{6}
3. Resolve conflicts carefully (especially schema.ts)
4. Test extensively:
   - Coach request access flow
   - Parent approve/decline flow
   - Consent-based data viewing
   - Element-level permissions
   - Audit logging
5. TypeScript build
6. Merge to main

**Option 2: Phased Integration**
1. **Phase 1**: Backend only (schema, passportSharing, consentGateway)
2. **Phase 2**: Parent UI (wizard, dashboard, pending requests)
3. **Phase 3**: Shared passport viewing
4. **Phase 4**: UX enhancements (mockups, layouts)

**Option 3: Cherry-Pick Critical Features**
- Only integrate request/approval workflow
- Skip UX mockups and layout changes
- Minimal viable integration

### Testing Plan

**Critical Tests**:
1. ✅ Coach can request access to player passport
2. ✅ Parent receives request notification
3. ✅ Parent can approve request → creates consent
4. ✅ Coach can view shared passport with correct element filtering
5. ✅ Consent expires after duration → coach loses access
6. ✅ Audit log records all access events
7. ✅ Parent can revoke consent → coach immediately loses access

**Regression Tests**:
1. Existing parent-initiated sharing still works
2. Coach viewing existing consents still works
3. No breaking changes to player profiles
4. Multi-org enrollment data intact

---

## Next Steps

1. **User Decision**: Integrate stash@{6}? (YES/NO)

2. **If YES**:
   - Choose integration strategy (Full vs Phased vs Cherry-pick)
   - Create feature branch
   - Apply stash and resolve conflicts
   - Comprehensive testing
   - GitHub issue tracking

3. **If NO/LATER**:
   - Document stash@{6} for future reference
   - Clean up low-priority stashes (0, 1, 2, 4, 7, 8)
   - Keep stash@{6} intact for later integration

4. **Cleanup**:
   - Drop stash@{1}, stash@{2} (generated files)
   - Drop stash@{5} (duplicate of integrated stash@{3})
   - Drop stash@{7} (just session history)
   - Drop stash@{8} (old stash before pull)

---

## Stash Cleanup Commands

```bash
# Keep stash@{6} (parent sharing) and stash@{0} (minor fix)
# Drop others

git stash drop stash@{1}  # Generated API types
git stash drop stash@{2}  # Generated API types
# stash@{3} already integrated ✅
git stash drop stash@{4}  # Enhanced User Menu cleanup
git stash drop stash@{5}  # Duplicate of stash@{3}
# stash@{6} KEEP - parent sharing 🔴
git stash drop stash@{7}  # Session history text
git stash drop stash@{8}  # Old stash

# After cleanup, remaining stashes:
# stash@{0} - Enhanced User Menu fix (evaluate later)
# stash@{1} - Parent-side passport sharing (MAJOR - integrate next)
```

---

## Integration Timeline Estimate

### Full Integration of stash@{6}

**Preparation**: 1-2 hours
- Review all changes
- Create feature branch
- Plan conflict resolution strategy

**Implementation**: 4-6 hours
- Apply stash
- Resolve schema conflicts
- Resolve code conflicts (55 files)
- Fix TypeScript errors
- Fix linting issues

**Testing**: 3-4 hours
- Manual testing of request/approval flow
- Consent-based viewing tests
- Element filtering tests
- Audit log verification
- Regression testing

**Documentation**: 1-2 hours
- Update architecture docs
- Update feature docs
- GitHub issue updates

**Total**: 9-14 hours for full integration

---

## Priority Assessment

| Feature | Priority | Reason |
|---------|----------|--------|
| stash@{6} - Parent Sharing | **🔴 HIGH** | Completes critical user story, required for production |
| stash@{0} - User Menu Fix | 🟡 LOW | Minor fix, non-blocking |
| Other stashes | ⚫ SKIP | Generated files, duplicates, or outdated |

---

**Recommended Action**: Integrate stash@{6} next to complete the passport sharing feature end-to-end.
