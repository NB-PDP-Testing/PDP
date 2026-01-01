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
import { useState } from "react";
import { toast } from "sonner";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface UserEditState {
  [userId: string]: {
    functionalRoles: FunctionalRole[];
    teams: string[];
    ageGroups: string[];
    linkedPlayerIds: string[];
    expanded: boolean;
    modified: boolean;
  };
}

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
    if (!(state && state.modified)) {
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
      interface InviteMetadata {
        suggestedFunctionalRoles: ("coach" | "parent" | "admin")[];
        roleSpecificData?: {
          teams?: string[]; // Team IDs for coach role
        };
        suggestedPlayerLinks?: string[]; // Player IDs for parent role
      }

      const metadata: InviteMetadata = {
        suggestedFunctionalRoles: inviteFunctionalRoles,
      };

      // Add coach-specific data (teams)
      if (inviteFunctionalRoles.includes("coach") && inviteTeams.length > 0) {
        metadata.roleSpecificData = {
          teams: inviteTeams,
        };
      }

      // Add parent-specific data (player links)
      if (
        inviteFunctionalRoles.includes("parent") &&
        invitePlayerIds.length > 0
      ) {
        metadata.suggestedPlayerLinks = invitePlayerIds;
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
                const expiresAt = new Date(invitation.expiresAt);
                const daysUntilExpiry = Math.ceil(
                  (invitation.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <div
                    className={`flex items-center justify-between rounded-lg border p-3 ${
                      isExpired
                        ? "border-red-200 bg-red-50"
                        : "border-orange-200 bg-orange-50"
                    }`}
                    key={invitation._id}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                        <Mail className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
                          <span>
                            Invited by {invitation.inviter?.name || "Unknown"}
                          </span>
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
                                  <span>•</span>
                                  <Badge className="text-xs" variant="outline">
                                    {role.charAt(0).toUpperCase() +
                                      role.slice(1)}
                                  </Badge>
                                  {/* Show teams inline if coach role */}
                                  {role === "coach" &&
                                    invitation.teams?.length > 0 && (
                                      <span className="flex items-center gap-1 text-blue-600 text-xs">
                                        →
                                        {invitation.teams
                                          .map((t: any) => t.name)
                                          .join(", ")}
                                      </span>
                                    )}
                                  {/* Show players inline if parent role */}
                                  {role === "parent" &&
                                    invitation.players?.length > 0 && (
                                      <span className="flex items-center gap-1 text-green-600 text-xs">
                                        →
                                        {invitation.players
                                          .map(
                                            (p: any) =>
                                              `${p.firstName} ${p.lastName}`
                                          )
                                          .join(", ")}
                                      </span>
                                    )}
                                </span>
                              ));
                            }
                            if (invitation.role) {
                              return (
                                <>
                                  <span>•</span>
                                  <Badge
                                    className="text-xs"
                                    variant="secondary"
                                  >
                                    {invitation.role}
                                  </Badge>
                                  <Badge
                                    className="text-xs"
                                    variant="destructive"
                                  >
                                    No functional role
                                  </Badge>
                                </>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {isExpired ? (
                            <span className="text-red-600">Expired</span>
                          ) : (
                            <span>
                              Expires in {daysUntilExpiry}{" "}
                              {daysUntilExpiry === 1 ? "day" : "days"} (
                              {expiresAt.toLocaleDateString()})
                            </span>
                          )}
                          {(() => {
                            // Show resend tracking if available
                            const resendHistory =
                              invitation.metadata?.resendHistory || [];
                            if (resendHistory.length > 0) {
                              const lastResend =
                                resendHistory[resendHistory.length - 1];
                              const lastSentDate = new Date(
                                lastResend.resentAt
                              );
                              const daysAgo = Math.floor(
                                (Date.now() - lastResend.resentAt) /
                                  (1000 * 60 * 60 * 24)
                              );
                              return (
                                <span className="ml-2">
                                  • Resent {resendHistory.length}{" "}
                                  {resendHistory.length === 1
                                    ? "time"
                                    : "times"}
                                  {daysAgo === 0
                                    ? " (today)"
                                    : daysAgo === 1
                                      ? " (yesterday)"
                                      : ` (${daysAgo} days ago)`}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        onClick={() => setEditingInvitation(invitation)}
                        size="sm"
                        title="Edit invitation roles and assignments"
                        variant="ghost"
                      >
                        <svg
                          className="mr-2 h-4 w-4"
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
                        Edit
                      </Button>
                      <Button
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
                          className="mr-2 h-4 w-4"
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
                        History
                      </Button>
                      <Button
                        onClick={() => setSelectedInvitationId(invitation._id)}
                        size="sm"
                        variant="ghost"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Details
                      </Button>
                      {!isExpired && (
                        <Button
                          disabled={loading === invitation._id}
                          onClick={() => handleResendInvitation(invitation._id)}
                          size="sm"
                          variant="outline"
                        >
                          {loading === invitation._id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          Resend
                        </Button>
                      )}
                      <Button
                        disabled={loading === invitation._id}
                        onClick={() => handleCancelInvitation(invitation._id)}
                        size="sm"
                        variant="destructive"
                      >
                        {loading === invitation._id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <X className="mr-2 h-4 w-4" />
                        )}
                        Cancel
                      </Button>
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
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchTerm || roleFilter !== "all"
                  ? "No users match your search criteria"
                  : "No users in this organization yet"}
              </p>
            </CardContent>
          </Card>
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
            const hasWarning = hasCoachWarning || hasParentWarning;

            return (
              <Card key={member.userId}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">
                          {user.name || "Unknown"}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {user.email || "No email"}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex flex-wrap gap-1">
                        {/* Suspended Badge - show if member is disabled */}
                        {member.isDisabled && (
                          <Badge className="border-red-300 bg-red-100 text-red-700">
                            <svg
                              className="mr-1 h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
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
                                (role === "coach" &&
                                  state.teams.length === 0) ||
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

                      <div className="flex items-center gap-2">
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
                            <label
                              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                state.functionalRoles.includes(role)
                                  ? getRoleBadgeColor(role)
                                  : "border-gray-200 bg-white hover:bg-gray-50"
                              }`}
                              key={role}
                            >
                              <Checkbox
                                checked={state.functionalRoles.includes(role)}
                                className="sr-only"
                                onCheckedChange={() =>
                                  toggleFunctionalRole(member.userId, role)
                                }
                              />
                              {getRoleIcon(role)}
                              <span className="capitalize">{role}</span>
                            </label>
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
                              <label
                                className={`flex cursor-pointer items-center gap-2 rounded border p-2 text-sm transition-colors ${
                                  state.teams.includes(team._id)
                                    ? "border-green-400 bg-green-100"
                                    : "border-gray-200 bg-white hover:bg-gray-50"
                                }`}
                                key={team._id}
                              >
                                <Checkbox
                                  checked={state.teams.includes(team._id)}
                                  onCheckedChange={() =>
                                    toggleTeam(member.userId, team._id)
                                  }
                                />
                                <span className="truncate">{team.name}</span>
                              </label>
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
                                <label
                                  className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm transition-colors ${
                                    state.ageGroups.includes(ageGroup)
                                      ? "border-green-400 bg-green-100"
                                      : "border-gray-200 bg-white hover:bg-gray-50"
                                  }`}
                                  key={ageGroup}
                                >
                                  <Checkbox
                                    checked={state.ageGroups.includes(ageGroup)}
                                    onCheckedChange={() =>
                                      toggleAgeGroup(member.userId, ageGroup)
                                    }
                                  />
                                  {ageGroup}
                                </label>
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
                                const searchTerm =
                                  playerSearchTerms[
                                    member.userId
                                  ]?.toLowerCase() || "";
                                if (!searchTerm) {
                                  return true;
                                }
                                return (
                                  player.name
                                    .toLowerCase()
                                    .includes(searchTerm) ||
                                  player.sport
                                    .toLowerCase()
                                    .includes(searchTerm) ||
                                  player.ageGroup
                                    .toLowerCase()
                                    .includes(searchTerm)
                                );
                              })
                              .map((player) => (
                                <label
                                  className={`flex cursor-pointer items-center gap-2 rounded border p-2 text-sm ${
                                    state.linkedPlayerIds.includes(player._id)
                                      ? "border-blue-400 bg-blue-100"
                                      : "border-gray-200 bg-white hover:bg-gray-50"
                                  }`}
                                  key={player._id}
                                >
                                  <Checkbox
                                    checked={state.linkedPlayerIds.includes(
                                      player._id
                                    )}
                                    onCheckedChange={() =>
                                      togglePlayer(member.userId, player._id)
                                    }
                                  />
                                  <span className="flex-1 font-medium">
                                    {player.name}
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    {player.ageGroup} - {player.sport}
                                  </span>
                                </label>
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

      {/* Invite Member Dialog */}
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

          <form className="space-y-4" onSubmit={handleInvite}>
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
                Select the roles this user should have. Admins can manage users
                and settings.
              </p>
              <div className="flex flex-wrap gap-2">
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    inviteFunctionalRoles.includes("admin")
                      ? "border-purple-400 bg-purple-100 text-purple-700"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <Checkbox
                    checked={inviteFunctionalRoles.includes("admin")}
                    disabled={inviting}
                    onCheckedChange={() => toggleInviteFunctionalRole("admin")}
                  />
                  <Shield className="h-4 w-4" />
                  <span>Admin</span>
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    inviteFunctionalRoles.includes("coach")
                      ? "border-green-400 bg-green-100 text-green-700"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <Checkbox
                    checked={inviteFunctionalRoles.includes("coach")}
                    disabled={inviting}
                    onCheckedChange={() => toggleInviteFunctionalRole("coach")}
                  />
                  <Users className="h-4 w-4" />
                  <span>Coach</span>
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    inviteFunctionalRoles.includes("parent")
                      ? "border-blue-400 bg-blue-100 text-blue-700"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <Checkbox
                    checked={inviteFunctionalRoles.includes("parent")}
                    disabled={inviting}
                    onCheckedChange={() => toggleInviteFunctionalRole("parent")}
                  />
                  <UserCircle className="h-4 w-4" />
                  <span>Parent</span>
                </label>
              </div>
              {inviteFunctionalRoles.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  Selected: {inviteFunctionalRoles.join(", ")}. These roles will
                  be auto-assigned when the invitation is accepted.
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
                      <label
                        className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
                          inviteTeams.includes(team._id)
                            ? "bg-green-100 text-green-700"
                            : "hover:bg-gray-100"
                        }`}
                        key={team._id}
                      >
                        <Checkbox
                          checked={inviteTeams.includes(team._id)}
                          disabled={inviting}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setInviteTeams([...inviteTeams, team._id]);
                            } else {
                              setInviteTeams(
                                inviteTeams.filter((id) => id !== team._id)
                              );
                            }
                          }}
                        />
                        <span>
                          {team.name}
                          {team.ageGroup && (
                            <span className="ml-1 text-muted-foreground">
                              ({team.ageGroup})
                            </span>
                          )}
                        </span>
                      </label>
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
                        <label
                          className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
                            invitePlayerIds.includes(player._id)
                              ? "bg-blue-100 text-blue-700"
                              : "hover:bg-gray-100"
                          }`}
                          key={player._id}
                        >
                          <Checkbox
                            checked={invitePlayerIds.includes(player._id)}
                            disabled={inviting}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setInvitePlayerIds([
                                  ...invitePlayerIds,
                                  player._id,
                                ]);
                              } else {
                                setInvitePlayerIds(
                                  invitePlayerIds.filter(
                                    (id) => id !== player._id
                                  )
                                );
                              }
                            }}
                          />
                          <span>
                            {player.name}
                            {player.ageGroup && (
                              <span className="ml-1 text-muted-foreground">
                                ({player.ageGroup})
                              </span>
                            )}
                          </span>
                        </label>
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

            <DialogFooter>
              <Button
                disabled={inviting}
                onClick={() => setInviteDialogOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={inviting || !inviteEmail} type="submit">
                {inviting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invitation Detail Modal */}
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
            } catch (error) {
              toast.error("Failed to cancel invitation");
            }
          }}
          onClose={() => setSelectedInvitationId(null)}
          onResend={async () => {
            try {
              await resendInvitation({ invitationId: selectedInvitationId });
              toast.success("Invitation resent successfully");
            } catch (error) {
              toast.error("Failed to resend invitation");
            }
          }}
        />
      )}

      {/* Invitation History Modal */}
      {historyInvitation && (
        <InvitationHistoryModal
          invitationId={historyInvitation.invitationId}
          inviteeEmail={historyInvitation.email}
          onClose={() => setHistoryInvitation(null)}
        />
      )}

      {/* Invitation Edit Modal */}
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

      {/* Disable/Enable Member Dialog */}
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

      {/* Remove from Organization Dialog */}
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
