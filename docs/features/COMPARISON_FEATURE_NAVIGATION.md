# Coach Passport Comparison Feature - Navigation Flows

## Overview

The passport comparison feature allows coaches to compare their local player assessments with shared passport data from other organizations. This document outlines all navigation paths to access this feature.

---

## Current Navigation Path (Implemented)

### For Coaches

```
┌─────────────────────────────────────────────────────────────────┐
│                        COACH DASHBOARD                          │
│                   /orgs/[orgId]/coach                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SIDEBAR NAVIGATION                          │
│                                                                 │
│  📁 Players                                                     │
│    ├── Overview                                                 │
│    ├── My Players                                               │
│    ├── Assessments                                              │
│    └── 🔗 Shared Passports  ◄──── CLICK HERE                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SHARED PASSPORTS HUB                         │
│          /orgs/[orgId]/coach/shared-passports                   │
│                                                                 │
│  ┌──────────┬──────────┬──────────┬──────────┐                 │
│  │My Players│  Active  │ Pending  │  Browse  │                 │
│  └──────────┴────┬─────┴──────────┴──────────┘                 │
│                  │                                              │
│                  ▼                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    ACTIVE TAB                            │   │
│  │  Shows passports shared WITH your organization           │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ 👤 Cian Murphy                                   │    │   │
│  │  │    From: Cork Youth GAA                         │    │   │
│  │  │    Shared: Basic Profile, Skill Ratings         │    │   │
│  │  │                                                  │    │   │
│  │  │    [View Passport]  [Compare] ◄── CLICK HERE    │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    COMPARISON VIEW                              │
│  /orgs/[orgId]/coach/shared-passports/[playerId]/compare       │
│                       ?consentId=[consentId]                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Compare: Cian Murphy                    [Same Sport]   │   │
│  │  Comparing your assessment with Cork Youth GAA          │   │
│  │                                                          │   │
│  │  ┌──────────┬────────────┬───────────┐                  │   │
│  │  │ Insights │ Split View │  Overlay  │  ◄── VIEW MODES  │   │
│  │  └──────────┴────────────┴───────────┘                  │   │
│  │                                                          │   │
│  │  [Summary Stats] [AI Insights] [Divergences]            │   │
│  │  [Agreements] [Blind Spots] [Recommendations]           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Navigation

### As a Coach:

1. **Log in** to PlayerARC as a coach
2. **Click "Shared Passports"** in the left sidebar (under Players section)
3. **Click the "Active" tab** to see passports shared with your organization
4. **Find a player** with shared passport data
5. **Click "Compare"** button on the player card
6. **Use the view mode selector** to switch between:
   - **Insights** (default) - Summary stats, divergences, AI insights
   - **Split View** - Side-by-side comparison
   - **Overlay** - Radar chart visualization

---

## Prerequisites for Using This Feature

Before a coach can use the comparison feature, the following must be in place:

### 1. Parent Must Share Passport
```
Parent Portal → Sharing Settings → Grant access to organization
```

### 2. Passport Must Have Skill Ratings
The shared passport must include skill ratings data for comparison to work.

### 3. Coach Must Have Local Assessments
The coach's organization should have their own skill assessments for the same player.

### 4. Share Must Be Active
The parent's share consent must be active (not expired or revoked).

---

## Stakeholder Access Summary

| Role | Can Access Comparison? | Path |
|------|------------------------|------|
| **Coach** | ✅ Yes | Sidebar → Shared Passports → Active → Compare |
| **Admin** | ✅ Yes (if also Coach) | Same as Coach |
| **Parent** | ❌ No | Parents share data, don't compare |
| **Player (18+)** | ❌ No | May view own passport, not compare |

---

## URL Structure

```
/orgs/[orgId]/coach/shared-passports/[playerId]/compare?consentId=[consentId]
```

| Parameter | Description |
|-----------|-------------|
| `orgId` | The coach's organization ID |
| `playerId` | The player identity ID |
| `consentId` | The passport share consent ID (required) |

---

## Feature Flow Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  PARENT PORTAL  │────▶│  SHARE CONSENT  │────▶│  COACH VIEWS    │
│                 │     │                 │     │  SHARED DATA    │
│  - Configure    │     │  - Active       │     │                 │
│    sharing      │     │  - Pending      │     │  - View Passport│
│  - Select orgs  │     │  - Revoked      │     │  - Compare ★    │
│  - Choose data  │     │                 │     │                 │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## What Each View Mode Shows

### Insights View (Default)
- Agreement percentage
- Divergence count
- Your assessments count
- Shared assessments count
- AI-Powered Insights panel
- Collapsible divergences section
- Collapsible agreements section
- Blind spots (skills in one but not other)
- Actionable recommendations

### Split View
- **Desktop**: Resizable side-by-side panels
- **Mobile**: Tab-based switching
- Your assessment on left (green)
- Shared data on right (blue)

### Overlay View
- Dual-dataset radar chart
- Skills comparison table with delta values
- Option to group by category

---

## Test Data Needed

To test this feature, you need:

1. **Two organizations** in the system
2. **A player enrolled** at both organizations
3. **Parent account** linked to the player
4. **Parent shares passport** with coach's organization
5. **Coach accepts** the pending share
6. **Both orgs have skill assessments** for the player

---

## Related Routes

| Route | Purpose |
|-------|---------|
| `/orgs/[orgId]/coach/shared-passports` | Shared Passports Hub |
| `/orgs/[orgId]/players/[playerId]` | Player Passport (local) |
| `/orgs/[orgId]/players/[playerId]/shared` | View Shared Passport Data |
| `/orgs/[orgId]/coach/shared-passports/[playerId]/compare` | **Comparison View** |

---

## Future Navigation Enhancements (Not Yet Implemented)

These navigation paths could be added in future iterations:

1. **From Player Passport Page**
   ```
   /orgs/[orgId]/players/[playerId]
   └── "Compare with Shared" button (when shared data exists)
   ```

2. **From Coach Dashboard Quick Actions**
   ```
   Coach Dashboard → Quick Actions → "Compare Shared Passports"
   ```

3. **From Notifications**
   ```
   "New passport shared" notification → Direct link to compare
   ```
