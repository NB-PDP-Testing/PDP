"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Bot,
  Check,
  History,
  Pencil,
  RefreshCw,
  Settings2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
  | "comparison_insights";

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
};

// Available models by provider
const MODELS_BY_PROVIDER: Record<string, { id: string; name: string }[]> = {
  openai: [
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "gpt-4o-mini-transcribe", name: "GPT-4o Mini Transcribe" },
  ],
  anthropic: [
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
    { id: "claude-opus-4-20250514", name: "Claude Opus 4" },
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
};

export default function AIConfigurationPage() {
  const user = useCurrentUser();
  const [editingConfig, setEditingConfig] = useState<ConfigItem | null>(null);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [selectedConfigId, setSelectedConfigId] =
    useState<Id<"aiModelConfig"> | null>(null);

  // Fetch platform configs
  const platformConfigs = useQuery(
    api.models.aiModelConfig.getAllPlatformConfigs,
    {}
  );

  // Mutation for updating config
  const upsertConfig = useMutation(api.models.aiModelConfig.upsertConfig);

  // Mutation for seeding defaults
  const seedDefaults = useMutation(api.models.aiModelConfig.seedDefaultConfigs);

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
          | "comparison_insights",
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

  // Get all features that should be displayed
  const allFeatures = Object.keys(FEATURE_INFO) as FeatureType[];

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
                      {platformConfigs.filter((c) => c.isActive).length}
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

          {/* Configuration Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="h-5 w-5" />
                Platform AI Models
              </CardTitle>
              {platformConfigs.length === 0 && (
                <Button onClick={handleSeedDefaults} size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Seed Defaults
                </Button>
              )}
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
                            <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                              {config.modelId}
                            </code>
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
                          {config?.isActive ? (
                            <Badge className="bg-green-100 text-green-700">
                              Active
                            </Badge>
                          ) : (
                            <Badge
                              className="text-muted-foreground"
                              variant="outline"
                            >
                              Inactive
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
                                    modelId: "claude-3-5-haiku-20241022",
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
                  <SelectContent>
                    {MODELS_BY_PROVIDER[editingConfig.provider]?.map(
                      (model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      )
                    )}
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
