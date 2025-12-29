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

export default crons;
