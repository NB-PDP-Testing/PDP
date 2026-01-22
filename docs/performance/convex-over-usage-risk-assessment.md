# Convex Over-Usage Optimization - Risk Assessment

**Date:** 2026-01-22
**Status:** Pre-Implementation Risk Analysis
**Related Documents:**
- `convex-over-usage-analysis.md` - Detailed findings
- `convex-over-usage-implementation-plan.md` - Implementation steps

---

## Executive Summary

This document assesses the risks associated with implementing the Convex over-usage optimizations. While the changes are necessary to prevent service interruption, they involve modifying data flow patterns and query logic that could impact application functionality if not carefully implemented.

**Overall Risk Level:** MEDIUM
**Recommended Approach:** Phased implementation with comprehensive testing at each stage
**Estimated Safe Implementation Timeline:** 3-4 days (including testing)

---

## Risk Matrix

| Risk Category | Probability | Impact | Risk Level | Mitigation Priority |
|--------------|-------------|--------|------------|-------------------|
| Data inconsistency after bulk query changes | Medium | High | **HIGH** | 1 |
| Real-time subscription failures | Low | High | **MEDIUM** | 2 |
| Coach dashboard shows wrong players | Medium | High | **HIGH** | 1 |
| Performance degradation during migration | Low | Medium | **LOW** | 4 |
| Schema migration failures | Low | High | **MEDIUM** | 3 |
| User-facing errors during rollout | Medium | Medium | **MEDIUM** | 2 |
| Breaking changes to shared components | Low | High | **MEDIUM** | 3 |

---

## Detailed Risk Analysis

### Risk #1: Data Inconsistency from Bulk Query Pattern Changes [HIGH]

**Description:**

Changing from individual queries per child to bulk queries changes the data flow architecture. If the bulk query implementation doesn't match the original query results exactly, child cards may display incorrect or incomplete data.

**Specific Concerns:**

1. **Field Mapping Mismatch:**
   - Bulk queries return data in a different structure
   - Frontend expects specific field names/formats
   - Mapping errors could cause missing fields

2. **Null/Undefined Handling:**
   - Original queries handle missing data gracefully
   - Bulk queries may return different null/undefined patterns
   - Could cause rendering errors or crashes

3. **Data Transformation Logic:**
   - ChildCard component has complex data transformation (Lines 129-162)
   - Transformations expect specific input structure
   - Changes to input structure could break transformations

**Probability:** Medium (40%)
**Impact:** High - Users see incorrect child data
**Risk Score:** HIGH

**Mitigation Strategies:**

1. **Type Safety:**
   ```typescript
   // Define exact return types for bulk queries
   export const getBulkInjuriesForPlayers = query({
     returns: v.array(
       v.object({
         playerIdentityId: v.id("playerIdentities"),
         injuries: v.array(injuryValidator), // Use exact validator
       })
     ),
     // ...
   });
   ```

2. **Unit Tests:**
   ```typescript
   // Test bulk query returns same data as individual queries
   it('bulk query returns identical data to individual queries', async () => {
     const playerIds = [player1Id, player2Id, player3Id];

     // Individual queries
     const individual = await Promise.all(
       playerIds.map(id => getInjuriesForPlayer({ playerIdentityId: id }))
     );

     // Bulk query
     const bulk = await getBulkInjuriesForPlayers({ playerIdentityIds: playerIds });

     // Compare results
     expect(bulk.map(b => b.injuries)).toEqual(individual);
   });
   ```

3. **Gradual Rollout:**
   - Implement bulk queries but keep individual queries as fallback
   - Use feature flag to toggle between old and new logic
   - Monitor for errors before full rollout

4. **Logging:**
   ```typescript
   // Log data structure for comparison
   if (process.env.NODE_ENV === 'development') {
     console.log('Individual query result:', injuries);
     console.log('Bulk query result:', bulkInjuries);
   }
   ```

**Detection:**
- Component renders with missing fields
- Console errors about undefined properties
- User reports of incomplete data

**Rollback Plan:**
- Revert ChildCard prop changes
- Revert parent component bulk query changes
- Return to individual queries

---

### Risk #2: Coach Dashboard Shows Wrong Players [HIGH]

**Description:**

The new `getPlayersForCoach` function filters players based on coach assignments. If the filtering logic doesn't correctly match the existing JavaScript filtering, coaches may see:
- Players they aren't assigned to
- Missing players they ARE assigned to
- Empty dashboards when they should have players

