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

export default crons;
