"use client";

import {
  Award,
  BookOpen,
  CheckCircle2,
  Shield,
  Sparkles,
  Target,
  Undo2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * AI Coach Assistant Help Dialog
 *
 * Comprehensive guide explaining:
 * - Trust level system (0-3)
 * - How auto-apply works
 * - Category preferences
 * - Undo window and safety
 * - Adaptive learning
 */
export function CoachAIHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <BookOpen className="h-6 w-6 text-blue-600" />
            AI Coach Assistant Guide
          </DialogTitle>
          <DialogDescription>
            Learn how the AI Coach Assistant works and how to customize it for
            your coaching style
          </DialogDescription>
        </DialogHeader>

        <Tabs className="mt-4" defaultValue="overview">
          <TabsList className="grid w-full grid-cols-5 gap-1">
            <TabsTrigger className="text-xs sm:text-sm" value="overview">
              Overview
            </TabsTrigger>
            <TabsTrigger className="text-xs sm:text-sm" value="levels">
              Trust Levels
            </TabsTrigger>
            <TabsTrigger className="text-xs sm:text-sm" value="auto-apply">
              Auto-Apply
            </TabsTrigger>
            <TabsTrigger className="text-xs sm:text-sm" value="settings">
              Settings
            </TabsTrigger>
            <TabsTrigger className="text-xs sm:text-sm" value="safety">
              Safety
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent className="space-y-4" value="overview">
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold text-lg">
                  What is the AI Coach Assistant?
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  The AI Coach Assistant helps you by automatically analyzing
                  your voice notes and applying insights to player profiles. As
                  you use the system and approve summaries, it learns your
                  preferences and becomes more helpful over time.
                </p>
              </div>

              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                <h4 className="mb-2 flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-100">
                  <Sparkles className="h-4 w-4" />
                  How It Works
                </h4>
                <ol className="ml-4 space-y-2 text-blue-900 text-sm dark:text-blue-100">
                  <li className="list-decimal">
                    <strong>Record voice notes</strong> about your players
                    during or after training
                  </li>
                  <li className="list-decimal">
                    <strong>AI extracts insights</strong> like skill
                    improvements, attendance, goals
                  </li>
                  <li className="list-decimal">
                    <strong>System auto-applies</strong> high-confidence
                    insights to player profiles
                  </li>
                  <li className="list-decimal">
                    <strong>You review and undo</strong> any mistakes within 1
                    hour
                  </li>
                  <li className="list-decimal">
                    <strong>AI learns</strong> from your feedback and adapts its
                    confidence threshold
                  </li>
                </ol>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-card p-3">
                  <h4 className="mb-1 flex items-center gap-2 font-semibold text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Benefits
                  </h4>
                  <ul className="ml-4 space-y-1 text-muted-foreground text-xs">
                    <li className="list-disc">
                      Save time on manual data entry
                    </li>
                    <li className="list-disc">
                      Never forget to record observations
                    </li>
                    <li className="list-disc">
                      Share insights with parents automatically
                    </li>
                    <li className="list-disc">
                      Track player progress effortlessly
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <h4 className="mb-1 flex items-center gap-2 font-semibold text-sm">
                    <Shield className="h-4 w-4 text-blue-600" />
                    Safety First
                  </h4>
                  <ul className="ml-4 space-y-1 text-muted-foreground text-xs">
                    <li className="list-disc">
                      Injury/medical always require manual review
                    </li>
                    <li className="list-disc">
                      1-hour undo window for all changes
                    </li>
                    <li className="list-disc">
                      Complete audit trail of all actions
                    </li>
                    <li className="list-disc">
                      You control which categories auto-apply
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Trust Levels Tab */}
          <TabsContent className="space-y-4" value="levels">
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold text-lg">
                  Trust Level System
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Your trust level is earned across all clubs by consistently
                  approving parent summaries. Higher levels unlock more
                  automation features. Your level is based on your track record,
                  not time spent in the system.
                </p>
              </div>

              {/* Level 0 */}
              <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-500/20">
                      <Shield className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Level 0: New</h4>
                      <p className="text-muted-foreground text-sm">
                        Just getting started
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-gray-500 text-white" variant="secondary">
                    Level 0
                  </Badge>
                </div>
                <p className="mb-2 text-sm">
                  <strong>What happens:</strong> Manual review required for all
                  parent summaries. AI provides insights but doesn't auto-apply
                  anything.
                </p>
                <p className="text-muted-foreground text-sm">
                  <strong>Next milestone:</strong> Approve 10 summaries to reach
                  Level 1
                </p>
              </div>

              {/* Level 1 */}
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20">
                      <Sparkles className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Level 1: Learning</h4>
                      <p className="text-muted-foreground text-sm">
                        Building trust
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-blue-500 text-white" variant="secondary">
                    Level 1
                  </Badge>
                </div>
                <p className="mb-2 text-sm">
                  <strong>What happens:</strong> Quick review with AI
                  suggestions. You'll see preview badges showing what AI would
                  auto-apply. System tracks your agreement rate during a
                  20-insight preview period.
                </p>
                <p className="text-muted-foreground text-sm">
                  <strong>Next milestone:</strong> Approve 50 summaries to reach
                  Level 2 and unlock auto-send
                </p>
              </div>

              {/* Level 2 */}
              <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                      <Award className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Level 2: Trusted</h4>
                      <p className="text-muted-foreground text-sm">
                        Automation unlocked
                      </p>
                    </div>
                  </div>
                  <Badge
                    className="bg-green-500 text-white"
                    variant="secondary"
                  >
                    Level 2
                  </Badge>
                </div>
                <p className="mb-2 text-sm">
                  <strong>What happens:</strong> Auto-approve normal summaries,
                  review only sensitive insights. Can enable insight auto-apply
                  for skills, attendance, goals, and performance. Parent
                  summaries can be sent automatically.
                </p>
                <p className="text-muted-foreground text-sm">
                  <strong>Next milestone:</strong> Approve 200 summaries to
                  reach Level 3 (Expert)
                </p>
              </div>

              {/* Level 3 */}
              <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-950/30">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20">
                      <Award className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Level 3: Expert</h4>
                      <p className="text-muted-foreground text-sm">
                        Maximum automation
                      </p>
                    </div>
                  </div>
                  <Badge
                    className="bg-purple-500 text-white"
                    variant="secondary"
                  >
                    Level 3
                  </Badge>
                </div>
                <p className="mb-2 text-sm">
                  <strong>What happens:</strong> Full automation capabilities
                  (opt-in required). System has highest confidence in your
                  coaching patterns and can handle complex scenarios
                  automatically.
                </p>
                <p className="text-green-700 text-sm dark:text-green-300">
                  🎉 <strong>Maximum level reached!</strong> You have full
                  automation capabilities.
                </p>
              </div>

              <div className="rounded-lg border bg-card p-3">
                <p className="text-muted-foreground text-xs">
                  <strong>Important:</strong> Your trust level is earned across
                  all clubs. If you coach at multiple clubs, your approvals
                  count toward the same platform-wide level.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Auto-Apply Tab */}
          <TabsContent className="space-y-4" value="auto-apply">
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold text-lg">
                  How Auto-Apply Works
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  At Level 2+, the AI can automatically apply high-confidence
                  insights to player profiles. This saves you time while
                  maintaining full control through the undo window.
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border bg-card p-3">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Eligibility Requirements
                  </h4>
                  <p className="mb-2 text-muted-foreground text-sm">
                    An insight will auto-apply if ALL of these conditions are
                    met:
                  </p>
                  <ul className="ml-4 space-y-1 text-muted-foreground text-xs">
                    <li className="list-disc">
                      Your trust level is 2 or higher
                    </li>
                    <li className="list-disc">
                      AI confidence score meets your threshold (default 70%)
                    </li>
                    <li className="list-disc">
                      Category is enabled in your preferences
                    </li>
                    <li className="list-disc">
                      Not injury or medical (always require manual review)
                    </li>
                    <li className="list-disc">
                      Insight is pending (not already applied)
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-sm">
                    <Target className="h-4 w-4 text-blue-600" />
                    Confidence Scoring
                  </h4>
                  <p className="mb-3 text-muted-foreground text-sm">
                    Each insight has an AI confidence score (0-100%). Color
                    coding helps you understand the risk:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Progress className="h-2" value={90} />
                      </div>
                      <Badge className="text-green-600" variant="outline">
                        80-100%
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        High confidence - Safe to auto-apply
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Progress className="h-2" value={70} />
                      </div>
                      <Badge className="text-amber-600" variant="outline">
                        60-79%
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        Moderate - May need review
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Progress className="h-2" value={50} />
                      </div>
                      <Badge className="text-red-600" variant="outline">
                        &lt;60%
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        Low confidence - Manual review
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-sm">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    Adaptive Learning
                  </h4>
                  <p className="mb-2 text-muted-foreground text-sm">
                    Your confidence threshold automatically adjusts based on
                    your undo patterns:
                  </p>
                  <ul className="ml-4 space-y-1 text-muted-foreground text-xs">
                    <li className="list-disc">
                      <strong>Low undo rate (&lt;3%)</strong>: System lowers
                      threshold → more insights auto-apply
                    </li>
                    <li className="list-disc">
                      <strong>High undo rate (&gt;10%)</strong>: System raises
                      threshold → fewer insights auto-apply
                    </li>
                    <li className="list-disc">
                      <strong>Adjustment frequency</strong>: Evaluated daily at
                      2 AM UTC
                    </li>
                    <li className="list-disc">
                      <strong>Minimum data</strong>: Requires at least 10
                      auto-applied insights for meaningful adjustment
                    </li>
                  </ul>
                  <p className="mt-2 text-muted-foreground text-xs">
                    This personalization ensures the AI adapts to your coaching
                    style over time.
                  </p>
                </div>

                <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-blue-900 text-sm dark:text-blue-100">
                    <BookOpen className="h-4 w-4" />
                    Example: Skill Rating Update
                  </h4>
                  <div className="space-y-2 text-blue-900 text-xs dark:text-blue-100">
                    <p>
                      <strong>Voice note:</strong> "Emma's passing was excellent
                      today. Really connecting with teammates. I'd rate her
                      passing at a 4 now."
                    </p>
                    <p>
                      <strong>AI insight:</strong> Passing: 3 → 4 (Confidence:
                      85%)
                    </p>
                    <p>
                      <strong>Auto-apply:</strong> ✓ Applied automatically
                      (Level 2, Skills enabled, 85% &gt; 70% threshold)
                    </p>
                    <p>
                      <strong>Result:</strong> Emma's player profile updated.
                      You can undo within 1 hour if needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent className="space-y-4" value="settings">
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold text-lg">
                  Customizing Your AI Assistant
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Control which categories of insights can be auto-applied and
                  how your AI assistant works for each club you coach at.
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-950">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="flex items-center gap-2 font-semibold text-sm">
                      <Target className="h-4 w-4" />
                      Insight Auto-Apply Preferences
                    </h4>
                    <Badge variant="outline">Platform-wide</Badge>
                  </div>
                  <p className="mb-3 text-muted-foreground text-sm">
                    Choose which types of insights can be automatically applied
                    across all clubs:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex h-4 w-4 items-center justify-center rounded border-2 border-primary bg-primary">
                        <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Skills</p>
                        <p className="text-muted-foreground text-xs">
                          Auto-apply skill rating updates (e.g., Passing: 3 → 4)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="flex h-4 w-4 items-center justify-center rounded border-2 border-primary bg-primary">
                        <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Attendance</p>
                        <p className="text-muted-foreground text-xs">
                          Auto-apply attendance records (present/absent/late)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="flex h-4 w-4 items-center justify-center rounded border-2 border-primary bg-primary">
                        <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Goals</p>
                        <p className="text-muted-foreground text-xs">
                          Auto-apply development goal updates and milestones
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="flex h-4 w-4 items-center justify-center rounded border-2 border-primary bg-primary">
                        <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Performance</p>
                        <p className="text-muted-foreground text-xs">
                          Auto-apply performance notes and observations
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="flex h-4 w-4 items-center justify-center rounded border-2">
                        <X className="h-3 w-3" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Injury & Medical</p>
                        <p className="text-muted-foreground text-xs">
                          <strong>Always require manual review</strong> - Cannot
                          be enabled for safety
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="flex items-center gap-2 font-semibold text-sm">
                      <Shield className="h-4 w-4" />
                      Club Settings
                    </h4>
                    <Badge variant="outline">Per-club</Badge>
                  </div>
                  <p className="mb-3 text-muted-foreground text-sm">
                    Configure parent summary generation for each club:
                  </p>
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium text-sm">
                        Enable Parent Summaries
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Generate AI summaries from your voice notes to share
                        with parents
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        Skip Sensitive Insights
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Exclude injury and behavior insights from parent
                        summaries
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <h4 className="mb-2 font-semibold text-sm">
                    Why Two Setting Levels?
                  </h4>
                  <ul className="ml-4 space-y-1 text-muted-foreground text-xs">
                    <li className="list-disc">
                      <strong>Platform-wide</strong>: Your automation
                      preferences apply everywhere you coach
                    </li>
                    <li className="list-disc">
                      <strong>Per-club</strong>: Each club may have different
                      parent communication needs
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Safety Tab */}
          <TabsContent className="space-y-4" value="safety">
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold text-lg">Safety & Control</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  The system is designed with multiple safety layers to ensure
                  you always maintain full control over player data and parent
                  communications.
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-sm">
                    <Shield className="h-4 w-4 text-red-600" />
                    Injury & Medical: Always Manual
                  </h4>
                  <p className="mb-2 text-sm">
                    Injury and medical insights <strong>NEVER</strong>{" "}
                    auto-apply, regardless of trust level or confidence score.
                    This is a hard-coded safety rule.
                  </p>
                  <p className="text-muted-foreground text-xs">
                    <strong>Why?</strong> Medical information requires coach
                    judgment, parent notification, and potential external
                    consultation. AI cannot make these decisions.
                  </p>
                </div>

                <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-sm">
                    <Undo2 className="h-4 w-4 text-blue-600" />
                    1-Hour Undo Window
                  </h4>
                  <p className="mb-3 text-sm">
                    Any auto-applied insight can be undone within 1 hour. After
                    that, the change becomes permanent (though you can always
                    manually edit the player profile).
                  </p>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>How to undo:</strong>
                    </p>
                    <ol className="ml-4 space-y-1 text-xs">
                      <li className="list-decimal">
                        Go to Voice Notes → AI Insights → Auto-Applied tab
                      </li>
                      <li className="list-decimal">
                        Find the insight you want to undo
                      </li>
                      <li className="list-decimal">
                        Click [Undo] button (enabled for 1 hour after
                        application)
                      </li>
                      <li className="list-decimal">
                        Select why you're undoing (helps AI learn)
                      </li>
                      <li className="list-decimal">
                        Confirm - player profile reverts to previous value
                      </li>
                    </ol>
                    <p className="text-muted-foreground text-xs">
                      <strong>Undo reasons:</strong> Wrong player, Wrong rating,
                      Insight incorrect, Other
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-950">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-sm">
                    <BookOpen className="h-4 w-4 text-purple-600" />
                    Complete Audit Trail
                  </h4>
                  <p className="mb-2 text-sm">
                    Every auto-applied insight creates a permanent audit record
                    showing:
                  </p>
                  <ul className="ml-4 space-y-1 text-muted-foreground text-xs">
                    <li className="list-disc">
                      What changed (field, previous value, new value)
                    </li>
                    <li className="list-disc">When it changed (timestamp)</li>
                    <li className="list-disc">Who triggered it (coach ID)</li>
                    <li className="list-disc">
                      AI confidence score at time of application
                    </li>
                    <li className="list-disc">If/when it was undone and why</li>
                  </ul>
                  <p className="mt-2 text-muted-foreground text-xs">
                    This audit trail supports compliance, coach accountability,
                    and continuous improvement of the AI system.
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <h4 className="mb-2 font-semibold text-sm">
                    Other Safety Features
                  </h4>
                  <ul className="ml-4 space-y-1 text-muted-foreground text-xs">
                    <li className="list-disc">
                      <strong>Confidence thresholds</strong>: Bounded between
                      60-90% (won't go too aggressive or conservative)
                    </li>
                    <li className="list-disc">
                      <strong>Category opt-in</strong>: All categories default
                      to disabled (you choose what to enable)
                    </li>
                    <li className="list-disc">
                      <strong>Trust level gates</strong>: Automation only
                      unlocks after proving track record
                    </li>
                    <li className="list-disc">
                      <strong>Stale insight handling</strong>: Insights older
                      than 24 hours don't auto-apply
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
                  <p className="text-green-900 text-xs dark:text-green-100">
                    <strong>Bottom line:</strong> You always have the final say.
                    The AI is your assistant, not a replacement. Every action is
                    transparent, reversible (within 1 hour), and under your
                    control.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-end border-t pt-4">
          <Button onClick={() => onOpenChange(false)}>Got it, thanks!</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
