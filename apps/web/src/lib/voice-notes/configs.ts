/**
 * Voice Notes v2 - Shared Configuration
 *
 * Topic, status, and artifact status display configurations.
 * Used by voice monitoring artifacts grid and artifact detail page.
 */

export const TOPIC_CONFIG: Record<string, { label: string; color: string }> = {
  injury: { label: "Injury", color: "bg-red-100 text-red-800" },
  skill_rating: { label: "Skill Rating", color: "bg-blue-100 text-blue-800" },
  skill_progress: { label: "Skill Progress", color: "bg-sky-100 text-sky-800" },
  behavior: { label: "Behavior", color: "bg-orange-100 text-orange-800" },
  performance: { label: "Performance", color: "bg-green-100 text-green-800" },
  attendance: { label: "Attendance", color: "bg-yellow-100 text-yellow-800" },
  wellbeing: { label: "Wellbeing", color: "bg-purple-100 text-purple-800" },
  recovery: { label: "Recovery", color: "bg-pink-100 text-pink-800" },
  development_milestone: {
    label: "Milestone",
    color: "bg-emerald-100 text-emerald-800",
  },
  physical_development: {
    label: "Physical Dev",
    color: "bg-teal-100 text-teal-800",
  },
  parent_communication: {
    label: "Parent Comms",
    color: "bg-amber-100 text-amber-800",
  },
  tactical: { label: "Tactical", color: "bg-indigo-100 text-indigo-800" },
  team_culture: {
    label: "Team Culture",
    color: "bg-violet-100 text-violet-800",
  },
  todo: { label: "Todo", color: "bg-slate-100 text-slate-800" },
  session_plan: { label: "Session Plan", color: "bg-cyan-100 text-cyan-800" },
};

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  extracted: { label: "Extracted", color: "bg-blue-100 text-blue-700" },
  resolving: { label: "Resolving", color: "bg-yellow-100 text-yellow-700" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700" },
  needs_disambiguation: {
    label: "Needs Review",
    color: "bg-orange-100 text-orange-700",
  },
  merged: { label: "Merged", color: "bg-purple-100 text-purple-700" },
  discarded: { label: "Discarded", color: "bg-gray-100 text-gray-500" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700" },
};

export const ARTIFACT_STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  received: { label: "Received", color: "bg-gray-100 text-gray-700" },
  transcribing: {
    label: "Transcribing",
    color: "bg-yellow-100 text-yellow-700",
  },
  transcribed: { label: "Transcribed", color: "bg-blue-100 text-blue-700" },
  processing: { label: "Processing", color: "bg-amber-100 text-amber-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700" },
};