**Specific Concerns:**

1. **Team ID vs Team Name Confusion:**
   - Coach assignments currently support both team IDs and team names (Lines 123-155 in coach-dashboard.tsx)
   - Backend function needs to handle both formats
   - Mismatch could cause missing players

2. **Multi-Team Player Logic:**
   - Players can belong to multiple teams
   - Coach should see player if on ANY assigned team
   - Logic error could cause duplicates or omissions

3. **Inactive Player Filtering:**
   - Current logic filters by `status === "active"`
   - Backend needs to maintain same filtering
   - Missing filter could show inactive players

4. **Enrollment vs Team Membership:**
   - Current logic uses teamPlayerIdentities links
   - Backend must use same linking logic
   - Schema misunderstanding could break relationships

**Probability:** Medium (35%)
**Impact:** High - Coaches can't access their players
**Risk Score:** HIGH

**Mitigation Strategies:**

1. **Parallel Validation:**
   ```typescript
   // In development, run both old and new queries
   const oldPlayers = /* existing logic */;
   const newPlayers = useQuery(api.models.orgPlayerEnrollments.getPlayersForCoach, ...);

   if (process.env.NODE_ENV === 'development') {
     console.assert(
       oldPlayers.length === newPlayers.length,
       'Player count mismatch!'
     );
   }
   ```

2. **Comprehensive Test Data:**
   ```typescript
   // Test cases:
   // 1. Coach with 1 team, 10 players
   // 2. Coach with 3 teams, players on multiple teams
   // 3. Coach with team that has no players
   // 4. Coach with no team assignments
   // 5. Coach with team name (legacy) vs team ID assignment
   ```

3. **Admin Override:**
   ```typescript
   // Add admin view to see ALL players for debugging
   const viewAllPlayers = isAdmin && useQueryParams().debug === 'true';
   ```

4. **Detailed Logging:**
   ```typescript
   // Log filtering steps
   console.log('Coach team IDs:', coachTeamIds);
   console.log('Team player links:', teamPlayerLinks.length);
   console.log('Filtered player IDs:', playerIds.size);
   console.log('Final players:', enrollments.length);
   ```

**Detection:**
- Coach sees 0 players when they have teams
- Coach sees players from other teams
- Player count doesn't match expected

**Rollback Plan:**
- Revert coach-dashboard.tsx changes
- Return to `getPlayersForOrg` with JavaScript filtering
- Keep new backend function for future use

---

### Risk #3: Real-Time Subscription Failures [MEDIUM]

**Description:**

Convex's real-time subscriptions are core to the application's functionality. Changes to query patterns could break subscription updates, causing:
- Stale data displayed to users
- Changes not reflected until page refresh
- Race conditions between queries

**Specific Concerns:**

1. **Subscription Dependencies:**
   - Bulk queries have different dependency arrays
   - useMemo/useEffect dependencies must be updated
   - Missing dependencies could prevent updates

2. **Query Skip Logic:**
   - Adding `"skip"` conditions changes when queries run
   - Incorrect skip logic could prevent needed queries
   - Queries might skip when they shouldn't

3. **Data Synchronization:**
   - Multiple related queries must stay in sync
   - Bulk query timing vs individual updates
   - Race condition if parent updates before children

**Probability:** Low (20%)
**Impact:** High - Core functionality breaks
**Risk Score:** MEDIUM

**Mitigation Strategies:**

1. **Subscription Testing:**
   ```typescript
   // Test: Change data, verify UI updates
   it('updates when player injury changes', async () => {
     render(<ParentChildrenView />);

     // Initial render
     expect(screen.getByText('No injuries')).toBeInTheDocument();

     // Add injury in backend
     await addInjury(playerId, { type: 'sprain' });

     // Wait for subscription update
     await waitFor(() => {
       expect(screen.getByText('1 Active injury')).toBeInTheDocument();
     });
   });
   ```

2. **Dependency Audit:**
   ```typescript
   // Document all useMemo/useEffect dependencies
   const passportsByPlayer = useMemo(() => {
     // ...
   }, [bulkPassports]); // ← Verify this updates when needed
   ```

3. **Real-Time Test Harness:**
   - Open dashboard in 2 browser tabs
   - Make changes in tab 1
   - Verify tab 2 updates automatically
   - Test with multiple data types

