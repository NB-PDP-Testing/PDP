"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Plus,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function GdprManagementPage() {
  const versions = useQuery(api.models.gdpr.getAllGdprVersions);
  const createVersion = useMutation(api.models.gdpr.createGdprVersion);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    summary: "",
    fullText: "",
    effectiveDate: "",
  });

  const handleCreateVersion = async () => {
    if (!(formData.summary.trim() && formData.fullText.trim())) {
      toast.error("Please fill in both summary and full text");
      return;
    }

    setIsSubmitting(true);

    try {
      const effectiveDate = formData.effectiveDate
        ? new Date(formData.effectiveDate).getTime()
        : undefined;

      const result = await createVersion({
        summary: formData.summary.trim(),
        fullText: formData.fullText.trim(),
        effectiveDate,
      });

      toast.success(`GDPR Version ${result.version} created successfully`);
      setIsDialogOpen(false);
      setFormData({ summary: "", fullText: "", effectiveDate: "" });
    } catch (error) {
      console.error("Failed to create GDPR version:", error);
      toast.error("Failed to create GDPR version");
    } finally {
      setIsSubmitting(false);
    }
  };

  const latestVersion = versions?.[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            className="mb-4 inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
            href="/platform"
          >
            <ArrowLeft className="size-4" />
            Back to Platform Dashboard
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-3">
                <ShieldCheck className="size-6 text-green-600" />
              </div>
              <div>
                <h1 className="font-bold text-2xl">GDPR Policy Versions</h1>
                <p className="text-muted-foreground">
                  Manage privacy policy versions and trigger user re-consent
                </p>
              </div>
            </div>

            <Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 size-4" />
                  New Version
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New GDPR Version</DialogTitle>
                  <DialogDescription>
                    Creating a new version will require all users to re-accept
                    the privacy policy.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="summary">Summary</Label>
                    <Input
                      id="summary"
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          summary: e.target.value,
                        }))
                      }
                      placeholder="Brief description of the policy changes"
                      value={formData.summary}
                    />
                    <p className="text-muted-foreground text-xs">
                      This summary is shown to users before they expand the full
                      policy.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullText">Full Policy Text</Label>
                    <Textarea
                      className="min-h-[300px] font-mono text-sm"
                      id="fullText"
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          fullText: e.target.value,
                        }))
                      }
                      placeholder="Enter the complete privacy policy text. Supports markdown formatting."
                      value={formData.fullText}
                    />
                    <p className="text-muted-foreground text-xs">
                      Use markdown for formatting: # Heading, ## Subheading, -
                      bullet points, **bold**
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="effectiveDate">
                      Effective Date (Optional)
                    </Label>
                    <Input
                      id="effectiveDate"
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          effectiveDate: e.target.value,
                        }))
                      }
                      type="datetime-local"
                      value={formData.effectiveDate}
                    />
                    <p className="text-muted-foreground text-xs">
                      Leave empty to make the version effective immediately.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    onClick={() => setIsDialogOpen(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button disabled={isSubmitting} onClick={handleCreateVersion}>
                    {isSubmitting ? "Creating..." : "Create Version"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Current Version Info */}
        {latestVersion && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-green-600" />
                <CardTitle className="text-base">Current Version</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Version {latestVersion.version} is active -{" "}
                {latestVersion.summary}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Version List */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">All Versions</h2>

          {versions ? (
            versions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="mx-auto mb-4 size-12 text-muted-foreground" />
                  <h3 className="mb-2 font-medium">No GDPR Versions</h3>
                  <p className="mb-4 text-muted-foreground text-sm">
                    Create your first GDPR policy version to enable consent
                    tracking.
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 size-4" />
                    Create First Version
                  </Button>
                </CardContent>
              </Card>
            ) : (
              versions.map((version, index) => (
                <Card key={version._id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">
                          Version {version.version}
                        </CardTitle>
                        {index === 0 && (
                          <Badge className="bg-green-100 text-green-800">
                            Current
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs">
                        Effective:{" "}
                        {new Date(version.effectiveDate).toLocaleDateString()}
                      </span>
                    </div>
                    <CardDescription>{version.summary}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-muted-foreground text-xs">
                      <span>
                        Created by {version.createdBy} •{" "}
                        {formatDistanceToNow(version.createdAt, {
                          addSuffix: true,
                        })}
                      </span>
                      <details className="cursor-pointer">
                        <summary className="hover:text-foreground">
                          View Full Text
                        </summary>
                        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-foreground text-xs">
                          {version.fullText}
                        </pre>
                      </details>
                    </div>
                  </CardContent>
                </Card>
              ))
            )
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Loading...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
