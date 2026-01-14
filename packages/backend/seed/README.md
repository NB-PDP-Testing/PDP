# Session Plans Seed Data

This script creates realistic test data for the session plans feature.

## Quick Start (Easiest Method)

Run this command from the repository root, replacing the values with your own:

```bash
npx convex run seed/sessionPlansSeed:seedSessionPlans \
  --args '{
    "organizationId": "jh7fc03thdh2hrzjvp0a6fh2tn7z1c36",
    "coachId": "k17325xe4yhjxfw9e3y99m8e5s7z2tfd",
    "coachName": "Neil B",
    "count": 25
  }'
```

## What Gets Created

The seed script creates diverse session plans with:

### Variety
- **Sports**: Football, Soccer, Basketball, Rugby, GAA
- **Age Groups**: U8, U10, U12, U14, U16, U18, Senior
- **Intensities**: Low, Medium, High
- **Focus Areas**: Technical Skills, Tactical Awareness, Physical Fitness, Team Cohesion, etc.

### Metadata
- **Skills**: 3-5 randomly selected skills per plan (Passing, Dribbling, Ball Control, etc.)
- **Categories**: 1-3 categories (Technical Training, Game-Based, etc.)
- **Equipment**: 3-5 equipment items (Balls, Cones, Bibs, Goals, etc.)

### Realistic Data
- **Creation Dates**: Distributed over the last 90 days
- **Visibility**: 70% private, 27% club-shared, 3% platform
- **Favorites**: 30% marked as favorited
- **Usage**: Random usage counts (0-14 times used)
- **Success Rate**: 60-95% for used plans
- **Featured**: 15% of club-shared plans are admin-pinned

### Structure
Each plan includes:
- Title and description
- Warm-up section (15 min)
- Main session activities
- Cool-down section (15 min)
- Equipment list
- Safety considerations
- Structured sections with activities

## Parameters

- `organizationId` (required): Your organization ID
- `coachId` (required): Your coach/user ID
- `coachName` (required): Your display name
- `count` (optional): Number of plans to create (default: 20)

## Finding Your IDs

### Organization ID
1. Go to your app and navigate to any organization page
2. Check the URL: `/orgs/[YOUR_ORG_ID]/...`
3. The segment after `/orgs/` is your organization ID

### Coach ID
1. Open browser DevTools (F12)
2. Go to Application/Storage > Local Storage
3. Look for Better Auth session data
4. Your user ID is the `id` field

Or check the Network tab for any API call and look for `userId` in the request.

## Alternative: Using the Convex Dashboard

1. Go to https://dashboard.convex.dev
2. Select your project
3. Go to "Functions" tab
4. Find `seed/sessionPlansSeed:seedSessionPlans`
5. Click "Run" and enter your arguments as JSON

## What to Expect

After running with `count: 25`, you should see:
- 25 session plans in the database
- Mix of private and club-shared plans
- Some favorited plans
- Plans with various usage statistics
- Plans distributed across different sports and age groups
- A variety of skills, categories, and equipment tags

This will give you a realistic dataset to test:
- ✅ Filtering by sport, age group, intensity
- ✅ Searching by title/team name
- ✅ Filtering by skills and categories
- ✅ Gallery and list views
- ✅ Favorites functionality
- ✅ Statistics dashboard
- ✅ Club library with featured plans
