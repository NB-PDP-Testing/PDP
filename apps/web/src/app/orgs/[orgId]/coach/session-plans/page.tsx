"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { FileText, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";

type ExtendedUser = {
  isPlatformStaff?: boolean;
  activeOrganization?: {
    role?: string;
  };
};

export default function SessionPlansPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  // Fetch coach's private plans
  const myPlans = useQuery(
    api.models.sessionPlans.listForCoach,
    userId ? { organizationId: orgId, coachId: userId } : "skip"
  );

  // Fetch club library
  const clubLibrary = useQuery(api.models.sessionPlans.listClubLibrary, {
    organizationId: orgId,
  });

  // Check if user is admin
  const user = session?.user as ExtendedUser | undefined;
  const isPlatformStaff = user?.isPlatformStaff;
  const activeOrg = user?.activeOrganization;
  const isOrgAdmin = activeOrg?.role === "admin" || activeOrg?.role === "owner";
  const isAdmin = isPlatformStaff || isOrgAdmin;

  // Fetch admin plans if admin
  const adminPlans = useQuery(
    api.models.sessionPlans.listForAdmin,
    isAdmin ? { organizationId: orgId } : "skip"
  );

  if (myPlans === undefined || clubLibrary === undefined) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">Session Plans</h1>
          <p className="text-muted-foreground">
            AI-powered training session plans for your teams
          </p>
        </div>
        <Link href={`/orgs/${orgId}/coach/session-plans/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Generate New Plan
          </Button>
        </Link>
      </div>

      <Tabs className="w-full" defaultValue="my-plans">
        <TabsList>
          <TabsTrigger value="my-plans">My Plans</TabsTrigger>
          <TabsTrigger value="club-library">Club Library</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>

        <TabsContent className="mt-6" value="my-plans">
          {myPlans.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <FileText className="mb-4 h-16 w-16 text-muted-foreground" />
                <h3 className="mb-2 font-semibold text-lg">
                  No session plans yet
                </h3>
                <p className="mb-4 text-center text-muted-foreground">
                  Create your first AI-powered session plan to get started
                </p>
                <Link href={`/orgs/${orgId}/coach/session-plans/new`}>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Generate Session Plan
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myPlans.map((plan) => (
                <Link
                  href={`/orgs/${orgId}/coach/session-plans/${plan._id}`}
                  key={plan._id}
                >
                  <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                    <CardHeader>
                      <CardTitle className="line-clamp-1">
                        {plan.title}
                      </CardTitle>
                      <CardDescription>
                        {plan.teamName} • {plan.duration} min
                        {plan.focusArea && ` • ${plan.focusArea}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-muted-foreground text-sm">
                        <span>
                          {plan.status === "draft" ? "Generating..." : "Ready"}
                        </span>
                        <span>
                          {new Date(plan.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {plan.usedInSession && (
                        <div className="mt-2 text-green-600 text-xs">
                          ✓ Used in session
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent className="mt-6" value="club-library">
          {clubLibrary.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <FileText className="mb-4 h-16 w-16 text-muted-foreground" />
                <h3 className="mb-2 font-semibold text-lg">
                  No plans in club library
                </h3>
                <p className="text-center text-muted-foreground">
                  Share your plans to make them available to other coaches
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clubLibrary.map((plan) => (
                <Link
                  href={`/orgs/${orgId}/coach/session-plans/${plan._id}`}
                  key={plan._id}
                >
                  <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                    <CardHeader>
                      <CardTitle className="line-clamp-1">
                        {plan.title}
                      </CardTitle>
                      <CardDescription>
                        {plan.teamName} • {plan.duration} min
                        {plan.focusArea && ` • ${plan.focusArea}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-muted-foreground text-sm">
                        <span>By {plan.sharedBy || plan.coachName}</span>
                        <span>
                          {new Date(
                            plan.sharedAt || plan.createdAt
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      {plan.pinnedByAdmin && (
                        <div className="mt-2 text-blue-600 text-xs">
                          📌 Featured
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent className="mt-6" value="admin">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(adminPlans || []).map((plan) => (
                <Link
                  href={`/orgs/${orgId}/coach/session-plans/${plan._id}`}
                  key={plan._id}
                >
                  <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                    <CardHeader>
                      <CardTitle className="line-clamp-1">
                        {plan.title}
                      </CardTitle>
                      <CardDescription>
                        {plan.teamName} • {plan.coachName}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <span
                          className={`${
                            plan.visibility === "club"
                              ? "text-blue-600"
                              : plan.visibility === "private"
                                ? "text-gray-600"
                                : "text-purple-600"
                          }`}
                        >
                          {plan.visibility}
                        </span>
                        <span className="text-muted-foreground">
                          {plan.status}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
