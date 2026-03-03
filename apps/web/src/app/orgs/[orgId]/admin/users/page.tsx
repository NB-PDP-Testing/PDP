"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useConvex, useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Crown,
  Eye,
  Home,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Search,
  Send,
  Shield,
  SkipForward,
  Trash2,
  UserCheck,
  UserCircle,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ResponsiveForm,
  ResponsiveFormSection,
} from "@/components/forms/responsive-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrgTheme } from "@/hooks/use-org-theme";
import { useRequireVerified } from "@/hooks/use-require-verified";
import { authClient } from "@/lib/auth-client";
import { getCountryName } from "@/lib/constants/address-data";
import { DisableMemberDialog } from "./disable-member-dialog";
import { EditInvitationModal } from "./edit-invitation-modal";
import { InvitationDetailModal } from "./invitation-detail-modal";
import { InvitationHistoryModal } from "./invitation-history-modal";
import { RemoveFromOrgDialog } from "./remove-from-org-dialog";

type FunctionalRole = "coach" | "parent" | "admin" | "player";

// Regex for basic email format validation — defined at module level per Biome rules
const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type UserEditState = {
  [userId: string]: {
    functionalRoles: FunctionalRole[];
    teams: string[];
    ageGroups: string[];
    linkedPlayerIds: string[];
    expanded: boolean;
    modified: boolean;
  };
};

