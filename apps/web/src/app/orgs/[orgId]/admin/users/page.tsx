"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Crown,
  Eye,
  Loader2,
  Mail,
  Save,
  Search,
  Send,
  Shield,
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
import { Skeleton } from "@/components/ui/skeleton";
import { useOrgTheme } from "@/hooks/use-org-theme";
import { authClient } from "@/lib/auth-client";
import { DisableMemberDialog } from "./disable-member-dialog";
import { EditInvitationModal } from "./edit-invitation-modal";
import { InvitationDetailModal } from "./invitation-detail-modal";
import { InvitationHistoryModal } from "./invitation-history-modal";
import { RemoveFromOrgDialog } from "./remove-from-org-dialog";

type FunctionalRole = "coach" | "parent" | "admin" | "player";

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
  const orgId = params.orgId as string;

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
  const updateInvitationMetadata = useMutation(
    api.models.members.updateInvitationMetadata
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
  const [playerSearchTerms, setPlayerSearchTerms] = useState<{
    [userId: string]: string;
  }>({});

  // Invitation dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFunctionalRoles, setInviteFunctionalRoles] = useState<
    ("coach" | "parent" | "admin")[]
  >([]);
  const [inviteTeams, setInviteTeams] = useState<string[]>([]); // Team IDs for coach
  const [invitePlayerIds, setInvitePlayerIds] = useState<string[]>([]); // Player IDs for parent
  const [invitePlayerSearch, setInvitePlayerSearch] = useState(""); // Search term for players
  const [inviting, setInviting] = useState(false);

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

  // Helper function to infer Better Auth role from functional roles
  // If functional roles include "admin", Better Auth role should be "admin"
  // Otherwise, default to "member"
  const inferBetterAuthRole = (
    functionalRoles: ("coach" | "parent" | "admin")[]
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
        // Convert team IDs to team names for consistency
        const teamNames = (state.teams || [])
          .map((teamIdOrName: string) => {
            // Check if it's already a name (exists in teams array by name)
            const teamByName = teams?.find((t: any) => t.name === teamIdOrName);
            if (teamByName) {
              return teamIdOrName; // It's already a name
            }
            // Check if it's a team ID and convert to name
            const teamById = teams?.find((t: any) => t._id === teamIdOrName);
            if (teamById) {
              return teamById.name; // Convert ID to name
            }
            // Fallback: return as-is (might be a name that doesn't match)
            return teamIdOrName;
          })
          .filter(Boolean);

        await updateCoachAssignments({
          userId,
          organizationId: orgId,
          teams: teamNames,
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

  const toggleInviteFunctionalRole = (role: "coach" | "parent" | "admin") => {
    setInviteFunctionalRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
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
        suggestedFunctionalRoles: ("coach" | "parent" | "admin")[];
        roleSpecificData?: {
          teams?: TeamInfo[]; // Full team details for coach role
        };
        suggestedPlayerLinks?: PlayerInfo[]; // Full player details for parent role
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
    if (!searchTerm) {
      return true;
    }
    const user = member.user || {};
    const searchable = [user.name, user.email, ...functionalRoles]
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
      {/* Pending Invitations */}
      {pendingInvitations && pendingInvitations.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-orange-600" />
              Pending Invitations ({pendingInvitations.length})
            </CardTitle>
            <CardDescription>
              Invitations that have been sent but not yet accepted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvitations.map((invitation: any) => {
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
                          <p className="font-medium sm:truncate">
                            {invitation.email}
                          </p>
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
                          onClick={() =>
                            setSelectedInvitationId(invitation._id)
                          }
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
                            onClick={() =>
                              handleResendInvitation(invitation._id)
                            }
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
                        // Use functional roles from backend query (already extracted from metadata)
                        const functionalRoles =
                          invitation.functionalRoles || [];

                        // Show functional roles if available with inline assignments
                        if (functionalRoles.length > 0) {
                          return functionalRoles.map((role: string) => (
                            <span
                              className="flex items-center gap-1.5"
                              key={role}
                            >
                              <Badge className="text-xs" variant="outline">
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                              </Badge>
                              {/* Show teams inline if coach role */}
                              {role === "coach" &&
                                invitation.teams?.length > 0 && (
                                  <span className="flex items-center gap-1 text-blue-600 text-xs">
                                    →
                                    <span className="max-w-[150px] truncate">
                                      {invitation.teams
                                        .map((t: any) => t.name)
                                        .join(", ")}
                                    </span>
                                  </span>
                                )}
                              {/* Show players inline if parent role */}
                              {role === "parent" &&
                                invitation.players?.length > 0 && (
                                  <span className="flex items-center gap-1 text-green-600 text-xs">
                                    →
                                    <span className="max-w-[150px] truncate">
                                      {invitation.players
                                        .map(
                                          (p: any) =>
                                            `${p.firstName} ${p.lastName}`
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
                        // Show resend tracking if available
                        const resendHistory =
                          invitation.metadata?.resendHistory || [];
                        if (resendHistory.length > 0) {
                          const lastResend = resendHistory.at(-1);
                          const daysAgo = Math.floor(
                            (Date.now() - lastResend.resentAt) /
                              (1000 * 60 * 60 * 24)
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
              })}
            </div>
          </CardContent>
        </Card>
      )}
      {/* Search and Filter */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative max-w-md flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by name or email..."
            value={searchTerm}
          />
        </div>
        {roleFilter !== "all" && (
          <Button
            onClick={() => setRoleFilter("all")}
            size="sm"
            variant="ghost"
          >
            <X className="mr-2 h-4 w-4" />
            Clear filter: {roleFilter}
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
                {searchTerm || roleFilter !== "all"
                  ? "No results found"
                  : "No users yet"}
              </EmptyTitle>
              <EmptyDescription>
                {searchTerm || roleFilter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Get started by inviting your first team member to join this organization"}
              </EmptyDescription>
              {!searchTerm && roleFilter === "all" && (
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
                    <div className="flex items-center justify-between gap-2">
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
                          <CardDescription className="flex min-w-0 items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {user.email || "No email"}
                            </span>
                          </CardDescription>
                        </div>
                      </div>

                      {/* Action buttons - always visible on right */}
                      <div className="flex flex-shrink-0 items-center gap-2">
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

                    {/* Save Button */}
                    {state.modified && (
                      <div className="flex justify-end gap-2 border-t pt-4">
                        <Button
                          onClick={() =>
                            setEditStates((prev) => ({
                              ...prev,
                              [member.userId]: {
                                ...prev[member.userId],
                                modified: false,
                              },
                            }))
                          }
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Invite Member
            </DialogTitle>
            <DialogDescription>
              Send an invitation to join this organization
            </DialogDescription>
          </DialogHeader>

          <ResponsiveForm
            isLoading={inviting}
            onCancel={() => setInviteDialogOpen(false)}
            onSubmit={handleInvite}
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
                    Select players this parent is associated with. Auto-matching
                    by email will also run.
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
            </ResponsiveFormSection>
          </ResponsiveForm>
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
