// disable biome in this file
// biome-ignore-all lint: reason for disabling

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Download,
  FileText,
  Info,
  Plus,
  Upload,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ReviewStatus, Team } from "@/lib/types";

// Skills type for GAA Football
type GAASkills = {
  soloing: number;
  kickingLong: number;
  kickingShort: number;
  kickingDistanceMax: string | number;
  freeTakingGround: number;
  freeTakingHand: number;
  handPassing: number;
  pickupToeLift: number;
  highCatching: number;
  tackling: number;
  positionalSense: number;
  tracking: number;
  decisionMaking: number;
  decisionSpeed: number;
  ballHandling: number;
  leftSide: number;
  rightSide: number;
};

// Type for player data to create
type PlayerCreateData = {
  name: string;
  ageGroup: string;
  sport: string;
  gender: string;
  teamId: string; // Now uses teamId instead of team name
  completionDate?: string;
  season: string;
  reviewedWith?: {
    coach: boolean;
    parent: boolean;
    player: boolean;
    forum: boolean;
  };
  attendance?: { training: string; matches: string };
  injuryNotes?: string;
  reviewStatus?: ReviewStatus;
  lastReviewDate?: string | null;
  nextReviewDue?: string | null;
  skills: Record<string, number>;
  positions?: {
    favourite: string;
    leastFavourite: string;
    coachesPref: string;
    dominantSide: string;
    goalkeeper: string;
  };
  fitness?: {
    pushPull: string;
    core: string;
    endurance: string;
    speed: string;
    broncoBeep: string;
  };
  otherInterests?: string;
  communications?: string;
  actions?: string;
  coachNotes?: string;
  parentNotes?: string;
  playerNotes?: string;
  seasonReviews?: unknown[];
  createdFrom?: string;
  familyId?: string;
  inferredParentFirstName?: string;
  inferredParentSurname?: string;
  inferredParentEmail?: string;
  inferredParentPhone?: string;
  inferredFromSource?: string;
  parentFirstName?: string;
  parentSurname?: string;
  parentEmail?: string;
  parentPhone?: string;
  dateOfBirth?: string;
  address?: string;
  town?: string;
  postcode?: string;
};

// Type for team creation data
type TeamCreateData = {
  name: string;
  sport: string;
  ageGroup: string;
  gender: "Boys" | "Girls" | "Mixed";
  season: string;
};

// Type for detected team from CSV
type DetectedTeam = {
  name: string;
  sport: string;
  ageGroup: string;
  gender: "Boys" | "Girls" | "Mixed";
  season: string;
  playerCount: number;
  existingTeamId?: string; // If matched to existing team
};

// Type for identity player (from new enrollment system)
type IdentityPlayer = {
  _id: string;
  name: string;
  ageGroup: string;
  sport?: string;
  gender: string;
  teamId: string;
  organizationId: string;
  season: string;
  dateOfBirth?: string;
  parentFirstName?: string;
  parentSurname?: string;
  lastReviewDate?: string;
  playerIdentityId?: string;
  enrollmentId?: string;
};

// Type for batch import result
type BatchImportResult = {
  totalProcessed: number;
  playersCreated: number;
  playersReused: number;
  guardiansCreated: number;
  guardiansReused: number;
  enrollmentsCreated: number;
  enrollmentsReused: number;
  errors: string[];
  // Player identity IDs with their original index for team assignment
  playerIdentities: Array<{
    index: number;
    playerIdentityId: Id<"playerIdentities">;
    wasCreated: boolean;
  }>;
};

// Type for player import data (new identity system)
type IdentityImportPlayer = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  ageGroup: string;
  season: string;
  address?: string;
  town?: string;
  postcode?: string;
  country?: string;
  parentFirstName?: string;
  parentLastName?: string;
  parentEmail?: string;
  parentPhone?: string;
  parentRelationship?:
    | "mother"
    | "father"
    | "guardian"
    | "grandparent"
    | "other";
  teamId?: string;
};

