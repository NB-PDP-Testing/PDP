"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useConvex, useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronRight,
  Edit,
  Eye,
  GitMerge,
  Link as LinkIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  UserCircle,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { toast } from "sonner";
import { SmartDataView } from "@/components/data-display";
import {
  ResponsiveForm,
  ResponsiveFormRow,
  ResponsiveFormSection,
} from "@/components/forms/responsive-form";
import { ResponsiveDialog } from "@/components/interactions";
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// Regex for basic email format validation — defined at module level per Biome rules
const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Age group options
const AGE_GROUPS = [
  "U6",
  "U7",
  "U8",
  "U9",
  "U10",
  "U11",
  "U12",
  "U13",
  "U14",
  "U15",
  "U16",
  "U17",
  "U18",
  "U19",
  "U21",
  "Senior",
  "Adult",
];

// Get current season (e.g., "2024/2025")
const getCurrentSeason = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // If after August, use current/next year, otherwise previous/current
  if (month >= 7) {
    return `${year}/${year + 1}`;
  }
  return `${year - 1}/${year}`;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SortColumn = "name" | "team" | "ageGroup" | "lastReview";
type SortDirection = "asc" | "desc";

type GuardianRelationship =
  | "mother"
  | "father"
  | "guardian"
  | "grandparent"
  | "other";

type AddPlayerFormData = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  ageGroup: string;
  // Matching signals
  email: string; // optional — youth players may not have an email address
  // Sport
  sportCode: string;
  // Player address (optional)
  address: string;
  town: string;
  postcode: string;
  country: string;
  // Guardian (optional, youth only)
  guardianFirstName: string;
  guardianLastName: string;
  guardianEmail: string;
  guardianPhone: string;
  guardianRelationship: GuardianRelationship;
  // Optional team assignment
  teamId: string;
};

const emptyFormData: AddPlayerFormData = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "male",
  ageGroup: "",
  email: "",
  sportCode: "",
  address: "",
  town: "",
  postcode: "",
  country: "",
  guardianFirstName: "",
  guardianLastName: "",
  guardianEmail: "",
  guardianPhone: "",
  guardianRelationship: "mother",
  teamId: "",
};

