# Convex Usage Monitoring Guide

## Overview

This document describes how to monitor Convex function calls and set up alerts to stay within the free tier limit (1M calls/month).

## Background

The PlayerARC platform was optimized in January 2026 (Phase 1-6 of the performance project) to reduce function calls from 3.2M/month to approximately 800K/month. This document ensures the team can monitor and maintain these improvements.

## Monitoring Setup

### Dashboard Access

1. **Development**: https://dashboard.convex.dev/d/brazen-squirrel-35
2. **Production**: Access via Convex dashboard at https://dashboard.convex.dev/

### Alert Thresholds (Free Tier)

| Threshold | Percentage | Action Required |
|-----------|------------|-----------------|
| 500K/month | 50% | Warning - Review usage patterns |
| 750K/month | 75% | Alert - Investigate any regression |
| 900K/month | 90% | Critical - Immediate action needed |

### Setting Up Alerts

#### Option 1: Convex Dashboard (Recommended)

1. Navigate to [Convex Dashboard](https://dashboard.convex.dev/)
2. Select your deployment
3. Go to **Settings** > **Usage & Billing**
4. Look for alert/notification configuration
5. Set up email notifications at the thresholds above

**Note**: As of January 2026, Convex may not have built-in alerting. If not available:
- Check for Convex updates that add this feature
- Use Option 2 (external monitoring)

#### Option 2: External Monitoring (Fallback)

If Convex doesn't support built-in alerts:

1. **Weekly Manual Review**:
   - Check dashboard every Monday
   - Calculate: `(current month calls) / (days elapsed) * 30`
   - Compare to thresholds

2. **Calendar Reminders**:
   - Set recurring reminder to check Convex usage weekly
   - Add team members who should be notified

3. **Future Enhancement**:
   - Consider building a scheduled action that tracks usage
   - Send Slack/email alerts via external service

### Key Metrics to Monitor

1. **Total Function Calls**: Primary metric for billing
2. **Function Call Breakdown**: Identify high-call functions
3. **Database Bandwidth**: Secondary metric affecting costs
4. **Storage Usage**: For file uploads/documents

### Investigating High Usage

If alerts trigger, investigate:

1. **Check Recent Deployments**:
   ```bash
   git log --oneline -20
   ```

2. **Look for N+1 Patterns**:
   - Queries in loops (Promise.all with individual queries)
   - Missing indexes (filter() instead of withIndex())
   - Frontend calling same query multiple times

3. **Review High-Call Functions**:
   - Dashboard shows call counts per function
   - Focus on functions with >10% of total calls

4. **Compare to Baseline**:
   - Pre-optimization: 3.2M calls/month
   - Post-optimization target: ~800K calls/month

### Performance Patterns to Maintain

See CLAUDE.md "Performance & Query Optimization" section for mandatory patterns:

- NEVER query in a loop
- ALWAYS use batch fetching with Maps
- ALWAYS use composite indexes
- NEVER use filter() - use withIndex()
- PREFER server-side filtering
- LIFT queries to parent components

## Incident Response

### If Approaching 900K Threshold

1. **Immediate**: Check for recent regressions in git log
2. **Short-term**: Identify and disable high-call non-essential features
3. **Medium-term**: Implement additional optimizations
4. **Last Resort**: Consider upgrading to Pro tier temporarily

### Contacts

- GitHub Issue: #330 (Performance Crisis documentation)
- Technical Lead: [Add contact]
- DevOps: [Add contact]

## Version History

| Date | Author | Change |
|------|--------|--------|
| 2026-01-29 | Performance Project | Initial documentation |
