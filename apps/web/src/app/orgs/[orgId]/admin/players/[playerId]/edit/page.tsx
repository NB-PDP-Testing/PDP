"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Loader2, Save, User } from "lucide-react";
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

export default function EditPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const playerId = params.playerId as string;

  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "male" as "male" | "female" | "other",
    ageGroup: "",
    coachNotes: "",
    adminNotes: "",
  });

  // Query player identity data
  const playerIdentity = useQuery(api.models.playerIdentities.getPlayerById, {
    playerIdentityId: playerId as Id<"playerIdentities">,
  });

  // Query enrollment data
  const enrollment = useQuery(
    api.models.orgPlayerEnrollments.getEnrollment,
    {
      playerIdentityId: playerId as Id<"playerIdentities">,
      organizationId: orgId,
    }
  );

  // Mutations
  const updatePlayerIdentity = useMutation(
    api.models.playerIdentities.updatePlayerIdentity
  );
  const updateEnrollment = useMutation(
    api.models.orgPlayerEnrollments.updateEnrollment
  );

  // Populate form when data loads
  useEffect(() => {
    if (playerIdentity && enrollment) {
      setFormData({
        firstName: playerIdentity.firstName || "",
        lastName: playerIdentity.lastName || "",
        dateOfBirth: playerIdentity.dateOfBirth || "",
        gender: playerIdentity.gender || "male",
        ageGroup: enrollment.ageGroup || "",
        coachNotes: enrollment.coachNotes || "",
        adminNotes: enrollment.adminNotes || "",
      });
    }
  }, [playerIdentity, enrollment]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update player identity
      await updatePlayerIdentity({
        playerIdentityId: playerId as Id<"playerIdentities">,
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender,
      });

      // Update enrollment if exists
      if (enrollment) {
        await updateEnrollment({
          enrollmentId: enrollment._id,
          ageGroup: formData.ageGroup || undefined,
          coachNotes: formData.coachNotes || undefined,
          adminNotes: formData.adminNotes || undefined,
        });
      }

      toast.success("Player updated successfully");
      router.push(`/orgs/${orgId}/admin/players`);
    } catch (error) {
      toast.error("Failed to update player", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (playerIdentity === undefined || enrollment === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not found state
  if (playerIdentity === null) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <User className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="mb-2 font-semibold text-lg">Player Not Found</h2>
        <p className="mb-4 text-muted-foreground">
          The player you're looking for doesn't exist.
        </p>
        <Button onClick={() => router.push(`/orgs/${orgId}/admin/players`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Players
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => router.push(`/orgs/${orgId}/admin/players`)}
          size="sm"
          variant="outline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="font-bold text-2xl">Edit Player</h1>
          <p className="text-muted-foreground text-sm">
            Update player information and enrollment details
          </p>
        </div>
        <Button disabled={isSaving} onClick={handleSave}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Player Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <User className="h-7 w-7 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-lg">
              {playerIdentity.firstName} {playerIdentity.lastName}
            </p>
            <div className="flex gap-2">
              <Badge variant="outline">{playerIdentity.playerType}</Badge>
              {enrollment && (
                <Badge
                  variant={
                    enrollment.status === "active" ? "default" : "secondary"
                  }
                >
                  {enrollment.status}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Player identity details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  placeholder="First name"
                  value={formData.firstName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  placeholder="Last name"
                  value={formData.lastName}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  onChange={(e) =>
                    setFormData({ ...formData, dateOfBirth: e.target.value })
                  }
                  type="date"
                  value={formData.dateOfBirth}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      gender: value as "male" | "female" | "other",
                    })
                  }
                  value={formData.gender}
                >
                  <SelectTrigger id="gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enrollment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Enrollment Details</CardTitle>
            <CardDescription>Organization-specific information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ageGroup">Age Group</Label>
              <Input
                id="ageGroup"
                onChange={(e) =>
                  setFormData({ ...formData, ageGroup: e.target.value })
                }
                placeholder="e.g., U12, U14, Senior"
                value={formData.ageGroup}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coachNotes">Coach Notes</Label>
              <Textarea
                id="coachNotes"
                onChange={(e) =>
                  setFormData({ ...formData, coachNotes: e.target.value })
                }
                placeholder="Notes from coaches..."
                rows={3}
                value={formData.coachNotes}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminNotes">Admin Notes</Label>
              <Textarea
                id="adminNotes"
                onChange={(e) =>
                  setFormData({ ...formData, adminNotes: e.target.value })
                }
                placeholder="Administrative notes..."
                rows={3}
                value={formData.adminNotes}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
