// Rating type for skills (1-5 scale)
export type Rating = 1 | 2 | 3 | 4 | 5;

// Review status for players
export type ReviewStatus = "Not Started" | "Completed" | "Overdue" | "Due Soon";

// Injury types
export type InjurySeverity = "Minor" | "Moderate" | "Severe";
export type InjuryStatus = "Active" | "Recovering" | "Healed";

// Goal types
export type GoalCategory = "Technical" | "Physical" | "Mental" | "Team";
export type GoalPriority = "High" | "Medium" | "Low";
export type GoalStatus =
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "On Hold";

// Insight types
export type InsightType =
  | "goal_progress"
  | "skill_update"
  | "injury"
  | "attendance"
  | "behavior"
  | "performance"
  | "team_insight";
export type InsightStatus = "pending" | "applied" | "dismissed";

// Better Auth organizational roles (hierarchy)
// Note: "coach" and "parent" are NOT Better Auth roles - they are functional roles
// stored in member.functionalRoles array
export type OrgMemberRole = "owner" | "admin" | "member";

// Functional roles (capabilities) - stored in member.functionalRoles array
export type FunctionalRole = "coach" | "parent" | "admin";

// Approval status
export type ApprovalStatus = "pending" | "approved" | "rejected";

// Team gender
export type TeamGender = "Male" | "Female" | "Mixed" | "Boys" | "Girls";

// Parent/Guardian information
export interface ParentGuardian {
  id: string;
  firstName: string;
  surname: string;
  email: string;
  phone?: string;
  relationship?: string;
  isPrimary?: boolean;
}

// Attendance tracking
export interface Attendance {
  training: string;
  matches: string;
}

// Review tracking
export interface ReviewedWith {
  coach: boolean;
  parent: boolean;
  player: boolean;
  forum: boolean;
}

// Positions
export interface Positions {
  favourite: string;
  leastFavourite: string;
  coachesPref: string;
  dominantSide: string;
  goalkeeper: string;
}

// Fitness
export interface Fitness {
  pushPull: string;
  core: string;
  endurance: string;
  speed: string;
  broncoBeep: string;
}

// Return to Play Step
export interface ReturnToPlayStep {
  id: string;
  description: string;
  completed: boolean;
  completedDate?: string;
}

// Goal Milestone
export interface GoalMilestone {
  id: string;
  description: string;
  completed: boolean;
  completedDate?: string;
}

// Coach Note
export interface CoachNote {
  date: string;
  note: string;
  coachId?: string;
}

// Player Note
export interface PlayerNote {
  date: string;
  note: string;
}

// Development Goal
export interface DevelopmentGoal {
  id: string;
  playerId: string;
  title: string;
  description: string;
  category: GoalCategory;
  priority: GoalPriority;
  status: GoalStatus;
  progress: number;
  targetDate: string;
  createdDate: string;
  completedDate?: string;
  linkedSkills: string[];
  milestones: GoalMilestone[];
  parentActions: string[];
  coachNotes: CoachNote[];
  playerNotes: PlayerNote[];
}

// Injury
export interface Injury {
  id: string;
  playerId: string;
  injuryType: string;
  bodyPart: string;
  dateOccurred: string;
  dateReported: string;
  severity: InjurySeverity;
  status: InjuryStatus;
  description: string;
  treatment: string;
  expectedReturn?: string;
  actualReturn?: string;
  daysOut: number;
  returnToPlayProtocol: ReturnToPlayStep[];
  coachNotes: CoachNote[];
  relatedToTraining: boolean;
  relatedToMatch: boolean;
}

// Medical Profile
export interface MedicalProfile {
  bloodType?: string;
  allergies: string[];
  medications: string[];
  conditions: string[];
  doctorName?: string;
  doctorPhone?: string;
  emergencyContact1Name: string;
  emergencyContact1Phone: string;
  emergencyContact2Name?: string;
  emergencyContact2Phone?: string;
  lastMedicalCheck?: string;
  insuranceCovered: boolean;
  notes?: string;
}

