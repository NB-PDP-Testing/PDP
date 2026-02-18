"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Bell, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";

// ── Alert severity config ─────────────────────────────────────

const SEVERITY_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  critical: {
    label: "Critical",
    color: "bg-red-100 text-red-800 border-red-300",
    icon: "🔴",
  },
  high: {
    label: "High",
    color: "bg-orange-100 text-orange-800 border-orange-300",
    icon: "🟠",
  },
  medium: {
    label: "Medium",
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    icon: "🟡",
  },
  low: {
    label: "Low",
    color: "bg-blue-100 text-blue-800 border-blue-300",
    icon: "🔵",
  },
};

// ── Alert Card ────────────────────────────────────────────────

function AlertCard({
  alert,
  onAcknowledge,
}: {
  alert: {
    _id: Id<"platformCostAlerts">;
    alertType: string;
    severity: string;
    message: string;
    metadata?: unknown;
    createdAt?: number;
    acknowledged: boolean;
  };
  onAcknowledge: (alertId: Id<"platformCostAlerts">) => void;
}) {
  const sevCfg = SEVERITY_CONFIG[alert.severity] ?? {
    label: alert.severity,
    color: "bg-gray-100 text-gray-800 border-gray-300",
    icon: "⚪",
  };

  return (
    <div
      className={`rounded-md border p-4 ${alert.severity === "critical" ? "border-red-300" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span>{sevCfg.icon}</span>
            <Badge className={sevCfg.color} variant="outline">
              {sevCfg.label}
            </Badge>
            <span className="font-mono text-muted-foreground text-xs">
              {alert.alertType}
            </span>
          </div>
          <p className="mt-2 text-sm">{alert.message}</p>
          {alert.createdAt && (
            <p className="mt-1 text-muted-foreground text-xs">
              {new Date(alert.createdAt).toLocaleString()}
            </p>
          )}
        </div>
        {!alert.acknowledged && (
          <Button
            onClick={() => onAcknowledge(alert._id)}
            size="sm"
            variant="outline"
          >
            <CheckCircle className="mr-1 h-4 w-4" />
            Acknowledge
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function AlertsPage() {
  const user = useCurrentUser();
  const isPlatformStaff = user?.isPlatformStaff === true;
  const router = useRouter();
  const prevAlertCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (user && !isPlatformStaff) {
      router.push("/orgs/current");
    }
  }, [user, isPlatformStaff, router]);

  const activeAlerts = useQuery(
    api.models.voicePipelineAlerts.getActiveAlerts,
    isPlatformStaff ? {} : "skip"
  );

  const alertHistory = useQuery(
    api.models.voicePipelineAlerts.getAlertHistory,
    isPlatformStaff
      ? { paginationOpts: { numItems: 20, cursor: null } }
      : "skip"
  );

  const acknowledgeAlert = useMutation(
    api.models.voicePipelineAlerts.acknowledgeAlert
  );

  // Real-time toast notifications for new alerts (ADR-VNM-027)
  useEffect(() => {
    if (activeAlerts === undefined) {
      return;
    }

    const currentCount = activeAlerts.length;
    if (
      prevAlertCountRef.current !== null &&
      currentCount > prevAlertCountRef.current
    ) {
      const newAlerts = currentCount - prevAlertCountRef.current;
      toast.warning(
        `${newAlerts} new pipeline alert${newAlerts > 1 ? "s" : ""}`,
        {
          description: "Check the alerts panel for details",
          duration: 5000,
        }
      );
    }
    prevAlertCountRef.current = currentCount;
  }, [activeAlerts]);

  const handleAcknowledge = async (alertId: Id<"platformCostAlerts">) => {
    try {
      await acknowledgeAlert({ alertId });
      toast.success("Alert acknowledged");
    } catch (err) {
      toast.error(
        `Failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  };

  const isLoading = activeAlerts === undefined;
  const historyAlerts = alertHistory?.page ?? [];
  const criticalCount = (activeAlerts ?? []).filter(
    (a) => a.severity === "critical"
  ).length;

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-lg">Alerts</h2>
          <p className="text-muted-foreground text-sm">
            Active pipeline alerts and history
          </p>
        </div>
        {criticalCount > 0 && (
          <Badge className="bg-red-100 text-red-800" variant="outline">
            <AlertTriangle className="mr-1 h-3 w-3" />
            {criticalCount} critical
          </Badge>
        )}
      </div>

      {/* Active alerts panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4" />
            Active Alerts ({activeAlerts?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                <Skeleton className="h-20 w-full" key={i} />
              ))}
            </div>
          ) : (activeAlerts?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <CheckCircle className="h-10 w-10 text-green-500" />
              <p className="mt-2 font-medium text-sm">No active alerts</p>
              <p className="text-xs">All pipeline stages are healthy</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlerts?.map((alert) => (
                <AlertCard
                  alert={alert}
                  key={String(alert._id)}
                  onAcknowledge={handleAcknowledge}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert history table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Alert History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {alertHistory === undefined ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                <Skeleton className="h-10 w-full" key={i} />
              ))}
            </div>
          ) : historyAlerts.length === 0 ? (
            <p className="px-4 py-8 text-center text-muted-foreground text-sm">
              No alert history
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">
                      Severity
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Message</th>
                    <th className="px-4 py-3 text-left font-medium">Time</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyAlerts.map((alert) => {
                    const sevCfg = SEVERITY_CONFIG[alert.severity] ?? {
                      label: alert.severity,
                      color: "bg-gray-100 text-gray-700",
                      icon: "⚪",
                    };
                    return (
                      <tr className="border-t" key={String(alert._id)}>
                        <td className="px-4 py-2">
                          <Badge className={sevCfg.color} variant="outline">
                            {sevCfg.icon} {sevCfg.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">
                          {alert.alertType}
                        </td>
                        <td className="max-w-xs truncate px-4 py-2 text-xs">
                          {alert.message}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          {alert.createdAt
                            ? new Date(alert.createdAt).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-2">
                          {alert.acknowledged ? (
                            <Badge
                              className="bg-green-100 text-green-700"
                              variant="outline"
                            >
                              Acknowledged
                            </Badge>
                          ) : (
                            <Badge
                              className="bg-orange-100 text-orange-700"
                              variant="outline"
                            >
                              Open
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
