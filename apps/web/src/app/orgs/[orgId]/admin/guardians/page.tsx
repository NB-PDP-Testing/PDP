"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit,
  Lightbulb,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Send,
  Target,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  Users2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession } from "@/lib/auth-client";
import { AddGuardianModal } from "./components/add-guardian-modal";
import { EditGuardianModal } from "./components/edit-guardian-modal";

type StatusFilter =
  | "all"
  | "accepted"
  | "pending"
  | "declined"
  | "missing"
  | "incomplete";
type ActiveSection = "links" | "unclaimed";

export default function GuardianManagementPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { data: session } = useSession();

  const [activeSection, setActiveSection] = useState<ActiveSection>("links");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [groupByFamily, setGroupByFamily] = useState(false);
  const [addGuardianModalOpen, setAddGuardianModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editGuardianModalOpen, setEditGuardianModalOpen] = useState(false);
  const [selectedGuardianForEdit, setSelectedGuardianForEdit] = useState<{
    guardianPlayerLinkId: Id<"guardianPlayerLinks">;
    guardianIdentityId: Id<"guardianIdentities">;
    playerIdentityId: Id<"playerIdentities">;
    playerName: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    relationship: string;
  } | null>(null);

  // Queries
  const stats = useQuery(api.models.guardianManagement.getGuardianStatsForOrg, {
    organizationId: orgId,
  });
  const relationships = useQuery(
    api.models.guardianManagement.getGuardianRelationshipsForOrg,
    { organizationId: orgId }
  );
  const guardians = useQuery(api.models.guardianManagement.getGuardiansForOrg, {
    organizationId: orgId,
  });
  const playersWithoutGuardians = useQuery(
    api.models.guardianManagement.getPlayersWithoutGuardians,
    { organizationId: orgId }
  );
  const unclaimedGuardians = useQuery(
    api.models.guardianIdentities.getUnclaimedGuardians,
    { organizationId: orgId }
  );

  // Delete state and mutation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [guardianToDelete, setGuardianToDelete] = useState<{
    linkId: Id<"guardianPlayerLinks">;
    guardianName: string;
    playerName: string;
  } | null>(null);
  const deleteGuardianPlayerLink = useMutation(
    api.models.guardianPlayerLinks.deleteGuardianPlayerLink
  );
  const resetDeclinedLink = useMutation(
    api.models.guardianPlayerLinks.resetDeclinedLink
  );
  const sendGuardianNotification = useAction(
    api.actions.guardianNotifications.sendGuardianNotificationEmail
  );

  const handleDeleteClick = (
    linkId: Id<"guardianPlayerLinks">,
    guardianName: string,
    playerName: string
  ) => {
    setGuardianToDelete({ linkId, guardianName, playerName });
    setDeleteConfirmOpen(true);
  };

  const handleResetDeclined = async (
    linkId: Id<"guardianPlayerLinks">,
    guardianName: string
  ) => {
    try {
      await resetDeclinedLink({ linkId });
      toast.success(
        `Reset connection for ${guardianName}. They can now claim this connection.`
      );
    } catch (error) {
      console.error("Failed to reset declined connection:", error);
      toast.error("Failed to reset connection");
    }
  };

  const handleResendPendingNotification = async (
    linkId: Id<"guardianPlayerLinks">,
    guardianEmail: string,
    guardianFirstName: string,
    guardianLastName: string
  ) => {
    if (!session?.user) {
      toast.error("You must be logged in to send notifications");
      return;
    }

    try {
      const result = await sendGuardianNotification({
        guardianEmail,
        guardianFirstName,
        guardianLastName,
        organizationId: orgId,
        guardianPlayerLinkId: linkId,
        invitedByUserId: session.user.id,
        invitedByUsername: session.user.name || session.user.email,
        invitedByEmail: session.user.email,
      });

      if (result.success) {
        toast.success(`Notification sent to ${guardianEmail}`, {
          description:
            result.scenario === "existing_user"
              ? "Simple notification sent to existing user"
              : "Full invitation email sent with pending children message",
        });
      } else {
        toast.error("Failed to send notification", {
          description: result.message,
        });
      }
    } catch (error) {
      console.error("Failed to send notification:", error);
      toast.error("Failed to send notification");
    }
  };

  const confirmDelete = async () => {
    if (!guardianToDelete) {
      return;
    }

    try {
      await deleteGuardianPlayerLink({
        linkId: guardianToDelete.linkId,
      });
      toast.success("Guardian connection removed successfully");
      setDeleteConfirmOpen(false);
      setGuardianToDelete(null);
    } catch (error) {
      console.error("Failed to delete guardian connection:", error);
      toast.error("Failed to remove guardian connection");
    }
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Generate insights and recommendations
  const getInsights = () => {
    if (!(stats && relationships && guardians)) {
      return [];
    }

    const insights = [];

    // Missing guardians insight
    if (stats.playersWithoutGuardians > 0) {
      insights.push({
        type: "warning",
        icon: AlertCircle,
        title: "Players Missing Guardian Information",
        description: `${stats.playersWithoutGuardians} player${stats.playersWithoutGuardians > 1 ? "s" : ""} don't have any guardian contacts linked.`,
        action: "Review Players",
        onClick: () => setStatusFilter("missing"),
        priority: "high",
      });
    }

    // Pending accounts insight
    if (stats.pendingAccounts > 0) {
      const pendingPercentage = Math.round(
        (stats.pendingAccounts /
          (stats.claimedAccounts + stats.pendingAccounts)) *
          100
      );
      insights.push({
        type: "info",
        icon: Send,
        title: "Guardian Invitations Pending",
        description: `${stats.pendingAccounts} guardian${stats.pendingAccounts > 1 ? "s" : ""} (${pendingPercentage}%) haven't created their accounts yet.`,
        action: "Send Reminders",
        onClick: () => setStatusFilter("pending"),
        priority: "medium",
      });
    }

    // Missing contact info insight
    if (
      stats.guardiansWithMissingEmail > 0 ||
      stats.guardiansWithMissingPhone > 0
    ) {
      const totalMissing =
        stats.guardiansWithMissingEmail + stats.guardiansWithMissingPhone;
      insights.push({
        type: "warning",
        icon: Mail,
        title: "Incomplete Contact Information",
        description: `${totalMissing} guardian record${totalMissing > 1 ? "s" : ""} missing email or phone details.`,
        action: "Review Contacts",
        onClick: () => setStatusFilter("incomplete"),
        priority: "medium",
      });
    }

    // Duplicate emails insight
    if (stats.duplicateEmails > 0) {
      insights.push({
        type: "info",
        icon: Users2,
        title: "Potential Duplicate Guardians",
        description: `${stats.duplicateEmails} email address${stats.duplicateEmails > 1 ? "es are" : " is"} shared across multiple guardian records.`,
        action: "View Families",
        onClick: () => setGroupByFamily(true),
        priority: "low",
      });
    }

    // Success insight
    if (
      stats.claimedAccounts === stats.claimedAccounts + stats.pendingAccounts &&
      stats.playersWithoutGuardians === 0 &&
      stats.guardiansWithMissingEmail === 0
    ) {
      insights.push({
        type: "success",
        icon: CheckCircle2,
        title: "Guardian Management Complete",
        description:
          "All guardians have accounts and complete contact information!",
        action: null,
        onClick: null,
        priority: "low",
      });
    }

    // Engagement opportunity
    if (
      stats.claimedAccounts > 0 &&
      stats.pendingAccounts > stats.claimedAccounts * 0.5
    ) {
      insights.push({
        type: "tip",
        icon: Lightbulb,
        title: "Boost Guardian Engagement",
        description:
          "Consider sending a welcome message to active guardians asking them to invite others.",
        action: null,
        onClick: null,
        priority: "low",
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return (
        priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder]
      );
    });
  };

  const insights = getInsights();

  // Group guardians by family (same last name or shared players)
  const getGroupedGuardians = () => {
    if (!guardians) {
      return [];
    }

    const familyGroups: Map<string, any[]> = new Map();

    // First, filter children for each guardian based on status filter
    const guardiansWithFilteredChildren = guardians.map((guardian: any) => {
      let filteredPlayers = guardian.players;

      if (statusFilter === "accepted") {
        // Show only accepted children (acknowledged by parent)
        filteredPlayers = guardian.players.filter(
          (p: any) => p.acknowledgedByParentAt && !p.declinedByUserId
        );
      } else if (statusFilter === "declined") {
        // Show only declined children
        filteredPlayers = guardian.players.filter(
          (p: any) => p.declinedByUserId
        );
      } else if (statusFilter === "pending") {
        // Show only pending children (not acknowledged and not declined)
        filteredPlayers = guardian.players.filter(
          (p: any) => !(p.acknowledgedByParentAt || p.declinedByUserId)
        );
      }

      return {
        ...guardian,
        players: filteredPlayers,
      };
    });

    // Only include guardians that have at least one child after filtering
    // For "incomplete": restrict to claimed guardians with missing critical info
    const validGuardians = guardiansWithFilteredChildren.filter(
      (guardian: any) => {
        if (guardian.players.length === 0) {
          return false;
        }
        if (statusFilter === "incomplete") {
          if (!guardian.hasUserAccount) {
            return false;
          }
          const hasMissingInfo = !(
            guardian.phone &&
            guardian.postcode &&
            guardian.firstName?.trim() &&
            guardian.lastName?.trim()
          );
          return hasMissingInfo;
        }
        return true;
      }
    );

    // Group by family
    for (const guardian of validGuardians) {
      const familyKey = guardian.lastName.toLowerCase();
      if (!familyGroups.has(familyKey)) {
        familyGroups.set(familyKey, []);
      }
      familyGroups.get(familyKey)?.push(guardian);
    }

    // Convert to array and filter by search
    return Array.from(familyGroups.entries())
      .map(([lastName, members]) => ({
        familyName: lastName,
        members: members.filter((guardian: any) => {
          if (searchQuery === "") {
            return true;
          }
          return (
            `${guardian.firstName} ${guardian.lastName}`
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            guardian.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            guardian.players.some((p: any) =>
              p.playerName.toLowerCase().includes(searchQuery.toLowerCase())
            )
          );
        }),
        playerCount: new Set(
          members.flatMap((g: any) => g.players.map((p: any) => p.playerId))
        ).size,
      }))
      .filter((family) => family.members.length > 0)
      .sort((a, b) => b.playerCount - a.playerCount);
  };

  // Filter data based on search and status
  const getFilteredData = () => {
    // Handle "missing" status - show players without guardians
    if (statusFilter === "missing" && playersWithoutGuardians) {
      return playersWithoutGuardians.filter((player: any) => {
        if (searchQuery === "") {
          return true;
        }
        return player.playerName
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      });
    }

    // Handle guardian filtering for all other statuses
    if (guardians) {
      const filtered = guardians
        .map((guardian: any) => {
          // Filter children based on status filter
          let filteredPlayers = guardian.players;

          if (statusFilter === "accepted") {
            // Show only accepted children (acknowledged by parent)
            filteredPlayers = guardian.players.filter(
              (p: any) => p.acknowledgedByParentAt && !p.declinedByUserId
            );
          } else if (statusFilter === "declined") {
            // Show only declined children
            filteredPlayers = guardian.players.filter(
              (p: any) => p.declinedByUserId
            );
          } else if (statusFilter === "pending") {
            // Show only pending children (not acknowledged and not declined)
            filteredPlayers = guardian.players.filter(
              (p: any) => !(p.acknowledgedByParentAt || p.declinedByUserId)
            );
          }

          return {
            ...guardian,
            players: filteredPlayers,
          };
        })
        .filter((guardian: any) => {
          // Only show guardians that have at least one child after filtering
          if (guardian.players.length === 0) {
            return false;
          }

          const matchesSearch =
            searchQuery === "" ||
            `${guardian.firstName} ${guardian.lastName}`
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            guardian.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            guardian.players?.some((p: any) =>
              p.playerName.toLowerCase().includes(searchQuery.toLowerCase())
            );

          // For "incomplete": restrict to claimed guardians with missing critical info
          if (statusFilter === "incomplete") {
            if (!guardian.hasUserAccount) {
              return false;
            }
            const hasMissingInfo = !(
              guardian.phone &&
              guardian.postcode &&
              guardian.firstName?.trim() &&
              guardian.lastName?.trim()
            );
            if (!hasMissingInfo) {
              return false;
            }
          }

          return matchesSearch;
        });
      return filtered;
    }

    return [];
  };

  const filteredData = getFilteredData();

  const getGuardianStatusBadge = (
    hasAccount: boolean,
    declinedByUserId?: string
  ) => {
    // Declined state
    if (declinedByUserId) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="gap-1 bg-red-600" variant="destructive">
                <X className="h-3 w-3" />
                Declined
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-sm">
                This guardian declined the connection (clicked "This Isn't Me"
                on the claim dialog). They indicated this is not their profile.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // Claimed state
    if (hasAccount) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="gap-1 bg-green-600" variant="default">
                <CheckCircle2 className="h-3 w-3" />
                Claimed
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-sm">
                This guardian has logged in and claimed their account. They have
                access to this player's information.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // Pending state
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              className="gap-1 bg-yellow-600 text-white"
              variant="secondary"
            >
              <Clock className="h-3 w-3" />
              Pending
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-sm">
              This guardian hasn't logged in yet. They need to create an account
              using their email address to access this player's information.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (!(stats && relationships && guardians)) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading guardian data...</p>
        </div>
      </div>
    );
  }

  const claimedPercentage =
    stats.totalGuardianLinks > 0
      ? Math.round(
          (stats.claimedAccounts /
            (stats.claimedAccounts + stats.pendingAccounts)) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/orgs/${orgId}/admin`}>
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-bold text-3xl tracking-tight">
            Guardian Management
          </h1>
          <p className="mt-1 text-muted-foreground">
            View and manage parent/guardian relationships and account status
          </p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 border-b">
        <button
          className={`border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
            activeSection === "links"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveSection("links")}
        >
          Guardian Links
        </button>
        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
            activeSection === "unclaimed"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveSection("unclaimed")}
        >
          Unclaimed Guardians
          {unclaimedGuardians && unclaimedGuardians.length > 0 && (
            <Badge className="text-xs" variant="secondary">
              {unclaimedGuardians.length}
            </Badge>
          )}
        </button>
      </div>

      {activeSection === "links" && (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">
                  Total Players
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">{stats.totalPlayers}</div>
                <p className="text-muted-foreground text-xs">
                  {stats.totalGuardianLinks} guardian links
                </p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-colors hover:border-green-600"
              onClick={() => setStatusFilter("accepted")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">
                  Accepted Links
                </CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">
                  {stats.claimedAccounts}
                </div>
                <p className="text-muted-foreground text-xs">
                  {claimedPercentage}% of links
                </p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-colors hover:border-yellow-600"
              onClick={() => setStatusFilter("pending")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">
                  Pending Sign-up
                </CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">
                  {stats.pendingAccounts}
                </div>
                <p className="text-muted-foreground text-xs">
                  Awaiting account creation
                </p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-colors hover:border-red-600"
              onClick={() => setStatusFilter("missing")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">
                  Missing Guardians
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">
                  {stats.playersWithoutGuardians}
                </div>
                <p className="text-muted-foreground text-xs">
                  Players with no guardian
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Insights & Recommendations */}
          {insights.length > 0 && (
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-blue-900 dark:text-blue-100">
                    Insights & Recommendations
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {insights.slice(0, 4).map((insight) => {
                    const Icon = insight.icon;
                    const bgColor = {
                      warning: "bg-orange-100 dark:bg-orange-950/50",
                      info: "bg-blue-100 dark:bg-blue-950/50",
                      success: "bg-green-100 dark:bg-green-950/50",
                      tip: "bg-purple-100 dark:bg-purple-950/50",
                    }[insight.type];
                    const iconColor = {
                      warning: "text-orange-600",
                      info: "text-blue-600",
                      success: "text-green-600",
                      tip: "text-purple-600",
                    }[insight.type];
                    const borderColor = {
                      warning: "border-orange-200 dark:border-orange-900",
                      info: "border-blue-200 dark:border-blue-900",
                      success: "border-green-200 dark:border-green-900",
                      tip: "border-purple-200 dark:border-purple-900",
                    }[insight.type];

                    return (
                      <div
                        className={`flex flex-col gap-2 rounded-lg border ${borderColor} ${bgColor} p-3 transition-all ${
                          insight.onClick
                            ? "cursor-pointer hover:shadow-md"
                            : ""
                        }`}
                        key={insight.title}
                        {...(insight.onClick
                          ? {
                              onClick: insight.onClick,
                              onKeyDown: (e: React.KeyboardEvent) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  insight.onClick?.();
                                }
                              },
                              role: "button" as const,
                              tabIndex: 0,
                            }
                          : {})}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`rounded-full p-2 ${iconColor}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="mb-1 font-semibold text-sm">
                              {insight.title}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {insight.description}
                            </div>
                          </div>
                        </div>
                        {insight.action && (
                          <div className="ml-11 flex items-center gap-1 font-medium text-primary text-xs">
                            {insight.action}
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {insights.length > 4 && (
                  <div className="mt-3 text-center text-muted-foreground text-xs">
                    + {insights.length - 4} more insight
                    {insights.length - 4 > 1 ? "s" : ""}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Search and View Options */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4">
                {/* Search Bar and Group Toggle */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Search Bar */}
                  <div className="relative w-full sm:flex-1">
                    <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pr-10 pl-10"
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search players, guardians, emails..."
                      type="text"
                      value={searchQuery}
                    />
                    {searchQuery && (
                      <button
                        className="absolute top-2.5 right-3 text-muted-foreground hover:text-foreground"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Group by Family Toggle */}
                  {statusFilter !== "missing" && (
                    <Button
                      onClick={() => setGroupByFamily(!groupByFamily)}
                      size="sm"
                      variant={groupByFamily ? "default" : "outline"}
                    >
                      <Users2 className="mr-2 h-4 w-4" />
                      {groupByFamily ? "Grouped by Family" : "Group by Family"}
                    </Button>
                  )}
                </div>

                {/* Active Filters Summary */}
                {(searchQuery || statusFilter !== "all") && (
                  <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                    <span className="text-muted-foreground text-sm">
                      Active filters:
                    </span>
                    {searchQuery && (
                      <Badge className="gap-1" variant="secondary">
                        Search: "{searchQuery}"
                        <button
                          className="ml-1 hover:text-foreground"
                          onClick={() => setSearchQuery("")}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {statusFilter !== "all" && (
                      <Badge className="gap-1" variant="secondary">
                        Status: {statusFilter}
                        <button
                          className="ml-1 hover:text-foreground"
                          onClick={() => setStatusFilter("all")}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    <Button
                      className="h-6 text-xs"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      Clear all
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status Filter Tabs */}
          <div className="overflow-x-auto border-b">
            <div className="flex gap-1 md:gap-2">
              <button
                className={`flex-shrink-0 border-b-2 px-2 py-2 font-medium text-sm transition-colors md:px-4 ${
                  statusFilter === "all"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setStatusFilter("all")}
              >
                All
              </button>
              <button
                className={`flex-shrink-0 border-b-2 px-2 py-2 font-medium text-sm transition-colors md:px-4 ${
                  statusFilter === "accepted"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setStatusFilter("accepted")}
              >
                <span className="hidden sm:inline">✅ </span>Accepted
              </button>
              <button
                className={`flex-shrink-0 border-b-2 px-2 py-2 font-medium text-sm transition-colors md:px-4 ${
                  statusFilter === "pending"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setStatusFilter("pending")}
              >
                <span className="hidden sm:inline">⏳ </span>Pending
              </button>
              <button
                className={`flex-shrink-0 border-b-2 px-2 py-2 font-medium text-sm transition-colors md:px-4 ${
                  statusFilter === "declined"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setStatusFilter("declined")}
              >
                <span className="hidden sm:inline">❌ </span>Declined
              </button>
              <button
                className={`flex-shrink-0 border-b-2 px-2 py-2 font-medium text-sm transition-colors md:px-4 ${
                  statusFilter === "missing"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setStatusFilter("missing")}
              >
                <span className="hidden sm:inline">⚠️ </span>
                <span className="hidden md:inline">Missing Contact</span>
                <span className="md:hidden">Missing</span>
              </button>
              <button
                className={`flex-shrink-0 border-b-2 px-2 py-2 font-medium text-sm transition-colors md:px-4 ${
                  statusFilter === "incomplete"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setStatusFilter("incomplete")}
              >
                <span className="hidden sm:inline">📋 </span>
                <span className="hidden md:inline">Missing Info</span>
                <span className="md:hidden">Info</span>
              </button>
            </div>
          </div>

          {/* Data Display */}
          <div className="space-y-4">
            {statusFilter !== "missing" && !groupByFamily && (
              <div className="space-y-2">
                {filteredData.length === 0 ? (
                  <Card>
                    <CardContent className="flex min-h-[200px] items-center justify-center">
                      <Empty>
                        <EmptyHeader>
                          <EmptyTitle>No Guardians Found</EmptyTitle>
                          <EmptyDescription>
                            No guardians match your current filters
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    </CardContent>
                  </Card>
                ) : (
                  filteredData.map((guardian: any) => (
                    <Card className="overflow-hidden" key={guardian.guardianId}>
                      <CardContent className="p-0">
                        <button
                          className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent p-4 text-left hover:bg-muted/50"
                          onClick={() => toggleRow(guardian.guardianId)}
                          type="button"
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-muted-foreground">
                              {expandedRows.has(guardian.guardianId) ? (
                                <ChevronDown className="h-5 w-5" />
                              ) : (
                                <ChevronRight className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">
                                {guardian.firstName} {guardian.lastName}
                              </div>
                              <div className="text-muted-foreground text-sm">
                                {guardian.email} • {guardian.players.length}{" "}
                                player
                                {guardian.players.length !== 1 ? "s" : ""}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getGuardianStatusBadge(guardian.hasUserAccount)}
                          </div>
                        </button>

                        {expandedRows.has(guardian.guardianId) && (
                          <div className="border-t bg-muted/20 p-4">
                            <div className="space-y-3">
                              <div className="text-sm">
                                <div className="mb-2 font-medium">
                                  Contact Information:
                                </div>
                                <div className="space-y-1 text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-3 w-3" />
                                    {guardian.email || (
                                      <span className="text-red-500">
                                        No email
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3" />
                                    {guardian.phone || (
                                      <span className="text-red-500">
                                        No phone
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-3 w-3" />
                                    {guardian.postcode || (
                                      <span className="text-red-500">
                                        No postcode
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="text-sm">
                                <div className="mb-2 font-medium">
                                  Linked Players:
                                </div>
                                <div className="space-y-2">
                                  {guardian.players.map((player: any) => (
                                    <div
                                      className="flex items-center justify-between rounded-lg border bg-background p-2"
                                      key={player.playerId}
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <div className="font-medium text-sm">
                                            {player.playerName}
                                          </div>
                                          {/* Per-child link status badge */}
                                          {player.declinedByUserId ? (
                                            <Badge
                                              className="gap-1 bg-red-600"
                                              variant="destructive"
                                            >
                                              <X className="h-3 w-3" />
                                              Declined
                                            </Badge>
                                          ) : player.acknowledgedByParentAt ? (
                                            <Badge
                                              className="gap-1 bg-green-600"
                                              variant="default"
                                            >
                                              <CheckCircle2 className="h-3 w-3" />
                                              Accepted
                                            </Badge>
                                          ) : (
                                            <Badge
                                              className="gap-1 bg-yellow-600 text-white"
                                              variant="secondary"
                                            >
                                              <Clock className="h-3 w-3" />
                                              Pending
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="text-muted-foreground text-xs">
                                          {player.ageGroup} •{" "}
                                          {player.relationship}
                                          {player.isPrimary && " (Primary)"}
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={() => {
                                            setSelectedGuardianForEdit({
                                              guardianPlayerLinkId:
                                                player.linkId,
                                              guardianIdentityId:
                                                guardian.guardianId,
                                              playerIdentityId: player.playerId,
                                              playerName: player.playerName,
                                              firstName: guardian.firstName,
                                              lastName: guardian.lastName,
                                              email: guardian.email || "",
                                              phone: guardian.phone,
                                              relationship: player.relationship,
                                            });
                                            setEditGuardianModalOpen(true);
                                          }}
                                          size="sm"
                                          variant="ghost"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        {player.declinedByUserId && (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  onClick={() =>
                                                    handleResetDeclined(
                                                      player.linkId,
                                                      `${guardian.firstName} ${guardian.lastName}`
                                                    )
                                                  }
                                                  size="sm"
                                                  variant="ghost"
                                                >
                                                  <Send className="h-4 w-4 text-blue-600" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p className="max-w-xs text-sm">
                                                  Reset declined status -
                                                  Guardian can try claiming
                                                  again
                                                </p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                        {!(
                                          player.declinedByUserId ||
                                          player.acknowledgedByParentAt
                                        ) &&
                                          guardian.email && (
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button
                                                    onClick={() =>
                                                      handleResendPendingNotification(
                                                        player.linkId,
                                                        guardian.email,
                                                        guardian.firstName,
                                                        guardian.lastName
                                                      )
                                                    }
                                                    size="sm"
                                                    variant="ghost"
                                                  >
                                                    <Send className="h-4 w-4 text-yellow-600" />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p className="max-w-xs text-sm">
                                                    Resend notification email
                                                  </p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          )}
                                        <Button
                                          onClick={() =>
                                            handleDeleteClick(
                                              player.linkId,
                                              `${guardian.firstName} ${guardian.lastName}`,
                                              player.playerName
                                            )
                                          }
                                          size="sm"
                                          variant="ghost"
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {statusFilter !== "missing" && groupByFamily && (
              <div className="space-y-3">
                {getGroupedGuardians().length === 0 ? (
                  <Card>
                    <CardContent className="flex min-h-[200px] items-center justify-center">
                      <p className="text-muted-foreground">No families found</p>
                    </CardContent>
                  </Card>
                ) : (
                  getGroupedGuardians().map((family: any) => (
                    <Card className="overflow-hidden" key={family.familyName}>
                      <CardContent className="p-0">
                        <button
                          className="flex w-full cursor-pointer items-center justify-between border-0 bg-muted/30 p-4 text-left hover:bg-muted/50"
                          onClick={() => toggleRow(family.familyName)}
                          type="button"
                        >
                          <div className="flex items-center gap-4">
                            <button className="text-muted-foreground">
                              {expandedRows.has(family.familyName) ? (
                                <ChevronDown className="h-5 w-5" />
                              ) : (
                                <ChevronRight className="h-5 w-5" />
                              )}
                            </button>
                            <Users2 className="h-5 w-5 text-primary" />
                            <div>
                              <div className="font-semibold text-lg capitalize">
                                {family.familyName} Family
                              </div>
                              <div className="text-muted-foreground text-sm">
                                {family.members.length} guardian
                                {family.members.length !== 1 ? "s" : ""} •{" "}
                                {family.playerCount} player
                                {family.playerCount !== 1 ? "s" : ""}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {
                                family.members.filter(
                                  (g: any) => g.hasUserAccount
                                ).length
                              }{" "}
                              / {family.members.length} claimed
                            </Badge>
                          </div>
                        </button>

                        {expandedRows.has(family.familyName) && (
                          <div className="border-t bg-background p-4">
                            <div className="space-y-4">
                              {family.members.map((guardian: any) => (
                                <div
                                  className="rounded-lg border bg-muted/20 p-4"
                                  key={guardian.guardianId}
                                >
                                  <div className="mb-3 flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="mb-2 flex items-center gap-2">
                                        <span className="font-medium text-lg">
                                          {guardian.firstName}{" "}
                                          {guardian.lastName}
                                        </span>
                                        {getGuardianStatusBadge(
                                          guardian.hasUserAccount
                                        )}
                                      </div>
                                      <div className="space-y-1 text-muted-foreground text-sm">
                                        <div className="flex items-center gap-2">
                                          <Mail className="h-3 w-3" />
                                          {guardian.email || "No email"}
                                        </div>
                                        {guardian.phone && (
                                          <div className="flex items-center gap-2">
                                            <Phone className="h-3 w-3" />
                                            {guardian.phone}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <Button
                                      onClick={() => {
                                        // Edit guardian contact info (uses first player's link)
                                        const firstPlayer = guardian.players[0];
                                        if (firstPlayer) {
                                          setSelectedGuardianForEdit({
                                            guardianPlayerLinkId:
                                              firstPlayer.linkId,
                                            guardianIdentityId:
                                              guardian.guardianId,
                                            playerIdentityId:
                                              firstPlayer.playerId,
                                            playerName: firstPlayer.playerName,
                                            firstName: guardian.firstName,
                                            lastName: guardian.lastName,
                                            email: guardian.email || "",
                                            phone: guardian.phone,
                                            relationship:
                                              firstPlayer.relationship,
                                          });
                                          setEditGuardianModalOpen(true);
                                        }
                                      }}
                                      size="sm"
                                      variant="ghost"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  <div className="border-t pt-3">
                                    <div className="mb-2 font-medium text-sm">
                                      Linked Players ({guardian.players.length}
                                      ):
                                    </div>
                                    <div className="space-y-2">
                                      {guardian.players.map((player: any) => (
                                        <div
                                          className="flex items-center justify-between rounded-md border bg-background p-2"
                                          key={player.playerId}
                                        >
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <div className="font-medium text-sm">
                                                {player.playerName}
                                              </div>
                                              {/* Per-child link status badge */}
                                              {player.declinedByUserId ? (
                                                <Badge
                                                  className="gap-1 bg-red-600"
                                                  variant="destructive"
                                                >
                                                  <X className="h-3 w-3" />
                                                  Declined
                                                </Badge>
                                              ) : player.acknowledgedByParentAt ? (
                                                <Badge
                                                  className="gap-1 bg-green-600"
                                                  variant="default"
                                                >
                                                  <CheckCircle2 className="h-3 w-3" />
                                                  Accepted
                                                </Badge>
                                              ) : (
                                                <Badge
                                                  className="gap-1 bg-yellow-600 text-white"
                                                  variant="secondary"
                                                >
                                                  <Clock className="h-3 w-3" />
                                                  Pending
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="text-muted-foreground text-xs">
                                              {player.ageGroup} •{" "}
                                              {player.relationship}
                                              {player.isPrimary && " (Primary)"}
                                            </div>
                                          </div>
                                          <div className="flex gap-2">
                                            <Button
                                              onClick={() => {
                                                setSelectedGuardianForEdit({
                                                  guardianPlayerLinkId:
                                                    player.linkId,
                                                  guardianIdentityId:
                                                    guardian.guardianId,
                                                  playerIdentityId:
                                                    player.playerId,
                                                  playerName: player.playerName,
                                                  firstName: guardian.firstName,
                                                  lastName: guardian.lastName,
                                                  email: guardian.email || "",
                                                  phone: guardian.phone,
                                                  relationship:
                                                    player.relationship,
                                                });
                                                setEditGuardianModalOpen(true);
                                              }}
                                              size="sm"
                                              variant="ghost"
                                            >
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                            {player.declinedByUserId && (
                                              <TooltipProvider>
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <Button
                                                      onClick={() =>
                                                        handleResetDeclined(
                                                          player.linkId,
                                                          `${guardian.firstName} ${guardian.lastName}`
                                                        )
                                                      }
                                                      size="sm"
                                                      variant="ghost"
                                                    >
                                                      <Send className="h-4 w-4 text-blue-600" />
                                                    </Button>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    <p className="max-w-xs text-sm">
                                                      Reset declined status -
                                                      Guardian can try claiming
                                                      again
                                                    </p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              </TooltipProvider>
                                            )}
                                            {!(
                                              player.declinedByUserId ||
                                              player.acknowledgedByParentAt
                                            ) &&
                                              guardian.email && (
                                                <TooltipProvider>
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <Button
                                                        onClick={() =>
                                                          handleResendPendingNotification(
                                                            player.linkId,
                                                            guardian.email,
                                                            guardian.firstName,
                                                            guardian.lastName
                                                          )
                                                        }
                                                        size="sm"
                                                        variant="ghost"
                                                      >
                                                        <Send className="h-4 w-4 text-yellow-600" />
                                                      </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                      <p className="max-w-xs text-sm">
                                                        Resend notification
                                                        email
                                                      </p>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                </TooltipProvider>
                                              )}
                                            <Button
                                              onClick={() =>
                                                handleDeleteClick(
                                                  player.linkId,
                                                  `${guardian.firstName} ${guardian.lastName}`,
                                                  player.playerName
                                                )
                                              }
                                              size="sm"
                                              variant="ghost"
                                            >
                                              <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {statusFilter === "missing" && (
              <div className="space-y-2">
                {playersWithoutGuardians &&
                playersWithoutGuardians.length === 0 ? (
                  <Card>
                    <CardContent className="flex min-h-[200px] items-center justify-center">
                      <div className="text-center">
                        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-600" />
                        <p className="font-medium">
                          All players have guardians!
                        </p>
                        <p className="text-muted-foreground text-sm">
                          Every player has at least one guardian linked
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  playersWithoutGuardians?.map((player: any) => (
                    <Card key={player.playerId}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <div className="font-medium">{player.playerName}</div>
                          <div className="text-muted-foreground text-sm">
                            {player.ageGroup} • DOB: {player.dateOfBirth}
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedPlayer({
                              id: player.playerId,
                              name: player.playerName,
                            });
                            setAddGuardianModalOpen(true);
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Guardian
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}

      {activeSection === "unclaimed" && (
        <>
          {/* Unclaimed Stats */}
          {unclaimedGuardians && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-sm">
                    Unclaimed Guardians
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">
                    {unclaimedGuardians.length}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Waiting to be claimed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-sm">
                    Total Children
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">
                    {unclaimedGuardians.reduce(
                      (sum: number, g: (typeof unclaimedGuardians)[number]) =>
                        sum + g.childrenCount,
                      0
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Linked to unclaimed guardians
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-sm">
                    Oldest Unclaimed
                  </CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">
                    {unclaimedGuardians.length > 0
                      ? Math.max(
                          ...unclaimedGuardians.map(
                            (g: (typeof unclaimedGuardians)[number]) =>
                              g.daysSinceCreated
                          )
                        )
                      : 0}
                  </div>
                  <p className="text-muted-foreground text-xs">Days ago</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Unclaimed Guardians Table */}
          <Card>
            <CardHeader>
              <CardTitle>Unclaimed Guardian Profiles</CardTitle>
            </CardHeader>
            <CardContent>
              {unclaimedGuardians ? (
                unclaimedGuardians.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="mb-4 h-12 w-12 text-green-600" />
                    <h3 className="mb-2 font-semibold text-lg">
                      No Unclaimed Guardians
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      All guardian identities have been claimed by their
                      respective users.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pr-4 pb-3 font-medium">
                            Guardian Name
                          </th>
                          <th className="pr-4 pb-3 font-medium">Contact</th>
                          <th className="pr-4 pb-3 font-medium">Children</th>
                          <th className="pr-4 pb-3 font-medium">Created</th>
                          <th className="pr-4 pb-3 font-medium">Source</th>
                          <th className="pb-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {unclaimedGuardians.map(
                          (item: (typeof unclaimedGuardians)[number]) => (
                            <tr key={item.guardian._id}>
                              <td className="py-3 pr-4 font-medium">
                                {item.guardian.firstName}{" "}
                                {item.guardian.lastName}
                              </td>
                              <td className="py-3 pr-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="h-3 w-3" />
                                    {item.guardian.email}
                                  </div>
                                  {item.guardian.phone && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Phone className="h-3 w-3" />
                                      {item.guardian.phone}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                <div className="space-y-1">
                                  {item.children.map(
                                    (child: (typeof item.children)[number]) => (
                                      <div
                                        key={`${child.firstName}-${child.lastName}`}
                                      >
                                        {child.firstName} {child.lastName}
                                      </div>
                                    )
                                  )}
                                  <Badge className="mt-1" variant="secondary">
                                    {item.childrenCount}{" "}
                                    {item.childrenCount === 1
                                      ? "child"
                                      : "children"}
                                  </Badge>
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                <Badge variant="outline">
                                  {item.daysSinceCreated === 0
                                    ? "Today"
                                    : item.daysSinceCreated === 1
                                      ? "Yesterday"
                                      : `${item.daysSinceCreated} days ago`}
                                </Badge>
                              </td>
                              <td className="py-3 pr-4">
                                <Badge variant="secondary">
                                  {item.guardian.createdFrom || "Import"}
                                </Badge>
                              </td>
                              <td className="py-3">
                                <Button size="sm" variant="outline">
                                  <Send className="mr-2 h-3 w-3" />
                                  Send Reminder
                                </Button>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                <div className="space-y-1 text-sm">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                    About Unclaimed Guardians
                  </h4>
                  <p className="text-blue-800 dark:text-blue-200">
                    These guardian profiles were created from data imports (like
                    GAA membership CSVs) but haven't been claimed by the actual
                    parents yet. When a parent signs up with the same email
                    address, they'll be prompted to claim their profile and gain
                    access to their children's information.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Guardian Modal */}
      {selectedPlayer && (
        <AddGuardianModal
          onOpenChange={setAddGuardianModalOpen}
          open={addGuardianModalOpen}
          organizationId={orgId}
          playerId={selectedPlayer.id as Id<"playerIdentities">}
          playerName={selectedPlayer.name}
        />
      )}

      {/* Edit Guardian Modal */}
      {selectedGuardianForEdit && (
        <EditGuardianModal
          currentData={{
            firstName: selectedGuardianForEdit.firstName,
            lastName: selectedGuardianForEdit.lastName,
            email: selectedGuardianForEdit.email,
            phone: selectedGuardianForEdit.phone,
            relationship: selectedGuardianForEdit.relationship,
          }}
          guardianIdentityId={selectedGuardianForEdit.guardianIdentityId}
          guardianPlayerLinkId={selectedGuardianForEdit.guardianPlayerLinkId}
          onOpenChange={setEditGuardianModalOpen}
          open={editGuardianModalOpen}
          playerIdentityId={selectedGuardianForEdit.playerIdentityId}
          playerName={selectedGuardianForEdit.playerName}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog onOpenChange={setDeleteConfirmOpen} open={deleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Guardian Connection?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the connection between{" "}
              <span className="font-semibold">
                {guardianToDelete?.guardianName}
              </span>{" "}
              and{" "}
              <span className="font-semibold">
                {guardianToDelete?.playerName}
              </span>
              ?
              <br />
              <br />
              This will unlink the guardian from this player. The guardian's
              profile will remain in the system but will no longer have access
              to this player's information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Remove Connection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Contextual Help & Recommendations */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Target className="mt-0.5 h-5 w-5 text-purple-600" />
            <div className="flex-1 text-sm">
              <div className="mb-2 font-semibold text-purple-900 dark:text-purple-100">
                {statusFilter === "all" &&
                  !groupByFamily &&
                  "Guardian Management Tips"}
                {statusFilter === "accepted" &&
                  "Accepted Guardian-Player Links"}
                {statusFilter === "pending" && "Pending Guardian-Player Links"}
                {statusFilter === "declined" &&
                  "Declined Guardian-Player Links"}
                {statusFilter === "missing" &&
                  "Players Without Guardian Contacts"}
                {statusFilter === "incomplete" &&
                  "Guardians With Incomplete Information"}
                {groupByFamily &&
                  statusFilter !== "missing" &&
                  statusFilter !== "incomplete" &&
                  "Family Grouping View"}
              </div>
              <div className="space-y-2 text-purple-800 dark:text-purple-200">
                {statusFilter === "all" && !groupByFamily && (
                  <>
                    <div>
                      • Click on a guardian to see their linked players and
                      contact details
                    </div>
                    <div>
                      • Use the search bar to quickly find specific guardians or
                      players
                    </div>
                    <div>
                      • Filter by status tabs to focus on specific groups that
                      need attention
                    </div>
                  </>
                )}
                {statusFilter === "accepted" && !groupByFamily && (
                  <>
                    <div>
                      • These guardian-player links have been acknowledged by
                      the parent
                    </div>
                    <div>
                      • Parents have confirmed these children are theirs and
                      have access to their information
                    </div>
                    <div>• These links are fully active and operational</div>
                  </>
                )}
                {statusFilter === "pending" && !groupByFamily && (
                  <>
                    <div>
                      • These guardian-player links are awaiting parent
                      acknowledgment
                    </div>
                    <div>
                      • Parents need to log in and confirm these children are
                      theirs
                    </div>
                    <div>
                      • Consider verifying contact information is correct for
                      pending links
                    </div>
                  </>
                )}
                {groupByFamily && statusFilter !== "missing" && (
                  <>
                    <div>
                      • Guardians are grouped by last name to identify family
                      units
                    </div>
                    <div>
                      • This view helps spot potential duplicates or siblings
                    </div>
                    <div>
                      • Click on a family to see all guardians and their linked
                      players
                    </div>
                  </>
                )}
                {statusFilter === "missing" && (
                  <>
                    <div>
                      <strong>Priority Action:</strong> Add guardian contacts
                      for these players
                    </div>
                    <div>
                      • Click "Add Guardian" to manually add guardian
                      information
                    </div>
                    <div>
                      • Missing guardian information prevents important
                      communications
                    </div>
                  </>
                )}
                {statusFilter === "incomplete" && (
                  <>
                    <div>
                      <strong>Priority Action:</strong> Update contact details
                      for these guardians
                    </div>
                    <div>
                      • Click a guardian to expand and use the Edit button to
                      add missing email or phone
                    </div>
                    <div>
                      • Incomplete contact info limits the ability to send
                      notifications and reminders
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Footer */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-blue-600" />
            <div className="text-sm">
              <div className="mb-1 font-medium text-blue-900 dark:text-blue-100">
                Data Quality Summary
              </div>
              <div className="space-y-1 text-blue-800 dark:text-blue-200">
                {stats.guardiansWithMissingEmail > 0 && (
                  <div>
                    • {stats.guardiansWithMissingEmail} guardian(s) missing
                    email address
                  </div>
                )}
                {stats.guardiansWithMissingPhone > 0 && (
                  <div>
                    • {stats.guardiansWithMissingPhone} guardian(s) missing
                    phone number
                  </div>
                )}
                {stats.duplicateEmails > 0 && (
                  <div>
                    • {stats.duplicateEmails} duplicate email addresses found
                  </div>
                )}
                {stats.guardiansWithMissingEmail === 0 &&
                  stats.guardiansWithMissingPhone === 0 &&
                  stats.duplicateEmails === 0 && (
                    <div>✅ All guardian contact information is complete!</div>
                  )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