4. **Subscription Debugging:**
   ```typescript
   // Add logging for subscription updates
   useEffect(() => {
     console.log('Bulk passports updated:', bulkPassports?.length);
   }, [bulkPassports]);
   ```

**Detection:**
- Data doesn't update until page refresh
- Changes visible in one component but not another
- Console warnings about stale data

**Rollback Plan:**
- Revert to individual subscriptions
- Real-time updates will resume immediately

---

### Risk #4: Schema Migration Failures [MEDIUM]

**Description:**

Adding composite indexes to the schema involves database migrations. If migrations fail or indexes aren't created correctly, queries will fail.

**Specific Concerns:**

1. **Index Creation Failures:**
   - Convex may reject invalid index combinations
   - Field type mismatches
   - Index name conflicts

2. **Deployment Timing:**
   - Code deployed before indexes created
   - Queries reference non-existent indexes
   - Application crashes on index lookup

3. **Index Performance:**
   - New indexes could be slower than expected
   - Compound index ordering matters
   - Could accidentally degrade performance

**Probability:** Low (15%)
**Impact:** High - Application unavailable
**Risk Score:** MEDIUM

**Mitigation Strategies:**

1. **Schema Validation:**
   ```bash
   # Validate schema before deployment
   npx -w packages/backend convex codegen
   # Check for errors
   ```

2. **Staged Deployment:**
   - Deploy schema changes first
   - Wait for indexes to be created
   - Then deploy code changes

3. **Index Verification:**
   ```typescript
   // After deployment, verify indexes exist
   // Use Convex dashboard to inspect table schemas
   ```

4. **Backward Compatibility:**
   ```typescript
   // Keep old query logic temporarily
   try {
     return await ctx.db.query('table').withIndex('new_index', ...).collect();
   } catch (error) {
     // Fallback to old index
     return await ctx.db.query('table').withIndex('old_index', ...).collect();
   }
   ```

**Detection:**
- Convex deployment fails with index errors
- Queries return errors about missing indexes
- Dashboard shows schema errors

**Rollback Plan:**
- Revert schema changes
- Redeploy previous schema
- Queries automatically use old indexes

---

### Risk #5: Breaking Changes to Shared Components [MEDIUM]

**Description:**

The ChildCard component may be used in other parts of the application beyond the parent dashboard. Changes to its props could break other usages.

**Specific Concerns:**

1. **Unknown Usage Locations:**
   - Component may be imported elsewhere
   - Search may not find all usages
   - Dynamic imports could be missed

2. **Prop Type Changes:**
   - Adding required props breaks existing usage
   - Changing prop structure requires updates everywhere
   - TypeScript may not catch all issues

**Probability:** Low (25%)
**Impact:** High - Multiple pages break
**Risk Score:** MEDIUM

**Mitigation Strategies:**

1. **Comprehensive Search:**
   ```bash
   # Find all usages
   grep -r "ChildCard" apps/web/src/
   grep -r "child-card" apps/web/src/
   ```

2. **Backward Compatibility:**
   ```typescript
   // Make new props optional
   type ChildCardProps = {
     // Required props
     child: ChildData;
     orgId: string;
     // Optional pre-fetched data (backward compatible)
     passportData?: any;
     injuries?: any[];
     goals?: any[];
   };

   // Component handles both patterns
   const passportData = preFetchedPassportData || fetchedPassportData;
   ```

3. **TypeScript Strict Mode:**
   ```bash
   # Run type checker
   npm run check-types
   ```

4. **Code Review Checklist:**
   - [ ] Search for all ChildCard imports
   - [ ] Verify each usage location
   - [ ] Test each usage pattern
   - [ ] Document component props

**Detection:**
- Type errors during build
- Runtime errors in unexpected pages
- Components render incorrectly

**Rollback Plan:**
- Restore original ChildCard props
- Existing usages continue working

---

### Risk #6: User-Facing Errors During Rollout [MEDIUM]

**Description:**

Users actively using the application during deployment could experience errors or data inconsistencies.

**Specific Concerns:**

1. **Mid-Session Changes:**
   - User has page open during deployment
   - Old JavaScript receives new API responses
   - Version mismatch causes errors

2. **Partial Updates:**
   - Frontend deployed before backend
   - Backend deployed before frontend
   - Queries reference non-existent functions

**Probability:** Medium (30%)
**Impact:** Medium - Temporary user disruption
**Risk Score:** MEDIUM

**Mitigation Strategies:**

