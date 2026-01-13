"use client";

import { Home, Megaphone, Shield, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default function PlatformDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] to-[#2a4a6f] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Compact Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/">
            <button
              className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white transition-all hover:bg-white/20"
              type="button"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </button>
          </Link>
          <h1 className="font-semibold text-white text-xl sm:text-2xl">
            Platform Management
          </h1>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        {/* Compact Management Tools Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Sports Management */}
          <Link href="/platform/sports">
            <Card className="group h-full cursor-pointer border-white/20 bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20 hover:shadow-lg">
              <CardHeader className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-500/20 p-2.5 transition-colors group-hover:bg-amber-500/30">
                    <Trophy className="h-5 w-5 text-amber-400" />
                  </div>
                  <CardTitle className="text-base text-white">Sports</CardTitle>
                </div>
              </CardHeader>
            </Card>
          </Link>

          {/* Skills & Assessments Management */}
          <Link href="/platform/skills">
            <Card className="group h-full cursor-pointer border-white/20 bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20 hover:shadow-lg">
              <CardHeader className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/20 p-2.5 transition-colors group-hover:bg-blue-500/30">
                    <Target className="h-5 w-5 text-blue-400" />
                  </div>
                  <CardTitle className="text-base text-white">Skills</CardTitle>
                </div>
              </CardHeader>
            </Card>
          </Link>

          {/* Platform Staff Management */}
          <Link href="/platform/staff">
            <Card className="group h-full cursor-pointer border-white/20 bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20 hover:shadow-lg">
              <CardHeader className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-500/20 p-2.5 transition-colors group-hover:bg-purple-500/30">
                    <Shield className="h-5 w-5 text-purple-400" />
                  </div>
                  <CardTitle className="text-base text-white">Staff</CardTitle>
                </div>
              </CardHeader>
            </Card>
          </Link>

          {/* Flow Management */}
          <Link href="/platform/flows">
            <Card className="group h-full cursor-pointer border-white/20 bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20 hover:shadow-lg">
              <CardHeader className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-500/20 p-2.5 transition-colors group-hover:bg-green-500/30">
                    <Megaphone className="h-5 w-5 text-green-400" />
                  </div>
                  <CardTitle className="text-base text-white">Flows</CardTitle>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
