# PostHog Dashboard Setup Guide

**Date:** January 3, 2026
**Time to Complete:** 15-20 minutes (starter dashboards)

This guide shows you how to create dashboards with **what's tracking NOW**, plus how to add business event tracking later.

---

## ⚡ Quick Start: What's Tracking Right Now

**Currently Active Events:**
- ✅ `$pageview` - All page navigation (automatic)
- ✅ `user_logged_in` - User login events
- ✅ `user_logged_out` - User logout events
- ✅ `$autocapture` - Clicks, form submissions (automatic)

**Not Yet Tracking (need code changes):**
- ❌ `organization_created`, `team_created`, `player_enrolled`
- ❌ `voice_note_recorded`, `skill_assessment_completed`
- ❌ `ai_insight_generated`, `parent_dashboard_accessed`

---

## 🎯 Phase 1: Starter Dashboards (Available NOW)

These dashboards work with events that are already being tracked.

### Dashboard 1: Traffic & Navigation

**Purpose:** See how users navigate your app

#### How to Create:

1. **Navigate to Dashboards:**
   - Click **"Dashboard"** in the left sidebar
   - Click **"+ New dashboard"** (top right)
   - Name it: "📊 Traffic Analytics"

2. **Add Insight 1 - Pageviews Over Time:**
   - Click **"Add insight"**
   - Select **"Trends"**
   - Event: `$pageview`
   - Display: **Total count**
   - Interval: **Daily**
   - Click **"Save & add to dashboard"**

3. **Add Insight 2 - Most Viewed Pages:**
   - Click **"Add insight"** again
   - Select **"Trends"**
   - Event: `$pageview`
   - Breakdown: **$current_url**
   - Chart type: **Bar chart**
   - Time range: **Last 7 days**
   - Click **"Save & add to dashboard"**

4. **Add Insight 3 - Unique Visitors:**
   - Click **"Add insight"**
   - Select **"Trends"**
   - Event: `$pageview`
   - Display: **Unique users**
   - Interval: **Daily**
   - Click **"Save & add to dashboard"**

**What you'll see:** Traffic patterns, popular pages, visitor counts

---

### Dashboard 2: User Activity

**Purpose:** Monitor active users and sessions

#### How to Create:

1. **Create New Dashboard:**
   - Click **"+ New dashboard"**
   - Name it: "👥 User Activity"

2. **Add Insight 1 - Daily Active Users:**
   - Click **"Add insight"**
   - Select **"Trends"**
   - Event: **Any event** (or `$pageview`)
   - Display: **Unique users**
   - Interval: **Daily**
   - Click **"Save & add to dashboard"**

3. **Add Insight 2 - Login Activity:**
   - Click **"Add insight"**
   - Select **"Trends"**
   - Event: `user_logged_in`
   - Display: **Total count**
   - Interval: **Daily**
   - Click **"Save & add to dashboard"**

4. **Add Insight 3 - Session Duration:**
   - Click **"Add insight"**
   - Select **"Trends"**
   - Event: `$pageview`
   - Property filter: **$session_duration** (exists)
   - Aggregation: **Average**
   - Click **"Save & add to dashboard"**

**What you'll see:** Daily active users, login patterns, session lengths

---

### Dashboard 3: Marketing Pages (Pre-Signup)

**Purpose:** Track anonymous visitors on marketing pages

#### How to Create:

1. **Create New Dashboard:**
   - Click **"+ New dashboard"**
   - Name it: "📢 Marketing Analytics"

2. **Add Insight 1 - Marketing Page Views:**
   - Click **"Add insight"**
   - Select **"Trends"**
   - Event: `$pageview`
   - Filter: **$current_url** does NOT contain `/orgs/` (exclude app pages)
   - Display: **Total count**
   - Interval: **Daily**
   - Click **"Save & add to dashboard"**

3. **Add Insight 2 - Traffic Sources:**
   - Click **"Add insight"**
   - Select **"Trends"**
   - Event: `$pageview`
   - Breakdown: **$referring_domain**
   - Chart type: **Bar chart**
   - Time range: **Last 7 days**
   - Click **"Save & add to dashboard"**

4. **Add Insight 3 - Top Landing Pages:**
   - Click **"Add insight"**
   - Select **"Trends"**
   - Event: `$pageview`
   - Filter: **$entry_current_url** (exists) - this shows first page visited
   - Breakdown: **$entry_current_url**
   - Chart type: **Bar chart**
   - Click **"Save & add to dashboard"**

**What you'll see:** Marketing traffic, referral sources, popular landing pages

---

## 🚀 Phase 2: Business Event Tracking (Add As You Build Features)

Once you add event tracking to your code, you can create these dashboards.

### How to Add Event Tracking to Your Code

**Example: Track when an organization is created**

