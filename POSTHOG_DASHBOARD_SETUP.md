# PostHog Dashboard Setup Guide

**Date:** January 3, 2026
**Time to Complete:** 20-30 minutes

This guide walks you through creating 3 essential dashboards in PostHog for monitoring PDP/PlayerARC.

---

## 🎯 Dashboard 1: User Onboarding Funnel

**Purpose:** Track how users complete signup and organization setup

### Step-by-Step:

1. **Go to PostHog Dashboard**
   - Click **"Insights"** in left sidebar
   - Click **"+ New insight"**

2. **Create Funnel:**
   - Select **"Funnels"** tab
   - Name: "User Onboarding Funnel"

3. **Add Steps:**
   - Step 1: `user_signed_up` (or `$pageview` with URL `/`)
   - Step 2: `organization_created`
   - Step 3: `team_created`
   - Step 4: `player_enrolled`

4. **Configure:**
   - Conversion window: **7 days**
   - Breakdown: None (or by `$referrer` to see sources)

5. **Save to Dashboard:**
   - Click **"Save"**
   - **"Add to dashboard"** → **"Create new dashboard"**
   - Name: "🚀 Product Overview"

### What to Monitor:
- **Drop-off between steps** → Where users get stuck
- **Conversion rate** → % completing full onboarding
- **Time between steps** → How long setup takes

---

## 📊 Dashboard 2: Feature Adoption

**Purpose:** Track which features are being used

### Step-by-Step:

1. **Create New Insight:**
   - Type: **"Trends"**
   - Name: "Feature Usage Over Time"

2. **Add Events:**
   - `voice_note_recorded`
   - `skill_assessment_completed`
   - `ai_insight_generated`
   - `parent_dashboard_accessed`

3. **Configure:**
   - Interval: **Weekly**
   - Chart type: **Line chart**
   - Display: **Total count**

4. **Save to Dashboard:**
   - Add to **"🚀 Product Overview"**

### Additional Insights to Add:

**Most Used Features (Last 30 Days):**
- Type: **Bar chart**
- Events: All feature events
- Breakdown: By event name
- Shows which features are most popular

**Feature Adoption Rate:**
- Type: **Trends**
- Formula: `unique users who did X / total users`
- Measures feature penetration

---

## 👥 Dashboard 3: User Engagement

**Purpose:** Monitor active users and retention

### Create These Insights:

**1. Weekly Active Users (WAU):**
- Type: **Trends**
- Event: Any event (or `$pageview`)
- Display: **Unique users**
- Interval: **Weekly**

**2. Daily Active Users (DAU):**
- Same as WAU but interval: **Daily**

**3. Stickiness (DAU/MAU):**
- Type: **Stickiness**
- Shows how often users return
- Good target: >20%

**4. User Retention:**
- Type: **Retention**
- Initial event: `user_signed_up`
- Returning event: Any event
- Shows % users returning after signup

**5. Session Duration:**
- Type: **Trends**
- Event: `$pageview`
- Property: `$session_duration`
- Aggregation: **Average**

### Save All to Dashboard:
- Create new dashboard: "📈 User Engagement"

---

## 🎨 Recommended Dashboard Layout

### Dashboard 1: "🚀 Product Overview"
```
┌────────────────────────────────┐
│   User Onboarding Funnel       │  ← Big, top priority
├────────────────┬───────────────┤
│ Feature Usage  │ Most Used     │  ← Side by side
│ Over Time      │ Features      │
├────────────────┴───────────────┤
│   Key Metrics Summary          │  ← Numbers at a glance
│   • Total Users: X             │
│   • Active Orgs: Y             │
│   • Players Tracked: Z         │
└────────────────────────────────┘
```

### Dashboard 2: "📈 User Engagement"
```
┌────────────────┬───────────────┐
│ Weekly Active  │ Daily Active  │
│ Users          │ Users         │
├────────────────┴───────────────┤
│   User Retention Curve         │
├────────────────┬───────────────┤
│ Stickiness     │ Avg Session   │
│ (DAU/MAU)      │ Duration      │
└────────────────┴───────────────┘
```

---

## 🔔 Set Up Alerts (Optional)

**Create alerts for important drops:**

1. **Go to Insights → Create Alert**
2. **Alert examples:**
   - WAU drops below 50 → Email you
   - Onboarding funnel conversion < 50% → Slack notification
   - Error rate > 5% → Immediate alert

---

## 📝 Quick Setup Checklist

Use this checklist as you create dashboards:

### Dashboard 1: Product Overview
- [ ] User Onboarding Funnel (4 steps)
- [ ] Feature Usage Over Time (line chart)
- [ ] Most Used Features (bar chart)
- [ ] Feature Adoption Rate (%)

### Dashboard 2: User Engagement
- [ ] Weekly Active Users (WAU)
- [ ] Daily Active Users (DAU)
- [ ] Stickiness (DAU/MAU ratio)
- [ ] User Retention curve
- [ ] Average session duration

### Bonus:
- [ ] Set up 1-2 alerts for critical metrics
- [ ] Create "Session Replays" saved filters
- [ ] Add team members to PostHog

---

## 🎯 What Metrics to Watch Weekly

**Critical Metrics:**
1. **Weekly Active Users** → Growing?
2. **Onboarding Conversion** → >50% ideal
3. **Retention (Week 1)** → >40% is good
4. **Feature Adoption** → Are key features used?

**Red Flags:**
- ⚠️ WAU declining week-over-week
- ⚠️ Onboarding drop-off > 50% at any step
- ⚠️ Retention < 20%
- ⚠️ Key features unused

---

## 💡 Pro Tips

### 1. Start Simple
Don't create 20 dashboards on day one. Start with these 2-3, add more as needed.

### 2. Use Saved Filters
Create filters like:
- "Coaches only"
- "Parents only"
- "Sessions with errors"
- "Long sessions (>5 min)"

### 3. Share Dashboards
Share links with your team to keep everyone aligned on metrics.

### 4. Weekly Review Ritual
Pick a day (e.g., Monday 9am) to review dashboards and note trends.

---

## 🚀 Next Steps After Setup

Once dashboards are running:
1. **Week 1:** Watch the data, understand patterns
2. **Week 2:** Identify one improvement (e.g., fix onboarding drop-off)
3. **Week 3:** Measure impact of changes
4. **Ongoing:** Add dashboards as you add features

---

**Questions?** See PostHog docs: https://posthog.com/docs/product-analytics/dashboards

**Ready to create your dashboards?** Follow this guide step-by-step in PostHog! 📊