1. **Deployment Timing:**
   - Deploy during low-traffic hours
   - Notify users of maintenance window
   - Monitor active sessions

2. **Atomic Deployment:**
   - Deploy backend first (backward compatible)
   - Then deploy frontend
   - Verify each step before proceeding

3. **Version Checking:**
   ```typescript
   // Client checks for version mismatch
   const APP_VERSION = '2.1.0';

   useEffect(() => {
     const serverVersion = await getServerVersion();
     if (serverVersion !== APP_VERSION) {
       toast.info('New version available. Please refresh.');
     }
   }, []);
   ```

4. **Graceful Degradation:**
   ```typescript
   // Handle query errors gracefully
   try {
     const data = useQuery(...);
   } catch (error) {
     console.error('Query failed:', error);
     return <ErrorBoundary />;
   }
   ```

**Detection:**
- Increased error rates in logs
- User reports of errors
- Sentry/error tracking alerts

**Rollback Plan:**
- Immediate rollback if errors spike
- Communicate with affected users
- Schedule better deployment window

---

### Risk #7: Performance Degradation During Migration [LOW]

**Description:**

While optimizations are expected to improve performance, there's a risk they could accidentally degrade it during transition.

**Specific Concerns:**

1. **Query Complexity:**
   - Bulk queries might be more complex
   - Multiple Promise.all() could cause memory spikes
   - Parallel queries could overwhelm database

2. **Bundle Size:**
   - Additional code for fallback logic
   - More complex component logic
   - Could slow initial page load

**Probability:** Low (10%)
**Impact:** Medium - Slower but still functional
**Risk Score:** LOW

**Mitigation Strategies:**

1. **Performance Monitoring:**
   ```typescript
   // Measure query times
   const startTime = performance.now();
   const data = await ctx.db.query(...).collect();
   console.log(`Query took ${performance.now() - startTime}ms`);
   ```

2. **Load Testing:**
   - Test with realistic data volumes
   - Simulate concurrent users
   - Monitor memory usage

3. **Incremental Rollout:**
   - Enable for 10% of users first
   - Monitor performance metrics
   - Gradually increase to 100%

**Detection:**
- Slower page load times
- Increased query execution times
- User complaints about slowness

**Rollback Plan:**
- Immediate rollback if performance degrades
- Analyze bottlenecks
- Re-implement with fixes

---

## Risk Mitigation Priority Order

### Priority 1: Critical Function Integrity (Risks #1 and #2)

**Focus:** Data correctness and user access

**Actions:**
1. Implement comprehensive unit tests
2. Run parallel validation (old vs new logic)
3. Test with realistic data volumes
4. Verify all edge cases

**Time Investment:** 40% of implementation time
**Justification:** Incorrect data or access issues directly impact users

### Priority 2: Real-Time Functionality (Risk #3 and #6)

**Focus:** Subscription reliability and deployment safety

**Actions:**
1. Test real-time updates extensively
2. Plan deployment timing
3. Monitor during rollout
4. Have rollback plan ready

**Time Investment:** 25% of implementation time
**Justification:** Core feature - must work flawlessly

### Priority 3: Schema Stability (Risk #5 and #4)

**Focus:** Database integrity and backward compatibility

**Actions:**
1. Validate schema changes
2. Stage deployments
3. Maintain backward compatibility
4. Search for component usages

**Time Investment:** 20% of implementation time
**Justification:** Foundation for all queries

### Priority 4: Performance (Risk #7)

**Focus:** Monitoring and optimization

**Actions:**
1. Measure baseline performance
2. Monitor after deployment
3. Be prepared to optimize further

**Time Investment:** 15% of implementation time
**Justification:** Low probability, medium impact

---

## Testing Strategy

### Unit Tests (Backend)

**Coverage Required:**

1. **Bulk Query Functions:**
   ```typescript
   describe('getBulkInjuriesForPlayers', () => {
     it('returns injuries for all players');
     it('handles empty player list');
     it('handles players with no injuries');
     it('returns injuries in correct structure');
   });
   ```

2. **Coach Player Filtering:**
   ```typescript
   describe('getPlayersForCoach', () => {
     it('returns only assigned players');
     it('handles coach with no teams');
     it('includes multi-team players once');
     it('filters by organization');
   });
   ```

3. **Index Usage:**
   ```typescript
   describe('query optimizations', () => {
     it('uses composite indexes correctly');
     it('does not use .filter() after .withIndex()');
   });
   ```

### Integration Tests (Frontend)

