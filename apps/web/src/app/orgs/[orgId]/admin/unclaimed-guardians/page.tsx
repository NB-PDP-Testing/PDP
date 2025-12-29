"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Calendar, Mail, Phone, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function UnclaimedGuardiansPage() {
  const params = useParams();
  const organizationId = params.orgId as string;

  const unclaimedGuardians = useQuery(
    api.models.guardianIdentities.getUnclaimedGuardians,
    { organizationId }
  );

  if (unclaimedGuardians === undefined) {
    return (
      <div className="container mx-auto max-w-7xl space-y-6 p-6">
        <div className="space-y-2">
          <h1 className="font-bold text-3xl">Unclaimed Guardian Identities</h1>
          <p className="text-muted-foreground">
            Loading guardian profiles waiting to be claimed...
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  const totalChildren = unclaimedGuardians.reduce(
    (sum: number, g: (typeof unclaimedGuardians)[number]) =>
      sum + g.childrenCount,
    0
  );

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-bold text-3xl">Unclaimed Guardian Identities</h1>
        <p className="text-muted-foreground">
          Guardian profiles created from imports that haven't been claimed by
          users yet
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Unclaimed Guardians
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {unclaimedGuardians.length}
            </div>
            <p className="text-muted-foreground text-xs">
              Waiting to be claimed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Total Children
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{totalChildren}</div>
            <p className="text-muted-foreground text-xs">
              Linked to unclaimed guardians
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Oldest Unclaimed
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {unclaimedGuardians.length > 0
                ? Math.max(
                    ...unclaimedGuardians.map(
                      (g: (typeof unclaimedGuardians)[number]) =>
                        g.daysSinceCreated
                    )
                  )
                : 0}
            </div>
            <p className="text-muted-foreground text-xs">Days ago</p>
          </CardContent>
        </Card>
      </div>

      {/* Guardians Table */}
      <Card>
        <CardHeader>
          <CardTitle>Guardian List</CardTitle>
        </CardHeader>
        <CardContent>
          {unclaimedGuardians.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 font-semibold text-lg">
                No Unclaimed Guardians
              </h3>
              <p className="text-muted-foreground text-sm">
                All guardian identities have been claimed by their respective
                users.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guardian Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Children</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unclaimedGuardians.map(
                    (item: (typeof unclaimedGuardians)[number]) => (
                      <TableRow key={item.guardian._id}>
                        <TableCell className="font-medium">
                          {item.guardian.firstName} {item.guardian.lastName}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {item.guardian.email}
                              </span>
                            </div>
                            {item.guardian.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {item.guardian.phone}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {item.children.map(
                              (
                                child: (typeof item.children)[number],
                                idx: number
                              ) => (
                                <div className="text-sm" key={idx}>
                                  {child.firstName} {child.lastName}
                                </div>
                              )
                            )}
                            <Badge className="mt-1" variant="secondary">
                              {item.childrenCount}{" "}
                              {item.childrenCount === 1 ? "child" : "children"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {item.daysSinceCreated === 0 ? (
                              <Badge variant="outline">Today</Badge>
                            ) : item.daysSinceCreated === 1 ? (
                              <Badge variant="outline">Yesterday</Badge>
                            ) : (
                              <Badge variant="outline">
                                {item.daysSinceCreated} days ago
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {item.guardian.createdFrom || "Import"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            Send Reminder
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                <span className="text-blue-600">ℹ️</span>
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">
                About Unclaimed Guardians
              </h4>
              <p className="text-muted-foreground text-sm">
                These guardian profiles were created from data imports (like GAA
                membership CSVs) but haven't been claimed by the actual parents
                yet. When a parent signs up with the same email address, they'll
                be prompted to claim their profile and gain access to their
                children's information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
