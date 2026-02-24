"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  Pencil,
  RefreshCw,
  Settings2,
  Shield,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";

// Feature types
type FeatureType =
  | "voice_transcription"
  | "voice_insights"
  | "sensitivity_classification"
  | "parent_summary"
  | "session_plan"
  | "recommendations"
  | "comparison_insights"
  | "ai_column_mapping"
  | "practice_plan_generation"
  | "global_fallback";

/**
 * Classify an API error message into a human-readable label + colour.
 * Returns null if the error doesn't indicate a specific known failure type,
 * so the caller can fall back to generic health status rendering.
 */
function classifyErrorMessage(msg: string): {
  label: string;
  className: string;
} | null {
  const lower = msg.toLowerCase();
  if (
    lower.includes("model") &&
    (lower.includes("not found") ||
      lower.includes("not support") ||
      lower.includes("deprecated") ||
      lower.includes("unavailable") ||
      lower.includes("does not exist"))
  ) {
    return { label: "Model Unavailable", className: "bg-red-100 text-red-700" };
  }
  if (lower.includes("rate limit") || lower.includes("429")) {
    return { label: "Rate Limited", className: "bg-amber-100 text-amber-700" };
  }
  if (lower.includes("quota") || lower.includes("billing")) {
    return { label: "Quota Exceeded", className: "bg-red-100 text-red-700" };
  }
  if (
    lower.includes("auth") ||
    lower.includes("api key") ||
    lower.includes("401")
  ) {
    return { label: "Auth Error", className: "bg-red-100 text-red-700" };
  }
  return null;
}

// Feature display names and descriptions
const FEATURE_INFO: Record<
  FeatureType,
  { name: string; description: string; icon: string }
> = {
  voice_transcription: {
    name: "Voice Transcription",
    description: "Convert coach audio recordings to text",
    icon: "mic",
  },
  voice_insights: {
    name: "Voice Insights",
    description: "Extract player insights from voice notes",
    icon: "lightbulb",
  },
  sensitivity_classification: {
    name: "Sensitivity Classification",
    description: "Classify insight sensitivity for parent sharing",
    icon: "shield",
  },
  parent_summary: {
    name: "Parent Summary",
    description: "Transform insights to parent-friendly messages",
    icon: "users",
  },
  session_plan: {
    name: "Session Plan",
    description: "Generate training session plans",
    icon: "calendar",
  },
  recommendations: {
    name: "Recommendations",
    description: "Provide coaching recommendations",
    icon: "star",
  },
  comparison_insights: {
    name: "Comparison Insights",
    description: "Analyze passport comparison data",
    icon: "scale",
  },
  ai_column_mapping: {
    name: "AI Column Mapping",
    description: "Map CSV import columns to player fields",
    icon: "table",
  },
  practice_plan_generation: {
    name: "Practice Plan Generation",
    description: "Generate personalized home practice plans for players",
    icon: "dumbbell",
  },
  global_fallback: {
    name: "Platform Default Fallback",
    description:
      "Used by all features when no per-feature fallback is configured",
    icon: "shield",
  },
};

