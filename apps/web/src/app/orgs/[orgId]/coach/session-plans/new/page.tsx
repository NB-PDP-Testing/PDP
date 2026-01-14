"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Sparkles } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
import { authClient } from "@/lib/auth-client";

export default function GenerateSessionPlanPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const [teamId, setTeamId] = useState<string>("");
  const [teamName, setTeamName] = useState<string>("");
  const [focusArea, setFocusArea] = useState<string>("");
  const [duration, setDuration] = useState<number>(90);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch coach's teams
  const coachAssignments = useQuery(
    api.models.coaches.getCoachAssignments,
    userId ? { userId } : "skip"
  );

  const generatePlan = useMutation(api.models.sessionPlans.generateAndSave);

  const handleTeamChange = (value: string) => {
    setTeamId(value);
    // Find team name from assignments
    const assignment = coachAssignments?.find((a) => a.teamId === value);
    if (assignment) {
      setTeamName(assignment.teamName || "");
    }
  };

  const handleGenerate = async () => {
    if (!(teamId && teamName)) {
      toast.error("Please select a team");
      return;
    }

    setIsGenerating(true);

    try {
      const planId = await generatePlan({
        organizationId: orgId,
        teamId,
        teamName,
        ageGroup: undefined,
        playerCount: 20, // Default - could be enhanced to fetch from team
        focusArea: focusArea || undefined,
        duration,
      });

      toast.success("Session plan is being generated!");

      // Redirect to plan detail page
      router.push(`/orgs/${orgId}/coach/session-plans/${planId}`);
    } catch (error) {
      console.error("Failed to generate plan:", error);
      toast.error("Failed to generate session plan. Please try again.");
      setIsGenerating(false);
    }
  };

  if (!userId || coachAssignments === undefined) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <div className="mb-6">
        <h1 className="font-bold text-3xl">Generate Session Plan</h1>
        <p className="text-muted-foreground">
          Create an AI-powered training session plan for your team
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
          <CardDescription>
            Provide information about your training session
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="team">Team *</Label>
            <Select onValueChange={handleTeamChange} value={teamId}>
              <SelectTrigger id="team">
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {coachAssignments?.map((assignment) => (
                  <SelectItem key={assignment.teamId} value={assignment.teamId}>
                    {assignment.teamName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="focusArea">Focus Area (Optional)</Label>
            <Input
              id="focusArea"
              onChange={(e) => setFocusArea(e.target.value)}
              placeholder="e.g., Passing, Defensive shape, Set pieces"
              value={focusArea}
            />
            <p className="text-muted-foreground text-sm">
              What specific skill or tactic do you want to focus on?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Session Duration</Label>
            <Select
              onValueChange={(value) => setDuration(Number.parseInt(value, 10))}
              value={duration.toString()}
            >
              <SelectTrigger id="duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
                <SelectItem value="120">120 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4">
            <Button
              className="w-full"
              disabled={isGenerating || !teamId}
              onClick={handleGenerate}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Session Plan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
