"use client";

import { useMutation, useQuery } from "convex/react";
import { Calendar, Megaphone, Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../../../../../../packages/backend/convex/_generated/api";

export default function OrganizationAnnouncementsPage({
  params,
}: {
  params: { orgId: string };
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const orgFlows = useQuery(api.models.flows.getAllOrganizationFlows, {
    organizationId: params.orgId,
  });
  const createFlow = useMutation(api.models.flows.createOrganizationFlow);

  const [formData, setFormData] = useState({
    name: "",
    content: "",
    type: "announcement" as const,
    priority: "medium" as const,
    targetAudience: "all_members" as const,
  });

  const handleCreateAnnouncement = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter an announcement title");
      return;
    }

    if (!formData.content.trim()) {
      toast.error("Please enter announcement content");
      return;
    }

    try {
      await createFlow({
        organizationId: params.orgId,
        name: formData.name,
        type: formData.type,
        priority: formData.priority,
        targetAudience: formData.targetAudience,
        steps: [
          {
            id: "announcement",
            type: "modal",
            title: formData.name,
            content: formData.content,
            ctaText: "Got It",
            dismissible: true,
          },
        ],
      });

      toast.success("Announcement created successfully!");
      setShowCreateDialog(false);
      setFormData({
        name: "",
        content: "",
        type: "announcement",
        priority: "medium",
        targetAudience: "all_members",
      });
    } catch (error) {
      toast.error("Failed to create announcement");
      console.error(error);
    }
  };

  // Show loading state
  if (orgFlows === undefined) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="text-muted-foreground">Loading announcements...</div>
        </div>
      </div>
    );
  }

  const activeFlows = orgFlows?.filter((f) => f.active) || [];
  const scheduledFlows =
    orgFlows?.filter((f) => f.startDate && f.startDate > Date.now()) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">Organization Announcements</h1>
          <p className="text-muted-foreground">
            Send announcements and alerts to your organization members
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Announcement
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Active Announcements
            </CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{activeFlows.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Reach</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">-</div>
            <p className="text-muted-foreground text-xs">Coming soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{scheduledFlows.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Announcements List */}
      <div className="grid gap-4">
        {!orgFlows || orgFlows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No announcements created yet.
              </p>
              <Button
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Announcement
              </Button>
            </CardContent>
          </Card>
        ) : (
          orgFlows.map((flow) => (
            <Card key={flow._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{flow.name}</CardTitle>
                    <CardDescription>
                      Target:{" "}
                      {flow.targetAudience?.replace("_", " ") || "All members"}{" "}
                      • Priority: {flow.priority}
                      {flow.startDate &&
                        ` • Scheduled: ${new Date(flow.startDate).toLocaleDateString()}`}
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="ghost">
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  {flow.steps[0]?.content.substring(0, 150)}
                  {flow.steps[0]?.content.length > 150 ? "..." : ""}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog onOpenChange={setShowCreateDialog} open={showCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Announcement Title</Label>
              <Input
                id="name"
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Season Schedule Update"
                value={formData.name}
              />
            </div>

            <div>
              <Label htmlFor="content">Message</Label>
              <Textarea
                className="min-h-[150px]"
                id="content"
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="Write your announcement here..."
                value={formData.content}
              />
              <p className="mt-1 text-muted-foreground text-xs">
                Supports Markdown formatting
              </p>
            </div>

            <div>
              <Label htmlFor="audience">Target Audience</Label>
              <Select
                onValueChange={(value: typeof formData.targetAudience) =>
                  setFormData({ ...formData, targetAudience: value })
                }
                value={formData.targetAudience}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_members">
                    All Organization Members
                  </SelectItem>
                  <SelectItem value="coaches">Coaches Only</SelectItem>
                  <SelectItem value="parents">Parents Only</SelectItem>
                  <SelectItem value="admins">Admins Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
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
                  <SelectItem value="high">High (Shows immediately)</SelectItem>
                  <SelectItem value="medium">
                    Medium (Shows on next login)
                  </SelectItem>
                  <SelectItem value="low">Low (Notification only)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                onClick={() => setShowCreateDialog(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={!(formData.name && formData.content)}
                onClick={handleCreateAnnouncement}
              >
                Create Announcement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