**Coverage Required:**

1. **Parent Dashboard:**
   ```typescript
   describe('ParentChildrenView', () => {
     it('displays all children');
     it('shows correct data for each child');
     it('updates when data changes');
     it('handles bulk query failures gracefully');
   });
   ```

2. **Coach Dashboard:**
   ```typescript
   describe('CoachDashboard', () => {
     it('shows only assigned players');
     it('filters correctly');
     it('updates when team assignments change');
   });
   ```

### End-to-End Tests

**Critical Paths:**

1. **Parent Flow:**
   - Login as parent
   - Navigate to dashboard
   - Verify all children display
   - Change child data in another session
   - Verify real-time update

2. **Coach Flow:**
   - Login as coach
   - Navigate to dashboard
   - Verify only assigned players show
   - Filter by team
   - Verify player count correct

### Manual Testing Checklist

- [ ] Parent with 1 child
- [ ] Parent with 5 children
- [ ] Parent with no children
- [ ] Coach with 2 teams
- [ ] Coach with no teams
- [ ] Admin viewing all players
- [ ] Real-time updates in all views
- [ ] Mobile responsive layouts work
- [ ] No console errors
- [ ] No network errors in DevTools

---

## Monitoring Plan

### Metrics to Track

**Before Optimization:**
- Function calls per day
- Average query response time
- Error rate
- Active subscription count

**During Deployment:**
- Error rate (should stay flat)
- Response times (should improve)
- User session duration (should be unaffected)

**After Optimization:**
- Function calls per day (expect 50-70% reduction)
- Query response time (expect 30% improvement)
- User-reported issues (expect zero)

### Alert Thresholds

Set up alerts for:
- Error rate > 5% increase
- Query response time > 2× baseline
- Function calls > 1M per day
- Any query failures

### Rollback Triggers

Immediate rollback if:
- Error rate increases by 10%+
- Multiple users report data issues
- Convex function calls increase instead of decrease
- Critical functionality breaks

---

## Deployment Checklist

### Pre-Deployment

- [ ] All code reviewed
- [ ] All tests passing
- [ ] Type checking clean
- [ ] Linting clean
- [ ] Staging environment tested
- [ ] Rollback plan documented
- [ ] Team notified of deployment
- [ ] Low-traffic time scheduled

### Deployment Steps

- [ ] Deploy backend schema changes
- [ ] Verify indexes created
- [ ] Deploy backend query changes
- [ ] Verify backend functions work
- [ ] Deploy frontend changes
- [ ] Run smoke tests
- [ ] Monitor for 30 minutes
- [ ] Verify metrics improving

### Post-Deployment

- [ ] Baseline metrics collected
- [ ] No errors in logs
- [ ] User reports reviewed
- [ ] Performance metrics reviewed
- [ ] Documentation updated
- [ ] Team notified of success

---

## Stakeholder Communication

### Before Implementation

**Message to Team:**
> "We've identified optimization opportunities that will reduce Convex usage by 50-70%. Implementation will take 3-4 days with comprehensive testing. During deployment, users may need to refresh their browsers. Low risk with rollback plan in place."

### During Implementation

**Status Updates:**
- Phase completed
- Current testing status
- Any issues encountered
- Next steps

### After Completion

**Success Report:**
- Metrics improvement
- Issues resolved
- Lessons learned
- Next optimization opportunities

---

## Lessons Learned Template

After implementation, document:

1. **What went well:**
   - Which mitigations worked
   - Unexpected benefits
   - Testing that caught issues

2. **What could be improved:**
   - Risks that materialized
   - Mitigations that didn't work
   - Better approaches identified

3. **Recommendations for future:**
   - Pattern to follow
   - Pattern to avoid
   - Tools that helped

---

## Conclusion

The proposed optimizations carry **MEDIUM risk** but are **necessary** to prevent service interruption. The primary risks involve data consistency and user access, which can be mitigated through:

1. **Comprehensive testing** at each phase
2. **Parallel validation** during migration
3. **Backward compatibility** in all changes
4. **Immediate rollback capability** if issues arise

With proper implementation following the mitigation strategies outlined, the risk is acceptable given the critical need to reduce Convex usage.

**Recommendation:** Proceed with implementation using phased approach with thorough testing.

---

**Document Status:** FINAL
**Review Required:** Yes
**Approval Required:** Yes before implementation begins
**Estimated Reading Time:** 15-20 minutes