// Available models by provider
const MODELS_BY_PROVIDER: Record<string, { id: string; name: string }[]> = {
  openai: [
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "gpt-4o-mini-transcribe", name: "GPT-4o Mini Transcribe" },
  ],
  anthropic: [
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
    { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
  ],
  openrouter: [
    { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku (OpenRouter)" },
    { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4 (OpenRouter)" },
    { id: "openai/gpt-4o", name: "GPT-4o (OpenRouter)" },
    { id: "openai/gpt-4o-mini", name: "GPT-4o Mini (OpenRouter)" },
  ],
};

type ConfigItem = {
  _id: Id<"aiModelConfig">;
  feature: FeatureType;
  scope: string;
  provider: string;
  modelId: string;
  maxTokens?: number;
  temperature?: number;
  isActive: boolean;
  updatedBy: string;
  updatedAt: number;
  notes?: string;
  healthStatus?: "healthy" | "degraded" | "down";
  lastSuccessAt?: number;
  lastFailureAt?: number;
  consecutiveErrors?: number;
  lastErrorMessage?: string;
  fallbackModelId?: string;
  fallbackProvider?: string;
};

type AvailableModel = {
  id: string;
  provider: "anthropic" | "openai";
  displayName: string;
  createdAt?: number;
  description?: string;
  contextLength?: number;
  pricingPromptPer1k?: string;
  pricingCompletionPer1k?: string;
  pricingInputPer1M?: string;
  pricingOutputPer1M?: string;
  modality?: string;
  capabilities?: string[];
};

export default function AIConfigurationPage() {
  const user = useCurrentUser();
  const [editingConfig, setEditingConfig] = useState<ConfigItem | null>(null);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [selectedConfigId, setSelectedConfigId] =
    useState<Id<"aiModelConfig"> | null>(null);
  const [testingModels, setTestingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<
    AvailableModel[] | null
  >(null);
  const [availableModelsError, setAvailableModelsError] = useState<
    Record<string, string>
  >({});
  const [showAvailableModels, setShowAvailableModels] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState("");

  // Fetch platform configs
  const platformConfigs = useQuery(
    api.models.aiModelConfig.getAllPlatformConfigs,
    {}
  );

  // Mutation for updating config
  const upsertConfig = useMutation(api.models.aiModelConfig.upsertConfig);

  // Mutation for seeding defaults
  const seedDefaults = useMutation(api.models.aiModelConfig.seedDefaultConfigs);

  const recordHealth = useMutation(
    api.models.aiModelConfig.recordFeatureHealth
  );

  async function testAllModels() {
    if (!platformConfigs) {
      return;
    }
    setTestingModels(true);
    try {
      const active = platformConfigs.filter(
        (c) => c.isActive && c.feature !== "global_fallback"
      );
      await Promise.all(
        active.map(async (config) => {
          try {
            const res = await fetch("/api/ai-config/verify-model", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                provider: config.provider,
                modelId: config.modelId,
              }),
            });
            const result = (await res.json()) as {
              success?: boolean;
              errorMessage?: string;
            };
            await recordHealth({
              feature: config.feature as Parameters<
                typeof recordHealth
              >[0]["feature"],
              success: result.success ?? false,
              errorMessage: result.errorMessage,
            });
          } catch {
            await recordHealth({
              feature: config.feature as Parameters<
                typeof recordHealth
              >[0]["feature"],
              success: false,
              errorMessage: "Network error reaching verification endpoint",
            });
          }
        })
      );
      toast.success("Model verification complete");
    } finally {
      setTestingModels(false);
    }
  }

  async function loadAvailableModels() {
    setShowAvailableModels(true);
    if (availableModels !== null) {
      return;
    } // already loaded
    try {
      const res = await fetch("/api/ai-config/available-models");
      const data = (await res.json()) as {
        models: AvailableModel[];
        errors: Record<string, string>;
      };
      setAvailableModels(data.models);
      setAvailableModelsError(data.errors ?? {});
    } catch (e) {
      setAvailableModelsError({
        fetch: e instanceof Error ? e.message : "Failed to load models",
      });
      setAvailableModels([]);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — only run once
  useEffect(() => {
    // biome-ignore lint/complexity/noVoid: fire-and-forget in useEffect
    void loadAvailableModels();
  }, []);

  // Fetch change log for selected config
  const changeLog = useQuery(
    api.models.aiModelConfig.getConfigChangeLog,
    selectedConfigId ? { configId: selectedConfigId } : "skip"
  );

  const handleEdit = (config: ConfigItem) => {
    setEditingConfig({ ...config });
  };

  const handleSeedDefaults = async () => {
    if (!user?._id) {
      return;
    }

    try {
      const created = await seedDefaults({ userId: user._id });
      if (created > 0) {
        toast.success(`Created ${created} default configuration(s)`);
      } else {
        toast.info("All defaults already exist");
      }
    } catch (error: any) {
      console.error("Error seeding defaults:", error);
      toast.error(error.message || "Failed to seed defaults");
    }
  };

  const handleSave = async () => {
    if (!(editingConfig && user?._id)) {
      return;
    }

    try {
      await upsertConfig({
        feature: editingConfig.feature as
          | "voice_transcription"
          | "voice_insights"
          | "sensitivity_classification"
          | "parent_summary"
          | "session_plan"
          | "recommendations"
          | "comparison_insights"
          | "ai_column_mapping"
          | "practice_plan_generation"
          | "global_fallback",
        scope: "platform",
        provider: editingConfig.provider as
          | "openai"
          | "anthropic"
          | "openrouter",
        modelId: editingConfig.modelId,
        maxTokens: editingConfig.maxTokens,
        temperature: editingConfig.temperature,
        isActive: editingConfig.isActive,
        notes: editingConfig.notes,
        userId: user._id,
        fallbackModelId: editingConfig.fallbackModelId || undefined,
        fallbackProvider: editingConfig.fallbackProvider || undefined,
      });

      toast.success("Configuration updated successfully");
      setEditingConfig(null);
    } catch (error: any) {
      console.error("Error updating config:", error);
      toast.error(error.message || "Failed to update configuration");
    }
  };

  const handleViewLog = (configId: Id<"aiModelConfig">) => {
    setSelectedConfigId(configId);
    setShowLogDialog(true);
  };

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleString();

  if (platformConfigs === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-6">
              <Skeleton className="mb-2 h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Create a map of existing configs by feature for easy lookup
  const configByFeature = new Map(
    platformConfigs.map((config) => [config.feature, config])
  );

  // Extract global fallback — it lives outside the feature table
  const globalFallbackConfig = configByFeature.get("global_fallback");

  // Get all features that should be displayed (excluding global_fallback which has its own banner)
  const allFeatures = (Object.keys(FEATURE_INFO) as FeatureType[]).filter(
    (f) => f !== "global_fallback"
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/platform">
                <Button size="icon" variant="ghost">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="font-bold text-2xl text-[#1E3A5F] tracking-tight">
                  AI Configuration
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Manage AI model settings for platform features
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:shrink-0">
              <Card className="border-cyan-200 bg-cyan-50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-full bg-cyan-100 p-2">
                    <Bot className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="font-bold text-2xl text-cyan-700">
                      {
                        platformConfigs.filter(
                          (c) => c.isActive && c.feature !== "global_fallback"
                        ).length
                      }
                    </p>
                    <p className="text-cyan-600 text-xs">Active Features</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-gray-200 bg-gray-50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-full bg-gray-100 p-2">
                    <Settings2 className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-bold text-2xl text-gray-700">
                      {allFeatures.length}
                    </p>
                    <p className="text-gray-600 text-xs">Total Features</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Global Fallback Banner */}
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-amber-100 p-2">
                    <Shield className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">
                      Platform Default Fallback
                    </p>
                    <p className="text-amber-700 text-xs">
                      Used by all features when no per-feature fallback is
                      configured
                    </p>
                    {globalFallbackConfig ? (
                      <p className="mt-1 font-mono text-amber-800 text-xs">
                        {globalFallbackConfig.provider} /{" "}
                        {globalFallbackConfig.modelId}
                        {!globalFallbackConfig.isActive && (
                          <span className="ml-2 font-normal font-sans text-amber-500">
                            (inactive)
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="mt-1 text-amber-500 text-xs italic">
                        Not configured — click Seed Defaults to initialise
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  className="shrink-0 border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                  onClick={() =>
                    handleEdit(
                      globalFallbackConfig || {
                        _id: "" as Id<"aiModelConfig">,
                        feature: "global_fallback" as FeatureType,
                        scope: "platform",
                        provider: "anthropic",
                        modelId: "claude-haiku-4-5-20251001",
                        isActive: true,
                        updatedBy: "",
                        updatedAt: Date.now(),
                      }
                    )
                  }
                  size="sm"
                  variant="outline"
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="h-5 w-5" />
                Platform AI Models
              </CardTitle>
              <div className="flex items-center gap-2">
                {(platformConfigs.length === 0 || !globalFallbackConfig) && (
                  <Button onClick={handleSeedDefaults} size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Seed Defaults
                  </Button>
                )}
                <Button
                  disabled={testingModels || platformConfigs.length === 0}
                  onClick={testAllModels}
                  size="sm"
                  variant="outline"
                >
                  {testingModels ? (
                    <>
                      <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Testing…
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-3.5 w-3.5" />
                      Test All Models
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-center">Max Tokens</TableHead>
                    <TableHead className="text-center">Temperature</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allFeatures.map((feature) => {
                    const config = configByFeature.get(feature);
                    const featureInfo = FEATURE_INFO[feature];

                    return (
                      <TableRow key={feature}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{featureInfo.name}</p>
                            <p className="text-muted-foreground text-xs">
                              {featureInfo.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {config ? (
                            <Badge className="capitalize" variant="outline">
                              {config.provider}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Not configured
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {config ? (
                            <div className="space-y-1">
                              <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                                {config.modelId}
                              </code>
                              {(() => {
                                const m = availableModels?.find(
                                  (x) => x.id === config.modelId
                                );
                                if (!m?.pricingInputPer1M) {
                                  return null;
                                }
                                return (
                                  <div className="text-muted-foreground text-xs">
                                    ${m.pricingInputPer1M} / $
                                    {m.pricingOutputPer1M ?? "?"} per 1M
                                  </div>
                                );
                              })()}
                              {config.fallbackModelId && (
                                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                                  <span className="opacity-60">↪</span>
                                  <code className="font-mono">
                                    {config.fallbackModelId}
                                  </code>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {config?.maxTokens ?? "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {config?.temperature ?? "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {config ? (
                            config.isActive ? (
                              (() => {
                                // If we have a recorded error, classify it first
                                const errorBadge =
                                  config.lastErrorMessage &&
                                  config.healthStatus !== "healthy"
                                    ? classifyErrorMessage(
                                        config.lastErrorMessage
                                      )
                                    : null;
                                if (errorBadge) {
                                  return (
                                    <Badge
                                      className={errorBadge.className}
                                      title={config.lastErrorMessage}
                                    >
                                      {errorBadge.label}
                                    </Badge>
                                  );
                                }
                                return config.healthStatus === "down" ? (
                                  <Badge className="bg-red-100 text-red-700">
                                    Down
                                  </Badge>
                                ) : config.healthStatus === "degraded" ? (
                                  <Badge className="bg-amber-100 text-amber-700">
                                    Degraded
                                  </Badge>
                                ) : config.healthStatus === "healthy" ? (
                                  <Badge className="bg-green-100 text-green-700">
                                    Healthy
                                  </Badge>
                                ) : (
                                  <Badge className="bg-slate-100 text-slate-600">
                                    Active
                                  </Badge>
                                );
                              })()
                            ) : (
                              <Badge
                                className="text-muted-foreground"
                                variant="outline"
                              >
                                Inactive
                              </Badge>
                            )
                          ) : (
                            <Badge
                              className="text-muted-foreground"
                              variant="outline"
                            >
                              Not Configured
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {config && (
                              <Button
                                onClick={() => handleViewLog(config._id)}
                                size="sm"
                                title="View change history"
                                variant="ghost"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              onClick={() =>
                                handleEdit(
                                  config || {
                                    _id: "" as Id<"aiModelConfig">,
                                    feature,
                                    scope: "platform",
                                    provider: "anthropic",
                                    modelId: "claude-haiku-4-5-20251001",
                                    isActive: false,
                                    updatedBy: "",
                                    updatedAt: Date.now(),
                                  }
                                )
                              }
                              size="sm"
                              title={
                                config ? "Edit configuration" : "Configure"
                              }
                              variant="ghost"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Available Models Browser */}
          <Card className="mt-6">
            <CardHeader>
              <button
                className="flex w-full items-center justify-between text-left"
                onClick={() => setShowAvailableModels((v) => !v)}
                type="button"
              >
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bot className="h-5 w-5" />
                  Available Models
                </CardTitle>
                {showAvailableModels ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            {showAvailableModels && (
              <CardContent>
                {Object.keys(availableModelsError).length > 0 && (
                  <div className="mb-4 space-y-1">
                    {Object.entries(availableModelsError).map(
                      ([provider, msg]) => (
                        <div
                          className="flex items-center gap-2 rounded bg-amber-50 p-2 text-amber-700 text-sm"
                          key={provider}
                        >
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>
                            <strong className="capitalize">{provider}:</strong>{" "}
                            {msg}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
                {availableModels === null ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : availableModels.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm">
                    No models available. Check that API keys are configured.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Search filter */}
                    <Input
                      className="h-8 text-sm"
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      placeholder="Filter models by name, ID, or description…"
                      value={modelSearchQuery}
                    />
                    {(["anthropic", "openai"] as const).map((provider) => {
                      const q = modelSearchQuery.toLowerCase().trim();
                      const providerModels = availableModels.filter(
                        (m) =>
                          m.provider === provider &&
                          (q === "" ||
                            m.id.toLowerCase().includes(q) ||
                            m.displayName.toLowerCase().includes(q) ||
                            m.description?.toLowerCase().includes(q))
                      );
                      if (providerModels.length === 0) {
                        return null;
                      }
                      const configuredIds = new Set(
                        (platformConfigs ?? []).map((c) => c.modelId)
                      );
                      return (
                        <div key={provider}>
                          <h3 className="mb-2 font-semibold text-muted-foreground text-sm capitalize">
                            {provider}
                          </h3>
                          <div className="space-y-1.5">
                            {providerModels.map((model) => (
                              <div
                                className="rounded-md border px-3 py-2"
                                key={model.id}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-x-2">
                                      <span className="font-medium font-mono text-xs">
                                        {model.id}
                                      </span>
                                      {model.displayName !== model.id && (
                                        <span className="text-muted-foreground text-xs">
                                          {model.displayName}
                                        </span>
                                      )}
                                    </div>
                                    {model.description && (
                                      <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                                        {model.description}
                                      </p>
                                    )}
                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                      {model.contextLength && (
                                        <Badge
                                          className="bg-blue-50 text-blue-700 text-xs"
                                          variant="outline"
                                        >
                                          {(model.contextLength / 1000).toFixed(
                                            0
                                          )}
                                          k ctx
                                        </Badge>
                                      )}
                                      {model.capabilities?.map((cap) => (
                                        <Badge
                                          className={
                                            cap === "vision"
                                              ? "bg-violet-50 text-violet-700 text-xs"
                                              : cap === "audio"
                                                ? "bg-orange-50 text-orange-700 text-xs"
                                                : cap === "reasoning"
                                                  ? "bg-cyan-50 text-cyan-700 text-xs"
                                                  : "bg-gray-50 text-gray-600 text-xs"
                                          }
                                          key={cap}
                                          variant="outline"
                                        >
                                          {cap === "vision"
                                            ? "👁 vision"
                                            : cap === "audio"
                                              ? "🎙 audio"
                                              : cap === "reasoning"
                                                ? "🧠 reasoning"
                                                : cap === "tools"
                                                  ? "🔧 tools"
                                                  : cap}
                                        </Badge>
                                      ))}
                                      {(model.pricingInputPer1M ??
                                        model.pricingPromptPer1k) && (
                                        <Badge
                                          className="bg-emerald-50 text-emerald-700 text-xs"
                                          variant="outline"
                                        >
                                          {model.pricingInputPer1M
                                            ? `$${model.pricingInputPer1M} / $${model.pricingOutputPer1M ?? "?"} per 1M`
                                            : `$${model.pricingPromptPer1k} / $${model.pricingCompletionPer1k ?? "?"} per 1k`}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-1">
                                    {configuredIds.has(model.id) && (
                                      <Badge className="bg-green-100 text-green-700 text-xs">
                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                        In use
                                      </Badge>
                                    )}
                                    {model.createdAt && (
                                      <span className="text-muted-foreground text-xs">
                                        {new Date(
                                          model.createdAt
                                        ).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog
        onOpenChange={(open) => !open && setEditingConfig(null)}
        open={!!editingConfig}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingConfig
                ? FEATURE_INFO[editingConfig.feature]?.name || "Configuration"
                : "Configuration"}
            </DialogTitle>
            <DialogDescription>
              {editingConfig
                ? FEATURE_INFO[editingConfig.feature]?.description
                : ""}
            </DialogDescription>
          </DialogHeader>

          {editingConfig && (
            <div className="grid gap-4 py-4">
              {/* Provider */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="provider">
                  Provider
                </Label>
                <Select
                  onValueChange={(value) =>
                    setEditingConfig({
                      ...editingConfig,
                      provider: value,
                      modelId: MODELS_BY_PROVIDER[value]?.[0]?.id || "",
                    })
                  }
                  value={editingConfig.provider}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Model */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="model">
                  Model
                </Label>
                <Select
                  onValueChange={(value) =>
                    setEditingConfig({ ...editingConfig, modelId: value })
                  }
                  value={editingConfig.modelId}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {availableModels === null
                      ? // Still loading — fall back to hardcoded list
                        MODELS_BY_PROVIDER[editingConfig.provider]?.map(
                          (model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          )
                        )
                      : availableModels
                          .filter((m) => m.provider === editingConfig.provider)
                          .map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-mono text-xs">
                                  {model.id}
                                </span>
                                <span className="flex flex-wrap gap-2 text-muted-foreground text-xs">
                                  {model.contextLength && (
                                    <span>
                                      {(model.contextLength / 1000).toFixed(0)}k
                                      ctx
                                    </span>
                                  )}
                                  {model.capabilities
                                    ?.filter((c) => c !== "tools")
                                    .map((c) => (
                                      <span key={c}>
                                        {c === "vision"
                                          ? "👁"
                                          : c === "audio"
                                            ? "🎙"
                                            : c === "reasoning"
                                              ? "🧠"
                                              : c}
                                      </span>
                                    ))}
                                  {model.pricingInputPer1M ? (
                                    <span>
                                      ${model.pricingInputPer1M}/$
                                      {model.pricingOutputPer1M ?? "?"} /1M
                                    </span>
                                  ) : model.pricingPromptPer1k ? (
                                    <span>
                                      ${model.pricingPromptPer1k}/1k in
                                    </span>
                                  ) : null}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Max Tokens */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="maxTokens">
                  Max Tokens
                </Label>
                <Input
                  className="col-span-3"
                  id="maxTokens"
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      maxTokens: e.target.value
                        ? Number.parseInt(e.target.value, 10)
                        : undefined,
                    })
                  }
                  placeholder="e.g., 500"
                  type="number"
                  value={editingConfig.maxTokens || ""}
                />
              </div>

              {/* Temperature */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="temperature">
                  Temperature
                </Label>
                <Input
                  className="col-span-3"
                  id="temperature"
                  max="2"
                  min="0"
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      temperature: e.target.value
                        ? Number.parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="e.g., 0.7"
                  step="0.1"
                  type="number"
                  value={editingConfig.temperature ?? ""}
                />
              </div>

              {/* Active Toggle */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="isActive">
                  Active
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Switch
                    checked={editingConfig.isActive}
                    id="isActive"
                    onCheckedChange={(checked) =>
                      setEditingConfig({ ...editingConfig, isActive: checked })
                    }
                  />
                  <span className="text-muted-foreground text-sm">
                    {editingConfig.isActive
                      ? "Feature is enabled"
                      : "Feature is disabled"}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="notes">
                  Notes
                </Label>
                <Textarea
                  className="col-span-3"
                  id="notes"
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Reason for this configuration..."
                  rows={2}
                  value={editingConfig.notes || ""}
                />
              </div>

              {/* Fallback Model */}
              <div className="border-t pt-3">
                <p className="mb-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Fallback Model{" "}
                  <span className="font-normal normal-case">
                    — used automatically if the primary model fails
                  </span>
                </p>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label
                  className="text-right text-sm"
                  htmlFor="fallbackProvider"
                >
                  Provider
                </Label>
                <Select
                  onValueChange={(value) =>
                    setEditingConfig({
                      ...editingConfig,
                      fallbackProvider: value === "none" ? "" : value,
                      fallbackModelId:
                        value === "none"
                          ? ""
                          : ((
                              availableModels?.find(
                                (m) => m.provider === value
                              ) ?? MODELS_BY_PROVIDER[value]?.[0]
                            )?.id ?? ""),
                    })
                  }
                  value={editingConfig.fallbackProvider || "none"}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingConfig.fallbackProvider && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-sm" htmlFor="fallbackModel">
                    Model
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      setEditingConfig({
                        ...editingConfig,
                        fallbackModelId: value,
                      })
                    }
                    value={editingConfig.fallbackModelId || ""}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select fallback model" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {(availableModels === null
                        ? MODELS_BY_PROVIDER[
                            editingConfig.fallbackProvider
                          ]?.map((m) => ({ id: m.id, displayName: m.name }))
                        : availableModels.filter(
                            (m) => m.provider === editingConfig.fallbackProvider
                          )
                      )?.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <span className="font-mono text-xs">{model.id}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setEditingConfig(null)} variant="outline">
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Check className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Log Dialog */}
      <Dialog onOpenChange={setShowLogDialog} open={showLogDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Change History</DialogTitle>
            <DialogDescription>
              View the history of changes made to this configuration
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto">
            {changeLog === undefined ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : changeLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <RefreshCw className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">No changes recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {changeLog.map((log) => (
                  <Card key={log._id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge
                            variant={
                              log.action === "created"
                                ? "default"
                                : log.action === "deactivated"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {log.action}
                          </Badge>
                          <p className="mt-1 text-muted-foreground text-xs">
                            {formatDate(log.changedAt)}
                          </p>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          by {log.changedBy}
                        </p>
                      </div>
                      {log.reason && (
                        <p className="mt-2 text-sm">{log.reason}</p>
                      )}
                      {log.previousValue && log.newValue && (
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded bg-red-50 p-2">
                            <p className="font-medium text-red-700">Previous</p>
                            <code className="text-red-600">
                              {(log.previousValue as { modelId?: string })
                                ?.modelId || "-"}
                            </code>
                          </div>
                          <div className="rounded bg-green-50 p-2">
                            <p className="font-medium text-green-700">New</p>
                            <code className="text-green-600">
                              {(log.newValue as { modelId?: string })
                                ?.modelId || "-"}
                            </code>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
