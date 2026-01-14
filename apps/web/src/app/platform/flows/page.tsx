"use client";

import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Edit,
  Megaphone,
  Plus,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "../../../../../../packages/backend/convex/_generated/api";

export default function FlowsManagementPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const flows = useQuery(api.models.flows.getAllPlatformFlows);
  const toggleActive = useMutation(api.models.flows.togglePlatformFlowActive);
  const deleteFlow = useMutation(api.models.flows.deletePlatformFlow);

  // Redirect non-platform staff
  useEffect(() => {
    if (user && !user.isPlatformStaff) {
      router.push("/");
      toast.error("You must be platform staff to access this page");
    }
  }, [user, router]);

  if (!user?.isPlatformStaff) {
    return null;
  }

  if (!flows) {
    return <div>Loading...</div>;
  }

  const handleToggleActive = async (flowId: string) => {
    try {
      // @ts-expect-error - Convex ID type mismatch
      await toggleActive({ flowId });
      toast.success("Flow status updated");
    } catch (error) {
      toast.error("Failed to update flow status");
      console.error(error);
    }
  };

  const handleDelete = async (flowId: string) => {
    try {
      // @ts-expect-error - Convex ID type mismatch
      await deleteFlow({ flowId });
      toast.success("Flow deleted successfully");
    } catch (error) {
      toast.error("Failed to delete flow");
      console.error(error);
    }
  };

  const activeFlows = flows.filter((f) => f.active);
  const inactiveFlows = flows.filter((f) => !f.active);

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
              <div className="rounded-full bg-green-100 p-2">
                <Megaphone className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-bold text-2xl text-[#1E3A5F] tracking-tight">
                  Flow Management
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Create and manage user flows, wizards, and announcements
                </p>
              </div>
            </div>
            <Link href="/platform/flows/create">
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Create Flow
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-full bg-green-100 p-2">
                  <Megaphone className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-2xl text-green-700">
                    {flows.length}
                  </p>
                  <p className="text-green-600 text-xs">Total Flows</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-full bg-emerald-100 p-2">
                  <Power className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-2xl text-emerald-700">
                    {activeFlows.length}
                  </p>
                  <p className="text-emerald-600 text-xs">Active</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200 bg-gray-50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-full bg-gray-100 p-2">
                  <PowerOff className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-bold text-2xl text-gray-700">
                    {inactiveFlows.length}
                  </p>
                  <p className="text-gray-600 text-xs">Inactive</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Flows</CardTitle>
              <CardDescription>
                Manage platform-wide flows and announcements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {flows.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">No flows created yet.</p>
                  <Link href="/platform/flows/create">
                    <Button className="mt-4" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Flow
                    </Button>
                  </Link>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Steps</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flows.map((flow) => (
                      <TableRow key={flow._id}>
                        <TableCell className="font-medium">
                          {flow.name}
                          {flow.description && (
                            <p className="text-muted-foreground text-xs">
                              {flow.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{flow.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              flow.priority === "blocking"
                                ? "destructive"
                                : flow.priority === "high"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {flow.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={flow.active ? "default" : "outline"}>
                            {flow.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{flow.steps.length} steps</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => handleToggleActive(flow._id)}
                              size="icon"
                              title={
                                flow.active
                                  ? "Deactivate flow"
                                  : "Activate flow"
                              }
                              variant="ghost"
                            >
                              {flow.active ? (
                                <PowerOff className="h-4 w-4" />
                              ) : (
                                <Power className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                router.push(`/platform/flows/${flow._id}/edit`);
                              }}
                              size="icon"
                              variant="ghost"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(flow._id)}
                              size="icon"
                              variant="ghost"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
