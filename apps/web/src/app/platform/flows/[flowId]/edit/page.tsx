"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "../../../../../../../../packages/backend/convex/_generated/api";

type FlowStep = {
  id: string;
  type: "page" | "modal" | "banner" | "toast";
  title: string;
  content: string;
  ctaText?: string;
  ctaAction?: string;
  dismissible: boolean;
};

export default function EditFlowPage({
  params,
}: {
  params: { flowId: string };
}) {
  const router = useRouter();
  const user = useCurrentUser();
  const flow = useQuery(api.models.flows.getAllPlatformFlows);
  const updateFlow = useMutation(api.models.flows.updatePlatformFlow);

  // Redirect non-platform staff
  useEffect(() => {
    if (user && !user.isPlatformStaff) {
      router.push("/");
      toast.error("You must be platform staff to access this page");
    }
  }, [user, router]);

  // Find the specific flow
  const currentFlow = flow?.find((f) => f._id === params.flowId);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "announcement" as
      | "onboarding"
      | "announcement"
      | "action_required"
      | "feature_tour"
      | "system_alert",
    priority: "medium" as "blocking" | "high" | "medium" | "low",
    active: true,
  });
  const [steps, setSteps] = useState<FlowStep[]>([]);

  // Load flow data when available
  useEffect(() => {
    if (currentFlow) {
      setFormData({
        name: currentFlow.name,
        description: currentFlow.description || "",
        type: currentFlow.type,
        priority: currentFlow.priority,
        active: currentFlow.active,
      });
      setSteps(currentFlow.steps as FlowStep[]);
    }
  }, [currentFlow]);

  if (!user?.isPlatformStaff) {
    return null;
  }

  if (!flow) {
    return <div>Loading...</div>;
  }

  if (!currentFlow) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="font-bold text-2xl">Flow Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            The flow you're looking for doesn't exist.
          </p>
          <Link href="/platform/flows">
            <Button className="mt-4">Back to Flows</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleAddStep = () => {
    const newStep: FlowStep = {
      id: `step-${steps.length + 1}`,
      type: "modal",
      title: "",
      content: "",
      ctaText: "Continue",
      ctaAction: "",
      dismissible: true,
    };
    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length === 1) {
      toast.error("Flow must have at least one step");
      return;
    }
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleStepChange = (
    index: number,
    field: keyof FlowStep,
    value: unknown
  ) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Please enter a flow name");
      return;
    }

    if (steps.some((step) => !(step.title.trim() && step.content.trim()))) {
      toast.error("All steps must have a title and content");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateFlow({
        // @ts-expect-error - Convex ID type mismatch between string and Id<"flows">
        flowId: params.flowId,
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
        priority: formData.priority,
        steps,
        active: formData.active,
      });

      toast.success("Flow updated successfully!");
      router.push("/platform/flows");
    } catch (error) {
      toast.error("Failed to update flow");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            <Link href="/platform/flows">
              <Button size="icon" variant="ghost">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold text-2xl text-[#1E3A5F] tracking-tight">
                Edit Flow
              </h1>
              <p className="mt-2 text-muted-foreground">
                Update flow settings and steps
              </p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Configure the basic settings for your flow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Flow Name *</Label>
                  <Input
                    id="name"
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., First User Onboarding"
                    value={formData.name}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    className="min-h-[80px]"
                    id="description"
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Optional description of this flow"
                    value={formData.description}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="type">Flow Type *</Label>
                    <Select
                      onValueChange={(value: typeof formData.type) =>
                        setFormData({ ...formData, type: value })
                      }
                      value={formData.type}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                        <SelectItem value="announcement">
                          Announcement
                        </SelectItem>
                        <SelectItem value="action_required">
                          Action Required
                        </SelectItem>
                        <SelectItem value="feature_tour">
                          Feature Tour
                        </SelectItem>
                        <SelectItem value="system_alert">
                          System Alert
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority *</Label>
                    <Select
                      onValueChange={(value: typeof formData.priority) =>
                        setFormData({ ...formData, priority: value })
                      }
                      value={formData.priority}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blocking">
                          Blocking (Must complete)
                        </SelectItem>
                        <SelectItem value="high">
                          High (Shows immediately)
                        </SelectItem>
                        <SelectItem value="medium">
                          Medium (Shows on next login)
                        </SelectItem>
                        <SelectItem value="low">
                          Low (Notification only)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.active}
                    id="active"
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, active: checked })
                    }
                  />
                  <Label className="cursor-pointer" htmlFor="active">
                    Flow is active
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Flow Steps</CardTitle>
                <CardDescription>
                  Configure the steps users will see in this flow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {steps.map((step, index) => (
                  <Card key={step.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          Step {index + 1}
                        </CardTitle>
                        {steps.length > 1 && (
                          <Button
                            onClick={() => handleRemoveStep(index)}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`step-${index}-type`}>
                          Display Type *
                        </Label>
                        <Select
                          onValueChange={(value: FlowStep["type"]) =>
                            handleStepChange(index, "type", value)
                          }
                          value={step.type}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="page">Full Page</SelectItem>
                            <SelectItem value="modal">Modal Dialog</SelectItem>
                            <SelectItem value="banner">Top Banner</SelectItem>
                            <SelectItem value="toast">
                              Toast Notification
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`step-${index}-title`}>Title *</Label>
                        <Input
                          id={`step-${index}-title`}
                          onChange={(e) =>
                            handleStepChange(index, "title", e.target.value)
                          }
                          placeholder="Step title"
                          value={step.title}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`step-${index}-content`}>
                          Content *
                        </Label>
                        <Textarea
                          className="min-h-[120px]"
                          id={`step-${index}-content`}
                          onChange={(e) =>
                            handleStepChange(index, "content", e.target.value)
                          }
                          placeholder="Step content (supports Markdown)"
                          value={step.content}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`step-${index}-ctaText`}>
                            Button Text
                          </Label>
                          <Input
                            id={`step-${index}-ctaText`}
                            onChange={(e) =>
                              handleStepChange(index, "ctaText", e.target.value)
                            }
                            placeholder="e.g., Continue, Got It"
                            value={step.ctaText}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`step-${index}-ctaAction`}>
                            Action (Route)
                          </Label>
                          <Input
                            id={`step-${index}-ctaAction`}
                            onChange={(e) =>
                              handleStepChange(
                                index,
                                "ctaAction",
                                e.target.value
                              )
                            }
                            placeholder="e.g., /dashboard"
                            value={step.ctaAction}
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={step.dismissible}
                          id={`step-${index}-dismissible`}
                          onCheckedChange={(checked) =>
                            handleStepChange(index, "dismissible", checked)
                          }
                        />
                        <Label
                          className="cursor-pointer"
                          htmlFor={`step-${index}-dismissible`}
                        >
                          Allow users to dismiss this step
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button onClick={handleAddStep} type="button" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Another Step
                </Button>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Link href="/platform/flows">
                <Button disabled={isSubmitting} type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? "Updating..." : "Update Flow"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
