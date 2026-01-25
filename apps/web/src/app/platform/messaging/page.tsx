"use client";

import {
  Activity,
  AlertCircle,
  DollarSign,
  Gauge,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PlatformMessagingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-8 text-white">
          <h1 className="mb-2 font-bold text-3xl tracking-tight sm:text-4xl">
            Platform Messaging & AI Dashboard
          </h1>
          <p className="text-lg text-white/90">
            Monitor AI usage, costs, rate limits, and service health across all
            organizations
          </p>
        </div>

        {/* Main Content with Tabs */}
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <Tabs className="w-full" defaultValue="overview">
            <TabsList className="mb-6 w-full justify-start">
              <TabsTrigger className="gap-2" value="overview">
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger className="gap-2" value="cost-analytics">
                <DollarSign className="h-4 w-4" />
                Cost Analytics
              </TabsTrigger>
              <TabsTrigger className="gap-2" value="rate-limits">
                <Gauge className="h-4 w-4" />
                Rate Limits
              </TabsTrigger>
              <TabsTrigger className="gap-2" value="service-health">
                <Activity className="h-4 w-4" />
                Service Health
              </TabsTrigger>
              <TabsTrigger className="gap-2" value="settings">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Key metrics and platform health status will appear here.
                  </p>
                  <p className="mt-2 text-muted-foreground text-sm">
                    Implementation: US-022
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cost Analytics Tab */}
            <TabsContent value="cost-analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Cost Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Cost trends, breakdowns by organization, and cache
                    effectiveness will appear here.
                  </p>
                  <p className="mt-2 text-muted-foreground text-sm">
                    Implementation: US-018
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Rate Limits Tab */}
            <TabsContent value="rate-limits">
              <Card>
                <CardHeader>
                  <CardTitle>Rate Limits</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Platform-wide and per-org rate limit configuration and
                    violation monitoring will appear here.
                  </p>
                  <p className="mt-2 text-muted-foreground text-sm">
                    Implementation: US-019
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Service Health Tab */}
            <TabsContent value="service-health">
              <Card>
                <CardHeader>
                  <CardTitle>Service Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    AI service status, circuit breaker state, and recent errors
                    will appear here.
                  </p>
                  <p className="mt-2 text-muted-foreground text-sm">
                    Implementation: US-020
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Settings & Emergency Controls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Feature toggles and emergency kill switch will appear here.
                  </p>
                  <p className="mt-2 text-muted-foreground text-sm">
                    Implementation: US-021
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
