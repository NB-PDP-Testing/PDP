"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  Clock,
  Download,
  Share2,
  UserCheck,
  Users,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SharingContactSettings } from "./sharing-contact-settings";

type ActivityType =
  | "consent_created"
  | "consent_accepted"
  | "consent_declined"
  | "consent_revoked"
  | "data_accessed";

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-IE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-IE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActivityIcon(activityType: ActivityType) {
  switch (activityType) {
    case "consent_created":
      return <Share2 className="h-4 w-4 text-blue-600" />;
    case "consent_accepted":
      return <UserCheck className="h-4 w-4 text-green-600" />;
    case "consent_declined":
      return <Clock className="h-4 w-4 text-amber-600" />;
    case "consent_revoked":
      return <Clock className="h-4 w-4 text-red-600" />;
    default:
      return <ArrowRightLeft className="h-4 w-4 text-gray-600" />;
  }
}

function getActivityLabel(activityType: ActivityType): string {
  switch (activityType) {
    case "consent_created":
      return "Share Created";
    case "consent_accepted":
      return "Share Accepted";
    case "consent_declined":
      return "Share Declined";
    case "consent_revoked":
      return "Share Revoked";
    case "data_accessed":
      return "Data Accessed";
    default:
      return activityType;
  }
}

function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) {
    toast.error("No data to export");
    return;
  }

  // Get all unique keys from all objects
  const allKeys = Array.from(
    new Set(data.flatMap((item) => Object.keys(item)))
  );

  // Create CSV header
  const header = allKeys.join(",");

  // Create CSV rows
  const rows = data.map((item) =>
    allKeys
      .map((key) => {
        const value = item[key];
        // Handle arrays, objects, and special characters
        if (Array.isArray(value)) {
          return `"${value.join("; ")}"`;
        }
        if (typeof value === "object" && value !== null) {
          return `"${JSON.stringify(value)}"`;
        }
        if (typeof value === "string" && value.includes(",")) {
          return `"${value}"`;
        }
        return value;
      })
      .join(",")
  );

  const csv = [header, ...rows].join("\n");

  // Download CSV
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function AdminSharingStatistics() {
  const params = useParams();
  const orgId = params.orgId as string;
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch data
  const stats = useQuery(api.models.passportSharing.getOrgSharingStats, {
    organizationId: orgId,
  });

  const outgoingShares = useQuery(
    api.models.passportSharing.getOrgOutgoingShares,
    { organizationId: orgId }
  );

  const incomingShares = useQuery(
    api.models.passportSharing.getOrgIncomingShares,
    { organizationId: orgId }
  );

  const recentActivity = useQuery(
    api.models.passportSharing.getOrgRecentSharingActivity,
    { organizationId: orgId, limit: 20 }
  );

  const pendingAcceptances = useQuery(
    api.models.passportSharing.getOrgPendingAcceptances,
    { organizationId: orgId }
  );

  if (
    !(
      stats &&
      outgoingShares &&
      incomingShares &&
      recentActivity &&
      pendingAcceptances
    )
  ) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Passport Sharing</h1>
          <p className="text-muted-foreground">
            Cross-organization passport sharing statistics and activity
          </p>
        </div>
        <Badge className="text-sm" variant="outline">
          <Share2 className="mr-1 h-3 w-3" />
          Admin View
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">
              Players with Sharing
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.playersWithSharing}</div>
            <p className="text-muted-foreground text-xs">
              Active outgoing shares
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">
              Incoming Shares
            </CardTitle>
            <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.incomingShares}</div>
            <p className="text-muted-foreground text-xs">
              From other organizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">
              Outgoing Shares
            </CardTitle>
            <ArrowUpFromLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.outgoingShares}</div>
            <p className="text-muted-foreground text-xs">
              To other organizations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="outgoing">Outgoing Shares</TabsTrigger>
          <TabsTrigger value="incoming">Incoming Shares</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent className="space-y-6" value="overview">
          {/* Pending Acceptances */}
          {pendingAcceptances.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Coach Acceptances</CardTitle>
                <CardDescription>
                  Incoming shares waiting for coach acceptance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Source Organization(s)</TableHead>
                      <TableHead>Days Pending</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingAcceptances.map((item) => (
                      <TableRow key={item.consentId}>
                        <TableCell className="font-medium">
                          {item.playerName}
                        </TableCell>
                        <TableCell>{item.sourceOrgNames.join(", ")}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.daysPending > 7 ? "destructive" : "secondary"
                            }
                          >
                            {item.daysPending} days
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest sharing events involving your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <p className="text-center text-muted-foreground">
                    No recent activity
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentActivity.map((activity, index) => (
                        <TableRow key={`${activity.timestamp}-${index}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActivityIcon(activity.activityType)}
                              <span className="text-sm">
                                {getActivityLabel(activity.activityType)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {activity.playerName}
                          </TableCell>
                          <TableCell>{activity.orgName}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDateTime(activity.timestamp)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {activity.details || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outgoing Shares Tab */}
        <TabsContent className="space-y-6" value="outgoing">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Outgoing Shares Report</CardTitle>
                  <CardDescription>
                    Passport data being shared from your organization
                  </CardDescription>
                </div>
                <Button
                  onClick={() =>
                    exportToCSV(
                      outgoingShares.map((share) => ({
                        Player: share.playerName,
                        "Receiving Organization": share.receivingOrgName,
                        "Elements Shared": share.elementsShared.join("; "),
                        "Shared Since": formatDate(share.sharedSince),
                        Status: share.status,
                        "Coach Acceptance": share.coachAcceptanceStatus,
                      })),
                      `outgoing-shares-${orgId}-${new Date().toISOString().split("T")[0]}.csv`
                    )
                  }
                  size="sm"
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {outgoingShares.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No outgoing shares
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Receiving Organization</TableHead>
                      <TableHead>Elements Shared</TableHead>
                      <TableHead>Shared Since</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outgoingShares.map((share) => (
                      <TableRow key={share.consentId}>
                        <TableCell className="font-medium">
                          {share.playerName}
                        </TableCell>
                        <TableCell>{share.receivingOrgName}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {share.elementsShared.slice(0, 3).map((element) => (
                              <Badge key={element} variant="secondary">
                                {element}
                              </Badge>
                            ))}
                            {share.elementsShared.length > 3 && (
                              <Badge variant="outline">
                                +{share.elementsShared.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(share.sharedSince)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              share.coachAcceptanceStatus === "accepted"
                                ? "default"
                                : share.coachAcceptanceStatus === "pending"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {share.coachAcceptanceStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incoming Shares Tab */}
        <TabsContent className="space-y-6" value="incoming">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Incoming Shares Report</CardTitle>
                  <CardDescription>
                    Passport data being received by your organization
                  </CardDescription>
                </div>
                <Button
                  onClick={() =>
                    exportToCSV(
                      incomingShares.map((share) => ({
                        Player: share.playerName,
                        "Source Organizations": share.sourceOrgNames.join("; "),
                        "Elements Received": share.elementsReceived.join("; "),
                        "Shared Since": formatDate(share.sharedSince),
                        "Last Accessed": share.lastAccessedAt
                          ? formatDateTime(share.lastAccessedAt)
                          : "Never",
                        "Access Count": share.accessCount,
                      })),
                      `incoming-shares-${orgId}-${new Date().toISOString().split("T")[0]}.csv`
                    )
                  }
                  size="sm"
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {incomingShares.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No incoming shares
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Source Organization(s)</TableHead>
                      <TableHead>Elements Received</TableHead>
                      <TableHead>Shared Since</TableHead>
                      <TableHead>Last Accessed</TableHead>
                      <TableHead>Access Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomingShares.map((share) => (
                      <TableRow key={share.consentId}>
                        <TableCell className="font-medium">
                          {share.playerName}
                        </TableCell>
                        <TableCell>{share.sourceOrgNames.join(", ")}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {share.elementsReceived
                              .slice(0, 3)
                              .map((element) => (
                                <Badge key={element} variant="secondary">
                                  {element}
                                </Badge>
                              ))}
                            {share.elementsReceived.length > 3 && (
                              <Badge variant="outline">
                                +{share.elementsReceived.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(share.sharedSince)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {share.lastAccessedAt
                            ? formatDateTime(share.lastAccessedAt)
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{share.accessCount}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent className="space-y-6" value="settings">
          <SharingContactSettings organizationId={orgId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
