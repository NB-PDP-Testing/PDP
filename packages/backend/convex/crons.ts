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

// Phase 6.4: Aggregate daily AI usage stats at 1 AM UTC (US-023)
crons.daily(
  "aggregate-daily-usage",
  {
    hourUTC: 1,
    minuteUTC: 0,
  },
  internal.models.aiUsageLog.aggregateDailyUsage,
  {}
);

// Phase 7.3: Adjust insight confidence thresholds daily at 2 AM UTC (US-012)
crons.daily(
  "adjust-insight-thresholds",
  {
    hourUTC: 2,
    minuteUTC: 0,
  },
  internal.models.coachTrustLevels.adjustInsightThresholds,
  {}
);

// Phase 7.2: Process scheduled deliveries every 5 minutes
crons.interval(
  "process-scheduled-deliveries",
  { minutes: 5 },
  internal.models.coachParentSummaries.processScheduledDeliveries,
  {}
);

// Voice Gateways v2 Phase 2: Review link lifecycle (US-VN-012)

// Expire active review links that have passed their 48h expiry (daily at 2:30 AM UTC)
crons.daily(
  "expire-active-review-links",
  { hourUTC: 2, minuteUTC: 30 },
  internal.models.whatsappReviewLinks.expireActiveLinks,
  {}
);

// Process snoozed review reminders every 15 minutes (US-VN-012c)
crons.interval(
  "process-snoozed-review-reminders",
  { minutes: 15 },
  internal.models.whatsappReviewLinks.processSnoozedReminders,
  {}
);

// Delete expired review links older than 7 days past expiry (daily at 3:15 AM UTC)
crons.daily(
  "cleanup-expired-review-links",
  { hourUTC: 3, minuteUTC: 15 },
  internal.models.whatsappReviewLinks.cleanupExpiredLinks,
  {}
);

// Onboarding Phase 6: Invitation lifecycle jobs

// Mark expired invitations hourly
crons.hourly(
  "mark-expired-invitations",
  { minuteUTC: 5 },
  internal.jobs.invitations.markExpiredInvitations,
  {}
);

// Process auto re-invites for enabled orgs (hourly, offset from mark-expired)
crons.hourly(
  "process-auto-reinvites",
  { minuteUTC: 15 },
  internal.jobs.invitations.processAutoReInvites,
  {}
);

// Send admin alerts for expired invitations (daily at 9 AM UTC)
crons.daily(
  "admin-expiration-alerts",
  { hourUTC: 9, minuteUTC: 0 },
  internal.jobs.invitations.sendAdminExpirationAlerts,
  {}
);

// Archive expired invitations older than 30 days (daily at 3 AM UTC)
crons.daily(
  "archive-old-invitations",
  { hourUTC: 3, minuteUTC: 0 },
  internal.jobs.invitations.archiveOldInvitations,
  {}
);

// Cleanup archived invitations older than 90 days (weekly on Sunday at 4 AM UTC)
crons.weekly(
  "cleanup-archived-invitations",
  { dayOfWeek: "sunday", hourUTC: 4, minuteUTC: 0 },
  internal.jobs.invitations.cleanupArchivedInvitations,
  {}
);

// Onboarding Phase 7: Player graduation jobs

// Detect players who have turned 18 (daily at 6 AM UTC)
crons.daily(
  "detect-player-graduations",
  { hourUTC: 6, minuteUTC: 0 },
  internal.jobs.graduations.detectPlayerGraduations,
  {}
);

export default crons;