const GAAMembershipWizard = ({
  onClose,
  onComplete,
  existingPlayers,
  existingTeams,
  batchImportWithIdentity,
  bulkAddToTeam,
  createTeamMutation,
  organizationId,
}: {
  onClose: () => void;
  onComplete: () => Promise<void>;
  existingPlayers: IdentityPlayer[];
  existingTeams: Team[];
  batchImportWithIdentity: (args: {
    organizationId: string;
    sportCode?: string;
    players: IdentityImportPlayer[];
  }) => Promise<BatchImportResult>;
  bulkAddToTeam: (
    teamId: string,
    playerIdentityIds: Id<"playerIdentities">[]
  ) => Promise<{ added: number; skipped: number }>;
  createTeamMutation: (data: TeamCreateData) => Promise<string>;
  organizationId: string;
}) => {
  const [step, setStep] = useState(1);
  const [csvData, setCsvData] = useState("");
  const [parsedMembers, setParsedMembers] = useState<any[]>([]);
  // teamAssignments now maps member index -> teamId (not team name)
  const [teamAssignments, setTeamAssignments] = useState<
    Record<string, string>
  >({});
  const [skillRatingStrategy, setSkillRatingStrategy] = useState<
    "middle" | "blank" | "age-appropriate"
  >("middle");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{
    created: number;
    families: number;
    skipped?: number;
    replaced?: number;
    teamsCreated?: number;
  } | null>(null);
  const [duplicates, setDuplicates] = useState<
    Array<{ index: number; member: any; existingPlayer: IdentityPlayer }>
  >([]);
  const [duplicateResolutions, setDuplicateResolutions] = useState<
    Record<number, "replace" | "keep" | "skip">
  >({});
  const [duplicateSearch, setDuplicateSearch] = useState("");
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<number>>(
    new Set()
  );
  const [importFilter, setImportFilter] = useState<"all" | "youth" | "senior">(
    "all"
  );
  const [memberSort, setMemberSort] = useState<{
    field: string;
    direction: "asc" | "desc";
  }>({ field: "name", direction: "asc" });
  const [memberFilterAge, setMemberFilterAge] = useState<string>("all");
  const [memberFilterGender, setMemberFilterGender] = useState<string>("all");
  const [columnAnalysis, setColumnAnalysis] = useState<{
    requiredPresent: string[];
    requiredMissing: string[];
    optionalPresent: string[];
    ignored: string[];
    hasAllRequired: boolean;
  } | null>(null);
  // Team management state
  const [detectedTeams, setDetectedTeams] = useState<DetectedTeam[]>([]);
  const [teamsToCreate, setTeamsToCreate] = useState<Set<string>>(new Set());
  const [creatingTeams, setCreatingTeams] = useState(false);
  // Local teams state (includes newly created teams)
  const [localTeams, setLocalTeams] = useState<Team[]>([]);

  // Auto-validate columns whenever CSV data changes
  useEffect(() => {
    if (csvData.trim()) {
      const analysis = validateCSVColumns(csvData);
      setColumnAnalysis(analysis);
    } else {
      setColumnAnalysis(null);
    }
  }, [csvData]);

  // Sync local teams with existing teams
  useEffect(() => {
    setLocalTeams(existingTeams);
  }, [existingTeams]);

  // Helper to generate team key for comparison
  const getTeamKey = (team: {
    sport: string;
    ageGroup: string;
    gender: string;
    season: string;
  }) => {
    return `${team.sport}|${team.ageGroup}|${team.gender}|${team.season}`;
  };

  // Detect teams from parsed members
  const detectTeamsFromMembers = (members: any[]) => {
    const teamMap = new Map<string, DetectedTeam>();

    members.forEach((member) => {
      const normalizedGender =
        member.Gender?.toUpperCase() === "MALE"
          ? "Boys"
          : member.Gender?.toUpperCase() === "FEMALE"
            ? "Girls"
            : "Mixed";

      const teamKey = getTeamKey({
        sport: "GAA Football",
        ageGroup: member.AgeGroup,
        gender: normalizedGender,
        season: "2025",
      });

      const teamName =
        member.AgeGroup === "Senior"
          ? `Senior ${normalizedGender === "Boys" ? "Men" : normalizedGender === "Girls" ? "Women" : "Mixed"}`
          : `${member.AgeGroup} ${normalizedGender}`;

      if (teamMap.has(teamKey)) {
        const existing = teamMap.get(teamKey)!;
        existing.playerCount += 1;
      } else {
        // Check if this team already exists
        const existingTeam = localTeams.find(
          (t) =>
            t.sport === "GAA Football" &&
            t.ageGroup === member.AgeGroup &&
            t.gender === normalizedGender &&
            t.season === "2025"
        );

        teamMap.set(teamKey, {
          name: teamName,
          sport: "GAA Football",
          ageGroup: member.AgeGroup,
          gender: normalizedGender as "Boys" | "Girls" | "Mixed",
          season: "2025",
          playerCount: 1,
          existingTeamId: existingTeam?._id,
        });
      }
    });

    return Array.from(teamMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  };

  // Get team ID by team properties (looks up in localTeams)
  const getTeamIdByProperties = (
    sport: string,
    ageGroup: string,
    gender: string,
    season: string
  ): string | undefined => {
    const team = localTeams.find(
      (t) =>
        t.sport === sport &&
        t.ageGroup === ageGroup &&
        t.gender === gender &&
        t.season === season
    );
    return team?._id;
  };

  const downloadMembershipTemplate = () => {
    const template = `Forename,Surname,DOB,gender,email,Mobile Number,Membership Type,Player
John,Smith,5/15/12,MALE,mary.smith@email.com,0871234567,YOUTH,
Emma,Smith,8/22/14,FEMALE,mary.smith@email.com,0871234567,YOUTH,
Tom,Jones,3/10/11,MALE,sarah.jones@email.com,0869876543,YOUTH,
Michael,Brown,11/5/13,MALE,anne.brown@email.com,0851112223,YOUTH,
Sophie,Brown,6/18/15,FEMALE,anne.brown@email.com,0851112223,YOUTH,
Mary,Smith,4/20/85,FEMALE,mary.smith@email.com,0871234567,ADULT,
Sarah,Jones,7/15/80,FEMALE,sarah.jones@email.com,0869876543,ADULT,YES
Liam,Murphy,3/12/92,MALE,liam.murphy@email.com,0857654321,ADULT,YES
Anne,Brown,9/8/88,FEMALE,anne.brown@email.com,0851112223,ADULT,`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gaa_membership_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const getAgeGroup = (age: number): string => {
    if (age <= 8) return "U8";
    if (age <= 10) return "U10";
    if (age <= 12) return "U12";
    if (age <= 14) return "U14";
    if (age <= 16) return "U16";
    if (age <= 18) return "U18";
    return "Senior";
  };

  // Get age-appropriate skill ratings based on GAA development standards
  const getAgeAppropriateSkills = (ageGroup: string): GAASkills => {
    // GAA Foundation & Development Standards
    const skillsByAge: Record<string, GAASkills> = {
      U8: {
        // Foundation stage - basic skills development
        soloing: 1,
        kickingLong: 1,
        kickingShort: 2,
        kickingDistanceMax: "",
        freeTakingGround: 1,
        freeTakingHand: 1,
        handPassing: 2,
        pickupToeLift: 1,
        highCatching: 1,
        tackling: 1,
        positionalSense: 1,
        tracking: 1,
        decisionMaking: 1,
        decisionSpeed: 1,
        ballHandling: 2,
        leftSide: 1,
        rightSide: 1,
      },
      U10: {
        // Early development - growing fundamentals
        soloing: 2,
        kickingLong: 1,
        kickingShort: 2,
        kickingDistanceMax: "",
        freeTakingGround: 1,
        freeTakingHand: 2,
        handPassing: 2,
        pickupToeLift: 2,
        highCatching: 2,
        tackling: 1,
        positionalSense: 2,
        tracking: 1,
        decisionMaking: 2,
        decisionSpeed: 2,
        ballHandling: 2,
        leftSide: 1,
        rightSide: 2,
      },
      U12: {
        // Intermediate development
        soloing: 2,
        kickingLong: 2,
        kickingShort: 3,
        kickingDistanceMax: "",
        freeTakingGround: 2,
        freeTakingHand: 2,
        handPassing: 3,
        pickupToeLift: 2,
        highCatching: 2,
        tackling: 2,
        positionalSense: 2,
        tracking: 2,
        decisionMaking: 2,
        decisionSpeed: 2,
        ballHandling: 3,
        leftSide: 2,
        rightSide: 3,
      },
      U14: {
        // Advanced development
        soloing: 3,
        kickingLong: 2,
        kickingShort: 3,
        kickingDistanceMax: "",
        freeTakingGround: 2,
        freeTakingHand: 3,
        handPassing: 3,
        pickupToeLift: 3,
        highCatching: 3,
        tackling: 2,
        positionalSense: 3,
        tracking: 2,
        decisionMaking: 3,
        decisionSpeed: 3,
        ballHandling: 3,
        leftSide: 2,
        rightSide: 3,
      },
      U16: {
        // Proficient level
        soloing: 3,
        kickingLong: 3,
        kickingShort: 4,
        kickingDistanceMax: "",
        freeTakingGround: 3,
        freeTakingHand: 3,
        handPassing: 4,
        pickupToeLift: 3,
        highCatching: 3,
        tackling: 3,
        positionalSense: 3,
        tracking: 3,
        decisionMaking: 3,
        decisionSpeed: 3,
        ballHandling: 4,
        leftSide: 3,
        rightSide: 4,
      },
      U18: {
        // Near-senior competency
        soloing: 4,
        kickingLong: 3,
        kickingShort: 4,
        kickingDistanceMax: "",
        freeTakingGround: 3,
        freeTakingHand: 4,
        handPassing: 4,
        pickupToeLift: 4,
        highCatching: 4,
        tackling: 3,
        positionalSense: 4,
        tracking: 3,
        decisionMaking: 4,
        decisionSpeed: 4,
        ballHandling: 4,
        leftSide: 3,
        rightSide: 4,
      },
      Senior: {
        // Adult competency baseline
        soloing: 4,
        kickingLong: 4,
        kickingShort: 4,
        kickingDistanceMax: "",
        freeTakingGround: 3,
        freeTakingHand: 4,
        handPassing: 4,
        pickupToeLift: 4,
        highCatching: 4,
        tackling: 4,
        positionalSense: 4,
        tracking: 4,
        decisionMaking: 4,
        decisionSpeed: 4,
        ballHandling: 4,
        leftSide: 4,
        rightSide: 4,
      },
    };

    return skillsByAge[ageGroup] || skillsByAge["U12"]; // Default to U12 if not found
  };

  const parseCsvLine = (line: string): string[] => {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    const headers = parseCsvLine(lines[0]);

    // First pass: parse ALL rows and build parent lookup map
    const allRows = [];
    const parentsByEmail = new Map<string, any>();
    const parentsByPhone = new Map<string, any>();
    const parentsByAddress = new Map<string, any>();

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      // Map Foireann/GAA export columns to our format
      if (!row.FirstName && row.Forename) row.FirstName = row.Forename;
      if (!row.Surname && row.Surname) row.Surname = row.Surname;
      if (!row.DateOfBirth && row.DOB) row.DateOfBirth = row.DOB;
      if (!row.Gender && row.gender) row.Gender = row.gender;
      if (!row.MembershipType && row["Membership Type"])
        row.MembershipType = row["Membership Type"];
      if (!row.Email && row.email) row.Email = row.email;
      if (!row.Phone && row["Mobile Number"]) row.Phone = row["Mobile Number"];

      // Improved Address Handling
      // Concatenate Address1 + Address2 for complete street address
      const address1 = row.Address1?.trim() || "";
      const address2 = row.Address2?.trim() || "";
      const fullAddress = [address1, address2].filter(Boolean).join(" ");
      if (!row.Address && fullAddress) row.Address = fullAddress;

      // Clean and validate Town field
      const rawTown = row.Town?.trim() || "";
      const invalidTownWords = [
        "road",
        "street",
        "avenue",
        "drive",
        "lane",
        "park",
        "close",
        "way",
        "town",
      ];
      const isValidTown =
        rawTown && !invalidTownWords.includes(rawTown.toLowerCase());

      // Use Address2 as fallback if Town is invalid/empty and Address2 looks like a town
      const fallbackTown =
        !isValidTown && address2 && address2.length < 20 ? address2 : "";
      const cleanTown = isValidTown ? rawTown : fallbackTown;

      // Normalize town capitalization (title case)
      if (!row.Town && cleanTown) {
        row.Town =
          cleanTown.charAt(0).toUpperCase() + cleanTown.slice(1).toLowerCase();
      } else if (isValidTown) {
        row.Town =
          rawTown.charAt(0).toUpperCase() + rawTown.slice(1).toLowerCase();
      }

      // Clean postcode
      if (!row.Postcode && row.Postcode) {
        row.Postcode = row.Postcode.trim().toUpperCase();
      }

      if (!row.Player && row.IsPlayer) row.Player = row.IsPlayer;
      if (!row.Player && row["Playing Member"])
        row.Player = row["Playing Member"];

      allRows.push(row);

      // Build parent lookup maps for potential parent records
      // Include: ADULT, SOCIAL, or anyone NOT youth/juvenile (includes empty membership types)
      const memberType = row.MembershipType?.toUpperCase();
      const isYouth = memberType === "YOUTH" || memberType === "JUVENILE";

      // If not a youth member AND has a date of birth showing they're an adult (18+)
      if (!isYouth && row.DateOfBirth) {
        // Check if they're 18+ years old
        try {
          const age = calculateAge(row.DateOfBirth);
          if (age >= 18) {
            if (row.Email) {
              parentsByEmail.set(row.Email.toLowerCase().trim(), row);
            }
            if (row.Phone) {
              parentsByPhone.set(row.Phone.trim(), row);
            }
            if (row.Address && row.Postcode) {
              const addressKey = `${row.Address.toLowerCase().trim()}_${row.Postcode.toLowerCase().trim()}`;
              parentsByAddress.set(addressKey, row);
            }
          }
        } catch (e) {
          // If date parsing fails, skip this record
        }
      }
    }

    // Second pass: process youth members and senior players
    const members = [];
    for (const row of allRows) {
      const memberType = row.MembershipType?.toUpperCase();

      // Skip if no date of birth
      if (!row.DateOfBirth) {
        continue;
      }

      // Check if this is a youth member
      const isYouth = memberType === "YOUTH" || memberType === "JUVENILE";

      // Check if this is a senior player (check common field names for player flag)
      const playerVal = row.Player?.toUpperCase().trim();
      const isPlayerVal = row.IsPlayer?.toUpperCase().trim();
      const playingMemberVal = row["Playing Member"]?.toUpperCase().trim();

      const isPlayer =
        playerVal === "YES" ||
        playerVal === "Y" ||
        playerVal === "TRUE" ||
        isPlayerVal === "YES" ||
        isPlayerVal === "Y" ||
        isPlayerVal === "TRUE" ||
        playingMemberVal === "YES" ||
        playingMemberVal === "Y" ||
        playingMemberVal === "TRUE" ||
        memberType === "PLAYER" ||
        memberType === "PLAYING";

      // Skip non-youth, non-playing adults
      if (!(isYouth || isPlayer)) {
        continue;
      }

      // Apply import filter
      if (importFilter === "youth" && !isYouth) {
        // Skip non-youth when filter is youth-only
        continue;
      }
      if (importFilter === "senior" && isYouth) {
        // Skip youth when filter is senior-only
        continue;
      }

      // Parse date in various formats (MM/DD/YY, YYYY-MM-DD, DD/MM/YYYY)
      let dob = row.DateOfBirth;
      if (dob.includes("/")) {
        const parts = dob.split("/");
        if (parts[2]?.length === 2) {
          // Handle 2-digit year: 4/29/19 → 2019-04-29
          const year =
            Number.parseInt(parts[2]) < 50 ? `20${parts[2]}` : `19${parts[2]}`;
          dob = `${year}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
        } else if (parts[2]?.length === 4) {
          // Full year format
          dob = `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
        }
      }

      try {
        const age = calculateAge(dob);
        row.Age = age;
        row.AgeGroup = getAgeGroup(age);
        row.FullName = `${row.FirstName} ${row.Surname}`;
        row.Gender = row.Gender?.toUpperCase() || "MALE";

        // For youth members, try to match with parent records
        if (isYouth) {
          // Map contact fields for youth
          row.ParentEmail = row.Email || "";
          row.ParentPhone = row.Phone || "";

          // Try to find matching parent record
          let parentRecord = null;
          const childAddressKey =
            row.Address && row.Postcode
              ? `${row.Address.toLowerCase().trim()}_${row.Postcode.toLowerCase().trim()}`
              : null;

          // First try by email - but verify same address
          if (row.Email) {
            const candidate = parentsByEmail.get(
              row.Email.toLowerCase().trim()
            );
            if (candidate && childAddressKey) {
              const parentAddressKey =
                candidate.Address && candidate.Postcode
                  ? `${candidate.Address.toLowerCase().trim()}_${candidate.Postcode.toLowerCase().trim()}`
                  : null;
              if (parentAddressKey === childAddressKey) {
                parentRecord = candidate;
              }
            }
          }

          // Then try by phone - but verify same address
          if (!parentRecord && row.Phone) {
            const candidate = parentsByPhone.get(row.Phone.trim());
            if (candidate && childAddressKey) {
              const parentAddressKey =
                candidate.Address && candidate.Postcode
                  ? `${candidate.Address.toLowerCase().trim()}_${candidate.Postcode.toLowerCase().trim()}`
                  : null;
              if (parentAddressKey === childAddressKey) {
                parentRecord = candidate;
              }
            }
          }

          // Finally try by address alone
          if (!parentRecord && childAddressKey) {
            parentRecord = parentsByAddress.get(childAddressKey);
          }

          // If we found a parent record, use their name
          if (parentRecord) {
            row.ParentFirstName = parentRecord.FirstName || "";
            row.ParentSurname = parentRecord.Surname || "";
          } else {
            // Fallback: infer surname from child's surname
            row.ParentSurname = row.Surname || "";
          }
        } else {
          // For senior players, they are their own contact
          row.ParentEmail = row.Email || "";
          row.ParentPhone = row.Phone || "";
          row.ParentFirstName = "";
          row.ParentSurname = "";
        }

        members.push(row);
      } catch (error) {
        console.error("Error parsing member:", error);
      }
    }

    return members;
  };

  // Helper: Get team name by team ID
  const getTeamNameById = (teamId: string | undefined): string => {
    if (!teamId) return "No Team";
    const team = localTeams.find((t) => t._id === teamId);
    return team ? `${team.name} (${team.ageGroup} ${team.gender})` : teamId;
  };

  // Helper: Filter duplicates by search term
  const filteredDuplicates = duplicates.filter((dup) => {
    if (!duplicateSearch) return true;
    const search = duplicateSearch.toLowerCase();
    const memberName = dup.member.FullName?.toLowerCase() || "";
    const memberDOB = dup.member.DateOfBirth?.toLowerCase() || "";
    const existingName = dup.existingPlayer.name?.toLowerCase() || "";
    const teamName = getTeamNameById(dup.existingPlayer.teamId).toLowerCase();
    return (
      memberName.includes(search) ||
      memberDOB.includes(search) ||
      existingName.includes(search) ||
      teamName.includes(search)
    );
  });

  // Helper: Toggle all duplicates selection
  const toggleSelectAll = () => {
    if (selectedDuplicates.size === filteredDuplicates.length) {
      setSelectedDuplicates(new Set());
    } else {
      setSelectedDuplicates(
        new Set(filteredDuplicates.map((dup) => dup.index))
      );
    }
  };

  // Helper: Toggle individual duplicate selection
  const toggleDuplicateSelection = (index: number) => {
    const newSelected = new Set(selectedDuplicates);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedDuplicates(newSelected);
  };

  // Helper: Apply bulk decision to selected duplicates
  const applyBulkDecision = (decision: "replace" | "keep" | "skip") => {
    const newResolutions = { ...duplicateResolutions };
    selectedDuplicates.forEach((index) => {
      newResolutions[index] = decision;
    });
    setDuplicateResolutions(newResolutions);
    setSelectedDuplicates(new Set()); // Clear selection after applying
  };

  const checkForDuplicates = async (members: any[]) => {
    // Use existing players from Convex (passed as prop)
    // Find duplicates based on name + date of birth match
    const foundDuplicates: Array<{
      index: number;
      member: any;
      existingPlayer: IdentityPlayer;
    }> = [];

    members.forEach((member, index) => {
      const memberName = member.FullName.toLowerCase().trim();
      const memberDOB = member.DateOfBirth?.toLowerCase().trim();

      const duplicate = existingPlayers.find((player) => {
        const playerName = player.name.toLowerCase().trim();
        const playerDOB = player.dateOfBirth?.toLowerCase().trim();

        return playerName === memberName && playerDOB === memberDOB;
      });

      if (duplicate) {
        foundDuplicates.push({
          index,
          member,
          existingPlayer: duplicate,
        });
      }
    });

    return foundDuplicates;
  };

  const validateCSVColumns = (text: string) => {
    // Extract headers from CSV
    const lines = text.trim().split("\n");
    if (lines.length === 0) {
      return {
        requiredPresent: [],
        requiredMissing: [
          "Forename/FirstName",
          "Surname",
          "DOB/DateOfBirth",
          "gender",
          "Membership Type",
          "Address",
          "Postcode",
        ],
        optionalPresent: [],
        ignored: [],
        hasAllRequired: false,
      };
    }

    const headers = parseCsvLine(lines[0]);

    // Define required field mappings (what we need -> possible column names)
    const requiredFields = [
      {
        name: "First Name",
        variations: ["Forename", "FirstName", "First Name", "Given Name"],
      },
      {
        name: "Surname",
        variations: ["Surname", "LastName", "Last Name", "Family Name"],
      },
      {
        name: "Date of Birth",
        variations: ["DOB", "DateOfBirth", "Date of Birth", "Birth Date"],
      },
      { name: "Gender", variations: ["gender", "Gender", "Sex"] },
      {
        name: "Membership Type",
        variations: [
          "Membership Type",
          "MembershipType",
          "Member Type",
          "Type",
        ],
      },
      {
        name: "Address",
        variations: ["Address", "Address1", "Address 1", "Street Address"],
      },
      {
        name: "Postcode",
        variations: ["Postcode", "Post Code", "Postal Code", "Zip", "Zip Code"],
      },
    ];

    // Define optional fields we can use
    const optionalFields = [
      {
        name: "Email",
        variations: ["email", "Email", "Email Address", "E-mail"],
      },
      {
        name: "Phone",
        variations: [
          "Mobile Number",
          "Phone",
          "Mobile",
          "Phone Number",
          "Contact Number",
        ],
      },
      { name: "Town", variations: ["Town", "City"] },
      {
        name: "Player Flag",
        variations: ["Player", "IsPlayer", "Playing Member", "Is Player"],
      },
      {
        name: "Irish First Name",
        variations: ["Irish Forename", "Irish FirstName", "Ainm"],
      },
      { name: "Irish Surname", variations: ["Irish Surname", "Sloinne"] },
      { name: "County", variations: ["County", "Contae"] },
      { name: "Country", variations: ["Country", "Nation"] },
      {
        name: "Parental Consent",
        variations: ["Parental Consent", "Consent", "Parent Consent"],
      },
    ];

    // Check which required fields are present
    const requiredPresent: string[] = [];
    const requiredMissing: string[] = [];

    requiredFields.forEach((field) => {
      const found = field.variations.some((variation) =>
        headers.some(
          (h) => h.toLowerCase().trim() === variation.toLowerCase().trim()
        )
      );
      if (found) {
        requiredPresent.push(field.name);
      } else {
        requiredMissing.push(field.name);
      }
    });

    // Check which optional fields are present
    const optionalPresent: string[] = [];
    optionalFields.forEach((field) => {
      const found = field.variations.some((variation) =>
        headers.some(
          (h) => h.toLowerCase().trim() === variation.toLowerCase().trim()
        )
      );
      if (found) {
        optionalPresent.push(field.name);
      }
    });

    // Identify columns that will be ignored (not in required or optional)
    const allRecognizedVariations = [
      ...requiredFields.flatMap((f) => f.variations),
      ...optionalFields.flatMap((f) => f.variations),
    ].map((v) => v.toLowerCase().trim());

    const ignored = headers.filter(
      (h) => !allRecognizedVariations.includes(h.toLowerCase().trim())
    );

    return {
      requiredPresent,
      requiredMissing,
      optionalPresent,
      ignored,
      hasAllRequired: requiredMissing.length === 0,
    };
  };

  const analyzeAndAssignTeams = async () => {
    // First validate columns
    const analysis = validateCSVColumns(csvData);
    setColumnAnalysis(analysis);

    // If missing required fields, show error and don't proceed
    if (!analysis.hasAllRequired) {
      alert(
        `Missing required CSV columns:\n${analysis.requiredMissing.join("\n")}\n\nPlease add these columns to your CSV and try again.`
      );
      return;
    }

    const data = parseCSV(csvData);
    setParsedMembers(data);

    // Detect teams from the parsed data
    const detected = detectTeamsFromMembers(data);
    setDetectedTeams(detected);

    // Find teams that need to be created (no existing match)
    const missingTeams = detected.filter((t) => !t.existingTeamId);
    setTeamsToCreate(new Set(missingTeams.map((t) => getTeamKey(t))));

    // If there are missing teams, go to team creation step (1.5)
    // Otherwise, proceed with team assignments
    if (missingTeams.length > 0) {
      setStep(1.5);
    } else {
      // All teams exist, assign team IDs directly
      const assignments: Record<string, string> = {};
      data.forEach((member, idx) => {
        const normalizedGender =
          member.Gender?.toUpperCase() === "MALE"
            ? "Boys"
            : member.Gender?.toUpperCase() === "FEMALE"
              ? "Girls"
              : "Mixed";
        const teamId = getTeamIdByProperties(
          "GAA Football",
          member.AgeGroup,
          normalizedGender,
          "2025"
        );
        if (teamId) {
          assignments[idx] = teamId;
        }
      });
      setTeamAssignments(assignments);

      // Check for duplicates
      const foundDuplicates = await checkForDuplicates(data);
      setDuplicates(foundDuplicates);

      const defaultResolutions: Record<number, "replace" | "keep" | "skip"> =
        {};
      foundDuplicates.forEach((dup) => {
        defaultResolutions[dup.index] = "skip";
      });
      setDuplicateResolutions(defaultResolutions);

      // Go to duplicates step or review step
      setStep(foundDuplicates.length > 0 ? 2.5 : 2);
    }
  };

  // Create missing teams and proceed
  const handleCreateMissingTeams = async () => {
    setCreatingTeams(true);
    const teamsCreated: Team[] = [];
    const teamIdMap = new Map<string, string>(); // Track created team IDs by teamKey

    try {
      // ✅ FIX #1: Create teams and track IDs
      for (const team of detectedTeams) {
        const teamKey = getTeamKey(team);
        if (teamsToCreate.has(teamKey) && !team.existingTeamId) {
          // Create the team
          const teamId = await createTeamMutation({
            name: team.name,
            sport: team.sport,
            ageGroup: team.ageGroup,
            gender: team.gender,
            season: team.season,
          });

          // Track the created team ID
          teamIdMap.set(teamKey, teamId);

          // Add to local teams array
          teamsCreated.push({
            _id: teamId,
            name: team.name,
            organizationId: organizationId,
            createdAt: Date.now(),
            sport: team.sport,
            ageGroup: team.ageGroup,
            gender: team.gender,
            season: team.season,
            isActive: true,
          });

          console.log(`✅ Created team: ${team.name} (ID: ${teamId})`);
        }
      }

      // ✅ FIX #2: Update detectedTeams immutably with new team IDs
      const updatedDetectedTeams = detectedTeams.map((team) => {
        const teamKey = getTeamKey(team);
        const newTeamId = teamIdMap.get(teamKey);
        if (newTeamId) {
          return { ...team, existingTeamId: newTeamId };
        }
        return team;
      });

      // ✅ FIX #3: Update state with new immutable array
      const updatedLocalTeams = [...localTeams, ...teamsCreated];
      setLocalTeams(updatedLocalTeams);
      setDetectedTeams(updatedDetectedTeams);

      console.log(
        `📊 Team creation complete: ${teamsCreated.length} teams created`
      );
      console.log(`📊 Total teams available: ${updatedLocalTeams.length}`);

      // ✅ FIX #4: Assign teams using the updated localTeams
      const assignments: Record<string, string> = {};
      let successfulAssignments = 0;
      let failedAssignments = 0;

      parsedMembers.forEach((member, idx) => {
        const normalizedGender =
          member.Gender?.toUpperCase() === "MALE"
            ? "Boys"
            : member.Gender?.toUpperCase() === "FEMALE"
              ? "Girls"
              : "Mixed";

        // ✅ FIX #5: Use getTeamIdByProperties with updated localTeams
        // Note: This will work immediately because we have updatedLocalTeams in scope
        const teamId = updatedLocalTeams.find(
          (t) =>
            t.sport === "GAA Football" &&
            t.ageGroup === member.AgeGroup &&
            t.gender === normalizedGender &&
            t.season === "2025"
        )?._id;

        if (teamId) {
          assignments[idx] = teamId;
          successfulAssignments++;
        } else {
          console.warn(
            `⚠️ No team found for ${member.FullName} (${member.AgeGroup} ${normalizedGender})`
          );
          failedAssignments++;
        }
      });

      console.log(
        `📊 Team assignments: ${successfulAssignments} successful, ${failedAssignments} failed`
      );

      setTeamAssignments(assignments);

      // Check for duplicates
      const foundDuplicates = await checkForDuplicates(parsedMembers);
      setDuplicates(foundDuplicates);

      const defaultResolutions: Record<number, "replace" | "keep" | "skip"> =
        {};
      foundDuplicates.forEach((dup) => {
        defaultResolutions[dup.index] = "skip";
      });
      setDuplicateResolutions(defaultResolutions);

      // Go to duplicates step or review step
      setStep(foundDuplicates.length > 0 ? 2.5 : 2);
    } catch (error) {
      console.error("Error creating teams:", error);
      alert("Failed to create teams. Please try again.");
    } finally {
      setCreatingTeams(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvData(text);
      };
      reader.readAsText(file);
    }
  };

  const createPassports = async () => {
    setImporting(true);
    let skipped = 0;
    const familyMap = new Map<string, string>();

    console.log("🔄 Phase 1: Processing duplicates...");

    // Phase 1: Count skipped players based on duplicate resolutions
    for (let i = 0; i < parsedMembers.length; i++) {
      const resolution = duplicateResolutions[i];
      if (resolution === "skip" || resolution === "keep") {
        skipped++;
      }
    }

    console.log("📋 Phase 2: Preparing player data for identity system...");

    // Phase 2: Prepare player data for the NEW identity system
    const playersToImport: Array<IdentityImportPlayer & { teamId: string }> =
      [];

    for (let i = 0; i < parsedMembers.length; i++) {
      const resolution = duplicateResolutions[i];

      // Skip if user chose to skip or keep
      if (resolution === "skip" || resolution === "keep") {
        continue;
      }

      const member = parsedMembers[i];

      const assignedTeamId = teamAssignments[i];
      if (!assignedTeamId) {
        console.error(
          `❌ No team assigned for ${member.FullName} (${member.AgeGroup} ${member.Gender})`
        );
        console.error(
          `   This player will be skipped. Please ensure teams exist for all age groups.`
        );
        skipped++;
        continue;
      }

      // Parse name into first and last
      const nameParts = member.FullName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || nameParts[0] || "";

      // Convert gender to identity system format
      const genderRaw = member.Gender?.toUpperCase();
      const gender: "male" | "female" | "other" =
        genderRaw === "MALE"
          ? "male"
          : genderRaw === "FEMALE"
            ? "female"
            : "other";

      // Build the identity import data
      playersToImport.push({
        firstName,
        lastName,
        dateOfBirth: member.DateOfBirth || "",
        gender,
        ageGroup: member.AgeGroup,
        season: "2025",
        address: member.Address || undefined,
        town: member.Town || undefined,
        postcode: member.Postcode || undefined,
        country: "Ireland",
        parentFirstName: member.ParentFirstName || undefined,
        parentLastName: member.ParentSurname || undefined,
        parentEmail: member.ParentEmail?.toLowerCase().trim() || undefined,
        parentPhone: member.ParentPhone || undefined,
        parentRelationship: "guardian" as const,
        teamId: assignedTeamId,
      });
    }

    console.log(
      `📦 Prepared ${playersToImport.length} players for identity import`
    );

    // Phase 3: Import identities, guardians, and enrollments
    console.log(
      `🚀 Phase 3: Importing ${playersToImport.length} player identities...`
    );

    try {
      // Step 1: Batch import player identities, guardians, enrollments, AND sport passports
      console.log("   (passports will be auto-created during enrollment)");
      const importResult = await batchImportWithIdentity({
        organizationId: organizationId,
        sportCode: "gaa_football", // Auto-create passports during enrollment
        players: playersToImport.map((p) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: p.dateOfBirth,
          gender: p.gender,
          ageGroup: p.ageGroup,
          season: p.season,
          address: p.address,
          town: p.town,
          postcode: p.postcode,
          country: p.country,
          parentFirstName: p.parentFirstName,
          parentLastName: p.parentLastName,
          parentEmail: p.parentEmail,
          parentPhone: p.parentPhone,
          parentRelationship: p.parentRelationship,
        })),
      });

      console.log(
        `✅ Identity import complete! Created ${importResult.playersCreated} players, reused ${importResult.playersReused}`
      );
      console.log(
        `   Guardians: ${importResult.guardiansCreated} created, ${importResult.guardiansReused} reused`
      );
      console.log(
        `   Enrollments: ${importResult.enrollmentsCreated} created, ${importResult.enrollmentsReused} reused`
      );

      if (importResult.errors.length > 0) {
        console.warn("⚠️ Import errors:", importResult.errors);
      }

      // Step 2: Add players to teams (grouped by teamId)
      console.log("📋 Phase 4: Team assignments...");

      // Group players by team using the returned playerIdentities and original playersToImport
      const playersByTeam = new Map<string, Id<"playerIdentities">[]>();

      for (const identity of importResult.playerIdentities) {
        const originalPlayer = playersToImport[identity.index];
        if (originalPlayer?.teamId) {
          const teamPlayers = playersByTeam.get(originalPlayer.teamId) || [];
          teamPlayers.push(identity.playerIdentityId);
          playersByTeam.set(originalPlayer.teamId, teamPlayers);
        }
      }

      // Add players to each team (PARALLEL)
      let totalTeamAssignments = 0;

      console.log(
        `   Assigning players to ${playersByTeam.size} teams in parallel...`
      );

      const teamAssignmentPromises = Array.from(playersByTeam.entries()).map(
        async ([teamId, playerIds]) => {
          try {
            const teamResult = await bulkAddToTeam(teamId, playerIds);
            console.log(
              `   Team ${getTeamNameById(teamId)}: ${teamResult.added} added, ${teamResult.skipped} already on team`
            );
            return { success: true, added: teamResult.added };
          } catch (error) {
            console.error(
              `   ❌ Failed to add players to team ${getTeamNameById(teamId)}:`,
              error
            );
            return { success: false, added: 0 };
          }
        }
      );

      const teamResults = await Promise.all(teamAssignmentPromises);
      totalTeamAssignments = teamResults.reduce((sum, r) => sum + r.added, 0);

      console.log(
        `✅ Team assignments complete! ${totalTeamAssignments} players assigned to ${playersByTeam.size} teams`
      );

      // Sport passports were auto-created during enrollment (Phase 3)
      console.log("✅ Sport passports were auto-created during enrollment!");

      // Log audit
      const filterDesc =
        importFilter === "all"
          ? "all players"
          : importFilter === "youth"
            ? "youth players only"
            : "senior players only";

      console.log("[AUDIT] IDENTITY_IMPORT", {
        message: `Imported ${importResult.playersCreated} player identities from GAA membership database (${filterDesc})`,
        user: "Admin",
        playersCreated: importResult.playersCreated,
        playersReused: importResult.playersReused,
        guardiansCreated: importResult.guardiansCreated,
        enrollmentsCreated: importResult.enrollmentsCreated,
        teamAssignments: totalTeamAssignments,
        passportsCreated: importResult.enrollmentsCreated, // Auto-created during enrollment
        familyCount: familyMap.size,
        fileName: "membership_import.csv",
        metadata: {
          importSource: "GAA Membership Wizard - Identity Import",
          importFilter,
          organizationId,
        },
        priority: "high",
      });

      console.log(
        `🎉 Import complete! Players: ${importResult.playersCreated} created, ${importResult.playersReused} reused | Teams: ${totalTeamAssignments} assigned | Passports: ${importResult.enrollmentsCreated} auto-created | Skipped: ${skipped}`
      );

      // ✅ FIX #6: Warn user if players were skipped due to missing teams
      if (skipped > 0) {
        const playersWithoutTeams = parsedMembers.filter(
          (_, idx) => !teamAssignments[idx]
        );
        const missingTeamInfo = playersWithoutTeams
          .map((m) => `${m.AgeGroup} ${m.Gender}`)
          .filter((v, i, a) => a.indexOf(v) === i) // unique
          .join(", ");

        console.warn(
          `⚠️ WARNING: ${skipped} players were skipped due to missing team assignments`
        );
        console.warn(`   Missing teams for: ${missingTeamInfo}`);

        alert(
          `⚠️ Import completed with warnings:\n\n` +
            `${skipped} player(s) were skipped because no teams exist for:\n${missingTeamInfo}\n\n` +
            `Please create teams for these age groups and re-import these players.`
        );
      }

      setResults({
        created: importResult.playersCreated,
        families: familyMap.size,
        skipped,
        replaced: importResult.playersReused,
        teamsCreated: playersByTeam.size,
      });
    } catch (error) {
      console.error("❌ Identity import failed:", error);
      alert(
        `Import failed: ${error instanceof Error ? error.message : "Unknown error"}. Please check console for details.`
      );
      setResults({
        created: 0,
        families: familyMap.size,
        skipped,
        replaced: 0,
      });
    }

    setImporting(false);
    setStep(3);
    await onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white shadow-2xl"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="sticky top-0 z-10 border-gray-200 border-b bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="flex items-center gap-2 font-bold text-gray-800 text-lg sm:text-2xl">
                <Users className="text-green-600" size={24} />
                GAA Membership Onboarding Wizard
              </h2>
              <p className="mt-1 text-gray-600 text-xs sm:text-sm">
                Intelligent bulk import from membership database
              </p>
            </div>
            <button
              className="-mr-2 flex-shrink-0 p-2 text-gray-500 hover:text-gray-700"
              onClick={onClose}
            >
              <X size={24} />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mt-4 flex items-center justify-between text-xs sm:text-sm">
            <div
              className={`flex items-center gap-2 ${step >= 1 ? "font-bold text-green-600" : "text-gray-400"}`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 1 ? "bg-green-600 text-white" : "bg-gray-300"}`}
              >
                1
              </div>
              <span className="hidden sm:inline">Upload Data</span>
            </div>
            <div className="mx-2 h-1 flex-1 bg-gray-300">
              <div
                className={`h-full ${step >= 2 ? "bg-green-600" : "bg-gray-300"}`}
                style={{
                  width: step >= 2 ? "100%" : "0%",
                  transition: "width 0.3s",
                }}
              />
            </div>
            <div
              className={`flex items-center gap-2 ${step >= 2 ? "font-bold text-green-600" : "text-gray-400"}`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 2 ? "bg-green-600 text-white" : "bg-gray-300"}`}
              >
                2
              </div>
              <span className="hidden sm:inline">Review & Assign</span>
            </div>
            <div className="mx-2 h-1 flex-1 bg-gray-300">
              <div
                className={`h-full ${step >= 3 ? "bg-green-600" : "bg-gray-300"}`}
                style={{
                  width: step >= 3 ? "100%" : "0%",
                  transition: "width 0.3s",
                }}
              />
            </div>
            <div
              className={`flex items-center gap-2 ${step >= 3 ? "font-bold text-green-600" : "text-gray-400"}`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 3 ? "bg-green-600 text-white" : "bg-gray-300"}`}
              >
                3
              </div>
              <span className="hidden sm:inline">Complete</span>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {/* Step 1: Upload */}
          {step === 1 && (
            <>
              <div className="mb-4 rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-blue-50 p-4">
                <h3 className="mb-2 flex items-center gap-2 font-bold text-gray-800">
                  <FileText className="text-green-600" size={20} />
                  How It Works
                </h3>
                <ul className="ml-6 list-disc space-y-1 text-gray-700 text-sm">
                  <li>
                    Upload your GAA club membership CSV file (Foireann exports
                    supported)
                  </li>
                  <li>
                    We'll automatically detect ages and assign age groups
                    (U8-U18, Senior)
                  </li>
                  <li>
                    Family relationships are inferred from surnames and
                    addresses
                  </li>
                  <li>Teams are auto-created based on age and gender</li>
                  <li>Youth and/or Senior playing members can be imported</li>
                  <li>
                    Player passports are bulk-created with contact information
                  </li>
                </ul>
              </div>

              {/* Required Fields Guide */}
              <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
                <h3 className="mb-2 flex items-center gap-2 font-bold text-gray-800">
                  <AlertCircle className="text-orange-600" size={20} />
                  Required CSV Fields
                </h3>
                <p className="mb-3 text-gray-600 text-sm">
                  Your CSV must contain these columns (header names are
                  flexible):
                </p>
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  <div className="rounded border border-orange-200 bg-white p-3">
                    <h4 className="mb-2 font-bold text-orange-800">
                      Essential Fields
                    </h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>
                        • <strong>Forename</strong> or FirstName
                      </li>
                      <li>
                        • <strong>Surname</strong>
                      </li>
                      <li>
                        • <strong>DOB</strong> or DateOfBirth
                      </li>
                      <li>
                        • <strong>gender</strong>
                      </li>
                      <li>
                        • <strong>Membership Type</strong>{" "}
                        (YOUTH/JUVENILE/ADULT)
                      </li>
                    </ul>
                  </div>
                  <div className="rounded border border-green-200 bg-white p-3">
                    <h4 className="mb-2 font-bold text-green-800">
                      Recommended Fields
                    </h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>
                        • <strong>email</strong> (for parent contact)
                      </li>
                      <li>
                        • <strong>Mobile Number</strong> or Phone
                      </li>
                      <li>
                        • <strong>Address1, Town, Postcode</strong> (family
                        grouping)
                      </li>
                      <li>
                        • <strong>Player</strong> (Y/N for senior players)
                      </li>
                    </ul>
                  </div>
                </div>
                <p className="mt-3 text-gray-600 text-xs">
                  💡 <strong>Tip:</strong> Export directly from Foireann for
                  best compatibility. All standard Foireann fields are
                  supported.
                </p>
              </div>

              {/* Import Filter Selection */}
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h3 className="mb-3 font-bold text-gray-800">Import Filter</h3>
                <p className="mb-4 text-gray-600 text-sm">
                  Choose which player types to import from the membership file
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <button
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      importFilter === "all"
                        ? "border-green-600 bg-green-50"
                        : "border-gray-300 bg-white hover:border-green-400"
                    }`}
                    onClick={() => setImportFilter("all")}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-bold text-gray-800">
                        All Players
                      </span>
                      {importFilter === "all" && (
                        <CheckCircle className="text-green-600" size={18} />
                      )}
                    </div>
                    <p className="text-gray-600 text-xs">
                      Import both youth and senior players
                    </p>
                  </button>

                  <button
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      importFilter === "youth"
                        ? "border-green-600 bg-green-50"
                        : "border-gray-300 bg-white hover:border-green-400"
                    }`}
                    onClick={() => setImportFilter("youth")}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-bold text-gray-800">
                        Youth Only
                      </span>
                      {importFilter === "youth" && (
                        <CheckCircle className="text-green-600" size={18} />
                      )}
                    </div>
                    <p className="text-gray-600 text-xs">
                      Under 18 (U8-U18 age groups)
                    </p>
                  </button>

                  <button
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      importFilter === "senior"
                        ? "border-green-600 bg-green-50"
                        : "border-gray-300 bg-white hover:border-green-400"
                    }`}
                    onClick={() => setImportFilter("senior")}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-bold text-gray-800">
                        Senior Only
                      </span>
                      {importFilter === "senior" && (
                        <CheckCircle className="text-green-600" size={18} />
                      )}
                    </div>
                    <p className="text-gray-600 text-xs">
                      Adult players (18+) marked as playing members
                    </p>
                  </button>
                </div>
              </div>

              <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-white transition-colors hover:bg-blue-700"
                  onClick={downloadMembershipTemplate}
                >
                  <Download size={18} />
                  Download Example Template
                </button>
                <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-white transition-colors hover:bg-green-700">
                  <Upload size={18} />
                  Upload Membership CSV
                  <input
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileUpload}
                    type="file"
                  />
                </label>
              </div>

              {csvData && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="text-green-800 text-sm">
                    ✓ File loaded ({csvData.split("\n").length - 1} rows)
                  </p>
                </div>
              )}

              {/* Column Analysis - Show after file is loaded */}
              {csvData && columnAnalysis && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-800">
                    <CheckCircle className="text-blue-600" size={20} />
                    CSV Column Analysis
                  </h3>

                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    {/* Required Fields */}
                    <div className="rounded border border-green-300 bg-white p-3">
                      <h4 className="mb-2 font-bold text-green-800">
                        ✓ Required Fields Found
                      </h4>
                      <ul className="space-y-1 text-gray-700">
                        {columnAnalysis.requiredPresent.map((field, idx) => (
                          <li className="flex items-center gap-2" key={idx}>
                            <CheckCircle className="text-green-600" size={14} />
                            {field}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Optional Fields */}
                    <div className="rounded border border-blue-300 bg-white p-3">
                      <h4 className="mb-2 font-bold text-blue-800">
                        + Optional Fields Found
                      </h4>
                      {columnAnalysis.optionalPresent.length > 0 ? (
                        <ul className="space-y-1 text-gray-700">
                          {columnAnalysis.optionalPresent.map((field, idx) => (
                            <li className="flex items-center gap-2" key={idx}>
                              <CheckCircle
                                className="text-blue-600"
                                size={14}
                              />
                              {field}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 text-sm">
                          No optional fields detected
                        </p>
                      )}
                    </div>

                    {/* Missing Required Fields */}
                    {columnAnalysis.requiredMissing.length > 0 && (
                      <div className="rounded border border-red-300 bg-white p-3 md:col-span-2">
                        <h4 className="mb-2 flex items-center gap-2 font-bold text-red-800">
                          <AlertCircle className="text-red-600" size={16} />
                          Missing Required Fields
                        </h4>
                        <ul className="space-y-1 text-gray-700">
                          {columnAnalysis.requiredMissing.map((field, idx) => (
                            <li className="flex items-center gap-2" key={idx}>
                              <XCircle className="text-red-600" size={14} />
                              {field}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-red-700 text-xs">
                          ⚠️ Import will not proceed until these fields are added
                          to your CSV.
                        </p>
                      </div>
                    )}

                    {/* Ignored Columns */}
                    {columnAnalysis.ignored.length > 0 && (
                      <div className="rounded border border-gray-300 bg-white p-3 md:col-span-2">
                        <h4 className="mb-2 font-bold text-gray-800">
                          ℹ️ Columns to be Ignored
                        </h4>
                        <p className="mb-2 text-gray-600 text-xs">
                          These columns are present in your CSV but will not be
                          used during import:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {columnAnalysis.ignored.map((col, idx) => (
                            <span
                              className="rounded border border-gray-300 bg-gray-100 px-2 py-1 text-gray-700 text-xs"
                              key={idx}
                            >
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs focus:border-transparent focus:ring-2 focus:ring-green-500"
                onChange={(e) => setCsvData(e.target.value)}
                placeholder="Or paste membership CSV data here..."
                rows={12}
                value={csvData}
              />

              <div className="mt-4 flex gap-3">
                <button
                  className="flex-1 rounded-lg bg-gray-600 px-4 py-3 text-white transition-colors hover:bg-gray-700"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!csvData.trim()}
                  onClick={analyzeAndAssignTeams}
                >
                  Analyze & Continue
                  <ChevronRight size={18} />
                </button>
              </div>
            </>
          )}

          {/* Step 1.5: Create Missing Teams */}
          {step === 1.5 && (
            <>
              <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
                <h3 className="mb-2 flex items-center gap-2 font-bold text-gray-800">
                  <Users className="text-purple-600" size={20} />
                  Teams Required for Import
                </h3>
                <p className="text-gray-600 text-sm">
                  The following teams are needed to import players. Teams that
                  already exist are marked with a checkmark. Select which
                  missing teams to create.
                </p>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                  <p className="text-gray-600">Total Teams</p>
                  <p className="font-bold text-2xl text-green-700">
                    {detectedTeams.length}
                  </p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
                  <p className="text-gray-600">Existing</p>
                  <p className="font-bold text-2xl text-blue-700">
                    {detectedTeams.filter((t) => t.existingTeamId).length}
                  </p>
                </div>
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-center">
                  <p className="text-gray-600">To Create</p>
                  <p className="font-bold text-2xl text-orange-700">
                    {detectedTeams.filter((t) => !t.existingTeamId).length}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
                  <p className="text-gray-600">Total Players</p>
                  <p className="font-bold text-2xl text-gray-700">
                    {parsedMembers.length}
                  </p>
                </div>
              </div>

              <div className="mb-4 max-h-96 space-y-2 overflow-y-auto">
                {detectedTeams.map((team, idx) => {
                  const teamKey = getTeamKey(team);
                  const isExisting = !!team.existingTeamId;
                  const isSelected = teamsToCreate.has(teamKey);

                  return (
                    <div
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        isExisting
                          ? "border-green-300 bg-green-50"
                          : isSelected
                            ? "border-purple-300 bg-purple-50"
                            : "border-gray-300 bg-white"
                      }`}
                      key={idx}
                    >
                      <div className="flex items-center gap-3">
                        {!isExisting && (
                          <input
                            checked={isSelected}
                            className="h-4 w-4 rounded border-gray-300"
                            disabled={isExisting}
                            onChange={() => {
                              const newSet = new Set(teamsToCreate);
                              if (newSet.has(teamKey)) {
                                newSet.delete(teamKey);
                              } else {
                                newSet.add(teamKey);
                              }
                              setTeamsToCreate(newSet);
                            }}
                            type="checkbox"
                          />
                        )}
                        {isExisting && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                        <div>
                          <p className="font-medium text-gray-800">
                            {team.name}
                          </p>
                          <p className="text-gray-600 text-xs">
                            {team.sport} • {team.ageGroup} • {team.gender} •{" "}
                            {team.season}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800">
                          {team.playerCount}
                        </p>
                        <p className="text-gray-500 text-xs">players</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {detectedTeams.filter((t) => !t.existingTeamId).length > 0 && (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <span className="text-gray-700 text-sm">
                    Select all missing teams
                  </span>
                  <button
                    className="rounded bg-blue-600 px-3 py-1 text-white text-xs hover:bg-blue-700"
                    onClick={() => {
                      const allMissing = detectedTeams
                        .filter((t) => !t.existingTeamId)
                        .map((t) => getTeamKey(t));
                      setTeamsToCreate(new Set(allMissing));
                    }}
                  >
                    Select All
                  </button>
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-600 px-4 py-3 text-white transition-colors hover:bg-gray-700"
                  onClick={() => setStep(1)}
                >
                  <ChevronRight className="rotate-180" size={18} />
                  Back
                </button>
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    creatingTeams ||
                    (detectedTeams.some((t) => !t.existingTeamId) &&
                      teamsToCreate.size === 0)
                  }
                  onClick={handleCreateMissingTeams}
                >
                  {creatingTeams ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-white border-b-2" />
                      Creating Teams...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      {teamsToCreate.size > 0
                        ? `Create ${teamsToCreate.size} Team${teamsToCreate.size !== 1 ? "s" : ""} & Continue`
                        : "Continue"}
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* Step 2.5: Resolve Duplicates */}
          {step === 2.5 && (
            <>
              <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
                <h3 className="mb-2 flex items-center gap-2 font-bold text-gray-800">
                  <AlertCircle className="text-yellow-600" size={20} />
                  Duplicate Players Detected
                </h3>
                <p className="text-gray-600 text-sm">
                  {duplicates.length} player{duplicates.length > 1 ? "s" : ""}{" "}
                  in the import file match existing players in the system.
                  Please choose how to handle each duplicate.
                </p>
              </div>

              {/* Search and Bulk Actions */}
              <div className="mb-4 space-y-3">
                {/* Search Box */}
                <div className="relative">
                  <input
                    className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 focus:border-blue-500 focus:outline-none"
                    onChange={(e) => setDuplicateSearch(e.target.value)}
                    placeholder="Search duplicates by name, DOB, or team..."
                    type="text"
                    value={duplicateSearch}
                  />
                  <svg
                    className="-translate-y-1/2 absolute top-1/2 left-3 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>

                {/* Select All and Bulk Actions */}
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-gray-700 text-sm">
                    <input
                      checked={
                        filteredDuplicates.length > 0 &&
                        selectedDuplicates.size === filteredDuplicates.length
                      }
                      className="h-4 w-4 rounded border-gray-300"
                      onChange={toggleSelectAll}
                      type="checkbox"
                    />
                    Select All ({selectedDuplicates.size} selected)
                  </label>

                  {selectedDuplicates.size > 0 && (
                    <div className="flex gap-2">
                      <button
                        className="rounded bg-green-600 px-3 py-1 text-white text-xs hover:bg-green-700"
                        onClick={() => applyBulkDecision("replace")}
                      >
                        Replace All Selected
                      </button>
                      <button
                        className="rounded bg-blue-600 px-3 py-1 text-white text-xs hover:bg-blue-700"
                        onClick={() => applyBulkDecision("keep")}
                      >
                        Keep All Selected
                      </button>
                      <button
                        className="rounded bg-gray-600 px-3 py-1 text-white text-xs hover:bg-gray-700"
                        onClick={() => applyBulkDecision("skip")}
                      >
                        Skip All Selected
                      </button>
                    </div>
                  )}
                </div>

                {filteredDuplicates.length < duplicates.length && (
                  <p className="text-gray-600 text-sm">
                    Showing {filteredDuplicates.length} of {duplicates.length}{" "}
                    duplicates
                  </p>
                )}
              </div>

              <div className="max-h-96 space-y-4 overflow-y-auto">
                {filteredDuplicates.map((dup, idx) => (
                  <div
                    className={`rounded-lg border p-4 ${
                      selectedDuplicates.has(dup.index)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 bg-white"
                    }`}
                    key={idx}
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <input
                        checked={selectedDuplicates.has(dup.index)}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                        onChange={() => toggleDuplicateSelection(dup.index)}
                        type="checkbox"
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">
                          {dup.member.FullName}
                        </h4>
                        <p className="text-gray-600 text-sm">
                          DOB: {dup.member.DateOfBirth} • Team:{" "}
                          {getTeamNameById(teamAssignments[dup.index])}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded border border-blue-200 bg-blue-50 p-3">
                        <h5 className="mb-2 font-semibold text-blue-800 text-sm">
                          Existing Player
                        </h5>
                        <div className="space-y-1 text-gray-700 text-xs">
                          <p>
                            <strong>Team:</strong>{" "}
                            {getTeamNameById(dup.existingPlayer.teamId)}
                          </p>
                          <p>
                            <strong>Season:</strong> {dup.existingPlayer.season}
                          </p>
                          <p>
                            <strong>Last Review:</strong>{" "}
                            {dup.existingPlayer.lastReviewDate || "Never"}
                          </p>
                          <p>
                            <strong>Parent:</strong>{" "}
                            {dup.existingPlayer.parentFirstName
                              ? `${dup.existingPlayer.parentFirstName} ${dup.existingPlayer.parentSurname}`
                              : dup.existingPlayer.parentSurname || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="rounded border border-green-200 bg-green-50 p-3">
                        <h5 className="mb-2 font-semibold text-green-800 text-sm">
                          Imported Data
                        </h5>
                        <div className="space-y-1 text-gray-700 text-xs">
                          <p>
                            <strong>Team:</strong>{" "}
                            {getTeamNameById(teamAssignments[dup.index])}
                          </p>
                          <p>
                            <strong>Season:</strong> 2025
                          </p>
                          <p>
                            <strong>Last Review:</strong> N/A (New Import)
                          </p>
                          <p>
                            <strong>Parent:</strong>{" "}
                            {dup.member.ParentFirstName
                              ? `${dup.member.ParentFirstName} ${dup.member.ParentSurname}`
                              : dup.member.ParentSurname || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        className={`flex-1 rounded-lg border-2 px-4 py-2 font-medium text-sm transition-all ${
                          duplicateResolutions[dup.index] === "keep"
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-gray-300 bg-white text-gray-700 hover:border-blue-400"
                        }`}
                        onClick={() =>
                          setDuplicateResolutions({
                            ...duplicateResolutions,
                            [dup.index]: "keep",
                          })
                        }
                      >
                        Keep Existing
                      </button>
                      <button
                        className={`flex-1 rounded-lg border-2 px-4 py-2 font-medium text-sm transition-all ${
                          duplicateResolutions[dup.index] === "replace"
                            ? "border-green-600 bg-green-50 text-green-700"
                            : "border-gray-300 bg-white text-gray-700 hover:border-green-400"
                        }`}
                        onClick={() =>
                          setDuplicateResolutions({
                            ...duplicateResolutions,
                            [dup.index]: "replace",
                          })
                        }
                      >
                        Replace with Import
                      </button>
                      <button
                        className={`flex-1 rounded-lg border-2 px-4 py-2 font-medium text-sm transition-all ${
                          duplicateResolutions[dup.index] === "skip"
                            ? "border-red-600 bg-red-50 text-red-700"
                            : "border-gray-300 bg-white text-gray-700 hover:border-red-400"
                        }`}
                        onClick={() =>
                          setDuplicateResolutions({
                            ...duplicateResolutions,
                            [dup.index]: "skip",
                          })
                        }
                      >
                        Skip (Don't Import)
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  className="rounded-lg bg-gray-200 px-6 py-3 text-gray-700 transition-colors hover:bg-gray-300"
                  onClick={() => setStep(1)}
                >
                  Back
                </button>
                <button
                  className="flex-1 rounded-lg bg-green-600 px-6 py-3 font-bold text-white transition-colors hover:bg-green-700"
                  onClick={() => setStep(2)}
                >
                  Continue to Review
                </button>
              </div>
            </>
          )}

          {/* Step 2: Review */}
          {step === 2 && !importing && (
            <>
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
                <h3 className="mb-2 font-bold text-gray-800">
                  Analysis Complete
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div>
                    <p className="text-gray-600">
                      {importFilter === "youth"
                        ? "Youth Members"
                        : importFilter === "senior"
                          ? "Senior Players"
                          : "Players"}
                    </p>
                    <p className="font-bold text-2xl text-green-700">
                      {parsedMembers.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Families Detected</p>
                    <p className="font-bold text-2xl text-blue-700">
                      {new Set(parsedMembers.map((m) => m.Surname)).size}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Teams Created</p>
                    <p className="font-bold text-2xl text-purple-700">
                      {new Set(Object.values(teamAssignments)).size}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Age Range</p>
                    <p className="font-bold text-2xl text-orange-700">
                      {Math.min(...parsedMembers.map((m) => m.Age))}-
                      {Math.max(...parsedMembers.map((m) => m.Age))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Skill Rating Strategy Selector */}
              <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h3 className="mb-3 font-bold text-gray-800">
                  Initial Skill Ratings
                </h3>
                <p className="mb-4 text-gray-600 text-sm">
                  Choose how to set skill ratings for imported players. Coaches
                  can adjust individual ratings after import.
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <button
                    className={`rounded-lg border-2 p-4 text-left transition-all ${
                      skillRatingStrategy === "age-appropriate"
                        ? "border-green-600 bg-green-50"
                        : "border-gray-300 bg-white hover:border-green-400"
                    }`}
                    onClick={() => setSkillRatingStrategy("age-appropriate")}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-bold text-gray-800">
                        Age-Appropriate
                      </span>
                      {skillRatingStrategy === "age-appropriate" && (
                        <CheckCircle className="text-green-600" size={20} />
                      )}
                    </div>
                    <p className="text-gray-600 text-xs">
                      Based on GAA development standards. U8s start at 1-2, U12s
                      at 2-3, U16s at 3-4, etc.
                    </p>
                    <div className="mt-2 rounded bg-white px-2 py-1 text-gray-700 text-xs">
                      <strong>Recommended</strong> - Realistic baseline
                    </div>
                  </button>

                  <button
                    className={`rounded-lg border-2 p-4 text-left transition-all ${
                      skillRatingStrategy === "middle"
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-300 bg-white hover:border-blue-400"
                    }`}
                    onClick={() => setSkillRatingStrategy("middle")}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-bold text-gray-800">
                        Middle (All 3s)
                      </span>
                      {skillRatingStrategy === "middle" && (
                        <CheckCircle className="text-blue-600" size={20} />
                      )}
                    </div>
                    <p className="text-gray-600 text-xs">
                      Set all skills to rating 3 (Competent). Neutral starting
                      point for all ages.
                    </p>
                    <div className="mt-2 rounded bg-white px-2 py-1 text-gray-700 text-xs">
                      Quick baseline assessment
                    </div>
                  </button>

                  <button
                    className={`rounded-lg border-2 p-4 text-left transition-all ${
                      skillRatingStrategy === "blank"
                        ? "border-orange-600 bg-orange-50"
                        : "border-gray-300 bg-white hover:border-orange-400"
                    }`}
                    onClick={() => setSkillRatingStrategy("blank")}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-bold text-gray-800">
                        Blank (All 1s)
                      </span>
                      {skillRatingStrategy === "blank" && (
                        <CheckCircle className="text-orange-600" size={20} />
                      )}
                    </div>
                    <p className="text-gray-600 text-xs">
                      Start with no ratings. Coach assesses each skill
                      individually from scratch.
                    </p>
                    <div className="mt-2 rounded bg-white px-2 py-1 text-gray-700 text-xs">
                      Manual assessment required
                    </div>
                  </button>
                </div>
              </div>

              {/* Filter controls */}
              <div className="mb-3 flex gap-3">
                <select
                  className="rounded border border-gray-300 px-3 py-2 text-xs"
                  onChange={(e) => setMemberFilterAge(e.target.value)}
                  value={memberFilterAge}
                >
                  <option value="all">All Ages</option>
                  {Array.from(new Set(parsedMembers.map((m) => m.AgeGroup)))
                    .sort()
                    .map((ag) => (
                      <option key={ag} value={ag}>
                        {ag}
                      </option>
                    ))}
                </select>
                <select
                  className="rounded border border-gray-300 px-3 py-2 text-xs"
                  onChange={(e) => setMemberFilterGender(e.target.value)}
                  value={memberFilterGender}
                >
                  <option value="all">All Genders</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
                <div className="flex flex-1 items-center text-gray-600 text-xs">
                  Showing{" "}
                  {
                    parsedMembers.filter(
                      (m) =>
                        (memberFilterAge === "all" ||
                          m.AgeGroup === memberFilterAge) &&
                        (memberFilterGender === "all" ||
                          m.Gender === memberFilterGender)
                    ).length
                  }{" "}
                  of {parsedMembers.length} members
                </div>
              </div>

              {/* Team Assignment Help */}
              <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-start gap-2">
                  <Info
                    className="mt-0.5 flex-shrink-0 text-blue-600"
                    size={16}
                  />
                  <div className="text-gray-700 text-xs">
                    <strong>Team Assignment:</strong> Click the dropdown to
                    select an existing team, or simply type a new team name to
                    create it. You can edit any team name directly in the field.
                  </div>
                </div>
              </div>

              <div className="mb-4 max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-200">
                    <tr>
                      <th
                        className="cursor-pointer select-none p-2 text-left hover:bg-gray-300"
                        onClick={() =>
                          setMemberSort({
                            field: "name",
                            direction:
                              memberSort.field === "name" &&
                              memberSort.direction === "asc"
                                ? "desc"
                                : "asc",
                          })
                        }
                      >
                        Name{" "}
                        {memberSort.field === "name" &&
                          (memberSort.direction === "asc" ? "▲" : "▼")}
                      </th>
                      <th
                        className="cursor-pointer select-none p-2 text-left hover:bg-gray-300"
                        onClick={() =>
                          setMemberSort({
                            field: "age",
                            direction:
                              memberSort.field === "age" &&
                              memberSort.direction === "asc"
                                ? "desc"
                                : "asc",
                          })
                        }
                      >
                        Age{" "}
                        {memberSort.field === "age" &&
                          (memberSort.direction === "asc" ? "▲" : "▼")}
                      </th>
                      <th
                        className="cursor-pointer select-none p-2 text-left hover:bg-gray-300"
                        onClick={() =>
                          setMemberSort({
                            field: "gender",
                            direction:
                              memberSort.field === "gender" &&
                              memberSort.direction === "asc"
                                ? "desc"
                                : "asc",
                          })
                        }
                      >
                        Gender{" "}
                        {memberSort.field === "gender" &&
                          (memberSort.direction === "asc" ? "▲" : "▼")}
                      </th>
                      <th
                        className="cursor-pointer select-none p-2 text-left hover:bg-gray-300"
                        onClick={() =>
                          setMemberSort({
                            field: "team",
                            direction:
                              memberSort.field === "team" &&
                              memberSort.direction === "asc"
                                ? "desc"
                                : "asc",
                          })
                        }
                      >
                        Assigned Team{" "}
                        {memberSort.field === "team" &&
                          (memberSort.direction === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="p-2 text-left">Parent Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedMembers
                      .map((member, idx) => ({ member, originalIndex: idx }))
                      .filter(
                        ({ member }) =>
                          (memberFilterAge === "all" ||
                            member.AgeGroup === memberFilterAge) &&
                          (memberFilterGender === "all" ||
                            member.Gender === memberFilterGender)
                      )
                      .sort((a, b) => {
                        let comparison = 0;
                        if (memberSort.field === "name") {
                          comparison = a.member.FullName.localeCompare(
                            b.member.FullName
                          );
                        } else if (memberSort.field === "age") {
                          comparison = a.member.Age - b.member.Age;
                        } else if (memberSort.field === "gender") {
                          comparison = a.member.Gender.localeCompare(
                            b.member.Gender
                          );
                        } else if (memberSort.field === "team") {
                          const teamA =
                            localTeams.find(
                              (t) => t._id === teamAssignments[a.originalIndex]
                            )?.name || "";
                          const teamB =
                            localTeams.find(
                              (t) => t._id === teamAssignments[b.originalIndex]
                            )?.name || "";
                          comparison = teamA.localeCompare(teamB);
                        }
                        return memberSort.direction === "asc"
                          ? comparison
                          : -comparison;
                      })
                      .map(({ member, originalIndex: idx }) => {
                        const assignedTeamId = teamAssignments[idx];
                        const assignedTeam = localTeams.find(
                          (t) => t._id === assignedTeamId
                        );

                        return (
                          <tr className="border-b hover:bg-gray-50" key={idx}>
                            <td className="p-2 font-medium">
                              {member.FullName}
                            </td>
                            <td className="p-2">
                              {member.Age} ({member.AgeGroup})
                            </td>
                            <td className="p-2">{member.Gender}</td>
                            <td className="p-2">
                              <select
                                className="w-full rounded border px-2 py-1 text-xs"
                                onChange={(e) =>
                                  setTeamAssignments({
                                    ...teamAssignments,
                                    [idx]: e.target.value,
                                  })
                                }
                                value={assignedTeamId || ""}
                              >
                                <option value="">Select team...</option>
                                {localTeams
                                  .filter((t) => t.isActive !== false)
                                  .sort((a, b) =>
                                    (a.name || "").localeCompare(b.name || "")
                                  )
                                  .map((team) => (
                                    <option key={team._id} value={team._id}>
                                      {team.name} ({team.ageGroup} {team.gender}
                                      )
                                    </option>
                                  ))}
                              </select>
                              {assignedTeam && (
                                <div className="mt-1 text-gray-500 text-xs">
                                  {assignedTeam.sport} • {assignedTeam.season}
                                </div>
                              )}
                            </td>
                            <td className="p-2 text-gray-600 text-xs">
                              {member.ParentSurname ? (
                                <div>
                                  <div className="font-medium text-gray-800">
                                    {member.ParentFirstName
                                      ? `${member.ParentFirstName} ${member.ParentSurname}`
                                      : `Parent/Guardian: ${member.ParentSurname}`}
                                  </div>
                                  {member.ParentEmail && (
                                    <div className="text-gray-600">
                                      {member.ParentEmail}
                                    </div>
                                  )}
                                  {member.ParentPhone && (
                                    <div className="text-gray-600">
                                      {member.ParentPhone}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  {member.ParentEmail && (
                                    <div>{member.ParentEmail}</div>
                                  )}
                                  {member.ParentPhone && (
                                    <div>{member.ParentPhone}</div>
                                  )}
                                  {!(
                                    member.ParentEmail || member.ParentPhone
                                  ) && "N/A"}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-600 px-4 py-3 text-white transition-colors hover:bg-gray-700"
                  onClick={() => setStep(1)}
                >
                  <ChevronRight className="rotate-180" size={18} />
                  Back
                </button>
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-white transition-colors hover:bg-green-700"
                  onClick={createPassports}
                >
                  Create {parsedMembers.length} Passports
                  <CheckCircle size={18} />
                </button>
              </div>
            </>
          )}

          {/* Importing */}
          {importing && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 h-16 w-16 animate-spin rounded-full border-green-600 border-b-4" />
              <p className="font-medium text-gray-800 text-lg">
                Creating Player Passports...
              </p>
              <p className="mt-2 text-gray-600 text-sm">
                This may take a few moments
              </p>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === 3 && results && (
            <>
              <div className="flex flex-col items-center justify-center py-8">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="text-green-600" size={48} />
                </div>
                <h3 className="mb-2 font-bold text-2xl text-gray-800">
                  Import Complete!
                </h3>
                <p className="mb-6 text-center text-gray-600">
                  Player passports have been successfully created
                </p>

                <div
                  className={`mb-6 grid w-full max-w-md grid-cols-1 gap-4 sm:grid-cols-2 ${results.skipped || results.replaced ? "sm:grid-cols-2 md:grid-cols-4" : ""}`}
                >
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                    <p className="mb-1 text-gray-600 text-sm">
                      Passports Created
                    </p>
                    <p className="font-bold text-3xl text-green-700">
                      {results.created}
                    </p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
                    <p className="mb-1 text-gray-600 text-sm">Families</p>
                    <p className="font-bold text-3xl text-blue-700">
                      {results.families}
                    </p>
                  </div>
                  {results.replaced && results.replaced > 0 ? (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-center">
                      <p className="mb-1 text-gray-600 text-sm">Replaced</p>
                      <p className="font-bold text-3xl text-orange-700">
                        {results.replaced}
                      </p>
                    </div>
                  ) : null}
                  {results.skipped && results.skipped > 0 ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                      <p className="mb-1 text-gray-600 text-sm">Skipped</p>
                      <p className="font-bold text-3xl text-gray-700">
                        {results.skipped}
                      </p>
                    </div>
                  ) : null}
                </div>

                <button
                  className="rounded-lg bg-green-600 px-8 py-3 font-medium text-white transition-colors hover:bg-green-700"
                  onClick={onClose}
                >
                  View Dashboard
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GAAMembershipWizard;
