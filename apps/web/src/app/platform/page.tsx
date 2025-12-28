"use client";

import {
  Database,
  Settings,
  Shield,
  Target,
  Trophy,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PlatformDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Platform Welcome Section */}
        <div className="mb-12 text-center text-white">
          <div className="mb-6 flex justify-center">
            <div className="relative h-20 w-20 sm:h-24 sm:w-24">
              <Image
                alt="PlayerARC Logo"
                className="object-contain drop-shadow-lg"
                fill
                priority
                sizes="(max-width: 640px) 80px, 96px"
                src="/logos-landing/PDP-Logo-OffWhiteOrbit_GreenHuman.png"
              />
            </div>
          </div>
          <h1 className="mb-4 font-bold text-4xl tracking-tight sm:text-5xl">
            Platform Management
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90 sm:text-xl">
            Configure platform-wide settings, manage sports, skills, and
            administrator permissions across all organizations.
          </p>

          {/* Summary Cards */}
          <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
            <Card className="border-white/20 bg-white/10 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="mb-3 flex justify-center">
                  <div className="rounded-full bg-amber-500/20 p-3">
                    <Trophy className="h-6 w-6 text-amber-400" />
                  </div>
                </div>
                <h3 className="mb-2 font-semibold text-white">
                  Sports & Skills
                </h3>
                <p className="text-sm text-white/80">
                  Configure sports, age groups, and assessment criteria
                </p>
              </CardContent>
            </Card>
            <Card className="border-white/20 bg-white/10 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="mb-3 flex justify-center">
                  <div className="rounded-full bg-purple-500/20 p-3">
                    <Shield className="h-6 w-6 text-purple-400" />
                  </div>
                </div>
                <h3 className="mb-2 font-semibold text-white">
                  Staff Management
                </h3>
                <p className="text-sm text-white/80">
                  Grant and manage platform administrator permissions
                </p>
              </CardContent>
            </Card>
            <Card className="border-white/20 bg-white/10 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="mb-3 flex justify-center">
                  <div className="rounded-full bg-blue-500/20 p-3">
                    <Settings className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
                <h3 className="mb-2 font-semibold text-white">
                  Platform Settings
                </h3>
                <p className="text-sm text-white/80">
                  Global configuration and data management tools
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Management Tools Section */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
          <div className="mb-6">
            <h2 className="font-bold text-2xl text-[#1E3A5F] tracking-tight">
              Management Tools
            </h2>
            <p className="mt-2 text-muted-foreground">
              Access platform-level configuration and management features
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Sports Management */}
            <Link href="/platform/sports">
              <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-[#1E3A5F]/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-amber-100 p-2">
                      <Trophy className="h-6 w-6 text-amber-600" />
                    </div>
                    <CardTitle>Sports Management</CardTitle>
                  </div>
                  <CardDescription>
                    Configure sports, age groups, and eligibility rules
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-muted-foreground text-sm">
                    <li>• Create and manage sports</li>
                    <li>• Configure age group ranges</li>
                    <li>• Set eligibility rules</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            {/* Skills & Assessments Management */}
            <Link href="/platform/skills">
              <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-[#1E3A5F]/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-blue-100 p-2">
                      <Target className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle>Skills & Assessments</CardTitle>
                  </div>
                  <CardDescription>
                    Manage skill categories and assessment criteria
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-muted-foreground text-sm">
                    <li>• Define skill categories</li>
                    <li>• Configure assessment levels</li>
                    <li>• Sport-specific skills</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            {/* Platform Staff Management */}
            <Link href="/platform/staff">
              <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-[#1E3A5F]/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-purple-100 p-2">
                      <Shield className="h-6 w-6 text-purple-600" />
                    </div>
                    <CardTitle>Platform Staff</CardTitle>
                  </div>
                  <CardDescription>
                    Manage platform administrator permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-muted-foreground text-sm">
                    <li>• Grant staff access</li>
                    <li>• Revoke permissions</li>
                    <li>• View all platform users</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            {/* Future: Platform Settings */}
            <Card className="border-dashed opacity-60">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-gray-100 p-2">
                    <Settings className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <CardTitle>Platform Settings</CardTitle>
                </div>
                <CardDescription>Global platform configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Coming soon...</p>
              </CardContent>
            </Card>

            {/* Future: Data Management */}
            <Card className="border-dashed opacity-60">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-gray-100 p-2">
                    <Database className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <CardTitle>Data Management</CardTitle>
                </div>
                <CardDescription>Platform data and analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Coming soon...</p>
              </CardContent>
            </Card>

            {/* Future: Developer Tools */}
            <Card className="border-dashed opacity-60">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-gray-100 p-2">
                    <Wrench className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <CardTitle>Developer Tools</CardTitle>
                </div>
                <CardDescription>API keys and integrations</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Coming soon...</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
