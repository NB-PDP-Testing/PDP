"use client";

import {
  Download,
  Edit,
  Home,
  Save,
  Share,
  Trash,
  Upload,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePageQuickActions } from "@/hooks/use-page-quick-actions";

/**
 * Quick Actions Demo Page
 *
 * This page demonstrates how to customize Quick Actions for a specific page.
 * Navigate to: /orgs/[orgId]/coach/quick-actions-demo
 *
 * IMPORTANT: Enable the "ux_quick_actions_fab" feature flag in PostHog to see the button.
 */
export default function QuickActionsDemoPage() {
  const [isDraft, setIsDraft] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Example 1: Static actions using the hook
  // Uncomment this to see static actions:
  /*
  usePageQuickActions([
    {
      id: "save",
      icon: Save,
      label: "Save",
      onClick: () => alert("Saved!"),
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      id: "download",
      icon: Download,
      label: "Download",
      onClick: () => alert("Downloading..."),
      color: "bg-green-600 hover:bg-green-700",
    },
    {
      id: "share",
      icon: Share,
      label: "Share",
      onClick: () => alert("Sharing..."),
      color: "bg-purple-600 hover:bg-purple-700",
    },
  ]);
  */

  // Example 2: Dynamic actions based on state with titles
  // This changes the actions based on whether we're in draft mode
  usePageQuickActions(
    isDraft
      ? [
          {
            id: "save-draft",
            icon: Save,
            label: hasChanges ? "Save Draft" : "Saved",
            title: hasChanges ? "Save your changes" : "All changes saved",
            onClick: () => {
              setHasChanges(false);
              alert("Draft saved!");
            },
            color: hasChanges
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 hover:bg-gray-500",
          },
          {
            id: "publish",
            icon: Upload,
            label: "Publish",
            title: "Make content live",
            onClick: () => {
              setIsDraft(false);
              setHasChanges(false);
              alert("Published!");
            },
            color: "bg-green-600 hover:bg-green-700",
          },
          {
            id: "delete-draft",
            icon: Trash,
            label: "Delete",
            title: "Remove this draft",
            onClick: () => {
              if (confirm("Delete this draft?")) {
                alert("Draft deleted!");
              }
            },
            color: "bg-red-600 hover:bg-red-700",
          },
        ]
      : [
          {
            id: "edit",
            icon: Edit,
            label: "Edit",
            title: "Return to draft mode",
            onClick: () => {
              setIsDraft(true);
              alert("Switched to draft mode");
            },
            color: "bg-purple-600 hover:bg-purple-700",
          },
          {
            id: "share-published",
            icon: Share,
            label: "Share",
            title: "Share with others",
            onClick: () => alert("Sharing published version..."),
            color: "bg-cyan-600 hover:bg-cyan-700",
          },
          {
            id: "download-published",
            icon: Download,
            label: "Download",
            title: "Export as file",
            onClick: () => alert("Downloading..."),
            color: "bg-green-600 hover:bg-green-700",
          },
        ]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-bold text-2xl text-gray-900 md:text-3xl">
          Quick Actions Demo
        </h1>
        <p className="mt-2 text-gray-600">
          This page demonstrates custom Quick Actions that change based on page
          state.
        </p>
      </div>

      {/* Feature Flag Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-blue-900 text-sm">
                Enable Feature Flag
              </p>
              <p className="mt-1 text-blue-800 text-xs">
                To see the Quick Actions button in the header, enable the{" "}
                <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-blue-900">
                  ux_quick_actions_fab
                </code>{" "}
                feature flag in PostHog.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Display */}
          <div className="rounded-lg border-2 border-gray-300 border-dashed bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  Current Status
                </p>
                <p className="mt-1 text-gray-600 text-xs">
                  {isDraft ? "Draft Mode" : "Published"} •{" "}
                  {hasChanges ? "Unsaved Changes" : "All Changes Saved"}
                </p>
              </div>
              <div
                className={`rounded-full px-3 py-1 font-medium text-xs ${
                  isDraft
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {isDraft ? "Draft" : "Published"}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <p className="font-medium text-gray-900 text-sm">
              Interact with the page to see Quick Actions change:
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setHasChanges(!hasChanges)}
                size="sm"
                variant="outline"
              >
                {hasChanges ? "Mark as Saved" : "Make Changes"}
              </Button>
              <Button
                onClick={() => setIsDraft(!isDraft)}
                size="sm"
                variant="outline"
              >
                Toggle Draft/Published
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Quick Actions Display */}
      <Card>
        <CardHeader>
          <CardTitle>Current Quick Actions (in Header)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-gray-600 text-sm">
            Look at the header bar - you should see these actions in the Quick
            Actions menu:
          </p>
          <div className="space-y-2">
            {(isDraft
              ? [
                  {
                    label: hasChanges ? "Save Draft" : "Saved",
                    icon: "💾",
                    description: "Save your changes as a draft",
                  },
                  {
                    label: "Publish",
                    icon: "📤",
                    description: "Publish the current draft",
                  },
                  {
                    label: "Delete",
                    icon: "🗑️",
                    description: "Delete this draft",
                  },
                ]
              : [
                  {
                    label: "Edit",
                    icon: "✏️",
                    description: "Switch back to draft mode",
                  },
                  {
                    label: "Share",
                    icon: "🔗",
                    description: "Share the published version",
                  },
                  {
                    label: "Download",
                    icon: "⬇️",
                    description: "Download the published version",
                  },
                ]
            ).map((action, idx) => (
              <div
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3"
                key={idx}
              >
                <span className="text-2xl">{action.icon}</span>
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {action.label}
                  </p>
                  <p className="text-gray-600 text-xs">{action.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Code Example */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Code</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-gray-100 text-xs">
            {`import { usePageQuickActions } from "@/hooks/use-page-quick-actions";
import { Save, Upload, Trash } from "lucide-react";

function MyPage() {
  const [isDraft, setIsDraft] = useState(true);

  // Register custom actions
  usePageQuickActions(
    isDraft ? [
      {
        id: "save-draft",
        icon: Save,
        label: "Save Draft",
        onClick: () => console.log("Saving..."),
        color: "bg-blue-600 hover:bg-blue-700",
      },
      {
        id: "publish",
        icon: Upload,
        label: "Publish",
        onClick: () => setIsDraft(false),
        color: "bg-green-600 hover:bg-green-700",
      },
      {
        id: "delete",
        icon: Trash,
        label: "Delete",
        onClick: () => console.log("Deleting..."),
        color: "bg-red-600 hover:bg-red-700",
      },
    ] : [
      // Different actions for published state
    ]
  );

  return <div>Page content</div>;
}`}
          </pre>
        </CardContent>
      </Card>

      {/* Navigation Note */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-600">
              <Home className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-purple-900 text-sm">
                Navigate Away & Back
              </p>
              <p className="mt-1 text-purple-800 text-xs">
                Go to another coach page (like Players or Goals), then come back
                here. Notice how the Quick Actions automatically restore when
                you return!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