export default function ManagePlayersPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  // Add Player Dialog state
  const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false);
  const [addPlayerForm, setAddPlayerForm] =
    useState<AddPlayerFormData>(emptyFormData);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof AddPlayerFormData, string>>
  >({});

  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const convex = useConvex();

  // Federation numbers state (US-P3-006)
  const [showFederationFields, setShowFederationFields] = useState(false);
  const [federationFai, setFederationFai] = useState("");
  const [federationIrfu, setFederationIrfu] = useState("");
  const [federationGaa, setFederationGaa] = useState("");
  const [federationOther, setFederationOther] = useState("");

  // Phone (E.164) — stored outside plain form object like federation IDs
  const [addPlayerPhone, setAddPlayerPhone] = useState("");

  // Player match state (US-P3-002)
  const [showYouthMatchDialog, setShowYouthMatchDialog] = useState(false);
  const [youthMatchCandidate, setYouthMatchCandidate] = useState<{
    _id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    playerType: "youth" | "adult";
  } | null>(null);
  const [mediumMatchWarning, setMediumMatchWarning] = useState<{
    name: string;
    dateOfBirth: string;
    playerIdentityId: string;
  } | null>(null);
  const [hasAcknowledgedMediumMatch, setHasAcknowledgedMediumMatch] =
    useState(false);
  const [isLinkingToYouth, setIsLinkingToYouth] = useState(false);

  // Guardian suggestion state
  const [selectedGuardianId, setSelectedGuardianId] = useState<string | null>(
    null
  );

  // Existing player match state (for "Use This Player" flow — findPotentialMatches panel)
  const [selectedExistingPlayer, setSelectedExistingPlayer] =
    useState<Id<"playerIdentities"> | null>(null);

  // Duplicate detection panel state (admin dedup UI)
  const [showDuplicatePanel, setShowDuplicatePanel] = useState(false);
  const [dismissedGroups, setDismissedGroups] = useState<Set<string>>(
    new Set()
  );

  // Merge dialog state
  const [mergeKeepId, setMergeKeepId] = useState<Id<"playerIdentities"> | null>(
    null
  );
  const [mergeRemoveId, setMergeRemoveId] =
    useState<Id<"playerIdentities"> | null>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // Delete player state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk delete state
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Mutations
  const findOrCreatePlayer = useMutation(
    api.models.playerIdentities.findOrCreatePlayer
  );
  const enrollPlayer = useMutation(
    api.models.orgPlayerEnrollments.enrollPlayer
  );
  const unenrollPlayer = useMutation(
    api.models.orgPlayerEnrollments.unenrollPlayer
  );
  const findOrCreateGuardian = useMutation(
    api.models.guardianIdentities.findOrCreateGuardian
  );
  const createGuardianPlayerLink = useMutation(
    api.models.guardianPlayerLinks.createGuardianPlayerLink
  );
  const mergePlayerIdentities = useMutation(
    api.models.playerIdentities.mergePlayerIdentities
  );
  const dismissDuplicatePair = useMutation(
    api.models.playerIdentities.dismissDuplicatePair
  );
  const updatePlayerIdentityMutation = useMutation(
    api.models.playerIdentities.updatePlayerIdentity
  );
  const approvePlayerRegistration = useMutation(
    api.models.orgPlayerEnrollments.approvePlayerSelfRegistration
  );
  const addPlayerToTeam = useMutation(
    api.models.teamPlayerIdentities.addPlayerToTeam
  );

  // Derive whether player is youth (under 18) from DOB
  const isYouthPlayer = (() => {
    if (!addPlayerForm.dateOfBirth) {
      return true; // Default to showing guardian section
    }
    const dob = new Date(addPlayerForm.dateOfBirth);
    const now = new Date();
    const age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    const adjustedAge =
      monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())
        ? age - 1
        : age;
    return adjustedAge < 18;
  })();

  // Guardian suggestion matching — fires reactively when enough info is entered
  const shouldQueryGuardians =
    isYouthPlayer &&
    addPlayerForm.lastName.trim().length >= 2 &&
    !!addPlayerForm.dateOfBirth;

  const guardianSuggestions = useQuery(
    api.models.guardianIdentities.suggestGuardiansForPlayer,
    shouldQueryGuardians
      ? {
          playerLastName: addPlayerForm.lastName.trim(),
          playerPostcode: addPlayerForm.postcode.trim() || undefined,
          playerTown: addPlayerForm.town.trim() || undefined,
          guardianEmail: addPlayerForm.guardianEmail.trim() || undefined,
          guardianPhone: addPlayerForm.guardianPhone.trim() || undefined,
          guardianFirstName:
            addPlayerForm.guardianFirstName.trim() || undefined,
          guardianLastName: addPlayerForm.guardianLastName.trim() || undefined,
        }
      : "skip"
  );

  // Block submission while guardian suggestions are loading (query fired but not returned)
  const isGuardianMatchLoading =
    shouldQueryGuardians && guardianSuggestions === undefined;

  // Potential player matches — reactive query fires when form has enough data
  const shouldQueryMatches =
    addPlayerForm.firstName.trim().length >= 2 &&
    addPlayerForm.lastName.trim().length >= 2 &&
    !!addPlayerForm.dateOfBirth;

  const potentialMatches = useQuery(
    api.models.playerIdentities.findPotentialMatches,
    shouldQueryMatches
      ? {
          firstName: addPlayerForm.firstName.trim(),
          lastName: addPlayerForm.lastName.trim(),
          dateOfBirth: addPlayerForm.dateOfBirth,
          gender: addPlayerForm.gender,
        }
      : "skip"
  );

  // Duplicate detection for the org
  const duplicateGroups = useQuery(
    api.models.playerIdentities.findPotentialDuplicatesForOrg,
    { organizationId: orgId }
  );

  // Merge preview
  const mergePreview = useQuery(
    api.models.playerIdentities.getMergePreview,
    mergeKeepId && mergeRemoveId
      ? { keepId: mergeKeepId, removeId: mergeRemoveId, organizationId: orgId }
      : "skip"
  );

  // Get data from new identity system — only active enrollments
  const enrolledPlayers = useQuery(
    api.models.orgPlayerEnrollments.getPlayersForOrg,
    {
      organizationId: orgId,
      status: "active",
    }
  );

  // Pending self-registration requests from members (US-P6-003)
  const pendingSelfRegistrations = useQuery(
    api.models.orgPlayerEnrollments.getPendingSelfRegistrations,
    { organizationId: orgId }
  );

  const teams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });

  // Get team-player links for proper team filtering
  const teamPlayerLinks = useQuery(
    api.models.teamPlayerIdentities.getTeamMembersForOrg,
    { organizationId: orgId }
  );

  // Get sport reference data for friendly names
  const sportsData = useQuery(api.models.referenceData.getSports);

  // Create a mapping from sport code to friendly name
  const sportCodeToName = new Map<string, string>(
    sportsData?.map((sport) => [sport.code, sport.name]) ?? []
  );

  // Helper to get friendly sport name from code
  const getSportName = (sportCode: string | null | undefined): string => {
    if (!sportCode || sportCode === "Not assigned") {
      return "Not assigned";
    }
    return sportCodeToName.get(sportCode) ?? sportCode;
  };

  // Transform to flat player structure for compatibility
  const players = enrolledPlayers?.map(
    ({ enrollment, player, sportCode }: any) => ({
      _id: player._id, // playerIdentityId
      name: `${player.firstName} ${player.lastName}`,
      firstName: player.firstName,
      lastName: player.lastName,
      ageGroup: enrollment.ageGroup,
      gender: player.gender,
      sport: sportCode || "Not assigned", // From sport passport
      lastReviewDate: enrollment.lastReviewDate,
      reviewStatus: enrollment.reviewStatus,
      dateOfBirth: player.dateOfBirth,
      enrollmentId: enrollment._id,
      enrollmentStatus: enrollment.status,
    })
  );

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>("all");
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>("all");
  const [approvingRegistrationId, setApprovingRegistrationId] = useState<
    string | null
  >(null);
  const [decliningRegistrationId, setDecliningRegistrationId] = useState<
    string | null
  >(null);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(
    new Set()
  );
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isLoading =
    enrolledPlayers === undefined ||
    teams === undefined ||
    teamPlayerLinks === undefined;

  // Validate add player form
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof AddPlayerFormData, string>> = {};

    if (!addPlayerForm.firstName.trim()) {
      errors.firstName = "First name is required";
    }
    if (!addPlayerForm.lastName.trim()) {
      errors.lastName = "Last name is required";
    }
    if (addPlayerForm.dateOfBirth) {
      // Check if date is valid
      const dob = new Date(addPlayerForm.dateOfBirth);
      const now = new Date();
      if (dob > now) {
        errors.dateOfBirth = "Date of birth cannot be in the future";
      } else if (now.getFullYear() - dob.getFullYear() > 100) {
        errors.dateOfBirth = "Please enter a valid date of birth";
      }
    } else {
      errors.dateOfBirth = "Date of birth is required";
    }
    if (
      addPlayerForm.email.trim() &&
      !EMAIL_FORMAT_REGEX.test(addPlayerForm.email.trim())
    ) {
      errors.email = "Please enter a valid email";
    }

    // Address validation: all optional, but if any is provided validate completeness
    // (no required validation — not all clubs collect address at enrollment)

    // Guardian validation: if email is provided, require first + last name
    if (addPlayerForm.guardianEmail.trim() && !selectedGuardianId) {
      if (!EMAIL_REGEX.test(addPlayerForm.guardianEmail.trim())) {
        errors.guardianEmail = "Please enter a valid email address";
      }
      if (!addPlayerForm.guardianFirstName.trim()) {
        errors.guardianFirstName =
          "Guardian first name is required when email is provided";
      }
      if (!addPlayerForm.guardianLastName.trim()) {
        errors.guardianLastName =
          "Guardian last name is required when email is provided";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Build federation IDs from form state (omit empty strings)
  const buildFederationIds = () => {
    const ids: {
      fai?: string;
      irfu?: string;
      gaa?: string;
      other?: string;
    } = {};
    if (federationFai.trim()) {
      ids.fai = federationFai.trim();
    }
    if (federationIrfu.trim()) {
      ids.irfu = federationIrfu.trim();
    }
    if (federationGaa.trim()) {
      ids.gaa = federationGaa.trim();
    }
    if (federationOther.trim()) {
      ids.other = federationOther.trim();
    }
    return Object.keys(ids).length > 0 ? ids : undefined;
  };

  // Create the player (called after validation and optional duplicate confirmation)
  const createPlayer = async () => {
    setIsAddingPlayer(true);
    try {
      // Step 1: Create player identity or use existing match
      // Client-side findPlayerMatchCandidates already ran (UX layer).
      // findOrCreatePlayer is the server-side safety net using 3-tier dedup.
      let playerIdentityId: Id<"playerIdentities">;
      let wasCreated = true;

      if (selectedExistingPlayer) {
        // User chose to use an existing player identity from the match panel
        playerIdentityId = selectedExistingPlayer;
        wasCreated = false;
      } else {
        const result = await findOrCreatePlayer({
          firstName: addPlayerForm.firstName.trim(),
          lastName: addPlayerForm.lastName.trim(),
          dateOfBirth: addPlayerForm.dateOfBirth,
          gender: addPlayerForm.gender,
          createdFrom: "manual_admin",
          address: addPlayerForm.address.trim() || undefined,
          town: addPlayerForm.town.trim() || undefined,
          postcode: addPlayerForm.postcode.trim() || undefined,
          country: addPlayerForm.country.trim() || undefined,
        });
        playerIdentityId = result.playerIdentityId;
        wasCreated = result.wasCreated;
      }

      // Step 1b: Store federation IDs on newly created records
      const federationIds = buildFederationIds();
      if (wasCreated && federationIds) {
        await updatePlayerIdentityMutation({
          playerIdentityId,
          federationIds,
        });
      }

      // Step 2: Enroll in organization (with sport if selected)
      await enrollPlayer({
        playerIdentityId,
        organizationId: orgId,
        ageGroup: addPlayerForm.ageGroup || undefined,
        season: getCurrentSeason(),
        sportCode: addPlayerForm.sportCode || undefined,
      });

      // Step 3: Guardian linking
      if (selectedGuardianId) {
        // Admin selected an existing guardian suggestion
        await createGuardianPlayerLink({
          guardianIdentityId: selectedGuardianId as Id<"guardianIdentities">,
          playerIdentityId,
          relationship: addPlayerForm.guardianRelationship,
          isPrimary: true,
        });
      } else if (addPlayerForm.guardianEmail.trim()) {
        // Admin entered new guardian details
        const guardianResult = await findOrCreateGuardian({
          firstName: addPlayerForm.guardianFirstName.trim(),
          lastName: addPlayerForm.guardianLastName.trim(),
          email: addPlayerForm.guardianEmail.trim(),
          phone: addPlayerForm.guardianPhone.trim() || undefined,
          address: addPlayerForm.address.trim() || undefined,
          town: addPlayerForm.town.trim() || undefined,
          postcode: addPlayerForm.postcode.trim() || undefined,
          country: addPlayerForm.country.trim() || undefined,
          createdFrom: "manual_admin",
        });
        await createGuardianPlayerLink({
          guardianIdentityId: guardianResult.guardianIdentityId,
          playerIdentityId,
          relationship: addPlayerForm.guardianRelationship,
          isPrimary: true,
        });
      }

      // Step 4: Optional team assignment
      if (addPlayerForm.teamId) {
        await addPlayerToTeam({
          playerIdentityId,
          teamId: addPlayerForm.teamId,
          organizationId: orgId,
          season: getCurrentSeason(),
        });
      }

      const guardianLinked = !!(
        selectedGuardianId || addPlayerForm.guardianEmail.trim()
      );
      const teamAssigned = !!addPlayerForm.teamId;
      toast.success(
        wasCreated ? "Player added successfully" : "Existing player enrolled",
        {
          description: `${addPlayerForm.firstName} ${addPlayerForm.lastName} has been ${wasCreated ? "added to" : "enrolled in"} the organization.${guardianLinked ? " Guardian linked." : ""}${teamAssigned ? " Added to team." : ""}`,
        }
      );

      // Reset form and close dialogs
      setAddPlayerForm(emptyFormData);
      setSelectedGuardianId(null);
      setSelectedExistingPlayer(null);
      setFormErrors({});
      setShowAddPlayerDialog(false);
      setFederationFai("");
      setFederationIrfu("");
      setFederationGaa("");
      setFederationOther("");
      setShowFederationFields(false);
      setAddPlayerPhone("");

      // Navigate to the new player
      router.push(`/orgs/${orgId}/players/${playerIdentityId}`);
    } catch (error) {
      console.error("Error adding player:", error);
      toast.error("Failed to add player", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsAddingPlayer(false);
    }
  };

  // Link to existing player record (HIGH confidence match dialog)
  const handleLinkToExistingHistory = async () => {
    if (!youthMatchCandidate) {
      return;
    }
    setIsLinkingToYouth(true);
    try {
      // Enroll the existing record in this organisation as-is (no type change)
      await enrollPlayer({
        playerIdentityId: youthMatchCandidate._id as any,
        organizationId: orgId,
        ageGroup: addPlayerForm.ageGroup || undefined,
        season: getCurrentSeason(),
      });
      toast.success("Player linked to existing record", {
        description: `${youthMatchCandidate.firstName} ${youthMatchCandidate.lastName}'s existing record has been enrolled in this organisation.`,
      });
      setShowYouthMatchDialog(false);
      setShowAddPlayerDialog(false);
      setAddPlayerForm(emptyFormData);
      setFormErrors({});
      setYouthMatchCandidate(null);
      setAddPlayerPhone("");
      router.push(`/orgs/${orgId}/players/${youthMatchCandidate._id}`);
    } catch (error) {
      console.error("Error linking to existing history:", error);
      toast.error("Failed to link player", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsLinkingToYouth(false);
    }
  };

  // Handle add player submit — run unified matching for all players
  const handleAddPlayer = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) {
      e.preventDefault();
    }

    if (!validateForm()) {
      return;
    }

    if (!hasAcknowledgedMediumMatch) {
      setIsCheckingDuplicate(true);
      try {
        type Candidate = {
          confidence: "high" | "medium" | "low" | "none";
          _id: string;
          firstName: string;
          lastName: string;
          dateOfBirth: string;
          playerType: "youth" | "adult";
        };
        const candidates = (await convex.query(
          api.models.playerMatching.findPlayerMatchCandidates,
          {
            organizationId: orgId,
            firstName: addPlayerForm.firstName.trim(),
            lastName: addPlayerForm.lastName.trim(),
            dateOfBirth: addPlayerForm.dateOfBirth,
            federationIds: buildFederationIds(),
            email: addPlayerForm.email.trim() || undefined,
            phone: addPlayerPhone || undefined,
            postcode: addPlayerForm.postcode.trim() || undefined,
          }
        )) as Candidate[];

        const highCandidates = candidates.filter(
          (c) => c.confidence === "high"
        );
        const mediumCandidates = candidates.filter(
          (c) => c.confidence === "medium"
        );

        // HIGH confidence — blocking dialog: link or create new
        if (highCandidates.length > 0) {
          const best = highCandidates[0];
          setYouthMatchCandidate({
            _id: best._id,
            firstName: best.firstName,
            lastName: best.lastName,
            dateOfBirth: best.dateOfBirth,
            playerType: best.playerType,
          });
          setShowYouthMatchDialog(true);
          return;
        }

        // MEDIUM confidence — non-blocking banner, user re-submits to proceed
        if (mediumCandidates.length > 0) {
          const best = mediumCandidates[0];
          setMediumMatchWarning({
            name: `${best.firstName} ${best.lastName}`,
            dateOfBirth: best.dateOfBirth,
            playerIdentityId: best._id,
          });
          setHasAcknowledgedMediumMatch(true);
          return;
        }
      } finally {
        setIsCheckingDuplicate(false);
      }
    }

    await createPlayer();
  };

  // Handle merge
  const handleMergeConfirm = async () => {
    if (!(mergeKeepId && mergeRemoveId)) {
      return;
    }
    setIsMerging(true);
    try {
      const result = await mergePlayerIdentities({
        keepId: mergeKeepId,
        removeId: mergeRemoveId,
        organizationId: orgId,
      });
      toast.success("Players merged successfully", {
        description: `${result.recordsUpdated} records updated.${result.conflicts.length > 0 ? ` ${result.conflicts.length} conflict(s) resolved.` : ""}`,
      });
      setShowMergeDialog(false);
      setMergeKeepId(null);
      setMergeRemoveId(null);
    } catch (error) {
      toast.error("Failed to merge players", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsMerging(false);
    }
  };

  // Handle delete player
  const handleDeleteClick = (player: any) => {
    setPlayerToDelete({ id: player.enrollmentId, name: player.name });
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!playerToDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await unenrollPlayer({
        enrollmentId: playerToDelete.id as any,
      });

      toast.success("Player removed", {
        description: `${playerToDelete.name} has been removed from the organization.`,
      });

      setShowDeleteDialog(false);
      setPlayerToDelete(null);
    } catch (error) {
      console.error("Error removing player:", error);
      toast.error("Failed to remove player", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle bulk delete
  const handleBulkDeleteClick = () => {
    if (selectedPlayers.size === 0) {
      return;
    }
    setShowBulkDeleteDialog(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedPlayers.size === 0) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      // Get enrollment IDs for selected players
      const selectedPlayersList = sortedPlayers.filter((p: any) =>
        selectedPlayers.has(p._id)
      );

      let successCount = 0;
      let failCount = 0;

      for (const player of selectedPlayersList) {
        try {
          await unenrollPlayer({
            // biome-ignore lint/suspicious/noExplicitAny: enrollmentId type comes from API
            enrollmentId: player.enrollmentId as any,
          });
          successCount += 1;
        } catch (error) {
          console.error(`Failed to remove ${player.name}:`, error);
          failCount += 1;
        }
      }

      if (successCount > 0) {
        toast.success(
          `Removed ${successCount} player${successCount !== 1 ? "s" : ""}`,
          {
            description:
              failCount > 0
                ? `${failCount} player${failCount !== 1 ? "s" : ""} failed to remove`
                : undefined,
          }
        );
      }

      setSelectedPlayers(new Set());
      setShowBulkDeleteDialog(false);
    } catch (error) {
      console.error("Error during bulk delete:", error);
      toast.error("Failed to remove players");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Get unique values for filters
  const uniqueAgeGroups = [
    ...new Set(players?.map((p: any) => p.ageGroup).filter(Boolean)),
  ] as string[];
  const uniqueSports = [
    ...new Set(players?.map((p: any) => p.sport).filter(Boolean)),
  ] as string[];
  const uniqueGenders = [
    ...new Set(players?.map((p: any) => p.gender).filter(Boolean)),
  ] as string[];
  const uniqueTeams = [
    ...new Set(teams?.map((t: any) => t.name).filter(Boolean)),
  ] as string[];

  // Filter players
  const filteredPlayers = players?.filter((player: any) => {
    const matchesSearch = player.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesAge =
      ageGroupFilter === "all" ||
      player.ageGroup?.toLowerCase() === ageGroupFilter?.toLowerCase();
    const matchesSport = sportFilter === "all" || player.sport === sportFilter;
    const matchesGender =
      genderFilter === "all" || player.gender === genderFilter;
    const matchesReviewStatus =
      reviewStatusFilter === "all" ||
      player.reviewStatus === reviewStatusFilter;

    // Team filter - check actual team membership via teamPlayerIdentities
    let matchesTeam = teamFilter === "all";
    if (!matchesTeam && teamFilter !== "all") {
      const selectedTeam = teams?.find((t: any) => t.name === teamFilter);
      if (selectedTeam) {
        // Check if this player is actually assigned to the selected team
        matchesTeam =
          teamPlayerLinks?.some(
            (link: any) =>
              link.teamId === selectedTeam._id &&
              link.playerIdentityId === player._id
          ) ?? false;
      }
    }

    return (
      matchesSearch &&
      matchesAge &&
      matchesSport &&
      matchesGender &&
      matchesTeam &&
      matchesReviewStatus
    );
  });

  // Sort players
  const sortedPlayers = [...(filteredPlayers || [])].sort((a, b) => {
    let comparison = 0;

    switch (sortColumn) {
      case "name": {
        comparison = a.name.localeCompare(b.name);
        break;
      }
      case "team": {
        // For now, sort by ageGroup since team membership is in junction table
        comparison = (a.ageGroup || "").localeCompare(b.ageGroup || "");
        break;
      }
      case "ageGroup": {
        comparison = (a.ageGroup || "").localeCompare(b.ageGroup || "");
        break;
      }
      case "lastReview": {
        const dateA = a.lastReviewDate
          ? new Date(a.lastReviewDate).getTime()
          : 0;
        const dateB = b.lastReviewDate
          ? new Date(b.lastReviewDate).getTime()
          : 0;
        comparison = dateA - dateB;
        break;
      }
      default: {
        // Default to name sort
        comparison = a.name.localeCompare(b.name);
        break;
      }
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const _togglePlayerSelection = (playerId: string) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelectedPlayers(newSelected);
  };

  const _toggleSelectAll = () => {
    if (selectedPlayers.size === sortedPlayers.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(sortedPlayers.map((p: any) => p._id)));
    }
  };

  const getPlayerTeams = (player: any) => {
    // Get actual team names from teamPlayerIdentities
    if (!(teamPlayerLinks && teams)) {
      return player.ageGroup ? [player.ageGroup] : ["Unassigned"];
    }

    const playerTeamIds = teamPlayerLinks
      .filter((link: any) => link.playerIdentityId === player._id)
      .map((link: any) => link.teamId);

    if (playerTeamIds.length === 0) {
      return ["Unassigned"];
    }

    const teamNames = teams
      .filter((team: any) => playerTeamIds.includes(team._id))
      .map((team: any) => team.name);

    return teamNames.length > 0 ? teamNames : ["Unassigned"];
  };

  const stats = {
    total: players?.length || 0,
    needsReview: players?.filter((p: any) => !p.lastReviewDate).length || 0,
    recentReviews:
      players?.filter((p: any) => {
        if (!p.lastReviewDate) {
          return false;
        }
        const days =
          (Date.now() - new Date(p.lastReviewDate).getTime()) /
          (1000 * 60 * 60 * 24);
        return days <= 60;
      }).length || 0,
    duplicateGroups: duplicateGroups?.totalGroups ?? 0,
  };

  // Handle pending self-registration approval
  const handleApproveRegistration = async (enrollmentId: string) => {
    setApprovingRegistrationId(enrollmentId);
    try {
      await approvePlayerRegistration({
        enrollmentId: enrollmentId as any,
        organizationId: orgId,
      });
      toast.success("Player registration approved", {
        description: "The member has been granted the Player role.",
      });
    } catch (error) {
      toast.error("Failed to approve registration", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setApprovingRegistrationId(null);
    }
  };

  // Handle pending self-registration decline
  const handleDeclineRegistration = async (enrollmentId: string) => {
    setDecliningRegistrationId(enrollmentId);
    try {
      await unenrollPlayer({ enrollmentId: enrollmentId as any });
      toast.success("Registration declined");
    } catch (error) {
      toast.error("Failed to decline registration", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setDecliningRegistrationId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        className="inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
        href={`/orgs/${orgId}/admin`}
      >
        <ArrowLeft className="h-4 w-4" />
        Admin
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Manage Players</h1>
          <p className="mt-2 text-muted-foreground">
            View and manage all player passports
          </p>
        </div>
        <div className="flex gap-2">
          {selectedPlayers.size > 0 && (
            <Button onClick={handleBulkDeleteClick} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedPlayers.size})
            </Button>
          )}
          <Button
            onClick={() => {
              const activeTeam =
                teamFilter !== "all"
                  ? teams?.find((t: any) => t.name === teamFilter)
                  : null;
              if (activeTeam) {
                setAddPlayerForm((f) => ({
                  ...f,
                  teamId: activeTeam._id,
                  sportCode: activeTeam.sport || f.sportCode,
                }));
              }
              setShowAddPlayerDialog(true);
            }}
            variant="default"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Player
          </Button>
          <Button
            onClick={() => router.push(`/orgs/${orgId}/admin/player-import`)}
            variant="outline"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Players
          </Button>
        </div>
      </div>

      {/* Pending Player Registrations (US-P6-003) */}
      {pendingSelfRegistrations && pendingSelfRegistrations.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <UserPlus className="h-5 w-5" />
              Pending Player Registrations ({pendingSelfRegistrations.length})
            </CardTitle>
            <p className="text-amber-700 text-sm">
              These members have requested to join as players and are awaiting
              your review.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingSelfRegistrations.map((reg) => (
              <div
                className="flex flex-col gap-3 rounded-lg border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                key={reg.enrollmentId}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{reg.name}</span>
                    {reg.matchFound && (
                      <Badge className="text-xs" variant="outline">
                        <AlertTriangle className="mr-1 h-3 w-3 text-amber-500" />
                        Possible existing record
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    DOB: {reg.dateOfBirth}
                    {reg.email ? ` · ${reg.email}` : ""}
                  </p>
                  {reg.matchFound && reg.matchedPlayerName && (
                    <p className="text-amber-700 text-xs">
                      May match existing record: {reg.matchedPlayerName}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 sm:shrink-0">
                  <Button
                    disabled={
                      approvingRegistrationId === reg.enrollmentId ||
                      decliningRegistrationId === reg.enrollmentId
                    }
                    onClick={() => handleApproveRegistration(reg.enrollmentId)}
                    size="sm"
                    variant="default"
                  >
                    {approvingRegistrationId === reg.enrollmentId
                      ? "Approving..."
                      : "Approve"}
                  </Button>
                  <Button
                    disabled={
                      approvingRegistrationId === reg.enrollmentId ||
                      decliningRegistrationId === reg.enrollmentId
                    }
                    onClick={() => handleDeclineRegistration(reg.enrollmentId)}
                    size="sm"
                    variant="outline"
                  >
                    {decliningRegistrationId === reg.enrollmentId
                      ? "Declining..."
                      : "Decline"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Players</p>
                <p className="font-bold text-2xl">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">
                  Recent Reviews (60 days)
                </p>
                <p className="font-bold text-2xl text-green-600">
                  {stats.recentReviews}
                </p>
              </div>
              <Eye className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Needs Review</p>
                <p className="font-bold text-2xl text-yellow-600">
                  {stats.needsReview}
                </p>
              </div>
              <UserCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        {stats.duplicateGroups > 0 && (
          <Card
            className="cursor-pointer border-amber-200 bg-amber-50/50 transition-colors hover:bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20"
            onClick={() => setShowDuplicatePanel(!showDuplicatePanel)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-700 text-sm dark:text-amber-400">
                    Potential Duplicates
                  </p>
                  <p className="font-bold text-2xl text-amber-600">
                    {stats.duplicateGroups}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Duplicate Review Panel */}
      {showDuplicatePanel &&
        duplicateGroups &&
        duplicateGroups.groups.length > 0 && (
          <Card className="border-amber-200 dark:border-amber-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-amber-700 dark:text-amber-400">
                    Potential Duplicate Players
                  </CardTitle>
                  <CardDescription>
                    Review and merge players that may be duplicates.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowDuplicatePanel(false)}
                  size="sm"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {duplicateGroups.groups
                  .filter(
                    (g) =>
                      !dismissedGroups.has(
                        g.players.map((p: any) => p._id).join("-")
                      )
                  )
                  .map((group) => {
                    const groupKey = group.players
                      .map((p: any) => p._id)
                      .join("-");
                    return (
                      <div className="rounded-lg border p-4" key={groupKey}>
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                group.confidence === "high"
                                  ? "bg-red-500/10 text-red-700"
                                  : group.confidence === "medium"
                                    ? "bg-amber-500/10 text-amber-700"
                                    : "bg-gray-500/10 text-gray-700"
                              }
                              variant="outline"
                            >
                              {group.confidence} confidence ({group.matchScore})
                            </Badge>
                            <Badge variant="outline">{group.matchType}</Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              onClick={() => {
                                setMergeKeepId(group.players[0]._id);
                                setMergeRemoveId(group.players[1]._id);
                                setShowMergeDialog(true);
                              }}
                              size="sm"
                              variant="default"
                            >
                              <GitMerge className="mr-1 h-3 w-3" />
                              Merge
                            </Button>
                            <Button
                              onClick={async () => {
                                const [idA, idB] = group.players.map(
                                  (p: any) => p._id
                                );
                                // Optimistic local hide
                                const next = new Set(dismissedGroups);
                                next.add(groupKey);
                                setDismissedGroups(next);
                                // Persist to DB so it survives refresh
                                await dismissDuplicatePair({
                                  organizationId: orgId,
                                  playerIdA: idA,
                                  playerIdB: idB,
                                });
                              }}
                              size="sm"
                              variant="ghost"
                            >
                              Dismiss
                            </Button>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {group.players.map((player: any) => (
                            <div
                              className="rounded-md border bg-muted/30 p-3"
                              key={player._id}
                            >
                              <p className="font-medium text-sm">
                                {player.firstName} {player.lastName}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                DOB:{" "}
                                {new Date(
                                  player.dateOfBirth
                                ).toLocaleDateString()}{" "}
                                | {player.gender}
                              </p>
                              {player.ageGroup && (
                                <p className="text-muted-foreground text-xs">
                                  Age Group: {player.ageGroup}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search players by name"
            className="pl-10"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search players by name..."
            value={searchTerm}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select onValueChange={setSportFilter} value={sportFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Sport" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              {uniqueSports.map((sportCode) => (
                <SelectItem key={sportCode} value={sportCode}>
                  {getSportName(sportCode)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setAgeGroupFilter} value={ageGroupFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Age Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ages</SelectItem>
              {uniqueAgeGroups.map((age) => (
                <SelectItem key={age} value={age}>
                  {age}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setGenderFilter} value={genderFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              {uniqueGenders.map((gender) => (
                <SelectItem key={gender} value={gender}>
                  {gender}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setTeamFilter} value={teamFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {uniqueTeams.map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={setReviewStatusFilter}
            value={reviewStatusFilter}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Review Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Not Started">Not Started</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Player Table - Using ResponsiveDataView for mobile-friendly display */}
      <Card>
        <CardHeader>
          <CardTitle>Players ({sortedPlayers.length})</CardTitle>
          <CardDescription>
            {selectedPlayers.size > 0 &&
              `${selectedPlayers.size} player${selectedPlayers.size !== 1 ? "s" : ""} selected`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <div className="p-4" key={i}>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedPlayers.length > 0 ? (
            <SmartDataView
              actions={[
                {
                  label: "View",
                  icon: <Eye className="h-4 w-4" />,
                  onClick: (player: any) =>
                    router.push(`/orgs/${orgId}/players/${player._id}`),
                },
                {
                  label: "Edit",
                  icon: <Edit className="h-4 w-4" />,
                  onClick: (player: any) =>
                    router.push(
                      `/orgs/${orgId}/admin/players/${player._id}/edit` as any
                    ),
                },
                {
                  label: "Delete",
                  icon: <Trash2 className="h-4 w-4" />,
                  destructive: true,
                  onClick: (player: any) => handleDeleteClick(player),
                },
              ]}
              columns={[
                {
                  key: "name",
                  header: "Name",
                  sortable: true,
                  accessor: (player: any) => (
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <span className="font-medium text-primary text-xs">
                          {(player.name || "U")
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">
                          {player.name || "Unnamed"}
                        </p>
                      </div>
                    </div>
                  ),
                  exportAccessor: (player: any) => player.name || "Unnamed",
                },
                {
                  key: "team",
                  header: "Team(s)",
                  sortable: true,
                  accessor: (player: any) => getPlayerTeams(player).join(", "),
                  exportAccessor: (player: any) =>
                    getPlayerTeams(player).join(", "),
                },
                {
                  key: "ageGroup",
                  header: "Age Group",
                  sortable: true,
                  mobileVisible: false,
                  accessor: (player: any) => player.ageGroup || "—",
                  exportAccessor: (player: any) => player.ageGroup || "",
                },
                {
                  key: "gender",
                  header: "Gender",
                  sortable: true,
                  mobileVisible: false,
                  accessor: (player: any) => player.gender || "—",
                  exportAccessor: (player: any) => player.gender || "",
                },
                {
                  key: "dateOfBirth",
                  header: "Date of Birth",
                  sortable: true,
                  mobileVisible: false,
                  accessor: (player: any) =>
                    player.dateOfBirth
                      ? new Date(player.dateOfBirth).toLocaleDateString()
                      : "—",
                  exportAccessor: (player: any) => player.dateOfBirth || "",
                },
                {
                  key: "sport",
                  header: "Sport",
                  sortable: true,
                  mobileVisible: false,
                  accessor: (player: any) => getSportName(player.sport) || "—",
                  exportAccessor: (player: any) =>
                    getSportName(player.sport) || "",
                },
                {
                  key: "lastReviewDate",
                  header: "Last Review",
                  sortable: true,
                  mobileVisible: false,
                  accessor: (player: any) =>
                    player.lastReviewDate ? (
                      <Badge
                        className={(() => {
                          const days = Math.floor(
                            (Date.now() -
                              new Date(player.lastReviewDate).getTime()) /
                              (1000 * 60 * 60 * 24)
                          );
                          if (days <= 60) {
                            return "bg-green-500/10 text-green-600";
                          }
                          if (days <= 90) {
                            return "bg-orange-500/10 text-orange-600";
                          }
                          return "bg-red-500/10 text-red-600";
                        })()}
                        variant="outline"
                      >
                        {new Date(player.lastReviewDate).toLocaleDateString()}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        Not reviewed
                      </span>
                    ),
                  exportAccessor: (player: any) =>
                    player.lastReviewDate
                      ? new Date(player.lastReviewDate).toLocaleDateString()
                      : "",
                },
              ]}
              data={sortedPlayers}
              emptyState={
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <UserCircle />
                    </EmptyMedia>
                    <EmptyTitle>No Players Found</EmptyTitle>
                    <EmptyDescription>
                      {searchTerm ||
                      sportFilter !== "all" ||
                      ageGroupFilter !== "all" ||
                      genderFilter !== "all" ||
                      teamFilter !== "all" ||
                      reviewStatusFilter !== "all"
                        ? "No players match your search criteria"
                        : "Import your first players to get started"}
                    </EmptyDescription>
                  </EmptyHeader>
                  {!searchTerm &&
                    sportFilter === "all" &&
                    ageGroupFilter === "all" &&
                    genderFilter === "all" &&
                    teamFilter === "all" &&
                    reviewStatusFilter === "all" && (
                      <EmptyContent>
                        <Button
                          onClick={() =>
                            router.push(`/orgs/${orgId}/admin/player-import`)
                          }
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Import Players
                        </Button>
                      </EmptyContent>
                    )}
                </Empty>
              }
              exportable
              exportFilename={`players-${orgId}`}
              getKey={(player: any) => player._id}
              leftSwipeActions={[
                {
                  label: "Delete",
                  icon: <Trash2 className="h-5 w-5" />,
                  bgColor: "bg-destructive",
                  textColor: "text-destructive-foreground",
                  onClick: (player: any) => handleDeleteClick(player),
                },
              ]}
              onRefresh={async () => {
                // Convex queries auto-refresh, so we just add a small delay
                // to give visual feedback that the refresh happened
                await new Promise((resolve) => setTimeout(resolve, 300));
              }}
              onRowClick={(player: any) =>
                router.push(`/orgs/${orgId}/admin/players/${player._id}/edit`)
              }
              onSelectionChange={setSelectedPlayers}
              onSortChange={handleSort as any}
              rightSwipeActions={[
                {
                  label: "View",
                  icon: <Eye className="h-5 w-5" />,
                  bgColor: "bg-primary",
                  textColor: "text-primary-foreground",
                  onClick: (player: any) =>
                    router.push(`/orgs/${orgId}/players/${player._id}`),
                },
                {
                  label: "Edit",
                  icon: <Edit className="h-5 w-5" />,
                  bgColor: "bg-blue-500",
                  textColor: "text-white",
                  onClick: (player: any) =>
                    router.push(
                      `/orgs/${orgId}/admin/players/${player._id}/edit` as any
                    ),
                },
              ]}
              selectable
              selectedKeys={selectedPlayers}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
            />
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UserCircle />
                </EmptyMedia>
                <EmptyTitle>No Players Found</EmptyTitle>
                <EmptyDescription>
                  {searchTerm ||
                  sportFilter !== "all" ||
                  ageGroupFilter !== "all" ||
                  genderFilter !== "all" ||
                  teamFilter !== "all" ||
                  reviewStatusFilter !== "all"
                    ? "No players match your search criteria"
                    : "Import your first players to get started"}
                </EmptyDescription>
              </EmptyHeader>
              {!searchTerm &&
                sportFilter === "all" &&
                ageGroupFilter === "all" &&
                genderFilter === "all" &&
                teamFilter === "all" &&
                reviewStatusFilter === "all" && (
                  <EmptyContent>
                    <Button
                      onClick={() =>
                        router.push(`/orgs/${orgId}/admin/player-import`)
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Import Players
                    </Button>
                  </EmptyContent>
                )}
            </Empty>
          )}
        </CardContent>
      </Card>

      {/* Add Player Dialog */}
      <ResponsiveDialog
        contentClassName="sm:max-w-lg"
        description="Create a new player and enroll them in your organization."
        onOpenChange={(open) => {
          if (!open) {
            setAddPlayerForm(emptyFormData);
            setSelectedGuardianId(null);
            setSelectedExistingPlayer(null);
            setFormErrors({});
            setMediumMatchWarning(null);
            setHasAcknowledgedMediumMatch(false);
            setYouthMatchCandidate(null);
            setFederationFai("");
            setFederationIrfu("");
            setFederationGaa("");
            setFederationOther("");
            setShowFederationFields(false);
            setAddPlayerPhone("");
          }
          setShowAddPlayerDialog(open);
        }}
        open={showAddPlayerDialog}
        title="Add New Player"
      >
        <ResponsiveForm
          isLoading={
            isAddingPlayer || isCheckingDuplicate || isGuardianMatchLoading
          }
          onCancel={() => {
            setShowAddPlayerDialog(false);
            setAddPlayerForm(emptyFormData);
            setSelectedGuardianId(null);
            setFormErrors({});
            setAddPlayerPhone("");
          }}
          onSubmit={handleAddPlayer}
          submitText="Add Player"
        >
          {/* MEDIUM confidence player match banner (non-blocking) */}
          {mediumMatchWarning && (
            <div className="mx-4 mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">Possible existing player match</p>
                <p>
                  An existing player may match this record:{" "}
                  <span className="font-medium">{mediumMatchWarning.name}</span>
                  {", born "}
                  {new Date(
                    mediumMatchWarning.dateOfBirth
                  ).toLocaleDateString()}
                  . Review before proceeding.
                </p>
                <button
                  className="text-amber-700 underline hover:text-amber-900"
                  onClick={() =>
                    router.push(
                      `/orgs/${orgId}/players/${mediumMatchWarning.playerIdentityId}`
                    )
                  }
                  type="button"
                >
                  View Match
                </button>
                <span className="ml-2 text-amber-600 text-xs">
                  Click Add Player again to proceed anyway.
                </span>
              </div>
            </div>
          )}

          {/* Player Details */}
          <ResponsiveFormSection title="Player Details">
            <ResponsiveFormRow columns={2}>
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  className={formErrors.firstName ? "border-red-500" : ""}
                  id="firstName"
                  onChange={(e) => {
                    setAddPlayerForm({
                      ...addPlayerForm,
                      firstName: e.target.value,
                    });
                    if (formErrors.firstName) {
                      setFormErrors({ ...formErrors, firstName: undefined });
                    }
                  }}
                  placeholder="Enter first name"
                  value={addPlayerForm.firstName}
                />
                {formErrors.firstName && (
                  <p className="text-red-500 text-sm">{formErrors.firstName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  className={formErrors.lastName ? "border-red-500" : ""}
                  id="lastName"
                  onChange={(e) => {
                    setAddPlayerForm({
                      ...addPlayerForm,
                      lastName: e.target.value,
                    });
                    if (formErrors.lastName) {
                      setFormErrors({ ...formErrors, lastName: undefined });
                    }
                  }}
                  placeholder="Enter last name"
                  value={addPlayerForm.lastName}
                />
                {formErrors.lastName && (
                  <p className="text-red-500 text-sm">{formErrors.lastName}</p>
                )}
              </div>
            </ResponsiveFormRow>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">
                Date of Birth <span className="text-red-500">*</span>
              </Label>
              <Input
                className={formErrors.dateOfBirth ? "border-red-500" : ""}
                id="dateOfBirth"
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  setAddPlayerForm({
                    ...addPlayerForm,
                    dateOfBirth: e.target.value,
                  });
                  if (formErrors.dateOfBirth) {
                    setFormErrors({ ...formErrors, dateOfBirth: undefined });
                  }
                }}
                type="date"
                value={addPlayerForm.dateOfBirth}
              />
              {formErrors.dateOfBirth && (
                <p className="text-red-500 text-sm">{formErrors.dateOfBirth}</p>
              )}
            </div>

            <ResponsiveFormRow columns={2}>
              <div className="space-y-2">
                <Label htmlFor="gender">
                  Gender <span className="text-red-500">*</span>
                </Label>
                <Select
                  onValueChange={(value: "male" | "female" | "other") =>
                    setAddPlayerForm({ ...addPlayerForm, gender: value })
                  }
                  value={addPlayerForm.gender}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ageGroup">Age Group</Label>
                <Select
                  onValueChange={(value) => {
                    setAddPlayerForm({ ...addPlayerForm, ageGroup: value });
                    if (formErrors.ageGroup) {
                      setFormErrors({ ...formErrors, ageGroup: undefined });
                    }
                  }}
                  value={addPlayerForm.ageGroup}
                >
                  <SelectTrigger
                    className={formErrors.ageGroup ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select age group" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_GROUPS.map((ag) => (
                      <SelectItem key={ag} value={ag}>
                        {ag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.ageGroup && (
                  <p className="text-red-500 text-sm">{formErrors.ageGroup}</p>
                )}
              </div>
            </ResponsiveFormRow>
            {/* Email — optional matching signal */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                className={formErrors.email ? "border-red-500" : ""}
                id="email"
                onChange={(e) => {
                  setAddPlayerForm({ ...addPlayerForm, email: e.target.value });
                  if (formErrors.email) {
                    setFormErrors({ ...formErrors, email: undefined });
                  }
                }}
                placeholder="player@example.com"
                type="email"
                value={addPlayerForm.email}
              />
              {formErrors.email && (
                <p className="text-red-500 text-sm">{formErrors.email}</p>
              )}
            </div>

            {/* Phone — optional matching signal */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <PhoneInput
                countries={["IE", "GB", "US"]}
                defaultCountry="IE"
                onChange={(value) => setAddPlayerPhone(value ?? "")}
                value={addPlayerPhone}
              />
            </div>

            {/* Team Assignment — pick team first; sport derives from it */}
            <div className="space-y-2">
              <Label htmlFor="teamId">Assign to Team (Optional)</Label>
              <Select
                onValueChange={(value) => {
                  const picked =
                    value === "__none__"
                      ? null
                      : teams?.find((t: any) => t._id === value);
                  setAddPlayerForm({
                    ...addPlayerForm,
                    teamId: value === "__none__" ? "" : value,
                    sportCode: picked?.sport || addPlayerForm.sportCode,
                  });
                }}
                value={addPlayerForm.teamId || "__none__"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No team selected</SelectItem>
                  {teams
                    ?.filter((t: any) => t.isActive !== false)
                    .map((t: any) => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.name}
                        {t.ageGroup ? ` (${t.ageGroup})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Federation Numbers — collapsible optional section */}
            <div className="border-t pt-3">
              <button
                className="flex w-full items-center gap-2 text-left text-muted-foreground text-sm hover:text-foreground"
                onClick={() => setShowFederationFields((v) => !v)}
                type="button"
              >
                {showFederationFields ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Federation Numbers (Optional)
              </button>
              {showFederationFields && (
                <div className="mt-3 space-y-3">
                  <p className="text-muted-foreground text-xs">
                    Enter national federation registration numbers for stronger
                    identity matching.
                  </p>
                  <ResponsiveFormRow columns={2}>
                    <div className="space-y-1">
                      <Label className="text-xs">FAI Number</Label>
                      <Input
                        onChange={(e) => setFederationFai(e.target.value)}
                        placeholder="FAI reg. number"
                        value={federationFai}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">IRFU Number</Label>
                      <Input
                        onChange={(e) => setFederationIrfu(e.target.value)}
                        placeholder="IRFU reg. number"
                        value={federationIrfu}
                      />
                    </div>
                  </ResponsiveFormRow>
                  <ResponsiveFormRow columns={2}>
                    <div className="space-y-1">
                      <Label className="text-xs">GAA Number</Label>
                      <Input
                        onChange={(e) => setFederationGaa(e.target.value)}
                        placeholder="GAA reg. number"
                        value={federationGaa}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Other</Label>
                      <Input
                        onChange={(e) => setFederationOther(e.target.value)}
                        placeholder="Other federation"
                        value={federationOther}
                      />
                    </div>
                  </ResponsiveFormRow>
                </div>
              )}
            </div>
          </ResponsiveFormSection>
          {/* Potential Matches Panel */}
          {potentialMatches &&
            potentialMatches.length > 0 &&
            !selectedExistingPlayer && (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
                <p className="font-medium text-amber-700 text-sm dark:text-amber-400">
                  <AlertTriangle className="mr-1 inline h-4 w-4" />
                  Existing players found matching this name and date of birth
                </p>
                <div className="space-y-2">
                  {potentialMatches.map((match: any) => (
                    <div
                      className="flex items-center justify-between rounded-md border bg-white p-3 dark:bg-gray-900"
                      key={match._id}
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {match.firstName} {match.lastName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          DOB:{" "}
                          {new Date(match.dateOfBirth).toLocaleDateString()} |{" "}
                          {match.gender}
                        </p>
                        <div className="mt-1 flex items-center gap-1">
                          <Badge
                            className={
                              match.confidence === "high"
                                ? "bg-green-500/10 text-green-700"
                                : match.confidence === "medium"
                                  ? "bg-amber-500/10 text-amber-700"
                                  : "bg-gray-500/10 text-gray-700"
                            }
                            variant="outline"
                          >
                            {match.confidence} ({match.matchScore})
                          </Badge>
                          <Badge variant="outline">{match.matchType}</Badge>
                        </div>
                      </div>
                      <Button
                        onClick={() => setSelectedExistingPlayer(match._id)}
                        size="sm"
                        type="button"
                        variant="default"
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Use This Player
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Selected Existing Player Banner */}
          {selectedExistingPlayer && (
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50/50 p-4 dark:border-green-800 dark:bg-green-950/20">
              <div>
                <p className="font-medium text-green-700 text-sm dark:text-green-400">
                  <Check className="mr-1 inline h-4 w-4" />
                  Using existing player identity
                </p>
                <p className="text-green-600 text-xs dark:text-green-500">
                  This will enroll the existing player in your organization
                  instead of creating a new identity.
                </p>
              </div>
              <Button
                onClick={() => setSelectedExistingPlayer(null)}
                size="sm"
                type="button"
                variant="outline"
              >
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            </div>
          )}

          {/* Player Address (Optional) */}
          <ResponsiveFormSection title="Player Address (Optional)">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                className={formErrors.address ? "border-red-500" : ""}
                id="address"
                onChange={(e) => {
                  setAddPlayerForm({
                    ...addPlayerForm,
                    address: e.target.value,
                  });
                  if (formErrors.address) {
                    setFormErrors({ ...formErrors, address: undefined });
                  }
                }}
                placeholder="e.g. 12 Main Street"
                value={addPlayerForm.address}
              />
              {formErrors.address && (
                <p className="text-red-500 text-sm">{formErrors.address}</p>
              )}
            </div>
            <ResponsiveFormRow columns={2}>
              <div className="space-y-2">
                <Label htmlFor="town">Town</Label>
                <Input
                  className={formErrors.town ? "border-red-500" : ""}
                  id="town"
                  onChange={(e) => {
                    setAddPlayerForm({
                      ...addPlayerForm,
                      town: e.target.value,
                    });
                    if (formErrors.town) {
                      setFormErrors({ ...formErrors, town: undefined });
                    }
                  }}
                  placeholder="e.g. Armagh"
                  value={addPlayerForm.town}
                />
                {formErrors.town && (
                  <p className="text-red-500 text-sm">{formErrors.town}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode / Eircode</Label>
                <Input
                  className={formErrors.postcode ? "border-red-500" : ""}
                  id="postcode"
                  onChange={(e) => {
                    setAddPlayerForm({
                      ...addPlayerForm,
                      postcode: e.target.value,
                    });
                    if (formErrors.postcode) {
                      setFormErrors({ ...formErrors, postcode: undefined });
                    }
                  }}
                  placeholder="e.g. BT61 8AA"
                  value={addPlayerForm.postcode}
                />
                {formErrors.postcode && (
                  <p className="text-red-500 text-sm">{formErrors.postcode}</p>
                )}
              </div>
            </ResponsiveFormRow>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select
                onValueChange={(value) =>
                  setAddPlayerForm({ ...addPlayerForm, country: value })
                }
                value={addPlayerForm.country || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ireland">Ireland</SelectItem>
                  <SelectItem value="Northern Ireland">
                    Northern Ireland
                  </SelectItem>
                  <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </ResponsiveFormSection>
          {/* Guardian / Emergency Contact Section */}
          {/* biome-ignore lint/complexity/noUselessFragments: wraps multiple conditional siblings */}
          <>
            {/* Guardian matching loading indicator */}
            {isGuardianMatchLoading && (
              <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-700 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking for matching guardians...
              </div>
            )}

            {/* Guardian Suggestions — only for youth players */}
            {isYouthPlayer &&
              guardianSuggestions &&
              guardianSuggestions.length > 0 && (
                <ResponsiveFormSection title="Suggested Guardians">
                  <p className="text-muted-foreground text-xs">
                    Based on matching surname, address, email, or phone.
                  </p>
                  <div className="space-y-2">
                    {guardianSuggestions.map(
                      (match: {
                        guardianIdentityId: string;
                        score: number;
                        confidence: "high" | "medium" | "low";
                        matchReasons: string[];
                        guardian: {
                          firstName: string;
                          lastName: string;
                          email?: string;
                          phone?: string;
                        };
                        linkedChildren: {
                          playerIdentityId: string;
                          firstName: string;
                          lastName: string;
                          dateOfBirth: string;
                        }[];
                      }) => {
                        const isSelected =
                          selectedGuardianId === match.guardianIdentityId;
                        return (
                          <div
                            className={`rounded-lg border p-3 transition-colors ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "hover:border-muted-foreground/30"
                            }`}
                            key={match.guardianIdentityId}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    className={
                                      match.confidence === "high"
                                        ? "bg-green-500/10 text-green-700"
                                        : match.confidence === "medium"
                                          ? "bg-amber-500/10 text-amber-700"
                                          : "bg-gray-500/10 text-gray-700"
                                    }
                                    variant="outline"
                                  >
                                    {match.confidence === "high"
                                      ? "High"
                                      : match.confidence === "medium"
                                        ? "Medium"
                                        : "Low"}{" "}
                                    ({match.score})
                                  </Badge>
                                  {isSelected && (
                                    <Badge
                                      className="bg-primary/10 text-primary"
                                      variant="outline"
                                    >
                                      <Check className="mr-1 h-3 w-3" />
                                      Selected
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-1 font-medium text-sm">
                                  {match.guardian.firstName}{" "}
                                  {match.guardian.lastName}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {[match.guardian.email, match.guardian.phone]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                                {match.linkedChildren.length > 0 && (
                                  <p className="mt-0.5 text-muted-foreground text-xs">
                                    Guardian of:{" "}
                                    {match.linkedChildren
                                      .map(
                                        (c) => `${c.firstName} ${c.lastName}`
                                      )
                                      .join(", ")}
                                  </p>
                                )}
                                <p className="mt-0.5 text-muted-foreground text-xs italic">
                                  {match.matchReasons.join(", ")}
                                </p>
                              </div>
                              <Button
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedGuardianId(null);
                                    setAddPlayerForm({
                                      ...addPlayerForm,
                                      guardianFirstName: "",
                                      guardianLastName: "",
                                      guardianEmail: "",
                                      guardianPhone: "",
                                    });
                                  } else {
                                    setSelectedGuardianId(
                                      match.guardianIdentityId
                                    );
                                    setAddPlayerForm({
                                      ...addPlayerForm,
                                      guardianFirstName:
                                        match.guardian.firstName,
                                      guardianLastName: match.guardian.lastName,
                                      guardianEmail: match.guardian.email || "",
                                      guardianPhone: match.guardian.phone || "",
                                    });
                                  }
                                }}
                                size="sm"
                                type="button"
                                variant={isSelected ? "outline" : "default"}
                              >
                                {isSelected ? (
                                  <>
                                    <X className="mr-1 h-3 w-3" />
                                    Clear
                                  </>
                                ) : (
                                  <>
                                    <LinkIcon className="mr-1 h-3 w-3" />
                                    Link
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </ResponsiveFormSection>
              )}

            {/* Guardian / Emergency Contact Details */}
            <ResponsiveFormSection
              title={
                selectedGuardianId
                  ? "Guardian Details (Linked)"
                  : isYouthPlayer
                    ? "Guardian Details (Optional)"
                    : "Emergency Contact (Optional)"
              }
            >
              <ResponsiveFormRow columns={2}>
                <div className="space-y-2">
                  <Label htmlFor="guardianFirstName">First Name</Label>
                  <Input
                    className={
                      formErrors.guardianFirstName ? "border-red-500" : ""
                    }
                    disabled={!!selectedGuardianId}
                    id="guardianFirstName"
                    onChange={(e) => {
                      setAddPlayerForm({
                        ...addPlayerForm,
                        guardianFirstName: e.target.value,
                      });
                      if (formErrors.guardianFirstName) {
                        setFormErrors({
                          ...formErrors,
                          guardianFirstName: undefined,
                        });
                      }
                    }}
                    placeholder="Guardian first name"
                    value={addPlayerForm.guardianFirstName}
                  />
                  {formErrors.guardianFirstName && (
                    <p className="text-red-500 text-xs">
                      {formErrors.guardianFirstName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardianLastName">Last Name</Label>
                  <Input
                    className={
                      formErrors.guardianLastName ? "border-red-500" : ""
                    }
                    disabled={!!selectedGuardianId}
                    id="guardianLastName"
                    onChange={(e) => {
                      setAddPlayerForm({
                        ...addPlayerForm,
                        guardianLastName: e.target.value,
                      });
                      if (formErrors.guardianLastName) {
                        setFormErrors({
                          ...formErrors,
                          guardianLastName: undefined,
                        });
                      }
                    }}
                    placeholder="Guardian last name"
                    value={addPlayerForm.guardianLastName}
                  />
                  {formErrors.guardianLastName && (
                    <p className="text-red-500 text-xs">
                      {formErrors.guardianLastName}
                    </p>
                  )}
                </div>
              </ResponsiveFormRow>

              <ResponsiveFormRow columns={2}>
                <div className="space-y-2">
                  <Label htmlFor="guardianEmail">Email</Label>
                  <Input
                    className={formErrors.guardianEmail ? "border-red-500" : ""}
                    disabled={!!selectedGuardianId}
                    id="guardianEmail"
                    onChange={(e) => {
                      setAddPlayerForm({
                        ...addPlayerForm,
                        guardianEmail: e.target.value,
                      });
                      if (formErrors.guardianEmail) {
                        setFormErrors({
                          ...formErrors,
                          guardianEmail: undefined,
                        });
                      }
                    }}
                    placeholder="guardian@example.com"
                    type="email"
                    value={addPlayerForm.guardianEmail}
                  />
                  {formErrors.guardianEmail && (
                    <p className="text-red-500 text-xs">
                      {formErrors.guardianEmail}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardianPhone">Phone</Label>
                  <Input
                    disabled={!!selectedGuardianId}
                    id="guardianPhone"
                    onChange={(e) =>
                      setAddPlayerForm({
                        ...addPlayerForm,
                        guardianPhone: e.target.value,
                      })
                    }
                    placeholder="087 123 4567"
                    type="tel"
                    value={addPlayerForm.guardianPhone}
                  />
                </div>
              </ResponsiveFormRow>

              <div className="space-y-2">
                <Label htmlFor="guardianRelationship">
                  {isYouthPlayer ? "Relationship" : "Relationship / Role"}
                </Label>
                <Select
                  onValueChange={(value: GuardianRelationship) =>
                    setAddPlayerForm({
                      ...addPlayerForm,
                      guardianRelationship: value,
                    })
                  }
                  value={addPlayerForm.guardianRelationship}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mother">Mother</SelectItem>
                    <SelectItem value="father">Father</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="grandparent">Grandparent</SelectItem>
                    <SelectItem value="other">
                      {isYouthPlayer ? "Other" : "Other / Emergency Contact"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </ResponsiveFormSection>
          </>
        </ResponsiveForm>
      </ResponsiveDialog>

      {/* Delete Confirmation Dialog */}
      <ResponsiveDialog
        contentClassName="sm:max-w-md"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              onClick={() => {
                setShowDeleteDialog(false);
                setPlayerToDelete(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
              variant="destructive"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Player
                </>
              )}
            </Button>
          </div>
        }
        onOpenChange={setShowDeleteDialog}
        open={showDeleteDialog}
      >
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-semibold text-destructive text-lg">
            <AlertTriangle className="h-5 w-5" />
            Remove Player
          </h3>
          <p className="text-muted-foreground">
            Are you sure you want to remove{" "}
            <span className="font-semibold">{playerToDelete?.name}</span> from
            this organization?
          </p>
          <p className="text-muted-foreground text-sm">
            This will remove the player from your organization. Their player
            identity will remain in the system and can be re-enrolled later.
          </p>
        </div>
      </ResponsiveDialog>

      {/* Player Match Dialog — HIGH confidence (blocking) */}
      <ResponsiveDialog
        contentClassName="sm:max-w-md"
        description={
          youthMatchCandidate
            ? `An existing ${youthMatchCandidate.playerType} player record for ${youthMatchCandidate.firstName} ${youthMatchCandidate.lastName}, born ${new Date(youthMatchCandidate.dateOfBirth).toLocaleDateString()}, was found.`
            : undefined
        }
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              disabled={isLinkingToYouth || isAddingPlayer}
              onClick={async () => {
                setShowYouthMatchDialog(false);
                await createPlayer();
              }}
              variant="outline"
            >
              {isAddingPlayer ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create New Profile"
              )}
            </Button>
            <Button
              disabled={isLinkingToYouth || isAddingPlayer}
              onClick={handleLinkToExistingHistory}
            >
              {isLinkingToYouth ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Linking...
                </>
              ) : (
                "Link to Existing Record"
              )}
            </Button>
          </div>
        }
        onOpenChange={(open) => {
          if (!open) {
            setYouthMatchCandidate(null);
          }
          setShowYouthMatchDialog(open);
        }}
        open={showYouthMatchDialog}
        title="Existing Player Record Found"
      >
        <div className="space-y-3 text-muted-foreground text-sm">
          <p>
            Would you like to link to this existing record, or create a new
            separate profile?
          </p>
          <ul className="list-disc space-y-1 pl-4">
            <li>
              <span className="font-medium text-foreground">
                Link to Existing Record
              </span>{" "}
              — preserves all prior history, assessments, and team records.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Create New Profile
              </span>{" "}
              — creates a separate record with no prior history.
            </li>
          </ul>
        </div>
      </ResponsiveDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <ResponsiveDialog
        contentClassName="sm:max-w-md"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              onClick={() => setShowBulkDeleteDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isBulkDeleting}
              onClick={handleBulkDeleteConfirm}
              variant="destructive"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove {selectedPlayers.size} Player
                  {selectedPlayers.size !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        }
        onOpenChange={setShowBulkDeleteDialog}
        open={showBulkDeleteDialog}
      >
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-semibold text-destructive text-lg">
            <AlertTriangle className="h-5 w-5" />
            Remove {selectedPlayers.size} Player
            {selectedPlayers.size !== 1 ? "s" : ""}
          </h3>
          <p className="text-muted-foreground">
            Are you sure you want to remove {selectedPlayers.size} selected
            player{selectedPlayers.size !== 1 ? "s" : ""} from this
            organization?
          </p>
          <p className="text-muted-foreground text-sm">
            This will remove the selected players from your organization. Their
            player identities will remain in the system and can be re-enrolled
            later.
          </p>
        </div>
      </ResponsiveDialog>

      {/* Merge Player Dialog */}
      <ResponsiveDialog
        contentClassName="sm:max-w-lg"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              onClick={() => {
                setShowMergeDialog(false);
                setMergeKeepId(null);
                setMergeRemoveId(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isMerging || !mergePreview?.canMerge}
              onClick={handleMergeConfirm}
              variant="default"
            >
              {isMerging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Merging...
                </>
              ) : (
                <>
                  <GitMerge className="mr-2 h-4 w-4" />
                  Confirm Merge
                </>
              )}
            </Button>
          </div>
        }
        onOpenChange={(open) => {
          if (!open) {
            setMergeKeepId(null);
            setMergeRemoveId(null);
          }
          setShowMergeDialog(open);
        }}
        open={showMergeDialog}
        title="Merge Player Identities"
      >
        {mergePreview ? (
          <div className="space-y-4">
            {/* Side-by-side player cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border-2 border-green-300 bg-green-50/50 p-3 dark:border-green-700 dark:bg-green-950/20">
                <Badge
                  className="mb-2 bg-green-500/10 text-green-700"
                  variant="outline"
                >
                  Keep
                </Badge>
                <p className="font-medium">
                  {mergePreview.keepPlayer.firstName}{" "}
                  {mergePreview.keepPlayer.lastName}
                </p>
                <p className="text-muted-foreground text-xs">
                  DOB:{" "}
                  {new Date(
                    mergePreview.keepPlayer.dateOfBirth
                  ).toLocaleDateString()}{" "}
                  | {mergePreview.keepPlayer.gender}
                </p>
              </div>
              <div className="rounded-lg border-2 border-red-300 bg-red-50/50 p-3 dark:border-red-700 dark:bg-red-950/20">
                <Badge
                  className="mb-2 bg-red-500/10 text-red-700"
                  variant="outline"
                >
                  Remove
                </Badge>
                <p className="font-medium">
                  {mergePreview.removePlayer.firstName}{" "}
                  {mergePreview.removePlayer.lastName}
                </p>
                <p className="text-muted-foreground text-xs">
                  DOB:{" "}
                  {new Date(
                    mergePreview.removePlayer.dateOfBirth
                  ).toLocaleDateString()}{" "}
                  | {mergePreview.removePlayer.gender}
                </p>
              </div>
            </div>

            {/* Swap button */}
            <div className="flex justify-center">
              <Button
                onClick={() => {
                  setMergeKeepId(mergeRemoveId);
                  setMergeRemoveId(mergeKeepId);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <ArrowLeftRight className="mr-1 h-3 w-3" />
                Swap Keep / Remove
              </Button>
            </div>

            {/* Affected records */}
            {mergePreview.affectedRecords.length > 0 && (
              <div>
                <p className="mb-2 font-medium text-sm">Affected Records</p>
                <div className="space-y-1">
                  {mergePreview.affectedRecords.map((r: any) => (
                    <div
                      className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-sm"
                      key={r.table}
                    >
                      <span className="text-muted-foreground">{r.table}</span>
                      <Badge variant="outline">{r.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conflicts */}
            {mergePreview.conflicts.length > 0 && (
              <div>
                <p className="mb-2 font-medium text-amber-700 text-sm">
                  Conflicts
                </p>
                <div className="space-y-1">
                  {mergePreview.conflicts.map((c: any, i: number) => (
                    <div
                      className="rounded-md border border-amber-200 bg-amber-50/50 px-3 py-1.5 text-xs dark:border-amber-800 dark:bg-amber-950/20"
                      key={`${c.table}-${i}`}
                    >
                      <p className="font-medium text-amber-700">
                        {c.table}: {c.issue}
                      </p>
                      <p className="text-amber-600">
                        Resolution: {c.resolution}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Blocking reason */}
            {!mergePreview.canMerge && mergePreview.blockingReason && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/20">
                <p className="font-medium text-red-700 text-sm">
                  <AlertTriangle className="mr-1 inline h-4 w-4" />
                  Merge Blocked
                </p>
                <p className="text-red-600 text-xs">
                  {mergePreview.blockingReason}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
}
