"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Loader2, MessageSquare, Send } from "lucide-react";
import type { Route } from "next";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";

export default function ComposeMessagePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = params.orgId as string;
  const currentUser = useCurrentUser();
  const { data: session } = authClient.useSession();

  // Get URL params for insight pre-fill (US-020)
  const urlType = searchParams?.get("type");
  const urlVoiceNoteId = searchParams?.get(
    "voiceNoteId"
  ) as Id<"voiceNotes"> | null;
  const urlInsightId = searchParams?.get("insightId");
  // Not currently used - player is pre-selected from insight data
  const _urlPlayerIdentityId = searchParams?.get("playerIdentityId");

  // Form state
  const [selectedPlayerId, setSelectedPlayerId] =
    useState<Id<"playerIdentities"> | null>(null);
  const [selectedGuardianIds, setSelectedGuardianIds] = useState<
    Set<Id<"guardianIdentities">>
  >(new Set());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sessionType, setSessionType] = useState<string>("");
  const [sessionDate, setSessionDate] = useState<string>("");
  const [developmentArea, setDevelopmentArea] = useState<string>("");
  const [deliveryMethod, setDeliveryMethod] = useState<
    "in_app" | "email" | "both"
  >("both");
  const [priority, setPriority] = useState<"normal" | "high">("normal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fallback: use session user ID if Convex user query returns null
  // TODO: Will be needed for coach assignment verification in future
  const _userId = currentUser?._id || session?.user?.id;

  // Fetch players for coach
  const allPlayersData = useQuery(
    api.models.orgPlayerEnrollments.getPlayersForOrg,
    orgId ? { organizationId: orgId } : "skip"
  );

  // Fetch guardians for selected player
  const guardiansData = useQuery(
    api.models.guardianPlayerLinks.getGuardiansForPlayer,
    selectedPlayerId ? { playerIdentityId: selectedPlayerId } : "skip"
  );

  // Fetch voice note for insight pre-fill (US-020)
  const voiceNoteData = useQuery(
    api.models.voiceNotes.getVoiceNoteById,
    urlType === "insight" && urlVoiceNoteId
      ? { noteId: urlVoiceNoteId }
      : "skip"
  );

  // Create message mutation
  const createDirectMessage = useMutation(
    api.models.coachParentMessages.createDirectMessage
  );

  // Handle URL param pre-fill for insight sharing (US-020)
  useEffect(() => {
    if (urlType === "insight" && voiceNoteData && urlInsightId) {
      // Find the matching insight
      const insight = voiceNoteData.insights.find((i) => i.id === urlInsightId);

      if (insight) {
        // Pre-fill subject
        if (!subject) {
          setSubject(insight.title);
        }

        // Pre-fill body with description and recommended update
        if (!body) {
          let bodyText = insight.description;
          if (insight.recommendedUpdate) {
            bodyText += `\n\n${insight.recommendedUpdate}`;
          }
          setBody(bodyText);
        }

        // Pre-select the player
        if (insight.playerIdentityId && !selectedPlayerId) {
          setSelectedPlayerId(insight.playerIdentityId);
        }
      }
    }
  }, [urlType, voiceNoteData, urlInsightId, subject, body, selectedPlayerId]);

  // Handle guardian selection
  const toggleGuardian = (guardianId: Id<"guardianIdentities">) => {
    const newSet = new Set(selectedGuardianIds);
    if (newSet.has(guardianId)) {
      newSet.delete(guardianId);
    } else {
      newSet.add(guardianId);
    }
    setSelectedGuardianIds(newSet);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlayerId) {
      toast.error("Please select a player");
      return;
    }

    if (selectedGuardianIds.size === 0) {
      toast.error("Please select at least one guardian");
      return;
    }

    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }

    if (!body.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSubmitting(true);

    try {
      await createDirectMessage({
        organizationId: orgId,
        playerIdentityId: selectedPlayerId,
        recipientGuardianIds: Array.from(selectedGuardianIds),
        subject: subject.trim(),
        body: body.trim(),
        context:
          sessionType || sessionDate || developmentArea
            ? {
                sessionType: sessionType || undefined,
                sessionDate: sessionDate || undefined,
                developmentArea: developmentArea || undefined,
              }
            : undefined,
        deliveryMethod,
        priority,
        sendImmediately: true,
      });

      toast.success("Message sent successfully!");
      router.push(`/orgs/${orgId}/coach/messages` as Route);
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPlayer = allPlayersData?.find(
    (p) => p._id === selectedPlayerId
  );

  return (
    <div className="container mx-auto max-w-4xl space-y-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            onClick={() =>
              router.push(`/orgs/${orgId}/coach/messages` as Route)
            }
            variant="ghost"
          >
            <ArrowLeft size={20} />
          </Button>
          <MessageSquare className="text-blue-600" size={32} />
          <div>
            <h1 className="font-bold text-3xl text-foreground">
              Compose Message
            </h1>
            <p className="text-gray-600 text-sm">
              Send a message to a player&apos;s guardian(s)
            </p>
          </div>
        </div>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Player Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Player</CardTitle>
            <CardDescription>
              Choose the player this message is about
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allPlayersData ? (
              allPlayersData.length === 0 ? (
                <Empty>
                  <EmptyContent>
                    <EmptyMedia variant="icon">
                      <MessageSquare className="h-6 w-6" />
                    </EmptyMedia>
                    <EmptyTitle>No players found</EmptyTitle>
                    <EmptyDescription>
                      There are no players enrolled in this organization yet.
                    </EmptyDescription>
                  </EmptyContent>
                </Empty>
              ) : (
                <Select
                  onValueChange={(value) =>
                    setSelectedPlayerId(value as Id<"playerIdentities">)
                  }
                  value={selectedPlayerId || undefined}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a player..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allPlayersData.map((player) => (
                      <SelectItem key={player._id} value={player._id}>
                        {player.firstName} {player.lastName}
                        {player.ageGroup && ` (${player.ageGroup})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            ) : (
              <div className="py-8 text-center text-gray-500">
                <Loader2
                  className="mx-auto mb-4 animate-spin text-gray-400"
                  size={32}
                />
                <p>Loading players...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guardian Selection */}
        {selectedPlayerId && (
          <Card>
            <CardHeader>
              <CardTitle>Select Recipients</CardTitle>
              <CardDescription>
                Choose which guardian(s) should receive this message
              </CardDescription>
            </CardHeader>
            <CardContent>
              {guardiansData ? (
                guardiansData.length === 0 ? (
                  <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
                    <p className="font-semibold">No guardians found</p>
                    <p className="text-sm">
                      This player has no linked guardians. Please add guardians
                      in the player management section before sending messages.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {guardiansData.map(
                      ({ link, guardian }: { link: any; guardian: any }) => (
                        <div
                          className="flex items-start gap-3 rounded-lg border p-4 hover:bg-accent"
                          key={guardian._id}
                        >
                          <Checkbox
                            checked={selectedGuardianIds.has(guardian._id)}
                            id={guardian._id}
                            onCheckedChange={() => toggleGuardian(guardian._id)}
                          />
                          <div className="flex-1">
                            <label
                              className="cursor-pointer font-medium"
                              htmlFor={guardian._id}
                            >
                              {guardian.firstName} {guardian.lastName}
                            </label>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <Badge variant="outline">
                                {link.relationship || "Guardian"}
                              </Badge>
                              {link.isPrimary && (
                                <Badge variant="default">Primary</Badge>
                              )}
                              {guardian.email && (
                                <span className="text-gray-600 text-sm">
                                  {guardian.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <Loader2
                    className="mx-auto mb-4 animate-spin text-gray-400"
                    size={32}
                  />
                  <p>Loading guardians...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Insight Reference Card (US-020) */}
        {urlType === "insight" &&
          voiceNoteData &&
          urlInsightId &&
          voiceNoteData.insights.find((i) => i.id === urlInsightId) && (
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-900">
                  <MessageSquare size={20} />
                  Voice Note Insight Reference
                </CardTitle>
                <CardDescription className="text-purple-700">
                  This message was pre-filled from a voice note insight
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const insight = voiceNoteData.insights.find(
                    (i) => i.id === urlInsightId
                  );
                  return insight ? (
                    <div className="space-y-3">
                      <div>
                        <p className="mb-1 font-semibold text-purple-900">
                          {insight.title}
                        </p>
                        <p className="text-purple-800 text-sm">
                          {insight.description}
                        </p>
                      </div>
                      {insight.recommendedUpdate && (
                        <div className="rounded-lg border-2 border-purple-300 bg-white p-3">
                          <p className="mb-1 font-medium text-purple-900 text-xs uppercase">
                            Recommended Action
                          </p>
                          <p className="text-purple-800 text-sm">
                            {insight.recommendedUpdate}
                          </p>
                        </div>
                      )}
                      {insight.category && (
                        <div className="flex gap-2">
                          <Badge
                            className="bg-purple-200 text-purple-900"
                            variant="outline"
                          >
                            {insight.category}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}
              </CardContent>
            </Card>
          )}

        {/* Message Content */}
        {selectedPlayerId && guardiansData && guardiansData.length > 0 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Message Details</CardTitle>
                <CardDescription>
                  Write your message to the guardian(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Great progress in training today"
                    required
                    value={subject}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">Message *</Label>
                  <Textarea
                    className="min-h-[200px]"
                    id="body"
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={`Write your message here...\n\nExample: ${selectedPlayer ? selectedPlayer.firstName : "The player"} showed excellent improvement during today's training session. Their passing accuracy has improved significantly and they demonstrated great teamwork.`}
                    required
                    value={body}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Optional Context */}
            <Card>
              <CardHeader>
                <CardTitle>Context (Optional)</CardTitle>
                <CardDescription>
                  Add additional details about the session or development area
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionType">Session Type</Label>
                  <Select onValueChange={setSessionType} value={sessionType}>
                    <SelectTrigger id="sessionType">
                      <SelectValue placeholder="Select session type (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="match">Match</SelectItem>
                      <SelectItem value="assessment">Assessment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionDate">Session Date</Label>
                  <Input
                    id="sessionDate"
                    onChange={(e) => setSessionDate(e.target.value)}
                    type="date"
                    value={sessionDate}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="developmentArea">Development Area</Label>
                  <Select
                    onValueChange={setDevelopmentArea}
                    value={developmentArea}
                  >
                    <SelectTrigger id="developmentArea">
                      <SelectValue placeholder="Select development area (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">
                        Technical Skills
                      </SelectItem>
                      <SelectItem value="tactical">
                        Tactical Awareness
                      </SelectItem>
                      <SelectItem value="physical">Physical Fitness</SelectItem>
                      <SelectItem value="mental">
                        Mental/Psychological
                      </SelectItem>
                      <SelectItem value="teamwork">Teamwork</SelectItem>
                      <SelectItem value="leadership">Leadership</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Settings</CardTitle>
                <CardDescription>
                  Choose how this message should be delivered
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Delivery Method</Label>
                  <RadioGroup
                    onValueChange={(value) =>
                      setDeliveryMethod(value as "in_app" | "email" | "both")
                    }
                    value={deliveryMethod}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem id="in_app" value="in_app" />
                      <Label className="font-normal" htmlFor="in_app">
                        In-app notification only
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem id="email" value="email" />
                      <Label className="font-normal" htmlFor="email">
                        Email only
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem id="both" value="both" />
                      <Label className="font-normal" htmlFor="both">
                        Both in-app and email (recommended)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label>Priority</Label>
                  <RadioGroup
                    onValueChange={(value) =>
                      setPriority(value as "normal" | "high")
                    }
                    value={priority}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem id="normal" value="normal" />
                      <Label className="font-normal" htmlFor="normal">
                        Normal
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem id="high" value="high" />
                      <Label className="font-normal" htmlFor="high">
                        High (urgent or important)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button
                disabled={isSubmitting}
                onClick={() =>
                  router.push(`/orgs/${orgId}/coach/messages` as Route)
                }
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={16} />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2" size={16} />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
