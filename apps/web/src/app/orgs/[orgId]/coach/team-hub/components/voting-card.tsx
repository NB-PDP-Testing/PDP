"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Check, CheckCircle2, Clock, Trophy, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CardSkeleton } from "@/components/loading";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

type VotingCardProps = {
  decisionId: Id<"teamDecisions">;
  organizationId: string;
  currentUserId: string;
  isHeadCoach: boolean;
};

export function VotingCard({
  decisionId,
  organizationId,
  currentUserId,
  isHeadCoach,
}: VotingCardProps) {
  // State
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [isVoting, setIsVoting] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Queries
  const decisions = useQuery(api.models.teamDecisions.getTeamDecisions, {
    teamId: organizationId, // Note: This should actually be teamId, not orgId
    status: undefined,
  });
  const votes = useQuery(api.models.teamDecisions.getDecisionVotes, {
    decisionId,
  });

  // Mutations
  const castVoteMutation = useMutation(api.models.teamDecisions.castVote);
  const finalizeDecisionMutation = useMutation(
    api.models.teamDecisions.finalizeDecision
  );

  // Find the current decision
  const decision = decisions?.find((d) => d._id === decisionId);

  // Find user's vote
  const userVote = votes?.find((v) => v.userId === currentUserId);

  // Loading state
  if (decisions === undefined || votes === undefined) {
    return <CardSkeleton />;
  }

  // Decision not found
  if (!decision) {
    return null;
  }

  // Calculate vote percentages
  const totalPoints = decision.options.reduce(
    (sum, opt) => sum + opt.votePoints,
    0
  );

  const optionsWithPercentage = decision.options.map((opt) => {
    const percentage =
      totalPoints > 0 ? Math.round((opt.votePoints / totalPoints) * 100) : 0;
    return { ...opt, percentage };
  });

  // Handle vote casting
  const handleCastVote = async () => {
    if (!selectedOption) {
      return;
    }

    setIsVoting(true);
    try {
      await castVoteMutation({
        decisionId,
        optionId: selectedOption,
        comment: comment || undefined,
      });
      toast.success(userVote ? "Vote updated!" : "Vote cast successfully!");
      setSelectedOption(null);
      setComment("");
    } catch (error) {
      toast.error("Failed to cast vote");
      console.error(error);
    } finally {
      setIsVoting(false);
    }
  };

  // Handle finalize
  const handleFinalize = async () => {
    setIsFinalizing(true);
    try {
      await finalizeDecisionMutation({ decisionId });
      toast.success("Decision finalized!");
      setShowFinalizeDialog(false);
    } catch (error) {
      toast.error("Failed to finalize decision");
      console.error(error);
    } finally {
      setIsFinalizing(false);
    }
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge className="bg-green-100 text-green-700">
            <Clock className="mr-1 h-3 w-3" />
            Open
          </Badge>
        );
      case "closed":
        return (
          <Badge className="bg-gray-100 text-gray-700">
            <XCircle className="mr-1 h-3 w-3" />
            Closed
          </Badge>
        );
      case "finalized":
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Finalized
          </Badge>
        );
      default:
        return null;
    }
  };

  // Format deadline
  const deadlineText = decision.deadline
    ? formatDistanceToNow(new Date(decision.deadline), { addSuffix: true })
    : null;

  // Check if deadline has passed
  const isPastDeadline = decision.deadline
    ? Date.now() > decision.deadline
    : false;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <CardTitle className="text-xl">{decision.title}</CardTitle>
              {getStatusBadge(decision.status)}
            </div>

            {decision.description && (
              <p className="text-muted-foreground text-sm">
                {decision.description}
              </p>
            )}

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
              <span>Created by {decision.createdByName}</span>
              <span>
                {formatDistanceToNow(new Date(decision.createdAt), {
                  addSuffix: true,
                })}
              </span>
              {deadlineText && (
                <span className={isPastDeadline ? "text-red-600" : ""}>
                  {isPastDeadline ? "Ended" : "Ends"} {deadlineText}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Voting Options */}
        <div className="space-y-4">
          {decision.status === "open" && !userVote ? (
            // Voting UI (user hasn't voted)
            <RadioGroup
              onValueChange={setSelectedOption}
              value={selectedOption || undefined}
            >
              {optionsWithPercentage.map((option) => (
                <div className="space-y-2" key={option.id}>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem id={option.id} value={option.id} />
                    <div className="flex-1 space-y-1">
                      <Label
                        className="cursor-pointer font-medium text-sm leading-tight"
                        htmlFor={option.id}
                      >
                        {option.label}
                      </Label>
                      {option.description && (
                        <p className="text-muted-foreground text-xs">
                          {option.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Progress className="h-2" value={option.percentage} />
                        <span className="text-muted-foreground text-xs">
                          {option.voteCount} votes ({option.percentage}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>
          ) : (
            // Results view (user voted or decision not open)
            <div className="space-y-3">
              {optionsWithPercentage.map((option) => {
                const isWinning =
                  decision.status === "finalized" &&
                  decision.winningOption === option.id;
                const isUserChoice = userVote?.optionId === option.id;

                return (
                  <div
                    className={`rounded-lg border p-3 ${
                      isWinning
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200"
                    }`}
                    key={option.id}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isUserChoice && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                        <span className="font-medium text-sm">
                          {option.label}
                        </span>
                        {isWinning && (
                          <Trophy className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {option.voteCount} votes
                      </span>
                    </div>
                    {option.description && (
                      <p className="mb-2 text-muted-foreground text-xs">
                        {option.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Progress className="h-2" value={option.percentage} />
                      <span className="text-muted-foreground text-xs">
                        {option.percentage}%
                      </span>
                    </div>
                    {decision.votingType === "weighted" && (
                      <p className="mt-1 text-muted-foreground text-xs">
                        {option.votePoints} points
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Comment textarea (when voting) */}
          {decision.status === "open" && !userVote && (
            <div className="space-y-2">
              <Label className="text-sm" htmlFor="comment">
                Optional comment
              </Label>
              <Textarea
                id="comment"
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment about your vote..."
                rows={2}
                value={comment}
              />
            </div>
          )}

          {/* User's comment (if they voted with a comment) */}
          {userVote?.comment && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="font-medium text-sm">Your comment:</p>
              <p className="text-muted-foreground text-sm">
                {userVote.comment}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Cast Vote button */}
            {decision.status === "open" && !userVote && (
              <Button
                disabled={!selectedOption || isVoting}
                onClick={handleCastVote}
              >
                {isVoting ? "Casting vote..." : "Cast Vote"}
              </Button>
            )}

            {/* Change Vote button */}
            {decision.status === "open" && userVote && (
              <Button
                onClick={() => {
                  setSelectedOption(userVote.optionId);
                  setComment(userVote.comment || "");
                }}
                variant="outline"
              >
                Change Vote
              </Button>
            )}

            {/* Finalize button (head coach only, open decisions) */}
            {isHeadCoach && decision.status === "open" && (
              <Button
                onClick={() => setShowFinalizeDialog(true)}
                variant="destructive"
              >
                Finalize Decision
              </Button>
            )}
          </div>

          {/* Finalized info */}
          {decision.status === "finalized" && decision.finalizedBy && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm">
                Finalized by {decision.finalizedByName} on{" "}
                {new Date(decision.finalizedAt || 0).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Finalize confirmation dialog */}
      <AlertDialog
        onOpenChange={setShowFinalizeDialog}
        open={showFinalizeDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Decision?</AlertDialogTitle>
            <AlertDialogDescription>
              This will close the voting and mark the winning option. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isFinalizing} onClick={handleFinalize}>
              {isFinalizing ? "Finalizing..." : "Finalize"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