```typescript
// In your organization creation code:
import { useAnalytics } from "@/lib/analytics";
import { AnalyticsEvents } from "@/lib/analytics";

function CreateOrgComponent() {
  const { track } = useAnalytics();

  const handleCreateOrg = async (orgData) => {
    // Your org creation logic
    const org = await createOrganization(orgData);

    // Track the event
    track(AnalyticsEvents.ORG_CREATED, {
      org_id: org.id,
      org_name: org.name,
    });
  };
}
```

### Events to Add as Features Are Built:

**When building Organization features:**
- `organization_created` - When org is created
- `organization_joined` - When user joins an org
- `team_created` - When team is created
- `player_enrolled` - When player is added to team

**When building Voice Notes:**
- `voice_note_recorded` - When coach records a note
- `voice_note_transcribed` - When transcription completes
- `ai_insight_generated` - When AI analyzes the note

**When building Assessments:**
- `skill_assessment_started` - When assessment begins
- `skill_assessment_completed` - When assessment is submitted

**When building Parent Features:**
- `parent_dashboard_accessed` - When parent views their dashboard
- `player_profile_viewed` - When profile is opened

---

## 📊 Future Dashboard: Onboarding Funnel

**Create this AFTER you add organization/team event tracking**

### Steps:
1. Click **"Add insight"** → **"Funnels"**
2. Add funnel steps:
   - Step 1: `user_logged_in` (or `$pageview` with URL `/signup`)
   - Step 2: `organization_created`
   - Step 3: `team_created`
   - Step 4: `player_enrolled`
3. Conversion window: **7 days**
4. Save to a new dashboard: "🚀 Product Metrics"

**Note:** This won't work until you add the tracking code for `organization_created`, `team_created`, and `player_enrolled`.

---

## 📊 Future Dashboard: Feature Adoption

**Create this AFTER you add feature event tracking**

### Insights to Create:
- Voice notes recorded over time
- Skill assessments completed
- AI insights generated
- Most used features (bar chart)

**Required:** Add event tracking to each feature first (see Phase 2 above)

---

## ✅ Quick Setup Checklist

### Phase 1 - Available Now (15-20 min):
- [ ] Traffic Analytics dashboard
  - [ ] Pageviews over time
  - [ ] Most viewed pages
  - [ ] Unique visitors
- [ ] User Activity dashboard
  - [ ] Daily active users
  - [ ] Login activity
  - [ ] Session duration
- [ ] Marketing Analytics dashboard
  - [ ] Marketing page views
  - [ ] Traffic sources
  - [ ] Top landing pages

### Phase 2 - Add Later (as features are built):
- [ ] Add organization event tracking to code
- [ ] Add team event tracking to code
- [ ] Add voice note event tracking to code
- [ ] Add skill assessment event tracking to code
- [ ] Create Onboarding Funnel dashboard
- [ ] Create Feature Adoption dashboard

---

## 💡 How to Find Events in PostHog

**To see what events are actually being captured:**

1. Go to **"Activity"** in the left sidebar
2. Look at the **"EVENT"** column - you'll see:
   - `$pageview` (lots of these)
   - `user_logged_in`
   - `user_logged_out`
   - `$autocapture` (clicks)
3. These are the only events you can use in dashboards right now

**To see what URLs are being tracked:**
1. Go to **"Activity"**
2. Click on a `$pageview` event
3. Look at the **"URL / SCREEN"** column

---

## 🎯 What Metrics to Watch Weekly

**With Current Tracking:**
- Daily active users (growing?)
- Login frequency (are users returning?)
- Most viewed pages (what's popular?)
- Session duration (how engaged are users?)
- Traffic sources (where do visitors come from?)

**After Adding Business Events:**
- Onboarding conversion rate (signup → org → team → player)
- Feature adoption (which features are used?)
- Retention (do users come back?)

---

## 🔧 Troubleshooting

**"I don't see any data in my dashboard"**
- Make sure you're looking at the right time range (try "Last 7 days")
- Check if events are actually being captured in the Activity view
- Remember: Business events won't show up until you add tracking code

**"The event I want doesn't exist"**
- Check the "Events to Add" section in Phase 2
- You need to add `track()` calls in your code first
- See the code example above

**"Insights not showing in Dashboard menu"**
- PostHog updated their UI - use "Add insight" from within a dashboard
- Or click "Dashboard" → "+ New dashboard" → "Add insight"

---

## 🚀 Next Steps

1. **Today:** Create the 3 starter dashboards (Phase 1)
2. **This Week:** Review the dashboards daily to understand traffic patterns
3. **As You Build:** Add event tracking to each new feature (Phase 2)
4. **Monthly:** Create new dashboards as more events become available

---

**Questions?** See PostHog docs: https://posthog.com/docs/product-analytics/dashboards

**Ready to start?** Follow Phase 1 to create your first 3 dashboards! 📊
