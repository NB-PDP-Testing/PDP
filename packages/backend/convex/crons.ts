import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run review status updates daily at 2 AM
crons.interval(
  "update review statuses",
  { hours: 24 }, // Run every 24 hours
  internal.models.orgPlayerEnrollments.updateReviewStatuses,
  {}
);

// Run consent expiry checks daily at 3 AM
crons.interval(
  "process consent expiry",
  { hours: 24 }, // Run every 24 hours
  internal.models.passportSharing.processConsentExpiry,
  {}
);

// Phase 4: Adjust personalized thresholds weekly (every Sunday at 2 AM UTC)
crons.weekly(
  "adjust personalized thresholds",
  {
    dayOfWeek: "sunday",
    hourUTC: 2, // 2 AM UTC
    minuteUTC: 0,
  },
  internal.models.coachTrustLevels.adjustPersonalizedThresholds,
  {}
);

// Phase 6.1: Reset daily spend counters at midnight UTC (US-005)
crons.daily(
  "update-org-daily-spend",
  {
    hourUTC: 0,
    minuteUTC: 0,
  },
  internal.models.orgCostBudgets.updateOrgDailySpend,
  {}
);

// Phase 6.1: Check cost alerts every 10 minutes (US-006)
crons.interval(
  "check-cost-alerts",
  { minutes: 10 },
  internal.models.platformCostAlerts.checkCostAlerts,
  {}
);

// Phase 6.1: Reset expired rate limit windows hourly (US-010)
crons.hourly(
  "reset-rate-limit-windows",
  { minuteUTC: 0 },
  internal.models.rateLimits.resetRateLimitWindows,
  {}
);

export default crons;
