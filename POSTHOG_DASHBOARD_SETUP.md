# PostHog Dashboard Setup Guide

**Date:** January 3, 2026
**Time to Complete:** 30-45 minutes

This guide walks you through creating 5 essential dashboards in PostHog for monitoring PDP/PlayerARC (3 product dashboards + 2 marketing dashboards).

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

## 🎯 Dashboard 4: Marketing Performance

**Purpose:** Track anonymous visitors on marketing pages (pre-signup analytics)

### Create These Insights:

**1. Landing Page Views:**
- Type: **Trends**
- Event: `$pageview`
- Filter: URL path contains `/platform` OR `/` (homepage)
- Display: **Total count**
- Interval: **Daily**
- Shows: Traffic to your marketing pages

**2. Top Marketing Pages:**
- Type: **Bar chart**
- Event: `$pageview`
- Breakdown: By `$current_url`
- Filter: URL does NOT contain `/orgs/` (exclude app pages)
- Shows: Which marketing pages get the most traffic

**3. Traffic Sources:**
- Type: **Trends**
- Event: `$pageview`
- Breakdown: By `$referring_domain`
- Shows: Where visitors come from (direct, Google, social, etc.)

**4. Average Time on Marketing Pages:**
- Type: **Trends**
- Event: `$pageview`
- Filter: URL path = `/platform` (or other marketing pages)
- Property: `$session_duration`
- Aggregation: **Average**
- Shows: How engaging your marketing content is

**5. Bounce Rate:**
- Type: **Trends**
- Formula: `Sessions with only 1 pageview / Total sessions`
- Shows: % of visitors who leave after viewing one page

### Save to Dashboard:
- Create new dashboard: "📢 Marketing Analytics"

### What to Monitor:
- **Traffic trends** → Are visits increasing?
- **Popular pages** → Which content resonates?
- **Referral sources** → Where to focus marketing efforts?
- **Engagement** → Are visitors reading or bouncing?

---

## 🚀 Dashboard 5: Marketing Conversion Funnel

**Purpose:** Track the journey from anonymous visitor to signed-up user

### Step-by-Step:

1. **Create New Funnel Insight:**
   - Type: **"Funnels"**
   - Name: "Marketing to Signup Conversion"

2. **Add Funnel Steps:**
   - Step 1: `$pageview` with URL path = `/` (homepage visit)
   - Step 2: `$pageview` with URL path = `/platform` (explored features)
   - Step 3: `$pageview` with URL path = `/signup` (visited signup page)
   - Step 4: `user_signed_up` (completed registration)

3. **Configure:**
   - Conversion window: **30 days** (visitors may return later)
   - Breakdown: By `$referring_domain` (see which sources convert best)

4. **Save to Dashboard:**
   - Add to **"📢 Marketing Analytics"**

### Additional Marketing Insights:

**Signup Page Performance:**
- Type: **Trends**
- Event: `$pageview`
- Filter: URL path = `/signup`
- Compare with `user_signed_up` event
- Shows: Signup page views vs actual signups

**Platform Page Clicks:**
- Type: **Trends**
- Event: `$autocapture` (clicks on platform page)
- Filter: URL contains `/platform`
- Breakdown: By element text
- Shows: Which buttons/links get clicked most

**Session Recordings for Drop-offs:**
- Go to **Session Recordings**
- Filter: Visited `/signup` but did NOT complete `user_signed_up`
- Watch recordings to see why users don't complete signup

### What to Monitor:
- **Conversion rate** → % of visitors who sign up
- **Drop-off points** → Where in the funnel users leave
- **Source performance** → Which marketing channels convert best
- **Signup friction** → Session recordings show UX issues

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

### Dashboard 3: "📢 Marketing Analytics"
```
┌────────────────────────────────┐
│ Marketing → Signup Funnel      │  ← Top priority
├────────────────┬───────────────┤
│ Landing Page   │ Traffic       │  ← Side by side
│ Views          │ Sources       │
├────────────────┼───────────────┤
│ Top Pages      │ Avg Time on   │
│ (Bar Chart)    │ Site          │
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

### Dashboard 3: Marketing Analytics
- [ ] Marketing to Signup Funnel (4 steps)
- [ ] Landing Page Views (trends)
- [ ] Top Marketing Pages (bar chart)
- [ ] Traffic Sources (breakdown by referrer)
- [ ] Average Time on Marketing Pages
- [ ] Signup Page Performance

### Bonus:
- [ ] Set up 1-2 alerts for critical metrics
- [ ] Create "Session Replays" saved filters
- [ ] Add team members to PostHog

---

## 🎯 What Metrics to Watch Weekly

**Critical Product Metrics:**
1. **Weekly Active Users** → Growing?
2. **Onboarding Conversion** → >50% ideal
3. **Retention (Week 1)** → >40% is good
4. **Feature Adoption** → Are key features used?

**Critical Marketing Metrics:**
1. **Marketing Page Traffic** → Are visits increasing?
2. **Marketing → Signup Conversion** → >10% is good for B2B SaaS
3. **Traffic Sources** → Which channels bring users?
4. **Bounce Rate** → <40% is healthy

**Red Flags:**
- ⚠️ WAU declining week-over-week
- ⚠️ Onboarding drop-off > 50% at any step
- ⚠️ Retention < 20%
- ⚠️ Key features unused
- ⚠️ Marketing traffic declining
- ⚠️ Signup conversion < 5%
- ⚠️ Bounce rate > 60%

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
