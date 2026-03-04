"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Mic,
  Pencil,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type FeedbackState = "initial" | "applied" | "editing" | "kept";

const ORIGINAL_TEXT =
  "Emma did really well today in training. Her tackling has improved a lot.";

const SUGGESTED_TEXT =
  "Emma's shoulder positioning in tackles has improved significantly — she's now winning 7/10 duels vs 4/10 last month. Next session: work on timing her approach in 1v1 situations to maintain body balance.";

const QUALITY_DIMENSIONS = [
  { name: "Specificity", original: 28, suggested: 85, weight: "25%" },
  { name: "Actionability", original: 15, suggested: 82, weight: "20%" },
  { name: "Observational Depth", original: 35, suggested: 78, weight: "20%" },
  {
    name: "Developmental Orientation",
    original: 60,
    suggested: 75,
    weight: "15%",
  },
  { name: "Constructive Balance", original: 55, suggested: 70, weight: "10%" },
  { name: "Player-Centricity", original: 50, suggested: 72, weight: "10%" },
];

export function InlineQualityFeedback({ color }: { color: string }) {
  const [feedbackState, setFeedbackState] = useState<FeedbackState>("initial");
  const [showDimensions, setShowDimensions] = useState(false);

  const originalScore = 42;
  const suggestedScore = 78;
  const currentScore =
    feedbackState === "applied" || feedbackState === "editing"
      ? suggestedScore
      : originalScore;

  const currentText =
    feedbackState === "applied" ? SUGGESTED_TEXT : ORIGINAL_TEXT;

  return (
    <div className="space-y-4">
      {/* Context */}
      <p className="text-center text-gray-500 text-xs">
        This feedback appears during insight creation when quality score is
        below 70. The coach can apply, edit, or keep their original text.
      </p>

      {/* Mocked Insight Creation Flow */}
      <Card className="overflow-hidden shadow-lg">
        <CardContent className="p-0">
          {/* Mock header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: `${color}10` }}
          >
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4" style={{ color }} />
              <span className="font-medium text-gray-900 text-sm">
                Voice Note for Emma Murphy
              </span>
            </div>
            <Badge
              className="text-xs"
              style={{
                backgroundColor:
                  currentScore >= 70
                    ? `${color}15`
                    : currentScore >= 40
                      ? "#fef3c720"
                      : "#fee2e220",
                color:
                  currentScore >= 70
                    ? color
                    : currentScore >= 40
                      ? "#b45309"
                      : "#dc2626",
                borderColor:
                  currentScore >= 70
                    ? `${color}30`
                    : currentScore >= 40
                      ? "#fde68a"
                      : "#fecaca",
              }}
              variant="outline"
            >
              Quality: {currentScore}/100
            </Badge>
          </div>

          {/* Transcription area */}
          <div className="border-b px-4 py-3">
            <p className="mb-1 font-medium text-gray-500 text-xs">
              Transcription:
            </p>
            <p
              className={`text-gray-800 text-sm leading-relaxed ${
                feedbackState === "applied" ? "rounded-lg bg-green-50 p-2" : ""
              }`}
            >
              {feedbackState === "applied" && (
                <Check className="mr-1 mb-0.5 inline h-3.5 w-3.5 text-green-600" />
              )}
              &ldquo;{currentText}&rdquo;
            </p>
          </div>

          {/* Quality feedback panel */}
          {feedbackState === "initial" && (
            <div className="border-b bg-blue-50/50 px-4 py-4">
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      Make this more impactful
                    </p>
                    <p className="mt-1 text-gray-600 text-xs">
                      Your note captures the improvement but could help Emma
                      (and parents) understand more:
                    </p>
                  </div>

                  {/* Weak dimensions */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span className="text-gray-600">
                        <span className="font-medium">Specificity:</span> What
                        tackling technique improved?
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                      <span className="text-gray-600">
                        <span className="font-medium">Actionability:</span> What
                        should she focus on next?
                      </span>
                    </div>
                  </div>

                  {/* Example rewrite */}
                  <div className="rounded-lg border border-blue-200 bg-white p-3">
                    <p className="mb-1 font-medium text-blue-700 text-xs">
                      <Sparkles className="mr-1 inline h-3 w-3" />
                      Suggested improvement:
                    </p>
                    <p className="text-gray-700 text-sm italic leading-relaxed">
                      &ldquo;{SUGGESTED_TEXT}&rdquo;
                    </p>
                  </div>

                  {/* Score preview */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-gray-500">Current</span>
                        <span className="font-medium text-amber-600">
                          {originalScore}/100
                        </span>
                      </div>
                      <Progress className="h-1.5" value={originalScore} />
                    </div>
                    <span className="text-gray-300">→</span>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-gray-500">After applying</span>
                        <span className="font-medium" style={{ color }}>
                          {suggestedScore}/100
                        </span>
                      </div>
                      <Progress className="h-1.5" value={suggestedScore} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      className="h-8 gap-1 text-xs"
                      onClick={() => setFeedbackState("applied")}
                      size="sm"
                      style={{ backgroundColor: color, color: "white" }}
                    >
                      <Check className="h-3 w-3" />
                      Apply Suggestion
                    </Button>
                    <Button
                      className="h-8 gap-1 text-xs"
                      onClick={() => setFeedbackState("editing")}
                      size="sm"
                      variant="outline"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit Myself
                    </Button>
                    <Button
                      className="h-8 text-gray-500 text-xs"
                      onClick={() => setFeedbackState("kept")}
                      size="sm"
                      variant="ghost"
                    >
                      Keep As-Is
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success state */}
          {feedbackState === "applied" && (
            <div className="border-b bg-green-50 px-4 py-3">
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <Check className="h-4 w-4" />
                <span>
                  Suggestion applied — quality improved from{" "}
                  <span className="font-semibold">{originalScore}</span> to{" "}
                  <span className="font-semibold">{suggestedScore}</span>
                </span>
              </div>
            </div>
          )}

          {/* Editing state */}
          {feedbackState === "editing" && (
            <div className="border-b bg-blue-50/30 px-4 py-3">
              <div className="flex items-center gap-2 text-blue-700 text-sm">
                <Pencil className="h-4 w-4" />
                <span>
                  Edit your insight — quality score updates live as you type
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Progress className="h-1.5 flex-1" value={suggestedScore} />
                <span className="font-medium text-sm" style={{ color }}>
                  {suggestedScore}/100
                </span>
              </div>
            </div>
          )}

          {/* Kept as-is state */}
          {feedbackState === "kept" && (
            <div className="border-b bg-gray-50 px-4 py-3">
              <p className="text-gray-500 text-sm">
                Saved as-is. No judgment — you know your players best.
              </p>
            </div>
          )}

          {/* Mock save button */}
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              className="text-xs"
              onClick={() => setShowDimensions(!showDimensions)}
              size="sm"
              variant="ghost"
            >
              {showDimensions ? (
                <ChevronUp className="mr-1 h-3 w-3" />
              ) : (
                <ChevronDown className="mr-1 h-3 w-3" />
              )}
              Quality breakdown
            </Button>
            <Button
              className="gap-1"
              size="sm"
              style={{ backgroundColor: color, color: "white" }}
            >
              Save Insight
            </Button>
          </div>

          {/* Quality dimension breakdown (expandable) */}
          {showDimensions && (
            <div className="border-t px-4 py-3">
              <div className="space-y-2">
                {QUALITY_DIMENSIONS.map((dim) => {
                  const score =
                    feedbackState === "applied" || feedbackState === "editing"
                      ? dim.suggested
                      : dim.original;
                  return (
                    <div className="flex items-center gap-3" key={dim.name}>
                      <span className="w-40 text-gray-600 text-xs">
                        {dim.name}{" "}
                        <span className="text-gray-400">({dim.weight})</span>
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${score}%`,
                            backgroundColor:
                              score >= 70
                                ? color
                                : score >= 40
                                  ? "#f59e0b"
                                  : "#ef4444",
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-gray-500 text-xs">
                        {score}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset button */}
      {feedbackState !== "initial" && (
        <div className="text-center">
          <Button
            onClick={() => {
              setFeedbackState("initial");
              setShowDimensions(false);
            }}
            size="sm"
            variant="outline"
          >
            Reset demo
          </Button>
        </div>
      )}

      {/* Research backing */}
      <Card className="border-gray-200 bg-gray-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Why This Is the Highest-ROI Feature
          </CardTitle>
          <CardDescription className="text-xs">
            Research supporting inline quality feedback
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-gray-500 text-xs">
          <p>
            <span className="font-medium">Textio 2024:</span> Quality disparity
            is a bigger predictor of outcomes than frequency disparity. 63% of
            employees receiving low-quality feedback leave within 12 months.
          </p>
          <p>
            <span className="font-medium">Culture Amp:</span> &ldquo;AI Suggest
            Improvements&rdquo; feature increased feedback quality scores by 34%
            in 6 months.
          </p>
          <p>
            <span className="font-medium">Key insight:</span> Quality scoring
            without real-time feedback is like grading essays but never showing
            the student their grade. Inline feedback closes the loop.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
