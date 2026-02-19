"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Edit,
  Plus,
  Search,
  TestTube,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConnectionTestDialog } from "@/components/connectors/connection-test-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ConnectorsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive" | "error"
  >("all");
  const [testingConnector, setTestingConnector] = useState<{
    id: Id<"federationConnectors">;
    name: string;
  } | null>(null);
  const [deletingConnector, setDeletingConnector] = useState<{
    id: Id<"federationConnectors">;
    name: string;
  } | null>(null);

  const deleteConnector = useMutation(
    api.models.federationConnectors.deleteConnector
  );

  // Fetch all connectors
  const connectors = useQuery(api.models.federationConnectors.listConnectors, {
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // Note: Health data fetching would be done per-connector in a real implementation
  // For now, we calculate uptime directly from connector data

  // Filter connectors by search query
  const filteredConnectors = useMemo(() => {
    if (!connectors) {
      return [];
    }
    if (!searchQuery.trim()) {
      return connectors;
    }

    const query = searchQuery.toLowerCase();
    return connectors.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.federationCode.toLowerCase().includes(query)
    );
  }, [connectors, searchQuery]);

  // Get status badge color and icon
  const getStatusBadge = (
    status: "active" | "inactive" | "error"
  ): { color: string; icon: React.ReactNode; label: string } => {
    switch (status) {
      case "active":
        return {
          color: "bg-green-100 text-green-800 hover:bg-green-100",
          icon: <CheckCircle2 className="h-3 w-3" />,
          label: "Active",
        };
      case "inactive":
        return {
          color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
          icon: <Circle className="h-3 w-3" />,
          label: "Inactive",
        };
      case "error":
        return {
          color: "bg-red-100 text-red-800 hover:bg-red-100",
          icon: <AlertCircle className="h-3 w-3" />,
          label: "Error",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 hover:bg-gray-100",
          icon: <Circle className="h-3 w-3" />,
          label: "Unknown",
        };
    }
  };

  // Calculate uptime percentage (simplified - would fetch from health query in real impl)
  const getUptimePercentage = (
    connector: NonNullable<typeof connectors>[number]
  ) => {
    if (!connector) {
      return 0;
    }
    if (connector.status === "error") {
      return Math.max(0, 100 - (connector.consecutiveFailures || 0) * 20);
    }
    return 100;
  };

  // Get health badge color based on uptime
  const getHealthBadge = (uptime: number): { color: string; label: string } => {
    if (uptime >= 95) {
      return {
        color: "bg-green-100 text-green-800 hover:bg-green-100",
        label: `${uptime.toFixed(0)}%`,
      };
    }
    if (uptime >= 80) {
      return {
        color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
        label: `${uptime.toFixed(0)}%`,
      };
    }
    return {
      color: "bg-red-100 text-red-800 hover:bg-red-100",
      label: `${uptime.toFixed(0)}%`,
    };
  };

  // Format last sync time
  const formatLastSync = (
    connector: NonNullable<typeof connectors>[number]
  ) => {
    if (!connector) {
      return "Never";
    }

    const lastSyncTimes = connector.connectedOrganizations
      .map(
        (org: {
          organizationId: string;
          federationOrgId: string;
          enabledAt: number;
          lastSyncAt?: number;
        }) => org.lastSyncAt
      )
      .filter((t: number | undefined): t is number => t !== undefined);

    if (lastSyncTimes.length === 0) {
      return "Never";
    }

    const mostRecent = Math.max(...lastSyncTimes);
    return formatDistanceToNow(mostRecent, { addSuffix: true });
  };

  const handleDelete = async () => {
    if (!deletingConnector) {
      return;
    }
    try {
      await deleteConnector({ connectorId: deletingConnector.id });
      toast.success(`"${deletingConnector.name}" has been deleted`);
    } catch (error) {
      toast.error(
        `Failed to delete connector: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setDeletingConnector(null);
    }
  };

  if (connectors === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center gap-4">
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Link href="/platform">
              <Button className="text-white/80" size="sm" variant="ghost">
                <ChevronDown className="mr-1 h-4 w-4 rotate-90" />
                Back to Platform
              </Button>
            </Link>
          </div>
          <h1 className="mb-4 font-bold text-4xl text-white tracking-tight">
            Federation Connectors
          </h1>
          <p className="text-lg text-white/80">
            Manage connections to external sports management systems
          </p>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-2">
              <div className="relative max-w-md flex-1">
                <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search connectors..."
                  value={searchQuery}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Status: {statusFilter === "all" ? "All" : statusFilter}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                    All
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                    Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>
                    Inactive
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("error")}>
                    Error
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Link href="/platform/connectors/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Connector
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Desktop Table View */}
        <Card className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Federation Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Connected Orgs</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Health</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConnectors.length === 0 ? (
                <TableRow>
                  <TableCell className="h-32 text-center" colSpan={7}>
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Activity className="h-8 w-8 opacity-50" />
                      <p>
                        {searchQuery
                          ? "No connectors match your search"
                          : "No connectors configured. Create one to get started."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredConnectors.map((connector) => {
                  const statusBadge = getStatusBadge(connector.status);
                  const uptime = getUptimePercentage(connector);
                  const healthBadge = getHealthBadge(uptime);

                  return (
                    <TableRow key={connector._id}>
                      <TableCell className="font-medium">
                        {connector.name}
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
                          {connector.federationCode}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadge.color}>
                          {statusBadge.icon}
                          <span className="ml-1">{statusBadge.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline">
                                {connector.connectedOrganizations.length}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="font-semibold text-sm">
                                  Connected Organizations:
                                </p>
                                {connector.connectedOrganizations.length ===
                                0 ? (
                                  <p className="text-muted-foreground text-sm">
                                    None
                                  </p>
                                ) : (
                                  connector.connectedOrganizations.map(
                                    (org) => (
                                      <p
                                        className="text-sm"
                                        key={org.organizationId}
                                      >
                                        {org.organizationId}
                                      </p>
                                    )
                                  )
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatLastSync(connector)}
                      </TableCell>
                      <TableCell>
                        <Badge className={healthBadge.color}>
                          {healthBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={() =>
                                    router.push(
                                      `/platform/connectors/${connector._id}/edit`
                                    )
                                  }
                                  size="icon"
                                  variant="ghost"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit connector</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={() =>
                                    setTestingConnector({
                                      id: connector._id,
                                      name: connector.name,
                                    })
                                  }
                                  size="icon"
                                  variant="ghost"
                                >
                                  <TestTube className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Test connection</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  className="text-destructive hover:text-destructive"
                                  onClick={() =>
                                    setDeletingConnector({
                                      id: connector._id,
                                      name: connector.name,
                                    })
                                  }
                                  size="icon"
                                  variant="ghost"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete connector</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Mobile Card List View */}
        <div className="space-y-4 md:hidden">
          {filteredConnectors.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Activity className="h-8 w-8 opacity-50" />
                <p>
                  {searchQuery
                    ? "No connectors match your search"
                    : "No connectors configured. Create one to get started."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredConnectors.map((connector) => {
              const statusBadge = getStatusBadge(connector.status);
              const uptime = getUptimePercentage(connector);
              const healthBadge = getHealthBadge(uptime);

              return (
                <Card key={connector._id}>
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{connector.name}</h3>
                        <code className="text-muted-foreground text-sm">
                          {connector.federationCode}
                        </code>
                      </div>
                      <Badge className={statusBadge.color}>
                        {statusBadge.icon}
                        <span className="ml-1">{statusBadge.label}</span>
                      </Badge>
                    </div>
                    <div className="mb-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Connected Orgs:
                        </span>
                        <Badge variant="outline">
                          {connector.connectedOrganizations.length}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Last Sync:
                        </span>
                        <span>{formatLastSync(connector)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Health:</span>
                        <Badge className={healthBadge.color}>
                          {healthBadge.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        asChild
                        className="flex-1"
                        size="sm"
                        variant="outline"
                      >
                        <Link
                          href={`/platform/connectors/${connector._id}/edit`}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() =>
                          setTestingConnector({
                            id: connector._id,
                            name: connector.name,
                          })
                        }
                        size="sm"
                        variant="outline"
                      >
                        <TestTube className="mr-2 h-4 w-4" />
                        Test
                      </Button>
                      <Button
                        className="flex-1 text-destructive hover:text-destructive"
                        onClick={() =>
                          setDeletingConnector({
                            id: connector._id,
                            name: connector.name,
                          })
                        }
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Connection Test Dialog */}
      {testingConnector && (
        <ConnectionTestDialog
          connectorId={testingConnector.id}
          connectorName={testingConnector.name}
          onOpenChange={(open) => {
            if (!open) {
              setTestingConnector(null);
            }
          }}
          open={testingConnector !== null}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setDeletingConnector(null);
          }
        }}
        open={deletingConnector !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Connector</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingConnector?.name}
              &quot;? This will deactivate the connector and disconnect it from
              all linked organizations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
