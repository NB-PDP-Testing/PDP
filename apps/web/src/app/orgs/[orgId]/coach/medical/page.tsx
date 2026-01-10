"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Eye,
  Heart,
  Loader2,
  Phone,
  Pill,
  Search,
  Shield,
  User,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Privacy confirmation component for coaches
function CoachPrivacyConfirmation({
  onConfirm,
  onCancel,
  playerName,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  playerName: string;
}) {
  return (
    <Dialog onOpenChange={(open) => !open && onCancel()} open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            Medical Information Access
          </DialogTitle>
          <DialogDescription>
            You are about to view medical information for{" "}
            <strong>{playerName}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-amber-800 text-sm">
              <strong>Coach Access Notice:</strong> As a coach, you have
              read-only access to player medical information for safety purposes
              during training and matches.
            </p>
          </div>
          <div className="text-muted-foreground text-sm">
            <ul className="list-inside list-disc space-y-1">
              <li>This access is logged for audit purposes</li>
              <li>Use this information responsibly for player safety</li>
              <li>Contact admin to update medical information</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700"
            onClick={onConfirm}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Info
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Limited Medical Profile View for Coaches
function CoachMedicalView({
  profile,
  playerName,
  onClose,
}: {
  profile: any;
  playerName: string;
  onClose: () => void;
}) {
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            {playerName} - Medical Info
          </DialogTitle>
          <DialogDescription>
            View-only access for coaching purposes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Emergency Contacts - Always Show */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-red-800">
              <Phone className="h-4 w-4" />
              Emergency Contacts
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="font-medium">
                  {profile?.emergencyContact1Name || "Not set"}
                </p>
                <p className="font-mono text-red-700">
                  {profile?.emergencyContact1Phone || "No phone"}
                </p>
                <Badge className="mt-1 bg-red-600">Primary</Badge>
              </div>
              {profile?.emergencyContact2Name && (
                <div>
                  <p className="font-medium">{profile.emergencyContact2Name}</p>
                  <p className="font-mono text-red-700">
                    {profile.emergencyContact2Phone || "No phone"}
                  </p>
                  <Badge className="mt-1" variant="outline">
                    Secondary
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Critical Allergies */}
          {profile?.allergies?.length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <h3 className="mb-2 flex items-center gap-2 font-semibold text-orange-800">
                <AlertCircle className="h-4 w-4" />
                Allergies
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.allergies.map((allergy: string) => (
                  <Badge
                    className="bg-orange-200 text-orange-800"
                    key={allergy}
                  >
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Medical Conditions */}
          {profile?.conditions?.length > 0 && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
              <h3 className="mb-2 flex items-center gap-2 font-semibold text-purple-800">
                <AlertTriangle className="h-4 w-4" />
                Medical Conditions
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.conditions.map((condition: string) => (
                  <Badge
                    className="bg-purple-200 text-purple-800"
                    key={condition}
                  >
                    {condition}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Current Medications */}
          {profile?.medications?.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="mb-2 flex items-center gap-2 font-semibold text-blue-800">
                <Pill className="h-4 w-4" />
                Current Medications
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.medications.map((med: string) => (
                  <Badge className="bg-blue-200 text-blue-800" key={med}>
                    {med}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* No Medical Info */}
          {!(
            profile?.allergies?.length ||
            profile?.conditions?.length ||
            profile?.medications?.length
          ) && (
            <div className="rounded-lg border p-4 text-center">
              <p className="text-muted-foreground">
                No allergies, conditions, or medications recorded.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Coach Medical Page
export default function CoachMedicalPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAlert, setFilterAlert] = useState<
    "all" | "allergies" | "conditions"
  >("all");

  // Privacy confirmation state
  const [pendingView, setPendingView] = useState<{
    playerName: string;
    profile: any;
  } | null>(null);

  // View modal state
  const [viewingProfile, setViewingProfile] = useState<{
    playerName: string;
    profile: any;
  } | null>(null);

  // Queries
  const allProfiles = useQuery(
    api.models.medicalProfiles.getAllForOrganization,
    {
      organizationId: orgId,
    }
  );

  // Filter players - only show those with medical profiles
  const filteredPlayers = useMemo(() => {
    if (!allProfiles) return [];

    return allProfiles.filter((item) => {
      // Only show players WITH medical profiles
      if (!item.hasProfile) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!item.player.name.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Alert filter
      if (filterAlert === "allergies" && !item.hasAllergies) return false;
      if (filterAlert === "conditions" && !item.hasConditions) return false;

      return true;
    });
  }, [allProfiles, searchQuery, filterAlert]);

  // Count players with alerts
  const alertCounts = useMemo(() => {
    if (!allProfiles) return { allergies: 0, conditions: 0, medications: 0 };
    return {
      allergies: allProfiles.filter((p) => p.hasAllergies).length,
      conditions: allProfiles.filter((p) => p.hasConditions).length,
      medications: allProfiles.filter((p) => p.hasMedications).length,
    };
  }, [allProfiles]);

  // Handle view click
  const handleViewClick = (playerName: string, profile: any) => {
    setPendingView({ playerName, profile });
  };

  // Handle privacy confirmation
  const handlePrivacyConfirm = () => {
    if (pendingView) {
      setViewingProfile(pendingView);
      setPendingView(null);
      console.log(
        `[AUDIT] Coach viewed medical info for: ${pendingView.playerName}`
      );
    }
  };

  // Loading state
  if (allProfiles === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const playersWithProfiles = allProfiles.filter((p) => p.hasProfile).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push(`/orgs/${orgId}/coach`)}
            size="sm"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="font-bold text-2xl">Player Medical Info</h1>
            <p className="text-muted-foreground text-sm">
              View-only access for player safety
            </p>
          </div>
        </div>
        <Badge className="flex items-center gap-2" variant="outline">
          <Eye className="h-4 w-4" />
          View Only
        </Badge>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  Players with Profiles
                </p>
                <p className="font-bold text-2xl">{playersWithProfiles}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={alertCounts.allergies > 0 ? "border-orange-200" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">With Allergies</p>
                <p className="font-bold text-2xl">{alertCounts.allergies}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={alertCounts.conditions > 0 ? "border-purple-200" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <AlertTriangle className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">With Conditions</p>
                <p className="font-bold text-2xl">{alertCounts.conditions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={alertCounts.medications > 0 ? "border-blue-200" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Pill className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">On Medication</p>
                <p className="font-bold text-2xl">{alertCounts.medications}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search players..."
                  value={searchQuery}
                />
              </div>
            </div>
            <Select
              onValueChange={(v) => setFilterAlert(v as typeof filterAlert)}
              value={filterAlert}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by Alert" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                <SelectItem value="allergies">Has Allergies</SelectItem>
                <SelectItem value="conditions">Has Conditions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Players Table */}
      <Card>
        <CardHeader>
          <CardTitle>Player Medical Overview</CardTitle>
          <CardDescription>
            {filteredPlayers.length} players with medical profiles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Age Group</TableHead>
                <TableHead>Alerts</TableHead>
                <TableHead>Emergency Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.map((item) => (
                <TableRow key={item.player._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium">{item.player.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.player.sport}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{item.player.ageGroup}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {item.hasAllergies && (
                        <Badge
                          className="bg-orange-100 text-orange-700"
                          title="Has Allergies"
                        >
                          <AlertCircle className="h-3 w-3" />
                        </Badge>
                      )}
                      {item.hasMedications && (
                        <Badge
                          className="bg-blue-100 text-blue-700"
                          title="On Medications"
                        >
                          <Pill className="h-3 w-3" />
                        </Badge>
                      )}
                      {item.hasConditions && (
                        <Badge
                          className="bg-purple-100 text-purple-700"
                          title="Has Conditions"
                        >
                          <AlertTriangle className="h-3 w-3" />
                        </Badge>
                      )}
                      {!(
                        item.hasAllergies ||
                        item.hasMedications ||
                        item.hasConditions
                      ) && (
                        <Badge className="text-green-600" variant="outline">
                          Clear
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-mono text-sm">
                      {item.profile?.emergencyContact1Phone || "Not set"}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      onClick={() =>
                        handleViewClick(item.player.name, item.profile)
                      }
                      size="sm"
                      variant="outline"
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredPlayers.length === 0 && (
                <TableRow>
                  <TableCell className="py-8 text-center" colSpan={5}>
                    <p className="text-muted-foreground">
                      No players with medical profiles found
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Privacy Confirmation Dialog */}
      {pendingView && (
        <CoachPrivacyConfirmation
          onCancel={() => setPendingView(null)}
          onConfirm={handlePrivacyConfirm}
          playerName={pendingView.playerName}
        />
      )}

      {/* View Profile Dialog */}
      {viewingProfile && (
        <CoachMedicalView
          onClose={() => setViewingProfile(null)}
          playerName={viewingProfile.playerName}
          profile={viewingProfile.profile}
        />
      )}
    </div>
  );
}