export default function ManageUsersPage() {
  const params = useParams();
  const { theme } = useOrgTheme();
  const { requireVerification } = useRequireVerified();
  const orgId = params.orgId as string;
  const convex = useConvex();

  // Get current user session
  const { data: session } = authClient.useSession();

  // Get members with all details (coach assignments, linked players)
  const membersWithDetails = useQuery(
    api.models.members.getMembersWithDetails,
    { organizationId: orgId }
  );

  // Get pending invitations with detailed assignments
  const pendingInvitations = useQuery(
    api.models.members.getPendingInvitationsWithAssignments,
    { organizationId: orgId }
  );

  // Get pending re-invite requests (merged from invitations page)
  const pendingRequests = useQuery(
    api.models.invitations.getPendingInvitationRequests,
    { organizationId: orgId }
  );

  // Get declined child links (merged from invitations page)
  const declinedLinks = useQuery(
    api.models.guardianPlayerLinks.getDeclinedChildLinks,
    { organizationId: orgId }
  );

  // Find current user's member record in this org
  const currentMember = membersWithDetails?.find(
    (member) => member.user?.email === session?.user?.email
  );

  // Get teams and players for the organization
  const teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });
  const allPlayersData = useQuery(
    api.models.orgPlayerEnrollments.getPlayersForOrg,
    {
      organizationId: orgId,
    }
  );

  // Mutations
  const updateMemberFunctionalRoles = useMutation(
    api.models.members.updateMemberFunctionalRoles
  );
  const updateCoachAssignments = useMutation(
    api.models.coaches.updateCoachAssignments
  );
  // Player linking uses new identity-based guardian system
  const linkPlayers = useMutation(
    api.models.guardianPlayerLinks.linkPlayersToGuardian
  );
  const unlinkPlayers = useMutation(
    api.models.guardianPlayerLinks.unlinkPlayersFromGuardian
  );
  const resendInvitation = useMutation(api.models.members.resendInvitation);
  const cancelInvitation = useMutation(api.models.members.cancelInvitation);
  const reInviteExpired = useMutation(api.models.members.reInviteExpired);
  const bulkReInviteExpired = useMutation(
    api.models.members.bulkReInviteExpired
  );
  const updateInvitationMetadata = useMutation(
    api.models.members.updateInvitationMetadata
  );

  // New mutations for invitation management (merged from invitations page)
  const approveInvitationRequest = useMutation(
    api.models.invitations.approveInvitationRequest
  );
  const denyInvitationRequest = useMutation(
    api.models.invitations.denyInvitationRequest
  );
  const notifyExistingUserOfInvitation = useMutation(
    api.models.invitations.notifyExistingUserOfInvitation
  );
  const resendChildLink = useMutation(
    api.models.guardianPlayerLinks.resendChildLink
  );
  const createPlayerIdentityAndEnrollment = useMutation(
    api.models.orgPlayerEnrollments.createPlayerIdentityAndEnrollment
  );
  const linkPlayerToUser = useMutation(
    api.models.playerIdentities.linkPlayerToUser
  );
  const updatePlayerTeams = useMutation(
    api.models.teamPlayerIdentities.updatePlayerTeams
  );

  const unlinkedEnrollments = useQuery(
    api.models.orgPlayerEnrollments.getUnlinkedEnrollmentsForOrg,
    { organizationId: orgId }
  );
  const teamPlayerLinks = useQuery(
    api.models.teamPlayerIdentities.getTeamMembersForOrg,
    { organizationId: orgId }
  );

  // Transform enrollment data to match expected player format
  const allPlayers =
    allPlayersData?.map((enrollment: any) => ({
      _id: enrollment.playerIdentityId, // Use identity ID as key
      name: `${enrollment.firstName} ${enrollment.lastName}`,
      ageGroup: enrollment.ageGroup,
      sport: enrollment.sportCode || "Unknown", // Phase 3: Use sportCode from sportPassports
    })) || [];

  const [editStates, setEditStates] = useState<UserEditState>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [profileStatusFilter, setProfileStatusFilter] = useState<string>("all");
  const [playerSearchTerms, setPlayerSearchTerms] = useState<{
    [userId: string]: string;
  }>({});

  // Player enrollment state for active member player role assignment
  const [selectedExistingEnrollmentId, setSelectedExistingEnrollmentId] =
    useState<Record<string, string | null>>({});
  const [playerCreateForm, setPlayerCreateForm] = useState<
    Record<string, { dateOfBirth: string; phone: string; postcode: string }>
  >({});
  const [playerCreateTeams, setPlayerCreateTeams] = useState<
    Record<string, string[]>
  >({});
  const [enrollmentSearchTerm, setEnrollmentSearchTerm] = useState<
    Record<string, string>
  >({});
  const [playerMatchStep, setPlayerMatchStep] = useState<
    Record<string, "auto" | "search" | "create" | "confirmed">
  >({});
  type CreateMatchCandidate = {
    _id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    confidence: "high" | "medium" | "low" | "none";
  };
  const [playerCreateMatchWarnings, setPlayerCreateMatchWarnings] = useState<
    Record<string, CreateMatchCandidate[]>
  >({});
  const [playerCreateMatchAcknowledged, setPlayerCreateMatchAcknowledged] =
    useState<Record<string, boolean>>({});
  const [playerMatchTarget, setPlayerMatchTarget] = useState<{
    userId: string;
    name: string;
    email: string;
  } | null>(null);
  const playerMatchResults = useQuery(
    api.models.orgPlayerEnrollments.findMatchingUnlinkedPlayers,
    playerMatchTarget
      ? {
          organizationId: orgId,
          name: playerMatchTarget.name,
          email: playerMatchTarget.email,
        }
      : "skip"
  );

  // Invitation dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFunctionalRoles, setInviteFunctionalRoles] = useState<
    ("coach" | "parent" | "admin" | "player")[]
  >([]);
  const [inviteTeams, setInviteTeams] = useState<string[]>([]); // Team IDs for coach
  const [invitePlayerIds, setInvitePlayerIds] = useState<string[]>([]); // Player IDs for parent
  const [invitePlayerSearch, setInvitePlayerSearch] = useState(""); // Search term for players
  // Player (adult) invite fields — used for youth record pre-matching
  const [invitePlayerFirstName, setInvitePlayerFirstName] = useState("");
  const [invitePlayerLastName, setInvitePlayerLastName] = useState("");
  const [invitePlayerDob, setInvitePlayerDob] = useState("");
  const [inviting, setInviting] = useState(false);

  // Debounced email for existing user lookup (Feature A - Issue #437)
  const [debouncedInviteEmail, setDebouncedInviteEmail] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInviteEmail(inviteEmail);
    }, 500);
    return () => clearTimeout(timer);
  }, [inviteEmail]);
  const isValidEmailFormat = EMAIL_FORMAT_REGEX.test(debouncedInviteEmail);
  const existingInviteUser = useQuery(
    api.models.users.getUserByEmail,
    isValidEmailFormat && inviteDialogOpen
      ? { email: debouncedInviteEmail }
      : "skip"
  );

  // Player matching for invite — run when player role selected + name + DOB provided
  const hasPlayerMatchData =
    inviteFunctionalRoles.includes("player") &&
    invitePlayerFirstName.trim().length > 0 &&
    invitePlayerLastName.trim().length > 0 &&
    invitePlayerDob.length > 0 &&
    inviteDialogOpen;
  const invitePlayerMatchCandidates = useQuery(
    api.models.playerMatching.findPlayerMatchCandidates,
    hasPlayerMatchData
      ? {
          organizationId: orgId,
          firstName: invitePlayerFirstName.trim(),
          lastName: invitePlayerLastName.trim(),
          dateOfBirth: invitePlayerDob,
          email: inviteEmail || undefined,
        }
      : "skip"
  );
  // Best single match for backwards-compatible usage in invite flow
  const invitePlayerMatchResult = invitePlayerMatchCandidates?.[0] ?? null;

  // Invitation detail modal state
  const [selectedInvitationId, setSelectedInvitationId] = useState<
    string | null
  >(null);

  // Invitation history modal state
  const [historyInvitation, setHistoryInvitation] = useState<{
    invitationId: string;
    email: string;
  } | null>(null);

  // Invitation edit modal state
  const [editingInvitation, setEditingInvitation] = useState<any | null>(null);

  // Disable member dialog state
  const [disablingMember, setDisablingMember] = useState<{
    userId: string;
    name: string;
    email: string;
    isDisabled?: boolean;
  } | null>(null);

  // Remove from org dialog state
  const [removingMember, setRemovingMember] = useState<{
    userId: string;
    name: string;
    email: string;
  } | null>(null);

  // Invitation tab state (merged from invitations page)
  const [invitationTab, setInvitationTab] = useState<string>("active");

  // Helper function to infer Better Auth role from functional roles
  // If functional roles include "admin", Better Auth role should be "admin"
  // Otherwise, default to "member"
  const inferBetterAuthRole = (
    functionalRoles: ("coach" | "parent" | "admin" | "player")[]
  ): "member" | "admin" =>
    functionalRoles.includes("admin") ? "admin" : "member";

  const isLoading =
    membersWithDetails === undefined ||
    pendingInvitations === undefined ||
    teams === undefined ||
    allPlayers === undefined;

  // Sync editStates when membersWithDetails changes (fixes stale cache bug)
  useEffect(() => {
    if (!membersWithDetails) {
      return;
    }

    setEditStates((prev) => {
      const updated = { ...prev };
      let hasChanges = false;

      for (const member of membersWithDetails) {
        const userId = member.userId;
        const existingState = prev[userId];

        // Only update if:
        // 1. State exists (user has been expanded before)
        // 2. User hasn't modified the data (modified === false)
        // 3. Data has actually changed
        if (existingState && !existingState.modified) {
          const currentFunctionalRoles = member.functionalRoles || [];
          const currentTeams =
            member.coachAssignments?.teams?.map((teamValue: string) => {
              const teamByName = teams?.find((t: any) => t.name === teamValue);
              if (teamByName) {
                return teamByName._id;
              }
              return teamValue;
            }) || [];
          const currentAgeGroups = member.coachAssignments?.ageGroups || [];
          const currentLinkedPlayerIds =
            member.linkedPlayers?.map((p: any) => p._id) || [];

          // Check if data has changed
          const rolesChanged =
            JSON.stringify(existingState.functionalRoles.sort()) !==
            JSON.stringify(currentFunctionalRoles.sort());
          const teamsChanged =
            JSON.stringify(existingState.teams.sort()) !==
            JSON.stringify(currentTeams.sort());
          const ageGroupsChanged =
            JSON.stringify(existingState.ageGroups.sort()) !==
            JSON.stringify(currentAgeGroups.sort());
          const playersChanged =
            JSON.stringify(existingState.linkedPlayerIds.sort()) !==
            JSON.stringify(currentLinkedPlayerIds.sort());

          if (
            rolesChanged ||
            teamsChanged ||
            ageGroupsChanged ||
            playersChanged
          ) {
            updated[userId] = {
              ...existingState,
              functionalRoles: currentFunctionalRoles,
              teams: currentTeams,
              ageGroups: currentAgeGroups,
              linkedPlayerIds: currentLinkedPlayerIds,
            };
            hasChanges = true;
          }
        }
      }

      return hasChanges ? updated : prev;
    });
  }, [membersWithDetails, teams]);

  // Auto-update the match target when a member enters "auto" step
  useEffect(() => {
    const entry = Object.entries(playerMatchStep).find(([, s]) => s === "auto");
    if (!entry) {
      if (playerMatchTarget !== null) {
        setPlayerMatchTarget(null);
      }
      return;
    }
    const [targetId] = entry;
    if (playerMatchTarget?.userId === targetId) {
      return;
    }
    const m = (membersWithDetails as any[] | undefined)?.find(
      (x: any) => x.userId === targetId
    );
    if (m) {
      setPlayerMatchTarget({
        userId: targetId,
        name: m.user?.name ?? "",
        email: m.user?.email ?? "",
      });
    }
  }, [playerMatchStep, playerMatchTarget, membersWithDetails]);

  // Helper to get unique age groups from teams
  const ageGroups = Array.from(
    new Set(
      teams
        ?.map((team) => team.ageGroup)
        .filter((ag): ag is string => typeof ag === "string") || []
    )
  ).sort();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "coach":
        return <Users className="h-4 w-4" />;
      case "parent":
        return <UserCircle className="h-4 w-4" />;
      case "admin":
        return <Shield className="h-4 w-4" />;
      case "player":
        return <UserCircle className="h-4 w-4" />;
      default:
        return <UserCheck className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "coach":
        return "bg-green-100 text-green-700 border-green-300";
      case "parent":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "admin":
        return "bg-purple-100 text-purple-700 border-purple-300";
      case "player":
        return "bg-orange-100 text-orange-700 border-orange-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const initEditState = (member: any) => {
    if (editStates[member.userId]) {
      return;
    }

    const coachTeamsRaw = member.coachAssignments?.teams || [];
    // Convert team IDs to team names if needed (for consistency)
    // But keep IDs in state for UI checking against team._id
    const coachTeams = coachTeamsRaw.map((teamValue: string) => {
      // Check if it's already a team name
      const teamByName = teams?.find((t: any) => t.name === teamValue);
      if (teamByName) {
        // It's a name, but we need the ID for the UI
        return teamByName._id;
      }
      // It's already an ID, return as-is
      return teamValue;
    });

    const coachAgeGroups = member.coachAssignments?.ageGroups || [];
    const linkedPlayerIds = member.linkedPlayers?.map((p: any) => p._id) || [];
    const functionalRoles = member.functionalRoles || [];

    setEditStates((prev) => ({
      ...prev,
      [member.userId]: {
        functionalRoles,
        teams: coachTeams, // Store IDs for UI consistency
        ageGroups: coachAgeGroups,
        linkedPlayerIds,
        expanded: false,
        modified: false,
      },
    }));
  };

  const toggleExpanded = (userId: string) => {
    setEditStates((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        expanded: !prev[userId]?.expanded,
      },
    }));
  };

  const toggleFunctionalRole = (userId: string, role: FunctionalRole) => {
    setEditStates((prev) => {
      const current = prev[userId]?.functionalRoles || [];
      const newRoles = current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role];
      return {
        ...prev,
        [userId]: {
          ...prev[userId],
          functionalRoles: newRoles,
          modified: true,
        },
      };
    });
    // Manage enrollment state when player role is toggled
    if (role === "player") {
      const currentRoles =
        editStates[userId]?.functionalRoles ??
        (membersWithDetails ?? []).find((m: any) => m.userId === userId)
          ?.functionalRoles ??
        [];
      const isAdding = !currentRoles.includes("player");
      if (isAdding) {
        // Start the auto-match flow when adding the player role
        setPlayerMatchStep((prev) => ({ ...prev, [userId]: "auto" }));
      } else {
        // Clear all player enrollment state when removing
        setSelectedExistingEnrollmentId((prev) => ({
          ...prev,
          [userId]: null,
        }));
        setPlayerCreateForm((prev) => {
          const n = { ...prev };
          delete n[userId];
          return n;
        });
        setPlayerCreateTeams((prev) => {
          const n = { ...prev };
          delete n[userId];
          return n;
        });
        setPlayerMatchStep((prev) => {
          const n = { ...prev };
          delete n[userId];
          return n;
        });
        if (playerMatchTarget?.userId === userId) {
          setPlayerMatchTarget(null);
        }
      }
    }
  };

  const toggleTeam = (userId: string, teamId: string) => {
    setEditStates((prev) => {
      const current = prev[userId]?.teams || [];
      const newTeams = current.includes(teamId)
        ? current.filter((t) => t !== teamId)
        : [...current, teamId];
      return {
        ...prev,
        [userId]: {
          ...prev[userId],
          teams: newTeams,
          modified: true,
        },
      };
    });
  };

  const toggleAgeGroup = (userId: string, ageGroup: string) => {
    setEditStates((prev) => {
      const current = prev[userId]?.ageGroups || [];
      const newAgeGroups = current.includes(ageGroup)
        ? current.filter((a) => a !== ageGroup)
        : [...current, ageGroup];
      return {
        ...prev,
        [userId]: {
          ...prev[userId],
          ageGroups: newAgeGroups,
          modified: true,
        },
      };
    });
  };

  const togglePlayer = (userId: string, playerId: string) => {
    setEditStates((prev) => {
      const current = prev[userId]?.linkedPlayerIds || [];
      const newPlayers = current.includes(playerId)
        ? current.filter((p) => p !== playerId)
        : [...current, playerId];
      return {
        ...prev,
        [userId]: {
          ...prev[userId],
          linkedPlayerIds: newPlayers,
          modified: true,
        },
      };
    });
  };

  const handleSave = async (member: any) => {
    if (!requireVerification()) {
      return;
    }
    const userId = member.userId;
    const state = editStates[userId];
    if (!state?.modified) {
      return;
    }

    // Validation
    if (state.functionalRoles.length === 0) {
      toast.error("User must have at least one functional role");
      return;
    }

    if (state.functionalRoles.includes("coach") && state.teams.length === 0) {
      toast.error("Coach role requires at least one team assignment");
      return;
    }

    if (
      state.functionalRoles.includes("parent") &&
      state.linkedPlayerIds.length === 0
    ) {
      toast.error("Parent role requires at least one linked player");
      return;
    }

    if (state.functionalRoles.includes("player")) {
      const alreadyLinked = allPlayersData?.some(
        (p: any) => p.player?.userId === userId
      );
      if (!alreadyLinked) {
        const hasSelection = !!selectedExistingEnrollmentId[userId];
        const hasDob = !!playerCreateForm[userId]?.dateOfBirth;
        if (!(hasSelection || hasDob)) {
          toast.error(
            "Player role: select a player record to claim, or enter a date of birth to create one"
          );
          return;
        }
      }
    }

    setLoading(userId);
    try {
      // Update functional roles
      await updateMemberFunctionalRoles({
        organizationId: orgId,
        userId,
        functionalRoles: state.functionalRoles,
      });

      // Update coach assignments if they have coach role
      if (state.functionalRoles.includes("coach")) {
        // Pass team IDs directly (do NOT convert to names)
        // Schema expects team IDs, not team names
        const teamIds = (state.teams || []).filter(Boolean);

        await updateCoachAssignments({
          userId,
          organizationId: orgId,
          teams: teamIds,
          ageGroups: state.ageGroups,
        });
      }

      // Update parent-player links if they have parent role
      if (state.functionalRoles.includes("parent") && member.user?.email) {
        const currentLinkedIds =
          member.linkedPlayers?.map((p: any) => p._id) || [];
        const newLinkedIds = state.linkedPlayerIds;

        const toLink = newLinkedIds.filter(
          (id) => !currentLinkedIds.includes(id)
        );
        const toUnlink = currentLinkedIds.filter(
          (id: string) => !newLinkedIds.includes(id)
        );

        if (toLink.length > 0) {
          await linkPlayers({
            playerIdentityIds: toLink as Id<"playerIdentities">[],
            guardianEmail: member.user.email,
            organizationId: orgId,
            // Pass current user info for self-assignment detection
            currentUserId: session?.user?.id,
            currentUserEmail: session?.user?.email,
          });
        }

        if (toUnlink.length > 0) {
          await unlinkPlayers({
            playerIdentityIds: toUnlink as Id<"playerIdentities">[],
            guardianEmail: member.user.email,
            organizationId: orgId,
          });
        }
      }

      // Handle player enrollment for active members
      if (state.functionalRoles.includes("player")) {
        const linkedRecord = allPlayersData?.find(
          (p: any) => p.player?.userId === userId
        );
        if (!linkedRecord) {
          // Link or create
          const enrollmentId = selectedExistingEnrollmentId[userId];
          const teamIds =
            (playerCreateTeams[userId] ?? []).length > 0
              ? playerCreateTeams[userId]
              : undefined;
          if (enrollmentId) {
            const enrollment = unlinkedEnrollments?.find(
              (e) => e.enrollmentId === enrollmentId
            );
            if (enrollment) {
              await linkPlayerToUser({
                playerIdentityId: enrollment.playerIdentityId,
                userId,
                email: member.user?.email ?? undefined,
              });
              // Assign teams if selected
              if (teamIds && teamIds.length > 0) {
                await updatePlayerTeams({
                  playerIdentityId: enrollment.playerIdentityId,
                  organizationId: orgId,
                  teamIds,
                  userEmail: session?.user?.email ?? "",
                });
              }
            }
          } else {
            // Auto-create using Better Auth account name + DOB
            const accountName = member.user?.name ?? "";
            const spaceIdx = accountName.indexOf(" ");
            const firstName =
              spaceIdx >= 0 ? accountName.slice(0, spaceIdx) : accountName;
            const lastName =
              spaceIdx >= 0 ? accountName.slice(spaceIdx + 1) : "";
            const dob = playerCreateForm[userId]?.dateOfBirth;
            if (dob) {
              await createPlayerIdentityAndEnrollment({
                userId,
                email: member.user?.email ?? undefined,
                organizationId: orgId,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                dateOfBirth: dob,
                teamIds,
              });
            }
          }
        } else if (playerCreateTeams[userId] !== undefined) {
          // Already linked — update teams if changed
          await updatePlayerTeams({
            playerIdentityId: linkedRecord._id as Id<"playerIdentities">,
            organizationId: orgId,
            teamIds: playerCreateTeams[userId],
            userEmail: session?.user?.email ?? "",
          });
        }
      }

      setEditStates((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], modified: false },
      }));

      toast.success("User updated successfully");
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const toggleInviteFunctionalRole = (
    role: "coach" | "parent" | "admin" | "player"
  ) => {
    setInviteFunctionalRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireVerification()) {
      return;
    }
    if (!inviteEmail) {
      toast.error("Please enter an email address");
      return;
    }

    if (inviteFunctionalRoles.length === 0) {
      toast.error(
        "Please select at least one functional role (Coach, Parent, or Admin)"
      );
      return;
    }

    setInviting(true);
    try {
      // Auto-infer Better Auth role from functional roles:
      // - If "admin" functional role selected → Better Auth role = "admin"
      // - Otherwise → Better Auth role = "member"
      const betterAuthRole = inferBetterAuthRole(inviteFunctionalRoles);

      // Build invitation metadata with functional roles and role-specific data
      // These will be auto-assigned when the user accepts via syncFunctionalRolesFromInvitation
      type TeamInfo = {
        id: string;
        name: string;
        sport?: string;
        ageGroup?: string;
      };

      type PlayerInfo = {
        id: string;
        name: string;
        ageGroup?: string;
      };

      type InviteMetadata = {
        suggestedFunctionalRoles: ("coach" | "parent" | "admin" | "player")[];
        roleSpecificData?: {
          teams?: TeamInfo[]; // Full team details for coach role
        };
        suggestedPlayerLinks?: PlayerInfo[]; // Full player details for parent role
        matchedPlayerIdentityId?: string; // Pre-matched youth identity for player role
      };

      const metadata: InviteMetadata = {
        suggestedFunctionalRoles: inviteFunctionalRoles,
      };

      // Add coach-specific data (teams with full details for email)
      if (inviteFunctionalRoles.includes("coach") && inviteTeams.length > 0) {
        const teamDetails = inviteTeams
          .map((teamId) => {
            const team = teams?.find((t) => t._id === teamId);
            if (!team) {
              return null;
            }
            const teamInfo: TeamInfo = {
              id: teamId,
              name: team.name,
            };
            if (team.sport) {
              teamInfo.sport = team.sport;
            }
            if (team.ageGroup) {
              teamInfo.ageGroup = team.ageGroup;
            }
            return teamInfo;
          })
          .filter((t): t is TeamInfo => t !== null);

        metadata.roleSpecificData = {
          teams: teamDetails,
        };
      }

      // Add parent-specific data (player details with names for email)
      if (
        inviteFunctionalRoles.includes("parent") &&
        invitePlayerIds.length > 0
      ) {
        const playerDetails = invitePlayerIds
          .map((playerId) => {
            const player = allPlayers?.find((p) => p._id === playerId);
            if (!player) {
              return null;
            }
            const playerInfo: PlayerInfo = {
              id: playerId,
              name: player.name,
            };
            if (player.ageGroup) {
              playerInfo.ageGroup = player.ageGroup;
            }
            return playerInfo;
          })
          .filter((p): p is PlayerInfo => p !== null);

        metadata.suggestedPlayerLinks = playerDetails;
      }

      // Add player-specific data (matched identity for player role)
      if (
        inviteFunctionalRoles.includes("player") &&
        invitePlayerMatchResult?.confidence !== "none" &&
        invitePlayerMatchResult?.confidence !== undefined &&
        invitePlayerMatchResult?._id
      ) {
        metadata.matchedPlayerIdentityId = invitePlayerMatchResult._id;
      }

      const inviteOptions = {
        email: inviteEmail,
        organizationId: orgId,
        role: betterAuthRole,
        metadata:
          inviteFunctionalRoles.length > 0 ? (metadata as any) : undefined,
      };

      // Debug logging
      console.log("[Invite] Sending invitation with options:", {
        email: inviteEmail,
        role: betterAuthRole,
        metadata,
      });

      const result = await authClient.organization.inviteMember(
        inviteOptions as any
      );

      console.log("[Invite] Better Auth result:", result);
      console.log("[Invite] Result data:", result.data);
      console.log(
        "[Invite] Result data keys:",
        result.data ? Object.keys(result.data) : "no data"
      );

      if (result.error) {
        toast.error(result.error.message || "Failed to send invitation");
      } else {
        // Better Auth created the invitation, now update it with metadata
        // This is a workaround because Better Auth client doesn't support custom metadata
        const invitationId =
          (result.data as { invitation?: { id?: string }; id?: string })
            ?.invitation?.id || (result.data as { id?: string })?.id;

        console.log("[Invite] Extracted invitation ID:", invitationId);
        console.log(
          "[Invite] Has functional roles:",
          inviteFunctionalRoles.length > 0
        );

        if (invitationId && inviteFunctionalRoles.length > 0) {
          console.log("[Invite] Updating invitation with metadata:", {
            invitationId,
            metadata,
          });

          const updateResult = await updateInvitationMetadata({
            invitationId,
            metadata,
          });

          if (!updateResult.success) {
            console.error(
              "[Invite] Failed to update metadata:",
              updateResult.error
            );
            toast.error(
              "Invitation sent but failed to save roles. Please resend."
            );
            return;
          }

          console.log("[Invite] Successfully updated invitation metadata");
        }

        // Feature B (Issue #437): Notify existing user via in-app notification
        if (invitationId) {
          await notifyExistingUserOfInvitation({
            invitedEmail: inviteEmail,
            organizationId: orgId,
            invitationId,
          });
        }

        const rolesStr =
          inviteFunctionalRoles.length > 0
            ? ` as ${inviteFunctionalRoles.join(", ")}`
            : "";
        toast.success(`Invitation sent to ${inviteEmail}${rolesStr}`);
        // Reset all invitation form state
        setInviteDialogOpen(false);
        setInviteEmail("");
        setInviteFunctionalRoles([]);
        setInviteTeams([]);
        setInvitePlayerIds([]);
        setInvitePlayerSearch("");
        setInvitePlayerFirstName("");
        setInvitePlayerLastName("");
        setInvitePlayerDob("");
      }
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    setLoading(invitationId);
    try {
      await resendInvitation({ invitationId });
      toast.success("Invitation email resent successfully");
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      toast.error(error.message || "Failed to resend invitation");
    } finally {
      setLoading(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    setLoading(invitationId);
    try {
      await cancelInvitation({ invitationId });
      toast.success("Invitation cancelled");
    } catch (error: any) {
      console.error("Error cancelling invitation:", error);
      toast.error(error.message || "Failed to cancel invitation");
    } finally {
      setLoading(null);
    }
  };

  const handleReInviteExpired = async (invitationId: string) => {
    setLoading(invitationId);
    try {
      const result = await reInviteExpired({ invitationId });
      if (result.success) {
        toast.success("New invitation sent successfully");
      } else if (result.rateLimitInfo) {
        const nextAllowed = result.rateLimitInfo.nextAllowedAt
          ? new Date(result.rateLimitInfo.nextAllowedAt).toLocaleTimeString()
          : "later";
        toast.error(
          `Rate limit reached (${result.rateLimitInfo.currentCount}/${result.rateLimitInfo.maxAllowed} in 24h). Try again after ${nextAllowed}`
        );
      } else {
        toast.error(result.error || "Failed to re-invite");
      }
    } catch (error: any) {
      console.error("Error re-inviting:", error);
      toast.error(error.message || "Failed to re-invite");
    } finally {
      setLoading(null);
    }
  };

  const handleBulkReInviteExpired = async () => {
    setLoading("bulk-reinvite");
    try {
      const result = await bulkReInviteExpired({ organizationId: orgId });
      if (result.total === 0) {
        toast.info("No expired invitations to re-invite");
      } else if (result.succeeded === result.total) {
        toast.success(`Successfully re-invited ${result.succeeded} users`);
      } else {
        toast.warning(
          `Re-invited ${result.succeeded} of ${result.total} users. ${result.rateLimited} rate-limited, ${result.failed} failed.`
        );
      }
    } catch (error: any) {
      console.error("Error bulk re-inviting:", error);
      toast.error(error.message || "Failed to bulk re-invite");
    } finally {
      setLoading(null);
    }
  };

  // Invitation tab handlers (merged from invitations page)
  const handleInvitationTabChange = (value: string) => {
    setInvitationTab(value);
  };

  const handleApproveRequest = async (requestId: string) => {
    setLoading(requestId);
    try {
      const result = await approveInvitationRequest({
        requestId: requestId as Id<"invitationRequests">,
      });
      if (result.success) {
        toast.success("Request approved. New invitation sent.");
      } else {
        toast.error(result.message || "Failed to approve request");
      }
    } catch (error: any) {
      console.error("Failed to approve request:", error);
      toast.error(error.message || "Failed to approve request");
    } finally {
      setLoading(null);
    }
  };

  const handleDenyRequest = async (requestId: string) => {
    setLoading(requestId);
    try {
      await denyInvitationRequest({
        requestId: requestId as Id<"invitationRequests">,
      });
      toast.success("Request denied");
    } catch (error: any) {
      console.error("Failed to deny request:", error);
      toast.error(error.message || "Failed to deny request");
    } finally {
      setLoading(null);
    }
  };

  const handleResendChildLink = async (linkId: string) => {
    setLoading(linkId);
    try {
      await resendChildLink({
        linkId: linkId as Id<"guardianPlayerLinks">,
      });
      toast.success("Child link resent. Guardian will see it on next login.");
    } catch (error: any) {
      console.error("Failed to resend child link:", error);
      toast.error(error.message || "Failed to resend child link");
    } finally {
      setLoading(null);
    }
  };

  // Format relative time helper
  const formatRelativeTime = (timestamp: number | null): string => {
    if (!timestamp) {
      return "Unknown";
    }
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  };

  const getInitials = (name?: string | null) => {
    if (!name) {
      return "??";
    }
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // Filter members
  const filteredMembers = membersWithDetails?.filter((member) => {
    const functionalRoles = member.functionalRoles || [];
    if (roleFilter !== "all" && !functionalRoles.includes(roleFilter)) {
      return false;
    }
    // Profile status filter
    if (profileStatusFilter !== "all") {
      const user = member.user || {};
      const userProfileStatus = user.profileCompletionStatus || "pending";
      if (profileStatusFilter !== userProfileStatus) {
        return false;
      }
    }
    if (!searchTerm) {
      return true;
    }
    const user = member.user || {};
    // Search by name, email, phone, postcode, and functional roles
    const searchable = [
      user.name,
      user.email,
      user.phone,
      user.postcode,
      ...functionalRoles,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchable.includes(searchTerm.toLowerCase());
  });

  // Stats - count members by functional roles (includes pending invitations)
  const stats = {
    total:
      (membersWithDetails?.length || 0) + (pendingInvitations?.length || 0),
    activeMembers: membersWithDetails?.length || 0,
    pendingInvites: pendingInvitations?.length || 0,
    coaches:
      membersWithDetails?.filter((m) => m.functionalRoles?.includes("coach"))
        .length || 0,
    parents:
      membersWithDetails?.filter((m) => m.functionalRoles?.includes("parent"))
        .length || 0,
    admins:
      membersWithDetails?.filter((m) => m.functionalRoles?.includes("admin"))
        .length || 0,
    members:
      membersWithDetails?.filter(
        (m) => !m.functionalRoles || m.functionalRoles.length === 0
      ).length || 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Manage Users</h1>
          <p className="mt-2 text-muted-foreground">
            Manage roles, assign teams to coaches, and link children to parents
          </p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => setRoleFilter("all")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total</p>
                <p className="font-bold text-2xl">{stats.total}</p>
                <p className="text-muted-foreground text-xs">
                  {stats.activeMembers} active
                </p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        {stats.pendingInvites > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: theme.tertiary }}>
                    Pending Invites
                  </p>
                  <p
                    className="font-bold text-2xl"
                    style={{ color: theme.tertiary }}
                  >
                    {stats.pendingInvites}
                  </p>
                </div>
                <Mail className="h-8 w-8" style={{ color: theme.tertiary }} />
              </div>
            </CardContent>
          </Card>
        )}
        <Card
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => setRoleFilter("coach")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Coaches</p>
                <p
                  className="font-bold text-2xl"
                  style={{ color: theme.primary }}
                >
                  {stats.coaches}
                </p>
              </div>
              <Users className="h-8 w-8" style={{ color: theme.primary }} />
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => setRoleFilter("parent")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Parents</p>
                <p
                  className="font-bold text-2xl"
                  style={{ color: theme.secondary }}
                >
                  {stats.parents}
                </p>
              </div>
              <UserCircle
                className="h-8 w-8"
                style={{ color: theme.secondary }}
              />
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => setRoleFilter("admin")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Admins</p>
                <p className="font-bold text-2xl text-purple-600">
                  {stats.admins}
                </p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => setRoleFilter("member")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">No Roles</p>
                <p className="font-bold text-2xl">{stats.members}</p>
              </div>
              <UserCheck className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Pending Invitations - Tabbed Interface (merged from invitations page) */}
      {(() => {
        // Compute filtered invitation lists
        const allInvitations = pendingInvitations || [];
        const activeInvitations = allInvitations.filter(
          (inv: any) => !inv.isExpired
        );
        const expiringSoonInvitations = allInvitations.filter((inv: any) => {
          if (inv.isExpired) {
            return false;
          }
          const hoursUntilExpiry =
            (inv.expiresAt - Date.now()) / (1000 * 60 * 60);
          return hoursUntilExpiry <= 48;
        });
        const expiredInvitations = allInvitations.filter(
          (inv: any) => inv.isExpired
        );
        const requests = pendingRequests || [];
        const declined = declinedLinks || [];

        // Render an invitation row
        const renderInvitationRow = (invitation: any) => {
          const isExpired = invitation.isExpired;
          const daysUntilExpiry = Math.ceil(
            (invitation.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)
          );

          return (
            <div
              className={`flex flex-col gap-2 rounded-lg border p-3 ${
                isExpired
                  ? "border-red-200 bg-red-50"
                  : "border-orange-200 bg-orange-50"
              }`}
              key={invitation._id}
            >
              {/* Row 1: Icon + Email (+ Action Buttons on desktop) */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-orange-100">
                    <Mail className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{invitation.email}</p>
                    <p className="truncate text-muted-foreground text-xs">
                      Invited by {invitation.inviter?.name || "Unknown"}
                    </p>
                  </div>
                </div>
                {/* Action buttons - stacked below on mobile, inline on desktop */}
                <div className="flex flex-wrap items-center gap-1 pl-[52px] sm:flex-shrink-0 sm:pl-0">
                  <Button
                    className="h-8 w-8 p-0 sm:h-auto sm:w-auto sm:px-3"
                    onClick={() => setEditingInvitation(invitation)}
                    size="sm"
                    title="Edit invitation roles and assignments"
                    variant="ghost"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 sm:mr-2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button
                    className="h-8 w-8 p-0 sm:h-auto sm:w-auto sm:px-3"
                    onClick={() =>
                      setHistoryInvitation({
                        invitationId: invitation._id,
                        email: invitation.email,
                      })
                    }
                    size="sm"
                    title="View invitation history"
                    variant="ghost"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 sm:mr-2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="hidden sm:inline">History</span>
                  </Button>
                  <Button
                    className="h-8 w-8 p-0 sm:h-auto sm:w-auto sm:px-3"
                    onClick={() => setSelectedInvitationId(invitation._id)}
                    size="sm"
                    title="View invitation details"
                    variant="ghost"
                  >
                    <Eye className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Details</span>
                  </Button>
                  {!isExpired && (
                    <Button
                      className="h-8 w-8 p-0 sm:h-auto sm:w-auto sm:px-3"
                      disabled={loading === invitation._id}
                      onClick={() => handleResendInvitation(invitation._id)}
                      size="sm"
                      title="Resend invitation"
                      variant="outline"
                    >
                      {loading === invitation._id ? (
                        <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                      ) : (
                        <Send className="h-4 w-4 sm:mr-2" />
                      )}
                      <span className="hidden sm:inline">Resend</span>
                    </Button>
                  )}
                  {isExpired && (
                    <Button
                      className="h-8 w-8 p-0 sm:h-auto sm:w-auto sm:px-3"
                      disabled={loading === invitation._id}
                      onClick={() => handleReInviteExpired(invitation._id)}
                      size="sm"
                      title="Send new invitation with same settings"
                      variant="outline"
                    >
                      {loading === invitation._id ? (
                        <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                      ) : (
                        <Send className="h-4 w-4 sm:mr-2" />
                      )}
                      <span className="hidden sm:inline">Re-invite</span>
                    </Button>
                  )}
                  <Button
                    className="h-8 w-8 p-0 sm:h-auto sm:w-auto sm:px-3"
                    disabled={loading === invitation._id}
                    onClick={() => handleCancelInvitation(invitation._id)}
                    size="sm"
                    title="Cancel invitation"
                    variant="destructive"
                  >
                    {loading === invitation._id ? (
                      <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                    ) : (
                      <X className="h-4 w-4 sm:mr-2" />
                    )}
                    <span className="hidden sm:inline">Cancel</span>
                  </Button>
                </div>
              </div>

              {/* Row 2: Roles, Badges, Expiry Info - with left padding to align with text */}
              <div className="flex flex-wrap items-center gap-2 pl-[52px] text-muted-foreground text-sm">
                {(() => {
                  const functionalRoles = invitation.functionalRoles || [];
                  if (functionalRoles.length > 0) {
                    return functionalRoles.map((role: string) => (
                      <span className="flex items-center gap-1.5" key={role}>
                        <Badge className="text-xs" variant="outline">
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Badge>
                        {role === "coach" && invitation.teams?.length > 0 && (
                          <span className="flex items-center gap-1 text-blue-600 text-xs">
                            →
                            <span className="max-w-[150px] truncate">
                              {invitation.teams
                                .map((t: any) => t.name)
                                .join(", ")}
                            </span>
                          </span>
                        )}
                        {role === "parent" &&
                          invitation.players?.length > 0 && (
                            <span className="flex items-center gap-1 text-green-600 text-xs">
                              →
                              <span className="max-w-[150px] truncate">
                                {invitation.players
                                  .map(
                                    (p: any) => `${p.firstName} ${p.lastName}`
                                  )
                                  .join(", ")}
                              </span>
                            </span>
                          )}
                      </span>
                    ));
                  }
                  if (invitation.role) {
                    return (
                      <>
                        <Badge className="text-xs" variant="secondary">
                          {invitation.role}
                        </Badge>
                        <Badge className="text-xs" variant="destructive">
                          No functional role
                        </Badge>
                      </>
                    );
                  }
                  return null;
                })()}
                <span className="text-xs">
                  •{" "}
                  {isExpired ? (
                    <span className="text-red-600">Expired</span>
                  ) : (
                    <span>
                      Expires in {daysUntilExpiry}{" "}
                      {daysUntilExpiry === 1 ? "day" : "days"}
                    </span>
                  )}
                </span>
                {(() => {
                  const resendHistory =
                    invitation.metadata?.resendHistory || [];
                  if (resendHistory.length > 0) {
                    const lastResend = resendHistory.at(-1);
                    const daysAgo = Math.floor(
                      (Date.now() - lastResend.resentAt) / (1000 * 60 * 60 * 24)
                    );
                    return (
                      <span className="text-xs">
                        • Resent {resendHistory.length}×
                        {daysAgo === 0
                          ? " today"
                          : daysAgo === 1
                            ? " yesterday"
                            : ` ${daysAgo}d ago`}
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          );
        };

        return (
          <Card className="border-orange-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-orange-600" />
                    Invitation Management
                  </CardTitle>
                  <CardDescription>
                    Manage pending invitations, requests, and declined links
                  </CardDescription>
                </div>
                {/* Bulk re-invite button - only show if there are expired invitations */}
                {expiredInvitations.length > 0 &&
                  invitationTab === "expired" && (
                    <Button
                      disabled={loading === "bulk-reinvite"}
                      onClick={handleBulkReInviteExpired}
                      size="sm"
                      variant="outline"
                    >
                      {loading === "bulk-reinvite" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Re-invite All ({expiredInvitations.length})
                    </Button>
                  )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs
                onValueChange={handleInvitationTabChange}
                value={invitationTab}
              >
                <TabsList className="mb-4 flex-wrap">
                  <TabsTrigger value="active">
                    Pending ({activeInvitations.length})
                  </TabsTrigger>
                  <TabsTrigger value="expiring_soon">
                    <AlertTriangle className="mr-1 h-3 w-3 text-amber-500" />
                    Expiring Soon ({expiringSoonInvitations.length})
                  </TabsTrigger>
                  <TabsTrigger value="expired">
                    Expired ({expiredInvitations.length})
                  </TabsTrigger>
                  <TabsTrigger value="requests">
                    Requests ({requests.length})
                  </TabsTrigger>
                  <TabsTrigger className="text-red-600" value="declined">
                    Declined ({declined.length})
                  </TabsTrigger>
                </TabsList>

                {/* Active/Pending, Expiring Soon, Expired tabs - show invitations */}
                <TabsContent className="space-y-3" value="active">
                  {activeInvitations.length === 0 ? (
                    <Empty>
                      <EmptyContent>
                        <EmptyMedia variant="icon">
                          <Mail className="h-6 w-6" />
                        </EmptyMedia>
                        <EmptyTitle>No pending invitations</EmptyTitle>
                        <EmptyDescription>
                          All invitations have been accepted, expired, or
                          cancelled.
                        </EmptyDescription>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    activeInvitations.map(renderInvitationRow)
                  )}
                </TabsContent>

                <TabsContent className="space-y-3" value="expiring_soon">
                  {expiringSoonInvitations.length === 0 ? (
                    <Empty>
                      <EmptyContent>
                        <EmptyMedia variant="icon">
                          <AlertTriangle className="h-6 w-6" />
                        </EmptyMedia>
                        <EmptyTitle>No invitations expiring soon</EmptyTitle>
                        <EmptyDescription>
                          No invitations are expiring within the next 48 hours.
                        </EmptyDescription>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    expiringSoonInvitations.map(renderInvitationRow)
                  )}
                </TabsContent>

                <TabsContent className="space-y-3" value="expired">
                  {expiredInvitations.length === 0 ? (
                    <Empty>
                      <EmptyContent>
                        <EmptyMedia variant="icon">
                          <Mail className="h-6 w-6" />
                        </EmptyMedia>
                        <EmptyTitle>No expired invitations</EmptyTitle>
                        <EmptyDescription>
                          All invitations are still valid.
                        </EmptyDescription>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    expiredInvitations.map(renderInvitationRow)
                  )}
                </TabsContent>

                {/* Requests tab */}
                <TabsContent className="space-y-3" value="requests">
                  {requests.length === 0 ? (
                    <Empty>
                      <EmptyContent>
                        <EmptyMedia variant="icon">
                          <Mail className="h-6 w-6" />
                        </EmptyMedia>
                        <EmptyTitle>No pending requests</EmptyTitle>
                        <EmptyDescription>
                          No users have requested new invitations.
                        </EmptyDescription>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    requests.map((request: any) => (
                      <div
                        className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                        key={request._id}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                            <Mail className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">
                              {request.userEmail}
                            </p>
                            <p className="truncate text-muted-foreground text-xs">
                              Request #{request.requestNumber} •{" "}
                              {formatRelativeTime(request.requestedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pl-[52px] sm:pl-0">
                          <Button
                            disabled={loading === request._id}
                            onClick={() => handleApproveRequest(request._id)}
                            size="sm"
                            variant="outline"
                          >
                            {loading === request._id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Approve
                          </Button>
                          <Button
                            disabled={loading === request._id}
                            onClick={() => handleDenyRequest(request._id)}
                            size="sm"
                            variant="ghost"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Declined tab */}
                <TabsContent className="space-y-3" value="declined">
                  {declined.length === 0 ? (
                    <Empty>
                      <EmptyContent>
                        <EmptyMedia variant="icon">
                          <UserCircle className="h-6 w-6" />
                        </EmptyMedia>
                        <EmptyTitle>No declined child links</EmptyTitle>
                        <EmptyDescription>
                          No parents have declined child links.
                        </EmptyDescription>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    declined.map((link: any) => (
                      <div
                        className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                        key={link.linkId}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                            <UserCircle className="h-5 w-5 text-red-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">
                              {link.guardianName}{" "}
                              <span className="text-muted-foreground">
                                ({link.guardianEmail})
                              </span>
                            </p>
                            <p className="truncate text-muted-foreground text-xs">
                              Declined link to{" "}
                              <strong>{link.playerName}</strong> •{" "}
                              {formatRelativeTime(link.declinedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pl-[52px] sm:pl-0">
                          <Button
                            disabled={loading === link.linkId}
                            onClick={() => handleResendChildLink(link.linkId)}
                            size="sm"
                            variant="outline"
                          >
                            {loading === link.linkId ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="mr-2 h-4 w-4" />
                            )}
                            Resend
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        );
      })()}
      {/* Search and Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, phone, or postcode..."
            value={searchTerm}
          />
        </div>
        {/* Profile Status Filter */}
        <select
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onChange={(e) => setProfileStatusFilter(e.target.value)}
          value={profileStatusFilter}
        >
          <option value="all">All Profile Status</option>
          <option value="completed">Profile Completed</option>
          <option value="pending">Profile Pending</option>
          <option value="skipped">Profile Skipped</option>
        </select>
        {/* Clear Filters */}
        {(roleFilter !== "all" || profileStatusFilter !== "all") && (
          <Button
            onClick={() => {
              setRoleFilter("all");
              setProfileStatusFilter("all");
            }}
            size="sm"
            variant="ghost"
          >
            <X className="mr-2 h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>
      {/* Users List */}
      <div className="space-y-3">
        {filteredMembers && filteredMembers.length === 0 ? (
          <Empty>
            <EmptyContent>
              <EmptyMedia variant="icon">
                <Users className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>
                {searchTerm ||
                roleFilter !== "all" ||
                profileStatusFilter !== "all"
                  ? "No results found"
                  : "No users yet"}
              </EmptyTitle>
              <EmptyDescription>
                {searchTerm ||
                roleFilter !== "all" ||
                profileStatusFilter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Get started by inviting your first team member to join this organization"}
              </EmptyDescription>
              {!searchTerm &&
                roleFilter === "all" &&
                profileStatusFilter === "all" && (
                  <Button onClick={() => setInviteDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Member
                  </Button>
                )}
            </EmptyContent>
          </Empty>
        ) : (
          filteredMembers?.map((member) => {
            // Initialize edit state if needed
            if (!editStates[member.userId]) {
              initEditState(member);
            }

            const state = editStates[member.userId] || {
              functionalRoles: member.functionalRoles || [],
              teams: member.coachAssignments?.teams || [],
              ageGroups: member.coachAssignments?.ageGroups || [],
              linkedPlayerIds:
                member.linkedPlayers?.map((p: any) => p._id) || [],
              expanded: false,
              modified: false,
            };

            const user = member.user || {};
            const hasCoachWarning =
              state.functionalRoles.includes("coach") &&
              state.teams.length === 0;
            const hasParentWarning =
              state.functionalRoles.includes("parent") &&
              state.linkedPlayerIds.length === 0;
            const _hasWarning = hasCoachWarning || hasParentWarning;

            return (
              <Card key={member.userId}>
                <CardHeader className="pb-4">
                  <div className="flex flex-col gap-2">
                    {/* Row 1: Avatar, Name/Email, Action Buttons */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={user.image || undefined} />
                          <AvatarFallback>
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate text-base">
                            {user.name || "Unknown"}
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <CardDescription className="flex min-w-0 items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                {user.email || "No email"}
                              </span>
                            </CardDescription>
                            {user.phone && (
                              <CardDescription className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3 flex-shrink-0" />
                                <span>{user.phone}</span>
                              </CardDescription>
                            )}
                            {user.postcode && (
                              <CardDescription className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span>{user.postcode}</span>
                              </CardDescription>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons - always visible on right */}
                      <div className="flex min-w-[88px] flex-shrink-0 items-center justify-end gap-2">
                        {/* Suspend/Restore button (admin/owner only) */}
                        {(currentMember?.role === "owner" ||
                          currentMember?.role === "admin") &&
                          member.role !== "owner" && (
                            <Button
                              onClick={() =>
                                setDisablingMember({
                                  userId: member.userId,
                                  name: member.name || member.email,
                                  email: member.email,
                                  isDisabled: member.isDisabled,
                                })
                              }
                              size="sm"
                              title={
                                member.isDisabled
                                  ? "Restore member access"
                                  : "Suspend member access"
                              }
                              variant="ghost"
                            >
                              <svg
                                aria-hidden="true"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                {member.isDisabled ? (
                                  <path
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                ) : (
                                  <path
                                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                )}
                              </svg>
                            </Button>
                          )}

                        {/* Remove from org button (admin/owner only) */}
                        {(currentMember?.role === "owner" ||
                          currentMember?.role === "admin") && (
                          <Button
                            onClick={() =>
                              setRemovingMember({
                                userId: member.userId,
                                name: member.name || member.email,
                                email: member.email,
                              })
                            }
                            size="sm"
                            variant="ghost"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          onClick={() => toggleExpanded(member.userId)}
                          size="sm"
                          variant="ghost"
                        >
                          {state.expanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Row 2: Badges */}
                    <div className="flex flex-wrap gap-1 pl-[52px]">
                      {/* Suspended Badge - show if member is disabled */}
                      {member.isDisabled && (
                        <Badge className="border-red-300 bg-red-100 text-red-700">
                          <svg
                            aria-hidden="true"
                            className="mr-1 h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 715.636 5.636m12.728 12.728L5.636 5.636"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Suspended
                        </Badge>
                      )}
                      {/* Owner Badge - show if Better Auth role is "owner" */}
                      {member.role === "owner" && (
                        <Badge className="border-amber-300 bg-amber-100 text-amber-700">
                          <Crown className="mr-1 h-3 w-3" />
                          Owner
                        </Badge>
                      )}
                      {state.functionalRoles.length === 0
                        ? member.role !== "owner" && (
                            <Badge variant="secondary">No roles</Badge>
                          )
                        : state.functionalRoles.map((role) => {
                            const roleHasWarning =
                              (role === "coach" && state.teams.length === 0) ||
                              (role === "parent" &&
                                state.linkedPlayerIds.length === 0);
                            return (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium text-xs ${getRoleBadgeColor(role)} ${roleHasWarning ? "ring-2 ring-orange-400" : ""}`}
                                key={role}
                                title={
                                  roleHasWarning
                                    ? `${role} has incomplete configuration`
                                    : ""
                                }
                              >
                                {getRoleIcon(role)}
                                {role}
                                {roleHasWarning && (
                                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                                )}
                              </span>
                            );
                          })}
                    </div>
                  </div>
                </CardHeader>

                {state.expanded && (
                  <CardContent className="space-y-4 border-t pt-4">
                    {/* Functional Role Selection (Checkboxes) */}
                    <div className="space-y-2">
                      <Label className="font-medium text-sm">
                        Functional Roles (select multiple)
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {(["coach", "parent", "admin", "player"] as const).map(
                          (role) => (
                            <button
                              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                state.functionalRoles.includes(role)
                                  ? getRoleBadgeColor(role)
                                  : "border-gray-200 bg-white hover:bg-gray-50"
                              }`}
                              key={role}
                              onClick={() =>
                                toggleFunctionalRole(member.userId, role)
                              }
                              type="button"
                            >
                              {getRoleIcon(role)}
                              <span className="capitalize">{role}</span>
                            </button>
                          )
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Users can have multiple roles. For example, a coach can
                        also be a parent.
                      </p>
                    </div>

                    {/* Profile Information (Phase 0: Onboarding Sync) */}
                    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-4 w-4 text-slate-600" />
                          <span className="font-semibold text-slate-700 text-sm">
                            Profile Information
                          </span>
                        </div>
                        {/* Profile completion status badge */}
                        {(() => {
                          const profileStatus =
                            user.profileCompletionStatus || "pending";
                          if (profileStatus === "completed") {
                            return (
                              <Badge className="border-green-300 bg-green-100 text-green-700">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Completed
                              </Badge>
                            );
                          }
                          if (profileStatus === "skipped") {
                            return (
                              <Badge className="border-amber-300 bg-amber-100 text-amber-700">
                                <SkipForward className="mr-1 h-3 w-3" />
                                Skipped ({user.profileSkipCount || 0}/3)
                              </Badge>
                            );
                          }
                          return (
                            <Badge className="border-slate-300 bg-slate-100 text-slate-700">
                              <Clock className="mr-1 h-3 w-3" />
                              Pending
                            </Badge>
                          );
                        })()}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {/* Phone */}
                        <div className="flex items-start gap-2">
                          <Phone className="mt-0.5 h-4 w-4 text-slate-500" />
                          <div>
                            <p className="font-medium text-slate-600 text-xs">
                              Phone
                            </p>
                            <p className="text-sm">
                              {user.phone || (
                                <span className="text-muted-foreground italic">
                                  Not provided
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Postcode */}
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 text-slate-500" />
                          <div>
                            <p className="font-medium text-slate-600 text-xs">
                              Postcode
                            </p>
                            <p className="text-sm">
                              {user.postcode || (
                                <span className="text-muted-foreground italic">
                                  Not provided
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Alt Email */}
                        <div className="flex items-start gap-2">
                          <Mail className="mt-0.5 h-4 w-4 text-slate-500" />
                          <div>
                            <p className="font-medium text-slate-600 text-xs">
                              Alternate Email
                            </p>
                            <p className="text-sm">
                              {user.altEmail || (
                                <span className="text-muted-foreground italic">
                                  Not provided
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Profile Completed At */}
                        {user.profileCompletedAt && (
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-slate-500" />
                            <div>
                              <p className="font-medium text-slate-600 text-xs">
                                Completed At
                              </p>
                              <p className="text-sm">
                                {new Date(
                                  user.profileCompletedAt
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Address Section (Phase 0.6) */}
                    {(user.address ||
                      user.address2 ||
                      user.town ||
                      user.county ||
                      user.country) && (
                      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-slate-600" />
                          <span className="font-semibold text-slate-700 text-sm">
                            Address
                          </span>
                        </div>
                        <div className="text-sm">
                          {/* Address Line 1 (with optional Line 2) */}
                          {user.address && (
                            <p>
                              {user.address}
                              {user.address2 && `, ${user.address2}`}
                            </p>
                          )}
                          {/* Town/City and Postcode */}
                          {(user.town || user.postcode) && (
                            <p>
                              {user.town}
                              {user.town && user.postcode && ", "}
                              {user.postcode}
                            </p>
                          )}
                          {/* County and Country */}
                          {(user.county || user.country) && (
                            <p>
                              {user.county && `County ${user.county}`}
                              {user.county && user.country && ", "}
                              {user.country && getCountryName(user.country)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Coach Settings */}
                    {state.functionalRoles.includes("coach") && (
                      <div
                        className={`space-y-3 rounded-lg border p-4 ${state.teams.length === 0 ? "border-orange-300 bg-orange-50" : "border-green-200 bg-green-50"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-green-600" />
                            <span className="font-semibold text-green-700 text-sm">
                              Coach Settings
                            </span>
                          </div>
                          {state.teams.length === 0 && (
                            <Badge
                              className="bg-orange-100 text-orange-700"
                              variant="outline"
                            >
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              No teams assigned
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="font-medium text-sm">
                            Team Assignments{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {teams?.map((team) => (
                              <button
                                className={`flex cursor-pointer items-center gap-2 rounded border p-2 text-sm transition-colors ${
                                  state.teams.includes(team._id)
                                    ? "border-green-400 bg-green-100"
                                    : "border-gray-200 bg-white hover:bg-gray-50"
                                }`}
                                key={team._id}
                                onClick={() =>
                                  toggleTeam(member.userId, team._id)
                                }
                                type="button"
                              >
                                <span
                                  className={`flex h-4 w-4 items-center justify-center rounded-sm border ${state.teams.includes(team._id) ? "border-primary bg-primary text-primary-foreground" : "border-muted"}`}
                                >
                                  {state.teams.includes(team._id) && "✓"}
                                </span>
                                <span className="truncate">{team.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {ageGroups.length > 0 && (
                          <div className="space-y-2">
                            <Label className="font-medium text-sm">
                              Age Groups (Optional)
                            </Label>
                            <div className="flex flex-wrap gap-2">
                              {ageGroups.map((ageGroup) => (
                                <button
                                  className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm transition-colors ${
                                    state.ageGroups.includes(ageGroup)
                                      ? "border-green-400 bg-green-100"
                                      : "border-gray-200 bg-white hover:bg-gray-50"
                                  }`}
                                  key={ageGroup}
                                  onClick={() =>
                                    toggleAgeGroup(member.userId, ageGroup)
                                  }
                                  type="button"
                                >
                                  <span
                                    className={`flex h-4 w-4 items-center justify-center rounded-sm border ${state.ageGroups.includes(ageGroup) ? "border-primary bg-primary text-primary-foreground" : "border-muted"}`}
                                  >
                                    {state.ageGroups.includes(ageGroup) && "✓"}
                                  </span>
                                  {ageGroup}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Parent Settings */}
                    {state.functionalRoles.includes("parent") && (
                      <div
                        className={`space-y-3 rounded-lg border p-4 ${state.linkedPlayerIds.length === 0 ? "border-orange-300 bg-orange-50" : "border-blue-200 bg-blue-50"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserCircle className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-blue-700 text-sm">
                              Parent Settings
                            </span>
                          </div>
                          {state.linkedPlayerIds.length === 0 && (
                            <Badge
                              className="bg-orange-100 text-orange-700"
                              variant="outline"
                            >
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              No children linked
                            </Badge>
                          )}
                        </div>

                        {state.linkedPlayerIds.length > 0 && (
                          <div className="rounded-lg bg-blue-100 p-2">
                            <p className="mb-1 font-medium text-blue-700 text-xs">
                              Currently Linked ({state.linkedPlayerIds.length}):
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {state.linkedPlayerIds.map((id) => {
                                const player = allPlayers?.find(
                                  (p) => p._id === id
                                );
                                return player ? (
                                  <span
                                    className="inline-flex items-center rounded bg-blue-200 px-2 py-0.5 text-blue-800 text-xs"
                                    key={id}
                                  >
                                    {player.name}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="font-medium text-sm">
                            Link Children{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-gray-400" />
                            <Input
                              className="pl-10"
                              onChange={(e) =>
                                setPlayerSearchTerms((prev) => ({
                                  ...prev,
                                  [member.userId]: e.target.value,
                                }))
                              }
                              placeholder="Search players by name or team..."
                              value={playerSearchTerms[member.userId] || ""}
                            />
                          </div>
                          <div className="max-h-48 space-y-1 overflow-y-auto">
                            {allPlayers
                              ?.filter((player) => {
                                const playerSearch =
                                  playerSearchTerms[
                                    member.userId
                                  ]?.toLowerCase() || "";
                                if (!playerSearch) {
                                  return true;
                                }
                                return (
                                  player.name
                                    .toLowerCase()
                                    .includes(playerSearch) ||
                                  player.sport
                                    .toLowerCase()
                                    .includes(playerSearch) ||
                                  player.ageGroup
                                    .toLowerCase()
                                    .includes(playerSearch)
                                );
                              })
                              .map((player) => (
                                <button
                                  className={`flex cursor-pointer items-center gap-2 rounded border p-2 text-left text-sm ${
                                    state.linkedPlayerIds.includes(player._id)
                                      ? "border-blue-400 bg-blue-100"
                                      : "border-gray-200 bg-white hover:bg-gray-50"
                                  }`}
                                  key={player._id}
                                  onClick={() =>
                                    togglePlayer(member.userId, player._id)
                                  }
                                  type="button"
                                >
                                  <span
                                    className={`flex h-4 w-4 items-center justify-center rounded-sm border ${state.linkedPlayerIds.includes(player._id) ? "border-primary bg-primary text-primary-foreground" : "border-muted"}`}
                                  >
                                    {state.linkedPlayerIds.includes(
                                      player._id
                                    ) && "✓"}
                                  </span>
                                  <span className="flex-1 font-medium">
                                    {player.name}
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    {player.ageGroup} - {player.sport}
                                  </span>
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Player Settings */}
                    {state.functionalRoles.includes("player") &&
                      (() => {
                        const linkedPlayerRecord = allPlayersData?.find(
                          (p: any) => p.player?.userId === member.userId
                        );

                        // Compute current team IDs for this player
                        const currentPlayerTeamIds = linkedPlayerRecord
                          ? (teamPlayerLinks ?? [])
                              .filter(
                                (link: any) =>
                                  link.playerIdentityId ===
                                    linkedPlayerRecord._id &&
                                  link.status === "active"
                              )
                              .map((link: any) => link.teamId)
                          : [];

                        // Selected teams: use stored state, or current teams if already linked
                        const selectedTeamIds =
                          playerCreateTeams[member.userId] ??
                          currentPlayerTeamIds;

                        const selectedEnrollmentId =
                          selectedExistingEnrollmentId[member.userId] ?? null;
                        const playerSearchTerm =
                          enrollmentSearchTerm[member.userId] ?? "";
                        const dob =
                          playerCreateForm[member.userId]?.dateOfBirth ?? "";

                        // Filter unlinked player records by search
                        const filteredUnlinked = (
                          unlinkedEnrollments ?? []
                        ).filter(
                          (e) =>
                            playerSearchTerm === "" ||
                            `${e.firstName} ${e.lastName}`
                              .toLowerCase()
                              .includes(playerSearchTerm.toLowerCase()) ||
                            (e.ageGroup ?? "")
                              .toLowerCase()
                              .includes(playerSearchTerm.toLowerCase())
                        );

                        // Selected enrollment details (for showing DOB)
                        const selectedEnrollment = selectedEnrollmentId
                          ? (unlinkedEnrollments ?? []).find(
                              (e) => e.enrollmentId === selectedEnrollmentId
                            )
                          : null;

                        // 3-step player matching flow
                        const matchStep = (playerMatchStep[member.userId] ??
                          "auto") as "auto" | "search" | "create" | "confirmed";
                        const isActiveMatchTarget =
                          playerMatchTarget?.userId === member.userId;
                        const matches = isActiveMatchTarget
                          ? playerMatchResults
                          : undefined;
                        const topMatch = matches?.[0] ?? null;
                        const isMatchLoading =
                          isActiveMatchTarget && matches === undefined;

                        return (
                          <div
                            className={`space-y-3 rounded-lg border p-4 ${linkedPlayerRecord ? "border-green-300 bg-green-50" : "border-orange-300 bg-orange-50"}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <UserCircle className="h-4 w-4 text-orange-600" />
                                <span className="font-semibold text-orange-700 text-sm">
                                  Player Settings
                                </span>
                              </div>
                              {!linkedPlayerRecord && (
                                <Badge
                                  className="bg-orange-100 text-orange-700"
                                  variant="outline"
                                >
                                  <AlertTriangle className="mr-1 h-3 w-3" />
                                  No player record linked
                                </Badge>
                              )}
                            </div>

                            {/* Already linked: show name badge */}
                            {linkedPlayerRecord && (
                              <div className="rounded-lg bg-green-100 p-2">
                                <p className="mb-1 font-medium text-green-700 text-xs">
                                  Currently Linked:
                                </p>
                                <span className="inline-flex items-center rounded bg-green-200 px-2 py-0.5 text-green-800 text-xs">
                                  {linkedPlayerRecord.name}
                                </span>
                              </div>
                            )}

                            {/* Not linked: 3-step player matching flow */}
                            {!linkedPlayerRecord &&
                              (() => {
                                // Step: confirmed + existing enrollment selected
                                if (
                                  matchStep === "confirmed" &&
                                  selectedEnrollment
                                ) {
                                  return (
                                    <div className="space-y-2">
                                      <Label className="font-medium text-sm">
                                        Player Record
                                      </Label>
                                      <div className="flex items-center justify-between rounded-lg border border-orange-300 bg-orange-50 p-3">
                                        <div>
                                          <p className="font-medium text-orange-800 text-sm">
                                            Will link:{" "}
                                            {selectedEnrollment.firstName}{" "}
                                            {selectedEnrollment.lastName}
                                          </p>
                                          <p className="text-muted-foreground text-xs">
                                            DOB:{" "}
                                            {selectedEnrollment.dateOfBirth}
                                          </p>
                                        </div>
                                        <Button
                                          className="h-auto p-0 text-muted-foreground text-xs"
                                          onClick={() => {
                                            setSelectedExistingEnrollmentId(
                                              (prev) => ({
                                                ...prev,
                                                [member.userId]: null,
                                              })
                                            );
                                            setPlayerMatchStep((prev) => ({
                                              ...prev,
                                              [member.userId]: "auto",
                                            }));
                                          }}
                                          size="sm"
                                          type="button"
                                          variant="ghost"
                                        >
                                          ✕ Change
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                }

                                // Step: confirmed + DOB (creating new)
                                if (matchStep === "confirmed" && dob) {
                                  return (
                                    <div className="space-y-2">
                                      <Label className="font-medium text-sm">
                                        Player Record
                                      </Label>
                                      <div className="flex items-center justify-between rounded-lg border border-orange-300 bg-orange-50 p-3">
                                        <div>
                                          <p className="font-medium text-orange-800 text-sm">
                                            Will create:{" "}
                                            {member.user?.name ?? "Player"}
                                          </p>
                                          <p className="text-muted-foreground text-xs">
                                            DOB: {dob}
                                          </p>
                                        </div>
                                        <Button
                                          className="h-auto p-0 text-muted-foreground text-xs"
                                          onClick={() =>
                                            setPlayerMatchStep((prev) => ({
                                              ...prev,
                                              [member.userId]: "create",
                                            }))
                                          }
                                          size="sm"
                                          type="button"
                                          variant="ghost"
                                        >
                                          ✕ Change
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="space-y-3">
                                    {/* Step: auto — auto-match results */}
                                    {matchStep === "auto" && (
                                      <div className="space-y-2">
                                        <Label className="font-medium text-sm">
                                          Player Record
                                        </Label>
                                        {isMatchLoading ? (
                                          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                            <span className="text-muted-foreground text-sm">
                                              Searching for a match...
                                            </span>
                                          </div>
                                        ) : topMatch ? (
                                          <div className="space-y-2">
                                            <p className="text-muted-foreground text-xs">
                                              We found a potential match based
                                              on name
                                              {(
                                                topMatch as any
                                              ).matchReasons?.includes(
                                                "Email matches"
                                              )
                                                ? " and email"
                                                : ""}
                                              :
                                            </p>
                                            <div
                                              className={`rounded-lg border p-3 ${(topMatch as any).confidence === "high" ? "border-green-300 bg-green-50" : (topMatch as any).confidence === "medium" ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"}`}
                                            >
                                              <div className="flex items-center justify-between">
                                                <div>
                                                  <p className="font-semibold text-sm">
                                                    {
                                                      (topMatch as any)
                                                        .firstName
                                                    }{" "}
                                                    {(topMatch as any).lastName}
                                                  </p>
                                                  <p className="text-muted-foreground text-xs">
                                                    DOB:{" "}
                                                    {
                                                      (topMatch as any)
                                                        .dateOfBirth
                                                    }
                                                    {(topMatch as any).ageGroup
                                                      ? ` · ${(topMatch as any).ageGroup}`
                                                      : ""}
                                                  </p>
                                                  <div className="mt-1 flex flex-wrap gap-1">
                                                    {(
                                                      (topMatch as any)
                                                        .matchReasons ?? []
                                                    ).map((r: string) => (
                                                      <span
                                                        className="rounded-full border bg-white px-2 py-0.5 text-xs"
                                                        key={r}
                                                      >
                                                        {r}
                                                      </span>
                                                    ))}
                                                  </div>
                                                </div>
                                                <Badge
                                                  className={
                                                    (topMatch as any)
                                                      .confidence === "high"
                                                      ? "bg-green-100 text-green-700"
                                                      : (topMatch as any)
                                                            .confidence ===
                                                          "medium"
                                                        ? "bg-blue-100 text-blue-700"
                                                        : "bg-gray-100 text-gray-700"
                                                  }
                                                  variant="outline"
                                                >
                                                  {(topMatch as any)
                                                    .confidence === "high"
                                                    ? "Strong match"
                                                    : (topMatch as any)
                                                          .confidence ===
                                                        "medium"
                                                      ? "Possible match"
                                                      : "Weak match"}
                                                </Badge>
                                              </div>
                                            </div>
                                            <div className="flex gap-2">
                                              <Button
                                                className="flex-1 border-green-400 text-green-700 hover:bg-green-50"
                                                onClick={() => {
                                                  setSelectedExistingEnrollmentId(
                                                    (prev) => ({
                                                      ...prev,
                                                      [member.userId]: (
                                                        topMatch as any
                                                      ).enrollmentId,
                                                    })
                                                  );
                                                  setPlayerMatchStep(
                                                    (prev) => ({
                                                      ...prev,
                                                      [member.userId]:
                                                        "confirmed",
                                                    })
                                                  );
                                                }}
                                                size="sm"
                                                type="button"
                                                variant="outline"
                                              >
                                                ✓ Yes, link this record
                                              </Button>
                                              <Button
                                                className="border-gray-300 text-gray-600 hover:bg-gray-50"
                                                onClick={() =>
                                                  setPlayerMatchStep(
                                                    (prev) => ({
                                                      ...prev,
                                                      [member.userId]: "search",
                                                    })
                                                  )
                                                }
                                                size="sm"
                                                type="button"
                                                variant="outline"
                                              >
                                                Not the right record →
                                              </Button>
                                            </div>
                                            {matches && matches.length > 1 && (
                                              <details className="text-xs">
                                                <summary className="cursor-pointer text-muted-foreground">
                                                  {matches.length - 1} other
                                                  potential match
                                                  {matches.length > 2
                                                    ? "es"
                                                    : ""}
                                                </summary>
                                                <div className="mt-1 space-y-1">
                                                  {matches
                                                    .slice(1)
                                                    .map((m: any) => (
                                                      <button
                                                        className="flex w-full items-center justify-between rounded border border-gray-200 p-2 text-left hover:bg-gray-50"
                                                        key={m.enrollmentId}
                                                        onClick={() => {
                                                          setSelectedExistingEnrollmentId(
                                                            (prev) => ({
                                                              ...prev,
                                                              [member.userId]:
                                                                m.enrollmentId,
                                                            })
                                                          );
                                                          setPlayerMatchStep(
                                                            (prev) => ({
                                                              ...prev,
                                                              [member.userId]:
                                                                "confirmed",
                                                            })
                                                          );
                                                        }}
                                                        type="button"
                                                      >
                                                        <span className="font-medium">
                                                          {m.firstName}{" "}
                                                          {m.lastName}
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                          {m.dateOfBirth}
                                                        </span>
                                                      </button>
                                                    ))}
                                                </div>
                                              </details>
                                            )}
                                          </div>
                                        ) : matches !== undefined ? (
                                          <div className="space-y-2">
                                            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                                              <p className="text-orange-700 text-sm">
                                                No matching player record found
                                                for {member.user?.name}.
                                              </p>
                                            </div>
                                            <div className="flex gap-2">
                                              <Button
                                                className="border-orange-400 text-orange-700 hover:bg-orange-100"
                                                onClick={() =>
                                                  setPlayerMatchStep(
                                                    (prev) => ({
                                                      ...prev,
                                                      [member.userId]: "search",
                                                    })
                                                  )
                                                }
                                                size="sm"
                                                type="button"
                                                variant="outline"
                                              >
                                                Search for record
                                              </Button>
                                              <Button
                                                className="border-orange-400 text-orange-700 hover:bg-orange-100"
                                                onClick={() =>
                                                  setPlayerMatchStep(
                                                    (prev) => ({
                                                      ...prev,
                                                      [member.userId]: "create",
                                                    })
                                                  )
                                                }
                                                size="sm"
                                                type="button"
                                                variant="outline"
                                              >
                                                Create new record
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                            <span className="text-muted-foreground text-sm">
                                              Checking for a match...
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Step: search — search by name */}
                                    {matchStep === "search" && (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <Label className="font-medium text-sm">
                                            Search Player Records
                                          </Label>
                                          <Button
                                            className="h-auto p-0 text-muted-foreground text-xs"
                                            onClick={() =>
                                              setPlayerMatchStep((prev) => ({
                                                ...prev,
                                                [member.userId]: "auto",
                                              }))
                                            }
                                            size="sm"
                                            type="button"
                                            variant="ghost"
                                          >
                                            ← Back
                                          </Button>
                                        </div>
                                        <div className="relative">
                                          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-gray-400" />
                                          <Input
                                            className="pl-10"
                                            onChange={(e) =>
                                              setEnrollmentSearchTerm(
                                                (prev) => ({
                                                  ...prev,
                                                  [member.userId]:
                                                    e.target.value,
                                                })
                                              )
                                            }
                                            placeholder="Type a name to search..."
                                            value={playerSearchTerm}
                                          />
                                        </div>
                                        {playerSearchTerm.length >= 2 ? (
                                          <div className="max-h-48 space-y-1 overflow-y-auto">
                                            {filteredUnlinked.length === 0 ? (
                                              <div className="space-y-2">
                                                <p className="text-muted-foreground text-xs">
                                                  No player records found
                                                  matching "{playerSearchTerm}".
                                                </p>
                                                <Button
                                                  className="border-orange-400 text-orange-700 hover:bg-orange-100"
                                                  onClick={() =>
                                                    setPlayerMatchStep(
                                                      (prev) => ({
                                                        ...prev,
                                                        [member.userId]:
                                                          "create",
                                                      })
                                                    )
                                                  }
                                                  size="sm"
                                                  type="button"
                                                  variant="outline"
                                                >
                                                  Create a new record instead
                                                </Button>
                                              </div>
                                            ) : (
                                              filteredUnlinked.map((e) => {
                                                const isSelected =
                                                  selectedEnrollmentId ===
                                                  e.enrollmentId;
                                                return (
                                                  <button
                                                    className={`flex w-full cursor-pointer items-center gap-2 rounded border p-2 text-left text-sm ${
                                                      isSelected
                                                        ? "border-orange-400 bg-orange-100"
                                                        : "border-gray-200 bg-white hover:bg-gray-50"
                                                    }`}
                                                    key={e.enrollmentId}
                                                    onClick={() => {
                                                      setSelectedExistingEnrollmentId(
                                                        (prev) => ({
                                                          ...prev,
                                                          [member.userId]:
                                                            isSelected
                                                              ? null
                                                              : e.enrollmentId,
                                                        })
                                                      );
                                                      if (!isSelected) {
                                                        setPlayerMatchStep(
                                                          (prev) => ({
                                                            ...prev,
                                                            [member.userId]:
                                                              "confirmed",
                                                          })
                                                        );
                                                      }
                                                    }}
                                                    type="button"
                                                  >
                                                    <span
                                                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${isSelected ? "border-orange-500 bg-orange-500 text-white" : "border-muted"}`}
                                                    >
                                                      {isSelected && "✓"}
                                                    </span>
                                                    <span className="flex-1 font-medium">
                                                      {e.firstName} {e.lastName}
                                                    </span>
                                                    <span className="text-muted-foreground text-xs">
                                                      {e.dateOfBirth
                                                        ? `DOB: ${e.dateOfBirth}`
                                                        : e.ageGroup}
                                                    </span>
                                                  </button>
                                                );
                                              })
                                            )}
                                          </div>
                                        ) : (
                                          <p className="text-muted-foreground text-xs">
                                            Type at least 2 characters to
                                            search.
                                          </p>
                                        )}
                                        <Button
                                          className="border-orange-400 text-orange-700 hover:bg-orange-100"
                                          onClick={() =>
                                            setPlayerMatchStep((prev) => ({
                                              ...prev,
                                              [member.userId]: "create",
                                            }))
                                          }
                                          size="sm"
                                          type="button"
                                          variant="outline"
                                        >
                                          Can't find the record — create a new
                                          one
                                        </Button>
                                      </div>
                                    )}

                                    {/* Step: create — DOB field only */}
                                    {matchStep === "create" && (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <Label className="font-medium text-sm">
                                            Create New Player Record
                                          </Label>
                                          <Button
                                            className="h-auto p-0 text-muted-foreground text-xs"
                                            onClick={() =>
                                              setPlayerMatchStep((prev) => ({
                                                ...prev,
                                                [member.userId]: "search",
                                              }))
                                            }
                                            size="sm"
                                            type="button"
                                            variant="ghost"
                                          >
                                            ← Back
                                          </Button>
                                        </div>
                                        <p className="text-muted-foreground text-xs">
                                          A new player record will be created
                                          for{" "}
                                          <strong>{member.user?.name}</strong>.
                                        </p>
                                        <div>
                                          <Label
                                            className="font-medium text-sm"
                                            htmlFor={`player-dob-${member.userId}`}
                                          >
                                            Date of Birth{" "}
                                            <span className="text-destructive">
                                              *
                                            </span>
                                          </Label>
                                          <Input
                                            id={`player-dob-${member.userId}`}
                                            onChange={(e) =>
                                              setPlayerCreateForm((prev) => ({
                                                ...prev,
                                                [member.userId]: {
                                                  ...prev[member.userId],
                                                  dateOfBirth: e.target.value,
                                                  phone:
                                                    prev[member.userId]
                                                      ?.phone ?? "",
                                                  postcode:
                                                    prev[member.userId]
                                                      ?.postcode ?? "",
                                                },
                                              }))
                                            }
                                            type="date"
                                            value={dob}
                                          />
                                        </div>
                                        {/* Phone and Postcode — optional matching signals */}
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <Label className="font-medium text-sm">
                                              Phone (Optional)
                                            </Label>
                                            <PhoneInput
                                              countries={["IE", "GB", "US"]}
                                              defaultCountry="IE"
                                              onChange={(value) =>
                                                setPlayerCreateForm((prev) => ({
                                                  ...prev,
                                                  [member.userId]: {
                                                    dateOfBirth:
                                                      prev[member.userId]
                                                        ?.dateOfBirth ?? "",
                                                    postcode:
                                                      prev[member.userId]
                                                        ?.postcode ?? "",
                                                    phone: value ?? "",
                                                  },
                                                }))
                                              }
                                              value={
                                                playerCreateForm[member.userId]
                                                  ?.phone ?? ""
                                              }
                                            />
                                          </div>
                                          <div>
                                            <Label className="font-medium text-sm">
                                              Postcode (Optional)
                                            </Label>
                                            <Input
                                              maxLength={10}
                                              onChange={(e) =>
                                                setPlayerCreateForm((prev) => ({
                                                  ...prev,
                                                  [member.userId]: {
                                                    dateOfBirth:
                                                      prev[member.userId]
                                                        ?.dateOfBirth ?? "",
                                                    phone:
                                                      prev[member.userId]
                                                        ?.phone ?? "",
                                                    postcode: e.target.value,
                                                  },
                                                }))
                                              }
                                              placeholder="e.g. D01 F5P2"
                                              type="text"
                                              value={
                                                playerCreateForm[member.userId]
                                                  ?.postcode ?? ""
                                              }
                                            />
                                          </div>
                                        </div>
                                        {/* Duplicate-match warning for create step */}
                                        {playerCreateMatchWarnings[
                                          member.userId
                                        ]?.length > 0 && (
                                          <div className="rounded border border-amber-300 bg-amber-50 p-2 text-xs">
                                            <p className="mb-1 font-medium text-amber-800">
                                              Possible existing player record(s)
                                              found:
                                            </p>
                                            {playerCreateMatchWarnings[
                                              member.userId
                                            ].map((c) => (
                                              <p
                                                className="text-amber-700"
                                                key={c._id}
                                              >
                                                {c.firstName} {c.lastName} — DOB{" "}
                                                {c.dateOfBirth} ({c.confidence}{" "}
                                                match)
                                              </p>
                                            ))}
                                            <div className="mt-2 flex gap-2">
                                              <Button
                                                className="border-amber-400 text-amber-700 hover:bg-amber-100"
                                                onClick={() => {
                                                  setPlayerCreateMatchAcknowledged(
                                                    (prev) => ({
                                                      ...prev,
                                                      [member.userId]: true,
                                                    })
                                                  );
                                                  setPlayerCreateMatchWarnings(
                                                    (prev) => ({
                                                      ...prev,
                                                      [member.userId]: [],
                                                    })
                                                  );
                                                  setPlayerMatchStep(
                                                    (prev) => ({
                                                      ...prev,
                                                      [member.userId]:
                                                        "confirmed",
                                                    })
                                                  );
                                                }}
                                                size="sm"
                                                type="button"
                                                variant="outline"
                                              >
                                                Create anyway
                                              </Button>
                                              <Button
                                                onClick={() =>
                                                  setPlayerCreateMatchWarnings(
                                                    (prev) => ({
                                                      ...prev,
                                                      [member.userId]: [],
                                                    })
                                                  )
                                                }
                                                size="sm"
                                                type="button"
                                                variant="ghost"
                                              >
                                                Cancel
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                        {dob &&
                                          !(
                                            playerCreateMatchWarnings[
                                              member.userId
                                            ]?.length > 0
                                          ) && (
                                            <Button
                                              className="border-orange-400 text-orange-700 hover:bg-orange-100"
                                              onClick={async () => {
                                                if (
                                                  playerCreateMatchAcknowledged[
                                                    member.userId
                                                  ]
                                                ) {
                                                  setPlayerMatchStep(
                                                    (prev) => ({
                                                      ...prev,
                                                      [member.userId]:
                                                        "confirmed",
                                                    })
                                                  );
                                                  return;
                                                }
                                                const accountName =
                                                  member.user?.name ?? "";
                                                const spaceIdx =
                                                  accountName.indexOf(" ");
                                                const firstName =
                                                  spaceIdx >= 0
                                                    ? accountName.slice(
                                                        0,
                                                        spaceIdx
                                                      )
                                                    : accountName;
                                                const lastName =
                                                  spaceIdx >= 0
                                                    ? accountName.slice(
                                                        spaceIdx + 1
                                                      )
                                                    : "";
                                                const candidates =
                                                  (await convex.query(
                                                    api.models.playerMatching
                                                      .findPlayerMatchCandidates,
                                                    {
                                                      organizationId: orgId,
                                                      firstName:
                                                        firstName.trim(),
                                                      lastName: lastName.trim(),
                                                      dateOfBirth: dob,
                                                      email:
                                                        member.user?.email ??
                                                        undefined,
                                                      phone:
                                                        playerCreateForm[
                                                          member.userId
                                                        ]?.phone || undefined,
                                                      postcode:
                                                        playerCreateForm[
                                                          member.userId
                                                        ]?.postcode?.trim() ||
                                                        undefined,
                                                    }
                                                  )) as CreateMatchCandidate[];
                                                const relevant =
                                                  candidates.filter(
                                                    (c) =>
                                                      c.confidence === "high" ||
                                                      c.confidence === "medium"
                                                  );
                                                if (relevant.length > 0) {
                                                  setPlayerCreateMatchWarnings(
                                                    (prev) => ({
                                                      ...prev,
                                                      [member.userId]: relevant,
                                                    })
                                                  );
                                                } else {
                                                  setPlayerMatchStep(
                                                    (prev) => ({
                                                      ...prev,
                                                      [member.userId]:
                                                        "confirmed",
                                                    })
                                                  );
                                                }
                                              }}
                                              size="sm"
                                              type="button"
                                              variant="outline"
                                            >
                                              ✓ Confirm — create this record
                                            </Button>
                                          )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                            {/* Team assignment — shown for both linked and unlinked */}
                            <div className="space-y-2">
                              <Label className="font-medium text-sm">
                                Assign to Teams{" "}
                                <span className="font-normal text-muted-foreground text-xs">
                                  (optional)
                                </span>
                              </Label>
                              {(teams ?? []).length === 0 ? (
                                <p className="text-muted-foreground text-xs">
                                  No teams set up yet.
                                </p>
                              ) : (
                                <div className="max-h-48 space-y-1 overflow-y-auto">
                                  {(teams ?? []).map((team: any) => {
                                    const isSelected = selectedTeamIds.includes(
                                      team._id
                                    );

                                    // Age-group mismatch warning
                                    const teamAgeGroupStr =
                                      team.ageGroup?.trim() ?? "";
                                    const dobForWarning =
                                      selectedEnrollment?.dateOfBirth ||
                                      linkedPlayerRecord?.dateOfBirth ||
                                      dob ||
                                      "";
                                    const dobYear = dobForWarning
                                      ? new Date(dobForWarning).getFullYear()
                                      : null;
                                    const playerAge = dobYear
                                      ? new Date().getFullYear() - dobYear
                                      : null;
                                    const ageGroupNum = teamAgeGroupStr
                                      ? Number.parseInt(
                                          teamAgeGroupStr.replace(/\D/g, ""),
                                          10
                                        )
                                      : null;
                                    const showAgeWarning =
                                      isSelected &&
                                      playerAge !== null &&
                                      ageGroupNum !== null &&
                                      !Number.isNaN(ageGroupNum) &&
                                      Math.abs(playerAge - ageGroupNum) > 2;

                                    return (
                                      <div key={team._id}>
                                        <button
                                          className={`flex w-full cursor-pointer items-center gap-2 rounded border p-2 text-left text-sm ${
                                            isSelected
                                              ? "border-orange-400 bg-orange-100"
                                              : "border-gray-200 bg-white hover:bg-gray-50"
                                          }`}
                                          onClick={() =>
                                            setPlayerCreateTeams((prev) => ({
                                              ...prev,
                                              [member.userId]: isSelected
                                                ? (
                                                    prev[member.userId] ??
                                                    currentPlayerTeamIds
                                                  ).filter(
                                                    (id) => id !== team._id
                                                  )
                                                : [
                                                    ...(prev[member.userId] ??
                                                      currentPlayerTeamIds),
                                                    team._id,
                                                  ],
                                            }))
                                          }
                                          type="button"
                                        >
                                          <span
                                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${isSelected ? "border-orange-500 bg-orange-500 text-white" : "border-muted"}`}
                                          >
                                            {isSelected && "✓"}
                                          </span>
                                          <span className="flex-1 font-medium">
                                            {team.name}
                                          </span>
                                          <span className="text-muted-foreground text-xs">
                                            {team.ageGroup}
                                            {team.season
                                              ? ` · ${team.season}`
                                              : ""}
                                          </span>
                                        </button>
                                        {showAgeWarning && (
                                          <p className="mt-0.5 text-amber-600 text-xs">
                                            ⚠ Player age ({playerAge}) may not
                                            match {teamAgeGroupStr} — you can
                                            still proceed.
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                    {/* Save Button */}
                    {state.modified && (
                      <div className="flex justify-end gap-2 border-t pt-4">
                        <Button
                          onClick={() => {
                            setEditStates((prev) => ({
                              ...prev,
                              [member.userId]: {
                                ...prev[member.userId],
                                modified: false,
                              },
                            }));
                            setSelectedExistingEnrollmentId((prev) => ({
                              ...prev,
                              [member.userId]: null,
                            }));
                            setPlayerCreateForm((prev) => {
                              const n = { ...prev };
                              delete n[member.userId];
                              return n;
                            });
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                        <Button
                          disabled={loading === member.userId}
                          onClick={() => handleSave(member)}
                        >
                          {loading === member.userId ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
      <Dialog onOpenChange={setInviteDialogOpen} open={inviteDialogOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Invite Member
            </DialogTitle>
            <DialogDescription>
              Send an invitation to join this organization
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <ResponsiveForm
              isLoading={inviting}
              onCancel={() => setInviteDialogOpen(false)}
              onSubmit={handleInvite}
              stickySubmit={false}
              submitText="Send Invitation"
            >
              <ResponsiveFormSection>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    disabled={inviting}
                    id="email"
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="coach@example.com"
                    required
                    type="email"
                    value={inviteEmail}
                  />
                  {/* Feature A (Issue #437): Existing user indicator */}
                  {existingInviteUser && (
                    <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-green-800 text-sm">
                      <UserCheck className="h-4 w-4 shrink-0" />
                      <span>
                        <strong>
                          {existingInviteUser.name || existingInviteUser.email}
                        </strong>{" "}
                        already has an account — they'll receive an in-app
                        notification when invited.
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Roles</Label>
                  <p className="mb-2 text-muted-foreground text-xs">
                    Select the roles this user should have. Admins can manage
                    users and settings.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        inviteFunctionalRoles.includes("admin")
                          ? "border-purple-400 bg-purple-100 text-purple-700"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                      disabled={inviting}
                      onClick={() => toggleInviteFunctionalRole("admin")}
                      type="button"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Admin</span>
                    </button>
                    <button
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        inviteFunctionalRoles.includes("coach")
                          ? "border-green-400 bg-green-100 text-green-700"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                      disabled={inviting}
                      onClick={() => toggleInviteFunctionalRole("coach")}
                      type="button"
                    >
                      <Users className="h-4 w-4" />
                      <span>Coach</span>
                    </button>
                    <button
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        inviteFunctionalRoles.includes("parent")
                          ? "border-blue-400 bg-blue-100 text-blue-700"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                      disabled={inviting}
                      onClick={() => toggleInviteFunctionalRole("parent")}
                      type="button"
                    >
                      <UserCircle className="h-4 w-4" />
                      <span>Parent</span>
                    </button>
                    <button
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        inviteFunctionalRoles.includes("player")
                          ? "border-orange-400 bg-orange-100 text-orange-700"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                      disabled={inviting}
                      onClick={() => toggleInviteFunctionalRole("player")}
                      type="button"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Player (Adult)</span>
                    </button>
                  </div>
                  {inviteFunctionalRoles.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      Selected: {inviteFunctionalRoles.join(", ")}. These roles
                      will be auto-assigned when the invitation is accepted.
                    </p>
                  )}
                </div>

                {/* Coach: Team Selection */}
                {inviteFunctionalRoles.includes("coach") && teams && (
                  <div className="space-y-2">
                    <Label>Assign to Teams (optional)</Label>
                    <p className="mb-2 text-muted-foreground text-xs">
                      Select teams this coach will manage. Can be changed later.
                    </p>
                    <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-2">
                      {teams.length === 0 ? (
                        <p className="py-2 text-center text-muted-foreground text-sm">
                          No teams available
                        </p>
                      ) : (
                        teams.map((team) => (
                          <button
                            className={`flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                              inviteTeams.includes(team._id)
                                ? "bg-green-100 text-green-700"
                                : "hover:bg-gray-100"
                            }`}
                            disabled={inviting}
                            key={team._id}
                            onClick={() => {
                              if (inviteTeams.includes(team._id)) {
                                setInviteTeams(
                                  inviteTeams.filter((id) => id !== team._id)
                                );
                              } else {
                                setInviteTeams([...inviteTeams, team._id]);
                              }
                            }}
                            type="button"
                          >
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded-sm border ${inviteTeams.includes(team._id) ? "border-primary bg-primary text-primary-foreground" : "border-muted"}`}
                            >
                              {inviteTeams.includes(team._id) && "✓"}
                            </span>
                            <span>
                              {team.name}
                              {team.ageGroup && (
                                <span className="ml-1 text-muted-foreground">
                                  ({team.ageGroup})
                                </span>
                              )}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                    {inviteTeams.length > 0 && (
                      <p className="text-muted-foreground text-xs">
                        {inviteTeams.length} team(s) selected
                      </p>
                    )}
                  </div>
                )}

                {/* Parent: Player Linking */}
                {inviteFunctionalRoles.includes("parent") && allPlayers && (
                  <div className="space-y-2">
                    <Label>Link to Players (optional)</Label>
                    <p className="mb-2 text-muted-foreground text-xs">
                      Select players this parent is associated with.
                      Auto-matching by email will also run.
                    </p>
                    <Input
                      className="mb-2"
                      disabled={inviting}
                      onChange={(e) => setInvitePlayerSearch(e.target.value)}
                      placeholder="Search players by name..."
                      value={invitePlayerSearch}
                    />
                    <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-2">
                      {allPlayers.length === 0 ? (
                        <p className="py-2 text-center text-muted-foreground text-sm">
                          No players available
                        </p>
                      ) : (
                        allPlayers
                          .filter(
                            (player) =>
                              !invitePlayerSearch ||
                              player.name
                                .toLowerCase()
                                .includes(invitePlayerSearch.toLowerCase())
                          )
                          .slice(0, 20)
                          .map((player) => (
                            <button
                              className={`flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                                invitePlayerIds.includes(player._id)
                                  ? "bg-blue-100 text-blue-700"
                                  : "hover:bg-gray-100"
                              }`}
                              disabled={inviting}
                              key={player._id}
                              onClick={() => {
                                if (invitePlayerIds.includes(player._id)) {
                                  setInvitePlayerIds(
                                    invitePlayerIds.filter(
                                      (id) => id !== player._id
                                    )
                                  );
                                } else {
                                  setInvitePlayerIds([
                                    ...invitePlayerIds,
                                    player._id,
                                  ]);
                                }
                              }}
                              type="button"
                            >
                              <span
                                className={`flex h-4 w-4 items-center justify-center rounded-sm border ${invitePlayerIds.includes(player._id) ? "border-primary bg-primary text-primary-foreground" : "border-muted"}`}
                              >
                                {invitePlayerIds.includes(player._id) && "✓"}
                              </span>
                              <span>
                                {player.name}
                                {player.ageGroup && (
                                  <span className="ml-1 text-muted-foreground">
                                    ({player.ageGroup})
                                  </span>
                                )}
                              </span>
                            </button>
                          ))
                      )}
                      {allPlayers.filter(
                        (player) =>
                          !invitePlayerSearch ||
                          player.name
                            .toLowerCase()
                            .includes(invitePlayerSearch.toLowerCase())
                      ).length > 20 && (
                        <p className="py-1 text-center text-muted-foreground text-xs">
                          Showing first 20 results. Use search to narrow down.
                        </p>
                      )}
                    </div>
                    {invitePlayerIds.length > 0 && (
                      <p className="text-muted-foreground text-xs">
                        {invitePlayerIds.length} player(s) selected
                      </p>
                    )}
                  </div>
                )}

                {/* Player (Adult): Optional name + DOB for youth record matching */}
                {inviteFunctionalRoles.includes("player") && (
                  <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
                    <div>
                      <Label className="font-medium text-orange-900 text-sm">
                        Youth Record Matching (Optional)
                      </Label>
                      <p className="mt-1 text-orange-700 text-xs">
                        Enter the player's name and date of birth to
                        automatically link their existing youth history when
                        they accept the invite.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-orange-800 text-xs">
                          First Name
                        </Label>
                        <Input
                          className="mt-1"
                          disabled={inviting}
                          onChange={(e) =>
                            setInvitePlayerFirstName(e.target.value)
                          }
                          placeholder="First name"
                          value={invitePlayerFirstName}
                        />
                      </div>
                      <div>
                        <Label className="text-orange-800 text-xs">
                          Last Name
                        </Label>
                        <Input
                          className="mt-1"
                          disabled={inviting}
                          onChange={(e) =>
                            setInvitePlayerLastName(e.target.value)
                          }
                          placeholder="Last name"
                          value={invitePlayerLastName}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-orange-800 text-xs">
                        Date of Birth
                      </Label>
                      <Input
                        className="mt-1"
                        disabled={inviting}
                        onChange={(e) => setInvitePlayerDob(e.target.value)}
                        type="date"
                        value={invitePlayerDob}
                      />
                    </div>
                    {/* Match result note */}
                    {hasPlayerMatchData &&
                      invitePlayerMatchResult !== null &&
                      (invitePlayerMatchResult.confidence === "high" ||
                        invitePlayerMatchResult.confidence === "medium") && (
                        <div className="rounded-md border border-orange-300 bg-orange-100 p-2">
                          <p className="text-orange-800 text-xs">
                            An existing {invitePlayerMatchResult.playerType}{" "}
                            player record may match this person. They&apos;ll be
                            linked to their existing history when they accept
                            the invite.
                          </p>
                        </div>
                      )}
                  </div>
                )}
              </ResponsiveFormSection>
            </ResponsiveForm>
          </div>
        </DialogContent>
      </Dialog>
      {selectedInvitationId && pendingInvitations && (
        <InvitationDetailModal
          invitation={
            pendingInvitations.find(
              (inv: { _id: string }) => inv._id === selectedInvitationId
            ) || null
          }
          isOpen={!!selectedInvitationId}
          onCancel={async () => {
            try {
              await cancelInvitation({ invitationId: selectedInvitationId });
              toast.success("Invitation cancelled successfully");
              setSelectedInvitationId(null);
            } catch (_error) {
              toast.error("Failed to cancel invitation");
            }
          }}
          onClose={() => setSelectedInvitationId(null)}
          onResend={async () => {
            try {
              await resendInvitation({ invitationId: selectedInvitationId });
              toast.success("Invitation resent successfully");
            } catch (_error) {
              toast.error("Failed to resend invitation");
            }
          }}
        />
      )}
      {historyInvitation && (
        <InvitationHistoryModal
          invitationId={historyInvitation.invitationId}
          inviteeEmail={historyInvitation.email}
          onClose={() => setHistoryInvitation(null)}
        />
      )}
      {editingInvitation && (
        <EditInvitationModal
          invitation={editingInvitation}
          onClose={() => setEditingInvitation(null)}
          onSuccess={() => {
            setEditingInvitation(null);
            // Refresh will happen automatically via Convex reactivity
          }}
          organizationId={orgId}
        />
      )}
      {disablingMember && (
        <DisableMemberDialog
          member={disablingMember}
          onClose={() => setDisablingMember(null)}
          onSuccess={() => {
            setDisablingMember(null);
            // Refresh will happen automatically via Convex reactivity
          }}
          organizationId={orgId}
        />
      )}
      {removingMember && (
        <RemoveFromOrgDialog
          member={removingMember}
          onClose={() => setRemovingMember(null)}
          onSuccess={() => {
            setRemovingMember(null);
            // Refresh will happen automatically via Convex reactivity
          }}
          organizationId={orgId}
        />
      )}
    </div>
  );
}
