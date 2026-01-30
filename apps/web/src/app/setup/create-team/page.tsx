"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Trophy, Users } from "lucide-react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
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

const AGE_GROUPS = [
  "U6",
  "U8",
  "U10",
  "U12",
  "U14",
  "U16",
  "U18",
  "Minor",
  "Adult",
  "Senior",
];

function SetupCreateTeamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId");
  const orgName = searchParams.get("orgName");

  const updateSetupStep = useMutation(api.models.setup.updateSetupStep);
  const createTeam = useMutation(api.models.teams.createTeam);

  // Get organization data for supported sports
  const organization = useQuery(
    api.models.organizations.getOrganization,
    orgId ? { organizationId: orgId } : "skip"
  );

  // Get available sports from reference data
  const availableSports = useQuery(api.models.referenceData.getSports, {});

  // Create sport code to name mapping
  const sportCodeToName = useMemo(() => {
    if (!availableSports) {
      return new Map<string, string>();
    }
    return new Map(availableSports.map((sport) => [sport.code, sport.name]));
  }, [availableSports]);

  // Filter available sports to organization's supported sports
  const supportedSports = useMemo(() => {
    if (!(organization?.supportedSports && availableSports)) {
      return [];
    }
    return organization.supportedSports.map((code) => ({
      code,
      name: sportCodeToName.get(code) || code,
    }));
  }, [organization?.supportedSports, availableSports, sportCodeToName]);

  const [formData, setFormData] = useState({
    name: "",
    sport: "",
    ageGroup: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      await updateSetupStep({ step: "invite" });
      router.push(
        `/setup/invite?orgId=${encodeURIComponent(orgId || "")}&orgName=${encodeURIComponent(orgName || "")}` as Route
      );
    } catch (error) {
      console.error("Failed to skip:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a team name.");
      return;
    }

    if (!formData.sport) {
      toast.error("Please select a sport.");
      return;
    }

    if (!formData.ageGroup) {
      toast.error("Please select an age group.");
      return;
    }

    if (!orgId) {
      toast.error("Organization not found. Please go back and try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createTeam({
        name: formData.name.trim(),
        organizationId: orgId,
        sport: formData.sport,
        ageGroup: formData.ageGroup,
        season: new Date().getFullYear().toString(),
        isActive: true,
      });

      toast.success(`Team "${formData.name}" created successfully!`);

      await updateSetupStep({ step: "invite" });
      router.push(
        `/setup/invite?orgId=${encodeURIComponent(orgId)}&orgName=${encodeURIComponent(orgName || "")}` as Route
      );
    } catch (error) {
      console.error("Failed to create team:", error);
      toast.error("Failed to create team. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set default sport when supported sports are loaded
  useEffect(() => {
    if (supportedSports.length > 0 && !formData.sport) {
      setFormData((prev) => ({ ...prev, sport: supportedSports[0].code }));
    }
  }, [supportedSports, formData.sport]);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create Your First Team</CardTitle>
          <CardDescription className="text-base">
            Set up your first team for{" "}
            {orgName ? (
              <span className="font-medium">{orgName}</span>
            ) : (
              "your organization"
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Team form */}
          <div className="space-y-4">
            {/* Team Name */}
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                disabled={isSubmitting}
                id="team-name"
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., U14 Boys Development"
                value={formData.name}
              />
            </div>

            {/* Sport */}
            <div className="space-y-2">
              <Label htmlFor="team-sport">Sport</Label>
              {supportedSports.length > 0 ? (
                <Select
                  disabled={isSubmitting}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, sport: value }))
                  }
                  value={formData.sport}
                >
                  <SelectTrigger id="team-sport">
                    <SelectValue placeholder="Select sport" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedSports.map((sport) => (
                      <SelectItem key={sport.code} value={sport.code}>
                        {sport.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex h-10 items-center rounded-md border bg-muted px-3">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground text-sm">
                    Loading sports...
                  </span>
                </div>
              )}
            </div>

            {/* Age Group */}
            <div className="space-y-2">
              <Label htmlFor="team-age-group">Age Group</Label>
              <Select
                disabled={isSubmitting}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, ageGroup: value }))
                }
                value={formData.ageGroup}
              >
                <SelectTrigger id="team-age-group">
                  <SelectValue placeholder="Select age group" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_GROUPS.map((age) => (
                    <SelectItem key={age} value={age}>
                      {age}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Help text */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex gap-3">
              <Users className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">
                  You can add more teams later
                </p>
                <p className="text-muted-foreground text-sm">
                  This creates your first team. You can add more teams,
                  configure schedules, and assign players from the admin
                  dashboard.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
            <Button
              className="flex-1"
              disabled={isSubmitting}
              onClick={handleSkip}
              variant="outline"
            >
              Skip for Now
            </Button>
            <Button
              className="flex-1"
              disabled={
                isSubmitting ||
                !formData.name.trim() ||
                !formData.sport ||
                !formData.ageGroup
              }
              onClick={handleCreateTeam}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Team"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetupCreateTeamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader />
        </div>
      }
    >
      <SetupCreateTeamContent />
    </Suspense>
  );
}
