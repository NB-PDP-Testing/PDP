"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Lock, Save } from "lucide-react";
import { useParams } from "next/navigation";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession } from "@/lib/auth-client";

// ============================================================
// CATEGORY CONFIGURATION
// ============================================================

type CategoryKey =
  | "wellnessDays"
  | "assessmentDays"
  | "injuryDays"
  | "coachFeedbackDays"
  | "auditLogDays"
  | "communicationDays";

interface CategoryConfig {
  key: CategoryKey;
  label: string;
  description: string;
  defaultDays: number;
  minDays?: number;
  minLabel?: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: "wellnessDays",
    label: "Wellness check-ins",
    description:
      "Daily health check-in data including sleep, energy, and mood ratings.",
    defaultDays: 730,
  },
  {
    key: "assessmentDays",
    label: "Assessment & passport history",
    description:
      "Player assessment records, skill evaluations, and sport passport data.",
    defaultDays: 1825,
  },
  {
    key: "injuryDays",
    label: "Injury records",
    description:
      "Records of injuries, medical incidents, and treatment history.",
    defaultDays: 2555,
    minDays: 2555,
    minLabel: "7 years minimum (healthcare legal requirement)",
  },
  {
    key: "coachFeedbackDays",
    label: "Coach feedback & notes",
    description:
      "Coach notes, feedback records, and player development observations.",
    defaultDays: 1825,
  },
  {
    key: "communicationDays",
    label: "WhatsApp & SMS communications",
    description:
      "WhatsApp messages, SMS sessions, and wellness channel communication records.",
    defaultDays: 365,
  },
  {
    key: "auditLogDays",
    label: "Activity & access logs",
    description: "System audit trail of data access and processing activities.",
    defaultDays: 1095,
    minDays: 1095,
    minLabel: "3 years minimum (GDPR Article 30)",
  },
];

// ============================================================
// HELPERS
// ============================================================