// Voice Insight
export interface VoiceInsight {
  id: string;
  type: InsightType;
  playerIds: string[];
  description: string;
  confidence: number;
  suggestedAction: string;
  source?: "pattern" | "ai";
  metadata: Record<string, unknown>;
  status: InsightStatus;
  appliedDate?: string;
  editedDescription?: string;
}

// Voice Note
export interface VoiceNote {
  id: string;
  teamId?: string;
  coachId?: string;
  organizationId?: string;
  date: string;
  type: "training" | "match" | "general";
  audioFileId?: string;
  duration?: number;
  transcription: string;
  transcriptionSource?: string;
  transcriptionConfidence?: number;
  processed: boolean;
  processingError?: string;
  insights: VoiceInsight[];
  createdAt?: number;
}

// Player
export interface Player {
  _id: string;
  name: string;
  ageGroup: string;
  sport: string;
  gender: string;
  teamId: string;
  organizationId: string;
  completionDate?: string;
  season: string;
  reviewedWith?: ReviewedWith;
  attendance?: Attendance;
  injuryNotes?: string;
  reviewStatus?: ReviewStatus;
  lastReviewDate?: string | null;
  nextReviewDue?: string | null;
  skills?: string; // JSON string
  positions?: Positions;
  fitness?: Fitness;
  otherInterests?: string;
  communications?: string;
  actions?: string;
  coachNotes?: string;
  parentNotes?: string;
  playerNotes?: string;
  seasonReviews?: unknown[];
  createdFrom?: string;
  familyId?: string;
  parentFirstName?: string;
  parentSurname?: string;
  parentEmail?: string;
  parentEmails?: string[];
  parentPhone?: string;
  parents?: ParentGuardian[];
  dateOfBirth?: string;
  address?: string;
  town?: string;
  postcode?: string;
  inferredParentFirstName?: string;
  inferredParentSurname?: string;
  inferredParentEmail?: string;
  inferredParentPhone?: string;
  inferredFromSource?: string;
}

// User (Better Auth user with custom fields)
export interface User {
  _id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: number;
  updatedAt: number;
  userId?: string | null;
  firstName?: string;
  lastName?: string;
  phone?: string;
  onboardingCompleted?: boolean;
  approvalStatus?: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: number;
  rejectionReason?: string;
}

// Team (Better Auth team with sports fields)
export interface Team {
  _id: string;
  name: string;
  organizationId: string;
  createdAt: number;
  updatedAt?: number | null;
  sport?: string;
  ageGroup?: string;
  gender?: TeamGender;
  season?: string;
  description?: string;
  trainingSchedule?: string;
  homeVenue?: string;
  isActive?: boolean;
}

// Team Goal
export interface TeamGoal {
  _id: string;
  teamId: string;
  organizationId: string;
  title: string;
  description: string;
  category: "Technical" | "Tactical" | "Physical" | "Mental" | "Team Culture";
  priority: GoalPriority;
  status: GoalStatus;
  progress: number;
  targetDate: string;
  createdDate: string;
  completedDate?: string;
  linkedInsightIds?: string[];
  coachNotes: CoachNote[];
}

// Coach Insight Preferences
export interface CoachInsightPreferences {
  _id: string;
  coachId: string;
  autoApproveEnabled: boolean;
  autoApproveThreshold: number;
  preferredStyle: string;
  totalInsights: number;
  approvedCount: number;
  rejectedCount: number;
  editedCount: number;
  commonEdits: Array<{
    original: string;
    edited: string;
    count: number;
  }>;
  updatedAt: number;
}

// Approval Action (Audit Trail)
export interface ApprovalAction {
  _id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
  adminId: string;
  adminName: string;
  action: "approved" | "rejected" | "unrejected";
  timestamp: number;
  rejectionReason?: string;
  teamsAssigned?: string[];
  playersLinked?: Array<{
    playerId: string;
    playerName: string;
    teamId: string;
    ageGroup: string;
  }>;
  organizationId: string;
}
