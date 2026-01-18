"use client";

import {
  Database,
  Key,
  Megaphone,
  Settings,
  Shield,
  Target,
  Trophy,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

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

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Sports Management */}
            <Link href="/platform/sports">
              <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-[#1E3A5F]/20">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-amber-100 p-3">
                    <Trophy className="h-6 w-6 text-amber-600" />
                  </div>
                  <CardTitle className="text-base">Sports Management</CardTitle>
                </CardContent>
              </Card>
            </Link>

            {/* Skills & Assessments Management */}
            <Link href="/platform/skills">
              <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-[#1E3A5F]/20">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-blue-100 p-3">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-base">
                    Skills & Assessments
                  </CardTitle>
                </CardContent>
              </Card>
            </Link>

            {/* Platform Staff Management */}
            <Link href="/platform/staff">
              <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-[#1E3A5F]/20">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-purple-100 p-3">
                    <Shield className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-base">Platform Staff</CardTitle>
                </CardContent>
              </Card>
            </Link>

            {/* Flow Management */}
            <Link href="/platform/flows">
              <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-[#1E3A5F]/20">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-green-100 p-3">
                    <Megaphone className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle className="text-base">Flow Management</CardTitle>
                </CardContent>
              </Card>
            </Link>

            {/* Platform Settings - Coming Soon */}
            <Card className="h-full border-gray-300 border-dashed bg-gray-50/50">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gray-100 p-3">
                    <Settings className="h-6 w-6 text-gray-500" />
                  </div>
                  <CardTitle className="text-base text-gray-700">
                    Platform Settings
                  </CardTitle>
                </div>
                <div className="flex flex-col gap-1.5 pl-1 text-gray-600 text-xs">
                  <p>Global platform configuration</p>
                  <Badge
                    className="w-fit border-gray-400 text-gray-700"
                    variant="outline"
                  >
                    Coming soon
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Data Management - Coming Soon */}
            <Card className="h-full border-gray-300 border-dashed bg-gray-50/50">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gray-100 p-3">
                    <Database className="h-6 w-6 text-gray-500" />
                  </div>
                  <CardTitle className="text-base text-gray-700">
                    Data Management
                  </CardTitle>
                </div>
                <div className="flex flex-col gap-1.5 pl-1 text-gray-600 text-xs">
                  <p>Platform data and analytics</p>
                  <Badge
                    className="w-fit border-gray-400 text-gray-700"
                    variant="outline"
                  >
                    Coming soon
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Developer Tools - Coming Soon */}
            <Card className="h-full border-gray-300 border-dashed bg-gray-50/50">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gray-100 p-3">
                    <Key className="h-6 w-6 text-gray-500" />
                  </div>
                  <CardTitle className="text-base text-gray-700">
                    Developer Tools
                  </CardTitle>
                </div>
                <div className="flex flex-col gap-1.5 pl-1 text-gray-600 text-xs">
                  <p>API keys and integrations</p>
                  <Badge
                    className="w-fit border-gray-400 text-gray-700"
                    variant="outline"
                  >
                    Coming soon
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
