"use client";

import { Check, MessageSquare, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UXAnalyticsEvents } from "@/hooks/use-ux-feature-flags";
import { useAnalytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type PreferenceVotingProps = {
  /** Unique identifier for this mockup comparison */
  mockupId: string;
  /** Human-readable name for the mockup being tested */
  mockupName: string;
  /** Whether to show the feedback form after voting */
  showFeedbackForm?: boolean;
  /** Callback when preference is selected */
  onVote?: (preference: "current" | "proposed") => void;
  /** Callback when feedback is submitted */
  onFeedback?: (feedback: string) => void;
};

/**
 * A/B preference voting component for UX mockups
 * Tracks user preferences via PostHog for data-driven decisions
 */
export function PreferenceVoting({
  mockupId,
  mockupName,
  showFeedbackForm = true,
  onVote,
  onFeedback,
}: PreferenceVotingProps) {
  const { track } = useAnalytics();
  const [vote, setVote] = useState<"current" | "proposed" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleVote = (preference: "current" | "proposed") => {
    setVote(preference);

    // Track preference in PostHog
    track(UXAnalyticsEvents.MOCKUP_PREFERENCE_SELECTED, {
      mockup_id: mockupId,
      mockup_name: mockupName,
      preference,
    });

    onVote?.(preference);
  };

  const handleFeedbackSubmit = () => {
    if (!(feedback.trim() && vote)) {
      return;
    }

    // Track feedback in PostHog
    track(UXAnalyticsEvents.MOCKUP_FEEDBACK_SUBMITTED, {
      mockup_id: mockupId,
      mockup_name: mockupName,
      preference: vote,
      feedback: feedback.trim(),
    });

    setFeedbackSubmitted(true);
    onFeedback?.(feedback.trim());
  };

  return (
    <div className="mt-6 space-y-4 rounded-lg border bg-muted/30 p-4">
      <div className="text-center">
        <p className="font-medium text-sm">Which design do you prefer?</p>
        <p className="mt-1 text-muted-foreground text-xs">
          Your feedback helps us make better decisions
        </p>
      </div>

      <div className="flex justify-center gap-4">
        <Button
          className={cn(
            "h-12 max-w-[140px] flex-1",
            vote === "current" && "bg-orange-500 hover:bg-orange-600"
          )}
          onClick={() => handleVote("current")}
          size="lg"
          variant={vote === "current" ? "default" : "outline"}
        >
          <ThumbsDown className="mr-2 h-4 w-4" />
          Current
        </Button>
        <Button
          className={cn(
            "h-12 max-w-[140px] flex-1",
            vote === "proposed" && "bg-green-500 hover:bg-green-600"
          )}
          onClick={() => handleVote("proposed")}
          size="lg"
          variant={vote === "proposed" ? "default" : "outline"}
        >
          <ThumbsUp className="mr-2 h-4 w-4" />
          Proposed
        </Button>
      </div>

      {vote && showFeedbackForm && !feedbackSubmitted && (
        <div className="fade-in slide-in-from-top-2 animate-in space-y-3 duration-200">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <MessageSquare className="h-4 w-4" />
            <span>Optional: Tell us why (helps us improve)</span>
          </div>
          <Textarea
            className="min-h-[80px] resize-none"
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What do you like or dislike about this design?"
            value={feedback}
          />
          <Button
            className="h-11 w-full"
            disabled={!feedback.trim()}
            onClick={handleFeedbackSubmit}
          >
            Submit Feedback
          </Button>
        </div>
      )}

      {feedbackSubmitted && (
        <div className="fade-in flex animate-in items-center justify-center gap-2 text-green-600 duration-200">
          <Check className="h-5 w-5" />
          <span className="font-medium">Thank you for your feedback!</span>
        </div>
      )}
    </div>
  );
}

type MultiOptionVotingProps = {
  /** Unique identifier for this comparison */
  comparisonId: string;
  /** Human-readable name for what's being compared */
  comparisonName: string;
  /** Options to vote on */
  options: Array<{
    id: string;
    label: string;
    description?: string;
  }>;
  /** Callback when option is selected */
  onVote?: (optionId: string) => void;
};

/**
 * Multi-option voting component for testing 3+ design approaches
 * Used for admin navigation testing (sidebar vs bottom sheet vs tabs)
 */
export function MultiOptionVoting({
  comparisonId,
  comparisonName,
  options,
  onVote,
}: MultiOptionVotingProps) {
  const { track } = useAnalytics();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleVote = (optionId: string) => {
    setSelectedOption(optionId);

    track(UXAnalyticsEvents.MOCKUP_PREFERENCE_SELECTED, {
      comparison_id: comparisonId,
      comparison_name: comparisonName,
      selected_option: optionId,
    });

    onVote?.(optionId);
  };

  return (
    <div className="mt-6 space-y-4 rounded-lg border bg-muted/30 p-4">
      <div className="text-center">
        <p className="font-medium text-sm">Which approach do you prefer?</p>
        <p className="mt-1 text-muted-foreground text-xs">
          Tap to select your favorite
        </p>
      </div>

      <div className="grid gap-2">
        {options.map((option) => (
          <Button
            className={cn(
              "h-auto justify-start px-4 py-3 text-left",
              selectedOption === option.id && "bg-green-500 hover:bg-green-600"
            )}
            key={option.id}
            onClick={() => handleVote(option.id)}
            variant={selectedOption === option.id ? "default" : "outline"}
          >
            <div>
              <div className="font-medium">{option.label}</div>
              {option.description && (
                <div className="mt-0.5 text-xs opacity-80">
                  {option.description}
                </div>
              )}
            </div>
            {selectedOption === option.id && (
              <Check className="ml-auto h-5 w-5" />
            )}
          </Button>
        ))}
      </div>

      {selectedOption && (
        <p className="fade-in animate-in text-center text-green-600 text-sm duration-200">
          Thanks for your vote!
        </p>
      )}
    </div>
  );
}
