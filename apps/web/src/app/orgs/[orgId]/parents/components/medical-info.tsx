"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Check,
  Droplet,
  Edit,
  Heart,
  Loader2,
  Phone,
  Pill,
  Plus,
  Shield,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";

type MedicalInfoProps = {
  playerData: Array<{
    player: {
      _id: Id<"playerIdentities">;
      firstName: string;
      lastName: string;
    };
    enrollment?: {
      ageGroup?: string;
    };
  }>;
  orgId: string;
};

// Medical Form Component
function MedicalForm({
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
    if (!value.trim()) {
      return;
    }
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
            {profile ? "Update" : "Add"} Medical Info: {playerName}
          </DialogTitle>
          <DialogDescription>
            Keep your child's medical information up to date for their safety
          </DialogDescription>
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
                  placeholder="Your name"
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
                  placeholder="e.g., Spouse, Grandparent"
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
                  {[
                    "A+",
                    "A-",
                    "B+",
                    "B-",
                    "AB+",
                    "AB-",
                    "O+",
                    "O-",
                    "Unknown",
                  ].map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
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
              <Label>Family Doctor Name</Label>
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
                    className="ml-1"
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
                    className="ml-1"
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
                placeholder="e.g., Asthma, Diabetes..."
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
                    className="ml-1"
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
              placeholder="Any other information coaches should know..."
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
            Save Medical Info
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MedicalInfo({ playerData, orgId }: MedicalInfoProps) {
  const [editingProfile, setEditingProfile] = useState<{
    playerIdentityId: Id<"playerIdentities">;
    playerName: string;
    ageGroup: string;
    sport: string;
    profile: any;
  } | null>(null);

  // Query medical profiles for all children
  const allProfiles = useQuery(
    api.models.medicalProfiles.getAllForOrganization,
    {
      organizationId: orgId,
    }
  );

  // Match profiles with children
  const childrenWithMedical = playerData.map((child) => {
    const profileData = allProfiles?.find(
      (p: any) => p.player._id === child.player._id
    );
    return {
      ...child,
      hasProfile: profileData?.hasProfile,
      profile: profileData?.profile,
      hasAllergies: (profileData?.profile?.allergies?.length || 0) > 0,
      hasMedications: (profileData?.profile?.medications?.length || 0) > 0,
      hasConditions: (profileData?.profile?.conditions?.length || 0) > 0,
      sport: profileData?.player?.sport || "general",
    };
  });

  // Count children missing medical info
  const missingCount = childrenWithMedical.filter((c) => !c.hasProfile).length;

  if (playerData.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Medical Information
            {missingCount > 0 && (
              <Badge className="ml-2 bg-red-100 text-red-700">
                {missingCount} incomplete
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Keep medical info up to date for your children's safety
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {childrenWithMedical.map((child) => (
              <div
                className={`rounded-lg border p-3 ${
                  child.hasProfile
                    ? child.hasAllergies || child.hasConditions
                      ? "border-amber-200 bg-amber-50/50"
                      : "border-green-200 bg-green-50/50"
                    : "border-red-200 bg-red-50/50"
                }`}
                key={child.player._id}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-sm">
                        {child.player.firstName} {child.player.lastName}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {child.enrollment?.ageGroup || "Age group TBD"}
                      </p>
                    </div>
                  </div>
                  {child.hasProfile ? (
                    <Badge className="flex-shrink-0 bg-green-100 text-green-700 text-xs">
                      <Check className="mr-1 h-3 w-3" />
                      OK
                    </Badge>
                  ) : (
                    <Badge className="flex-shrink-0 bg-red-100 text-red-700 text-xs">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Missing
                    </Badge>
                  )}
                </div>

                {child.hasProfile && child.profile && (
                  <div className="mt-3 space-y-2">
                    {/* 3 Main Icons Row: Blood Type, Medications, Allergies */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Blood Type */}
                      <div className="rounded-lg border bg-white p-2 text-center">
                        <Droplet className="mx-auto h-5 w-5 text-red-500" />
                        <p className="mt-1 font-bold text-red-600 text-sm">
                          {child.profile.bloodType || "—"}
                        </p>
                        <p className="text-muted-foreground text-xs">Blood</p>
                      </div>

                      {/* Medications */}
                      <div className="rounded-lg border bg-white p-2 text-center">
                        <Pill className="mx-auto h-5 w-5 text-blue-500" />
                        <p className="mt-1 font-bold text-blue-600 text-sm">
                          {child.profile.medications?.length || 0}
                        </p>
                        <p className="text-muted-foreground text-xs">Meds</p>
                      </div>

                      {/* Allergies */}
                      <div className="rounded-lg border bg-white p-2 text-center">
                        <AlertTriangle className="mx-auto h-5 w-5 text-orange-500" />
                        <p className="mt-1 font-bold text-orange-600 text-sm">
                          {child.profile.allergies?.length || 0}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Allergies
                        </p>
                      </div>
                    </div>

                    {/* Medications Detail */}
                    {child.profile.medications &&
                      child.profile.medications.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {child.profile.medications.map((med: string) => (
                            <Badge
                              className="bg-blue-100 px-1.5 py-0 text-blue-700 text-xs"
                              key={med}
                            >
                              {med}
                            </Badge>
                          ))}
                        </div>
                      )}

                    {/* Allergies Detail */}
                    {child.profile.allergies &&
                      child.profile.allergies.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {child.profile.allergies.map((allergy: string) => (
                            <Badge
                              className="bg-orange-100 px-1.5 py-0 text-orange-700 text-xs"
                              key={allergy}
                            >
                              {allergy}
                            </Badge>
                          ))}
                        </div>
                      )}

                    {/* Conditions (if any) */}
                    {child.profile.conditions &&
                      child.profile.conditions.length > 0 && (
                        <div className="rounded border border-purple-200 bg-purple-50 p-1.5">
                          <p className="mb-1 font-medium text-purple-700 text-xs">
                            Conditions:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {child.profile.conditions.map(
                              (condition: string) => (
                                <Badge
                                  className="bg-purple-200 px-1.5 py-0 text-purple-800 text-xs"
                                  key={condition}
                                >
                                  {condition}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* ICE & Doctor Details */}
                    <div className="space-y-1 border-t pt-2 text-xs">
                      {/* ICE */}
                      {child.profile.emergencyContact1Phone && (
                        <div className="flex items-start gap-1">
                          <Phone className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-500" />
                          <div className="min-w-0">
                            <span className="font-semibold text-red-700">
                              ICE:
                            </span>{" "}
                            <span className="text-gray-700">
                              {child.profile.emergencyContact1Name || "Primary"}
                            </span>
                            <span className="ml-1 font-mono text-gray-600">
                              {child.profile.emergencyContact1Phone}
                            </span>
                          </div>
                        </div>
                      )}
                      {child.profile.emergencyContact2Phone && (
                        <div className="flex items-start gap-1 pl-4">
                          <span className="text-gray-500">2nd:</span>{" "}
                          <span className="text-gray-700">
                            {child.profile.emergencyContact2Name || ""}
                          </span>
                          <span className="font-mono text-gray-600">
                            {child.profile.emergencyContact2Phone}
                          </span>
                        </div>
                      )}

                      {/* Doctor */}
                      {(child.profile.doctorName ||
                        child.profile.doctorPhone) && (
                        <div className="flex items-start gap-1">
                          <Stethoscope className="mt-0.5 h-3 w-3 flex-shrink-0 text-blue-500" />
                          <div className="min-w-0">
                            <span className="font-semibold text-blue-700">
                              Dr:
                            </span>{" "}
                            {child.profile.doctorName && (
                              <span className="text-gray-700">
                                {child.profile.doctorName}
                              </span>
                            )}
                            {child.profile.doctorPhone && (
                              <span className="ml-1 font-mono text-gray-600">
                                {child.profile.doctorPhone}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* All Clear */}
                    {!(
                      child.hasAllergies ||
                      child.hasMedications ||
                      child.hasConditions
                    ) && (
                      <p className="text-center text-green-600 text-xs">
                        No medications or conditions
                      </p>
                    )}
                  </div>
                )}

                {/* No Profile Message */}
                {!child.hasProfile && (
                  <div className="mt-3 rounded border border-red-200 bg-red-100 p-2 text-center">
                    <p className="text-red-700 text-xs">
                      Please add medical info for safety
                    </p>
                  </div>
                )}

                <Button
                  className="mt-3 w-full"
                  onClick={() =>
                    setEditingProfile({
                      playerIdentityId: child.player._id,
                      playerName: `${child.player.firstName} ${child.player.lastName}`,
                      ageGroup: child.enrollment?.ageGroup || "u12",
                      sport: child.sport,
                      profile: child.profile,
                    })
                  }
                  size="sm"
                  variant={child.hasProfile ? "outline" : "default"}
                >
                  {child.hasProfile ? (
                    <>
                      <Edit className="mr-1 h-3 w-3" />
                      Update
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1 h-3 w-3" />
                      Add Info
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>

          {/* Info Banner */}
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-blue-50 p-3">
            <Shield className="h-5 w-5 text-blue-600" />
            <p className="text-blue-700 text-sm">
              Medical information is shared with coaches only for safety
              purposes during training and matches.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingProfile && (
        <MedicalForm
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
    </>
  );
}
