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
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

// Guardian Medical Form (similar to admin but for their own children)
function GuardianMedicalForm({
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

  const upsertProfile = useMutation(api.models.medicalProfiles.upsertForIdentity);

  const handleAddItem = (field: "allergies" | "medications" | "conditions", value: string) => {
    if (!value.trim()) return;
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], value.trim()],
    }));
  };

  const handleRemoveItem = (field: "allergies" | "medications" | "conditions", value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((item: string) => item !== value),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.emergencyContact1Name || !formData.emergencyContact1Phone) {
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
      toast.success(profile ? "Medical profile updated" : "Medical profile created");
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
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
            <p className="text-red-700 text-sm">
              These contacts will be called in case of an emergency during training or matches.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Primary Contact Name *</Label>
                <Input
                  onChange={(e) =>
                    setFormData({ ...formData, emergencyContact1Name: e.target.value })
                  }
                  placeholder="Your name"
                  value={formData.emergencyContact1Name}
                />
              </div>
              <div className="space-y-2">
                <Label>Primary Contact Phone *</Label>
                <Input
                  onChange={(e) =>
                    setFormData({ ...formData, emergencyContact1Phone: e.target.value })
                  }
                  placeholder="e.g., 087 123 4567"
                  value={formData.emergencyContact1Phone}
                />
              </div>
              <div className="space-y-2">
                <Label>Secondary Contact Name</Label>
                <Input
                  onChange={(e) =>
                    setFormData({ ...formData, emergencyContact2Name: e.target.value })
                  }
                  placeholder="e.g., Spouse, Grandparent"
                  value={formData.emergencyContact2Name}
                />
              </div>
              <div className="space-y-2">
                <Label>Secondary Contact Phone</Label>
                <Input
                  onChange={(e) =>
                    setFormData({ ...formData, emergencyContact2Phone: e.target.value })
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
                onValueChange={(value) => setFormData({ ...formData, bloodType: value })}
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
                  setFormData({ ...formData, insuranceCovered: value === "yes" })
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
                onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                placeholder="e.g., Dr. Mary O'Brien"
                value={formData.doctorName}
              />
            </div>
            <div className="space-y-2">
              <Label>Doctor Phone</Label>
              <Input
                onChange={(e) => setFormData({ ...formData, doctorPhone: e.target.value })}
                placeholder="e.g., 01 234 5678"
                value={formData.doctorPhone}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Last Medical Check</Label>
              <Input
                onChange={(e) => setFormData({ ...formData, lastMedicalCheck: e.target.value })}
                type="date"
                value={formData.lastMedicalCheck}
              />
            </div>
          </div>

          {/* Allergies */}
          <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
            <h3 className="font-semibold text-orange-800">Allergies</h3>
            <p className="text-orange-700 text-sm">
              List any allergies your child has (food, medication, environmental)
            </p>
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
            <p className="text-blue-700 text-sm">
              List any medications your child takes regularly
            </p>
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
            <h3 className="font-semibold text-purple-800">Medical Conditions</h3>
            <p className="text-purple-700 text-sm">
              List any medical conditions coaches should be aware of
            </p>
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
                placeholder="e.g., Asthma, Diabetes, Epilepsy..."
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
                <Badge className="bg-purple-200 text-purple-800" key={condition}>
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
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any other information coaches or administrators should know..."
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

// Main Guardian Medical Page
export default function GuardianMedicalPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  // Edit modal state
  const [editingProfile, setEditingProfile] = useState<{
    playerIdentityId: Id<"playerIdentities">;
    playerName: string;
    ageGroup: string;
    sport: string;
    profile: any;
  } | null>(null);

  // Query - get players linked to this guardian
  // For now, we'll use the same query but filter for guardian's children
  // In production, this would be filtered by guardian relationship
  const allProfiles = useQuery(api.models.medicalProfiles.getAllForOrganization, {
    organizationId: orgId,
  });

  // In production, this would filter to only the guardian's children
  // For demo purposes, we'll show all players
  const myChildren = allProfiles || [];

  // Loading state
  if (allProfiles === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push(`/orgs/${orgId}/guardian`)}
            size="sm"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="font-bold text-2xl">Medical Information</h1>
            <p className="text-muted-foreground text-sm">
              Manage medical profiles for your children
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex items-center gap-4 py-4">
          <Shield className="h-8 w-8 text-blue-600" />
          <div>
            <p className="font-semibold text-blue-800">
              Why is medical information important?
            </p>
            <p className="text-blue-700 text-sm">
              Accurate medical information helps coaches respond quickly in emergencies and ensures
              your child's safety during training and matches.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Children's Medical Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {myChildren.map((child) => (
          <Card
            key={child.player._id}
            className={
              !child.hasProfile
                ? "border-red-200"
                : child.hasAllergies || child.hasConditions
                  ? "border-amber-200"
                  : "border-green-200"
            }
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <User className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{child.player.name}</CardTitle>
                    <CardDescription>
                      {child.player.ageGroup} • {child.player.sport}
                    </CardDescription>
                  </div>
                </div>
                {child.hasProfile ? (
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
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {child.hasProfile ? (
                <>
                  {/* Emergency Contact */}
                  <div className="flex items-center gap-2 rounded-lg border p-3">
                    <Phone className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="font-medium text-sm">
                        {child.profile?.emergencyContact1Name}
                      </p>
                      <p className="font-mono text-muted-foreground text-xs">
                        {child.profile?.emergencyContact1Phone}
                      </p>
                    </div>
                  </div>

                  {/* Alerts Summary */}
                  <div className="flex flex-wrap gap-2">
                    {child.hasAllergies && (
                      <Badge className="bg-orange-100 text-orange-700">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        {child.profile?.allergies?.length} Allergies
                      </Badge>
                    )}
                    {child.hasMedications && (
                      <Badge className="bg-blue-100 text-blue-700">
                        <Pill className="mr-1 h-3 w-3" />
                        {child.profile?.medications?.length} Medications
                      </Badge>
                    )}
                    {child.hasConditions && (
                      <Badge className="bg-purple-100 text-purple-700">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        {child.profile?.conditions?.length} Conditions
                      </Badge>
                    )}
                    {!child.hasAllergies && !child.hasMedications && !child.hasConditions && (
                      <Badge className="bg-green-100 text-green-700">
                        No alerts recorded
                      </Badge>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                  <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
                  <p className="mt-2 font-medium text-red-800">
                    Medical profile not set up
                  </p>
                  <p className="text-red-700 text-sm">
                    Please add medical information for your child's safety
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                onClick={() =>
                  setEditingProfile({
                    playerIdentityId: child.player._id,
                    playerName: child.player.name,
                    ageGroup: child.player.ageGroup,
                    sport: child.player.sport,
                    profile: child.profile,
                  })
                }
                variant={child.hasProfile ? "outline" : "default"}
              >
                {child.hasProfile ? (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Update Medical Info
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Medical Info
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}

        {myChildren.length === 0 && (
          <Card className="col-span-2">
            <CardContent className="py-8 text-center">
              <User className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 font-medium">No children found</p>
              <p className="text-muted-foreground text-sm">
                Contact the organization administrator to link your children to your account.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit/Create Profile Dialog */}
      {editingProfile && (
        <GuardianMedicalForm
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
