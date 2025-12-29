"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  Edit,
  Eye,
  Heart,
  Loader2,
  Phone,
  Pill,
  Plus,
  Search,
  Shield,
  Stethoscope,
  User,
  Users,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";

// Privacy confirmation component
function PrivacyConfirmation({
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
            Sensitive Medical Information
          </DialogTitle>
          <DialogDescription>
            You are about to view sensitive medical information for{" "}
            <strong>{playerName}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-amber-800 text-sm">
              <strong>Privacy Notice:</strong> This information is confidential
              and should only be accessed for legitimate coaching or
              administrative purposes. Access to this data is logged for audit
              purposes.
            </p>
          </div>
          <div className="text-muted-foreground text-sm">
            By clicking "View Medical Info", you confirm that:
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>You have a legitimate need to access this information</li>
              <li>You will not share this information inappropriately</li>
              <li>You understand this access is being logged</li>
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
            View Medical Info
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Medical Profile Detail Modal
function MedicalProfileDetail({
  profile,
  playerName,
  playerId,
  onClose,
  onEdit,
}: {
  profile: any;
  playerName: string;
  playerId: Id<"players">;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Medical Profile: {playerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Emergency Contacts */}
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
                <p className="text-red-700 text-sm">
                  {profile?.emergencyContact1Phone || "No phone"}
                </p>
                <Badge className="mt-1 bg-red-600">Primary</Badge>
              </div>
              {profile?.emergencyContact2Name && (
                <div>
                  <p className="font-medium">{profile.emergencyContact2Name}</p>
                  <p className="text-red-700 text-sm">
                    {profile.emergencyContact2Phone || "No phone"}
                  </p>
                  <Badge className="mt-1" variant="outline">
                    Secondary
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Medical Details Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Blood Type */}
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-sm">
                <Heart className="h-4 w-4 text-red-500" />
                Blood Type
              </h4>
              <p className="font-semibold text-lg">
                {profile?.bloodType || "Not recorded"}
              </p>
            </div>

            {/* Insurance */}
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-sm">
                <Shield className="h-4 w-4 text-blue-500" />
                Insurance
              </h4>
              <Badge
                variant={profile?.insuranceCovered ? "default" : "destructive"}
              >
                {profile?.insuranceCovered ? "Covered" : "Not Covered"}
              </Badge>
            </div>

            {/* Doctor Info */}
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-sm">
                <Stethoscope className="h-4 w-4 text-blue-500" />
                Doctor
              </h4>
              <p className="font-medium">{profile?.doctorName || "Not set"}</p>
              <p className="text-muted-foreground text-sm">
                {profile?.doctorPhone || "No phone"}
              </p>
            </div>

            {/* Last Medical Check */}
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 font-medium text-sm">Last Medical Check</h4>
              <p className="font-medium">
                {profile?.lastMedicalCheck
                  ? new Date(profile.lastMedicalCheck).toLocaleDateString()
                  : "Not recorded"}
              </p>
            </div>
          </div>

          {/* Allergies */}
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-orange-800">
              <AlertCircle className="h-4 w-4" />
              Allergies ({profile?.allergies?.length || 0})
            </h3>
            {profile?.allergies?.length > 0 ? (
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
            ) : (
              <p className="text-muted-foreground text-sm">
                No known allergies
              </p>
            )}
          </div>

          {/* Medications */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-blue-800">
              <Pill className="h-4 w-4" />
              Current Medications ({profile?.medications?.length || 0})
            </h3>
            {profile?.medications?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.medications.map((med: string) => (
                  <Badge className="bg-blue-200 text-blue-800" key={med}>
                    {med}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No current medications
              </p>
            )}
          </div>

          {/* Medical Conditions */}
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-purple-800">
              <AlertTriangle className="h-4 w-4" />
              Medical Conditions ({profile?.conditions?.length || 0})
            </h3>
            {profile?.conditions?.length > 0 ? (
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
            ) : (
              <p className="text-muted-foreground text-sm">
                No medical conditions recorded
              </p>
            )}
          </div>

          {/* Notes */}
          {profile?.notes && (
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-semibold">Additional Notes</h3>
              <p className="text-muted-foreground text-sm">{profile.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
          <Button onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Create/Edit Medical Profile Form
function MedicalProfileForm({
  profile,
  playerName,
  playerIdentityId,
  ageGroup,
  sport,
  orgId,
  onClose,
  onSave,
}: {
  profile: any;
  playerName: string;
  playerIdentityId: Id<"playerIdentities">;
  ageGroup: string;
  sport: string;
  orgId: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    bloodType: profile?.bloodType || "",
    allergies: profile?.allergies || [],
    medications: profile?.medications || [],
    conditions: profile?.conditions || [],
    doctorName: profile?.doctorName || "",
    doctorPhone: profile?.doctorPhone || "",
    emergencyContact1Name: profile?.emergencyContact1Name || "",
    emergencyContact1Phone: profile?.emergencyContact1Phone || "",
    emergencyContact2Name: profile?.emergencyContact2Name || "",
    emergencyContact2Phone: profile?.emergencyContact2Phone || "",
    lastMedicalCheck: profile?.lastMedicalCheck || "",
    insuranceCovered: profile?.insuranceCovered ?? false,
    notes: profile?.notes || "",
  });

  const [newAllergy, setNewAllergy] = useState("");
  const [newMedication, setNewMedication] = useState("");
  const [newCondition, setNewCondition] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const upsertProfile = useMutation(
    api.models.medicalProfiles.upsertForIdentity
  );

  const handleAddItem = (
    field: "allergies" | "medications" | "conditions",
    value: string
  ) => {
    if (!value.trim()) return;
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], value.trim()],
    }));
  };

  const handleRemoveItem = (
    field: "allergies" | "medications" | "conditions",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((item: string) => item !== value),
    }));
  };

  const handleSubmit = async () => {
    if (!(formData.emergencyContact1Name && formData.emergencyContact1Phone)) {
      toast.error("Emergency contact is required");
      return;
    }

    setIsSaving(true);
    try {
      await upsertProfile({
        playerIdentityId,
        organizationId: orgId,
        ageGroup,
        sport,
        ...formData,
      });
      toast.success(
        profile ? "Medical profile updated" : "Medical profile created"
      );
      onSave();
    } catch (error) {
      toast.error("Failed to save medical profile", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            {profile ? "Edit" : "Create"} Medical Profile: {playerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Emergency Contacts */}
          <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="font-semibold text-red-800">
              Emergency Contacts (Required)
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Primary Contact Name *</Label>
                <Input
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergencyContact1Name: e.target.value,
                    })
                  }
                  placeholder="e.g., John Smith"
                  value={formData.emergencyContact1Name}
                />
              </div>
              <div className="space-y-2">
                <Label>Primary Contact Phone *</Label>
                <Input
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergencyContact1Phone: e.target.value,
                    })
                  }
                  placeholder="e.g., 087 123 4567"
                  value={formData.emergencyContact1Phone}
                />
              </div>
              <div className="space-y-2">
                <Label>Secondary Contact Name</Label>
                <Input
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergencyContact2Name: e.target.value,
                    })
                  }
                  placeholder="e.g., Jane Smith"
                  value={formData.emergencyContact2Name}
                />
              </div>
              <div className="space-y-2">
                <Label>Secondary Contact Phone</Label>
                <Input
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergencyContact2Phone: e.target.value,
                    })
                  }
                  placeholder="e.g., 086 987 6543"
                  value={formData.emergencyContact2Phone}
                />
              </div>
            </div>
          </div>

          {/* Basic Medical Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Blood Type</Label>
              <Select
                onValueChange={(value) =>
                  setFormData({ ...formData, bloodType: value })
                }
                value={formData.bloodType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select blood type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                  <SelectItem value="Unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Insurance Covered</Label>
              <Select
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    insuranceCovered: value === "yes",
                  })
                }
                value={formData.insuranceCovered ? "yes" : "no"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes - Covered</SelectItem>
                  <SelectItem value="no">No - Not Covered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Doctor Name</Label>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, doctorName: e.target.value })
                }
                placeholder="e.g., Dr. Mary O'Brien"
                value={formData.doctorName}
              />
            </div>
            <div className="space-y-2">
              <Label>Doctor Phone</Label>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, doctorPhone: e.target.value })
                }
                placeholder="e.g., 01 234 5678"
                value={formData.doctorPhone}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Last Medical Check</Label>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, lastMedicalCheck: e.target.value })
                }
                type="date"
                value={formData.lastMedicalCheck}
              />
            </div>
          </div>

          {/* Allergies */}
          <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
            <h3 className="font-semibold text-orange-800">Allergies</h3>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                onChange={(e) => setNewAllergy(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddItem("allergies", newAllergy);
                    setNewAllergy("");
                  }
                }}
                placeholder="Add allergy..."
                value={newAllergy}
              />
              <Button
                onClick={() => {
                  handleAddItem("allergies", newAllergy);
                  setNewAllergy("");
                }}
                size="sm"
                type="button"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.allergies.map((allergy: string) => (
                <Badge className="bg-orange-200 text-orange-800" key={allergy}>
                  {allergy}
                  <button
                    className="ml-1 hover:text-orange-900"
                    onClick={() => handleRemoveItem("allergies", allergy)}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Medications */}
          <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="font-semibold text-blue-800">Current Medications</h3>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                onChange={(e) => setNewMedication(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddItem("medications", newMedication);
                    setNewMedication("");
                  }
                }}
                placeholder="Add medication..."
                value={newMedication}
              />
              <Button
                onClick={() => {
                  handleAddItem("medications", newMedication);
                  setNewMedication("");
                }}
                size="sm"
                type="button"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.medications.map((med: string) => (
                <Badge className="bg-blue-200 text-blue-800" key={med}>
                  {med}
                  <button
                    className="ml-1 hover:text-blue-900"
                    onClick={() => handleRemoveItem("medications", med)}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Medical Conditions */}
          <div className="space-y-3 rounded-lg border border-purple-200 bg-purple-50 p-4">
            <h3 className="font-semibold text-purple-800">
              Medical Conditions
            </h3>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                onChange={(e) => setNewCondition(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddItem("conditions", newCondition);
                    setNewCondition("");
                  }
                }}
                placeholder="Add condition (e.g., Asthma, Diabetes)..."
                value={newCondition}
              />
              <Button
                onClick={() => {
                  handleAddItem("conditions", newCondition);
                  setNewCondition("");
                }}
                size="sm"
                type="button"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.conditions.map((condition: string) => (
                <Badge
                  className="bg-purple-200 text-purple-800"
                  key={condition}
                >
                  {condition}
                  <button
                    className="ml-1 hover:text-purple-900"
                    onClick={() => handleRemoveItem("conditions", condition)}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Any additional medical information..."
              rows={3}
              value={formData.notes}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button disabled={isSaving} onClick={handleSubmit}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Save Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Medical Profiles Dashboard
export default function MedicalProfilesPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "has_profile" | "no_profile"
  >("all");
  const [filterAlert, setFilterAlert] = useState<
    "all" | "allergies" | "medications" | "conditions"
  >("all");

  // Privacy confirmation state
  const [pendingView, setPendingView] = useState<{
    playerIdentityId: Id<"playerIdentities">;
    playerName: string;
    ageGroup: string;
    sport: string;
    profile: any;
  } | null>(null);

  // Detail/Edit modal state
  const [viewingProfile, setViewingProfile] = useState<{
    playerIdentityId: Id<"playerIdentities">;
    playerName: string;
    ageGroup: string;
    sport: string;
    profile: any;
  } | null>(null);
  const [editingProfile, setEditingProfile] = useState<{
    playerIdentityId: Id<"playerIdentities">;
    playerName: string;
    ageGroup: string;
    sport: string;
    profile: any;
  } | null>(null);

  // Queries
  const stats = useQuery(api.models.medicalProfiles.getOrganizationStats, {
    organizationId: orgId,
  });
  const allProfiles = useQuery(
    api.models.medicalProfiles.getAllForOrganization,
    {
      organizationId: orgId,
    }
  );

  // Filter players
  const filteredPlayers = useMemo(() => {
    if (!allProfiles) return [];

    return allProfiles.filter((item) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!item.player.name.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Profile status filter
      if (filterStatus === "has_profile" && !item.hasProfile) return false;
      if (filterStatus === "no_profile" && item.hasProfile) return false;

      // Alert filter
      if (filterAlert === "allergies" && !item.hasAllergies) return false;
      if (filterAlert === "medications" && !item.hasMedications) return false;
      if (filterAlert === "conditions" && !item.hasConditions) return false;

      return true;
    });
  }, [allProfiles, searchQuery, filterStatus, filterAlert]);

  // Handle view click (with privacy confirmation)
  const handleViewClick = (
    playerIdentityId: Id<"playerIdentities">,
    playerName: string,
    ageGroup: string,
    sport: string,
    profile: any
  ) => {
    setPendingView({ playerIdentityId, playerName, ageGroup, sport, profile });
  };

  // Handle privacy confirmation
  const handlePrivacyConfirm = () => {
    if (pendingView) {
      setViewingProfile(pendingView);
      setPendingView(null);
      // TODO: Log access for audit
      console.log(
        `[AUDIT] Medical profile viewed for: ${pendingView.playerName}`
      );
    }
  };

  // Loading state
  if (allProfiles === undefined || stats === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-lg p-6 text-white shadow-lg"
        style={{
          background:
            "linear-gradient(to right, var(--org-primary), var(--org-primary))",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              onClick={() => router.back()}
              size="sm"
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="font-bold text-2xl">Medical Profiles</h1>
              <p className="text-sm text-white/80">
                Manage player medical information and emergency contacts
              </p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white">
            <Shield className="mr-2 h-4 w-4" />
            Sensitive Data
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Total Players</p>
                <p className="font-bold text-2xl">{stats.totalPlayers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={
            stats.profileCompletionRate < 80
              ? "border-amber-200"
              : "border-green-200"
          }
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  stats.profileCompletionRate < 80
                    ? "bg-amber-100"
                    : "bg-green-100"
                }`}
              >
                <Heart
                  className={`h-6 w-6 ${
                    stats.profileCompletionRate < 80
                      ? "text-amber-600"
                      : "text-green-600"
                  }`}
                />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  Profile Completion
                </p>
                <p className="font-bold text-2xl">
                  {stats.profileCompletionRate}%
                </p>
                <p className="text-muted-foreground text-xs">
                  {stats.playersWithProfiles}/{stats.totalPlayers} profiles
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={stats.playersWithAllergies > 0 ? "border-orange-200" : ""}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">With Allergies</p>
                <p className="font-bold text-2xl">
                  {stats.playersWithAllergies}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={stats.playersWithConditions > 0 ? "border-purple-200" : ""}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <AlertTriangle className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">With Conditions</p>
                <p className="font-bold text-2xl">
                  {stats.playersWithConditions}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning for missing profiles */}
      {stats.playersWithoutEmergencyContacts > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">
                {stats.playersWithoutEmergencyContacts} players without
                emergency contacts
              </p>
              <p className="text-red-700 text-sm">
                Emergency contact information is critical for player safety.
              </p>
            </div>
            <Button
              className="ml-auto"
              onClick={() => {
                setFilterStatus("no_profile");
                toast.info(
                  "Filter applied: Showing players without medical profiles"
                );
              }}
              variant="outline"
            >
              View Missing
            </Button>
          </CardContent>
        </Card>
      )}

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
              onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}
              value={filterStatus}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Profile Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                <SelectItem value="has_profile">Has Profile</SelectItem>
                <SelectItem value="no_profile">No Profile</SelectItem>
              </SelectContent>
            </Select>
            <Select
              onValueChange={(v) => setFilterAlert(v as typeof filterAlert)}
              value={filterAlert}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Alert Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="allergies">Has Allergies</SelectItem>
                <SelectItem value="medications">Has Medications</SelectItem>
                <SelectItem value="conditions">Has Conditions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Players Table */}
      <Card>
        <CardHeader>
          <CardTitle>Player Medical Profiles</CardTitle>
          <CardDescription>
            {filteredPlayers.length} players shown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Age Group</TableHead>
                <TableHead>Profile Status</TableHead>
                <TableHead>Alerts</TableHead>
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
                    {item.hasProfile ? (
                      <Badge className="bg-green-100 text-green-700">
                        <Check className="mr-1 h-3 w-3" />
                        Complete
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Missing
                      </Badge>
                    )}
                  </TableCell>
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
                        <span className="text-muted-foreground text-xs">
                          None
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {item.hasProfile ? (
                        <>
                          <Button
                            onClick={() =>
                              handleViewClick(
                                item.player._id,
                                item.player.name,
                                item.player.ageGroup,
                                item.player.sport,
                                item.profile
                              )
                            }
                            size="sm"
                            variant="outline"
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            View
                          </Button>
                          <Button
                            onClick={() =>
                              setEditingProfile({
                                playerIdentityId: item.player._id,
                                playerName: item.player.name,
                                ageGroup: item.player.ageGroup,
                                sport: item.player.sport,
                                profile: item.profile,
                              })
                            }
                            size="sm"
                            variant="outline"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() =>
                            setEditingProfile({
                              playerIdentityId: item.player._id,
                              playerName: item.player.name,
                              ageGroup: item.player.ageGroup,
                              sport: item.player.sport,
                              profile: null,
                            })
                          }
                          size="sm"
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Create
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredPlayers.length === 0 && (
                <TableRow>
                  <TableCell className="py-8 text-center" colSpan={5}>
                    <p className="text-muted-foreground">No players found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Privacy Confirmation Dialog */}
      {pendingView && (
        <PrivacyConfirmation
          onCancel={() => setPendingView(null)}
          onConfirm={handlePrivacyConfirm}
          playerName={pendingView.playerName}
        />
      )}

      {/* View Profile Dialog */}
      {viewingProfile && (
        <MedicalProfileDetail
          onClose={() => setViewingProfile(null)}
          onEdit={() => {
            setEditingProfile(viewingProfile);
            setViewingProfile(null);
          }}
          playerId={viewingProfile.playerIdentityId as unknown as Id<"players">}
          playerName={viewingProfile.playerName}
          profile={viewingProfile.profile}
        />
      )}

      {/* Edit/Create Profile Dialog */}
      {editingProfile && (
        <MedicalProfileForm
          ageGroup={editingProfile.ageGroup}
          onClose={() => setEditingProfile(null)}
          onSave={() => setEditingProfile(null)}
          orgId={orgId}
          playerIdentityId={editingProfile.playerIdentityId}
          playerName={editingProfile.playerName}
          profile={editingProfile.profile}
          sport={editingProfile.sport}
        />
      )}
    </div>
  );
}