function daysToYears(days: number): string {
  if (days % 365 === 0) {
    const years = days / 365;
    return `${years} year${years === 1 ? "" : "s"}`;
  }
  return `${days} days`;
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function DataRetentionPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const { data: session } = useSession();

  const savedConfig = useQuery(
    api.models.retentionConfig.getOrgRetentionConfig,
    { organizationId: orgId }
  );
  const expiryCounts = useQuery(
    api.models.retentionConfig.getUpcomingExpiryCountsForOrg,
    { organizationId: orgId }
  );
  const upsertConfig = useMutation(
    api.models.retentionConfig.upsertOrgRetentionConfig
  );

  const [form, setForm] = useState<Record<CategoryKey, string>>({
    wellnessDays: "730",
    assessmentDays: "1825",
    injuryDays: "2555",
    coachFeedbackDays: "1825",
    auditLogDays: "1095",
    communicationDays: "365",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Sync form when server config loads
  useEffect(() => {
    if (savedConfig) {
      setForm({
        wellnessDays: String(savedConfig.wellnessDays),
        assessmentDays: String(savedConfig.assessmentDays),
        injuryDays: String(savedConfig.injuryDays),
        coachFeedbackDays: String(savedConfig.coachFeedbackDays),
        auditLogDays: String(savedConfig.auditLogDays),
        communicationDays: String(savedConfig.communicationDays),
      });
    }
  }, [savedConfig]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    for (const cat of CATEGORIES) {
      const val = Number.parseInt(form[cat.key], 10);
      if (Number.isNaN(val) || val < 30) {
        newErrors[cat.key] = "Minimum 30 days";
      } else if (cat.minDays !== undefined && val < cat.minDays) {
        newErrors[cat.key] =
          `Cannot be set below ${cat.minDays} days — ${cat.minLabel}`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!session?.user?.id) {
      toast.error("Not authenticated");
      return;
    }
    if (!validate()) {
      return;
    }
    setIsSaving(true);
    try {
      await upsertConfig({
        organizationId: orgId,
        config: {
          wellnessDays: Number.parseInt(form.wellnessDays, 10),
          assessmentDays: Number.parseInt(form.assessmentDays, 10),
          injuryDays: Number.parseInt(form.injuryDays, 10),
          coachFeedbackDays: Number.parseInt(form.coachFeedbackDays, 10),
          auditLogDays: Number.parseInt(form.auditLogDays, 10),
          communicationDays: Number.parseInt(form.communicationDays, 10),
        },
        updatedByUserId: session.user.id,
      });
      toast.success("Retention policy saved.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save retention policy"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">
            Data Retention Policy
          </h1>
          <p className="mt-1 text-muted-foreground">
            Personal data is automatically deleted after these periods. Legal
            minimum periods are enforced and cannot be reduced.
          </p>
        </div>

        {/* Retention Configuration Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Retention Periods</CardTitle>
            <CardDescription>
              Configure how long each category of personal data is retained
              before automatic deletion. Minimum: 30 days for any category.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-0 divide-y">
              {CATEGORIES.map((cat) => {
                const isLocked =
                  cat.minDays !== undefined &&
                  Number.parseInt(form[cat.key], 10) <= cat.minDays;
                const fieldError = errors[cat.key];

                return (
                  <div
                    className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-[1fr_auto]"
                    key={cat.key}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Label
                          className="font-medium"
                          htmlFor={`field-${cat.key}`}
                        >
                          {cat.label}
                        </Label>
                        {cat.minDays !== undefined && (
                          <Badge className="text-xs" variant="secondary">
                            Legal minimum
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {cat.description}
                      </p>
                      {cat.minLabel && (
                        <p className="text-amber-600 text-xs dark:text-amber-400">
                          {cat.minLabel}
                        </p>
                      )}
                      {fieldError && (
                        <p className="text-destructive text-xs">{fieldError}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isLocked ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              <Input
                                className="w-28 text-right"
                                disabled
                                id={`field-${cat.key}`}
                                value={form[cat.key]}
                              />
                              <span className="text-muted-foreground text-sm">
                                days
                              </span>
                              <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p className="max-w-60 text-xs">
                              This period cannot be reduced below {cat.minDays}{" "}
                              days due to legal requirements.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <>
                          <Input
                            className="w-28 text-right"
                            id={`field-${cat.key}`}
                            min={30}
                            onChange={(e) => {
                              setForm((prev) => ({
                                ...prev,
                                [cat.key]: e.target.value,
                              }));
                              if (errors[cat.key]) {
                                setErrors((prev) => {
                                  const next = { ...prev };
                                  delete next[cat.key];
                                  return next;
                                });
                              }
                            }}
                            type="number"
                            value={form[cat.key]}
                          />
                          <span className="text-muted-foreground text-sm">
                            days
                          </span>
                        </>
                      )}
                      <span className="min-w-[6rem] text-right text-muted-foreground text-xs">
                        ≈ {daysToYears(Number.parseInt(form[cat.key], 10) || 0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4">
              <Button disabled={isSaving} onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving…" : "Save retention policy"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deletions Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Upcoming automatic deletions
            </CardTitle>
            <CardDescription>
              Records approaching their retention expiry in the next 90 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {expiryCounts === undefined ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : expiryCounts.wellnessCount === 0 ? (
              <p className="text-muted-foreground text-sm">
                No records are approaching expiry in the next 90 days.
              </p>
            ) : (
              <div className="space-y-2">
                {expiryCounts.wellnessCount > 0 && (
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="text-sm">Wellness check-ins</span>
                    <Badge variant="destructive">
                      {expiryCounts.wellnessCount} record
                      {expiryCounts.wellnessCount === 1 ? "" : "s"} expiring in
                      the next 90 days
                    </Badge>
                  </div>
                )}
              </div>
            )}
            <p className="text-muted-foreground text-xs">
              Deleted records are held for a 30-day grace period before
              permanent removal. Deletion can be reversed during this window by
              contacting support.
            </p>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
