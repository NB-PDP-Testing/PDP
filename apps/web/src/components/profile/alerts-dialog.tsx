"use client";

import { Bell, Sparkles } from "lucide-react";
import { ResponsiveDialog } from "@/components/interactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Alerts Dialog - Coming Soon Placeholder
 *
 * Modal dialog for the upcoming alerts & notifications feature.
 *
 * Desktop: Centered modal (600px max-width)
 * Mobile: Bottom sheet with scrollable content
 */
export function AlertsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ResponsiveDialog
      contentClassName="sm:max-w-[650px]"
      description="Manage your notification preferences"
      onOpenChange={onOpenChange}
      open={open}
      title="Alerts & Notifications"
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-1">
        {/* Coming Soon Card */}
        <Card className="border-2 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-4">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-lg">
                Alerts & Notifications Feature
              </h3>
              <p className="mb-6 max-w-md text-muted-foreground">
                We're building a powerful notification system to keep you
                updated on important events, player progress, and team
                activities.
              </p>

              <div className="grid w-full max-w-lg gap-3 text-left sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <h4 className="mb-1 font-medium text-sm">
                    Push Notifications
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    Real-time alerts for urgent updates
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <h4 className="mb-1 font-medium text-sm">Email Digests</h4>
                  <p className="text-muted-foreground text-xs">
                    Daily or weekly summaries of activity
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <h4 className="mb-1 font-medium text-sm">In-App Alerts</h4>
                  <p className="text-muted-foreground text-xs">
                    Bell icon notifications within the platform
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <h4 className="mb-1 font-medium text-sm">
                    Custom Preferences
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    Control what notifications you receive
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Planned Features Card */}
        <Card>
          <CardHeader>
            <CardTitle>What to Expect</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <div className="flex-shrink-0 rounded-full bg-primary/10 p-1">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    Player Development Alerts
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Get notified when coaches update player assessments or set
                    new goals
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 rounded-full bg-primary/10 p-1">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Team Activity Updates</p>
                  <p className="text-muted-foreground text-xs">
                    Stay informed about training schedules, match results, and
                    team announcements
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 rounded-full bg-primary/10 p-1">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    Role Request Notifications
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Admins receive alerts when users request coach or parent
                    roles
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 rounded-full bg-primary/10 p-1">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Granular Control</p>
                  <p className="text-muted-foreground text-xs">
                    Choose notification channels (email, push, in-app) for each
                    alert type
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </ResponsiveDialog>
  );
}
