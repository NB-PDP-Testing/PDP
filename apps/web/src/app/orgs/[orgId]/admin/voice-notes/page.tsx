"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Download,
  FileText,
  Filter,
  Loader2,
  Search,
  Shield,
  User,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";

const { useSession } = authClient;

// Format date as "Mon Jan 22, 2026 10:30 PM"
function formatAuditDate(date: Date | string | number): string {
  const d =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type NoteType = "all" | "training" | "match" | "general";

export default function VoiceNotesAuditPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const orgId = params.orgId as BetterAuthId<"organization">;

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<NoteType>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Get current user's role in organization
  const membership = useQuery(
    api.models.members.getMemberByUserId,
    session?.user?.id
      ? { organizationId: orgId, userId: session.user.id }
      : "skip"
  );

  // Get all voice notes for the organization (admin view)
  const voiceNotes = useQuery(api.models.voiceNotes.getAllVoiceNotes, {
    orgId,
  });

  // Check if user has admin access
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";

  // Filter notes based on search and filters
  const filteredNotes = voiceNotes?.filter((note) => {
    // Type filter
    if (typeFilter !== "all" && note.type !== typeFilter) {
      return false;
    }

    // Text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTranscription = note.transcription
        ?.toLowerCase()
        .includes(query);
      const matchesSummary = note.summary?.toLowerCase().includes(query);
      const matchesInsight = note.insights.some(
        (i: any) =>
          i.title.toLowerCase().includes(query) ||
          i.description?.toLowerCase().includes(query) ||
          i.playerName?.toLowerCase().includes(query)
      );
      return matchesTranscription || matchesSummary || matchesInsight;
    }

    return true;
  });

  const isLoading = membership === undefined || voiceNotes === undefined;

  // Access denied - not an admin
  if (!(isLoading || isAdmin)) {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <Empty>
              <EmptyContent>
                <EmptyMedia variant="icon">
                  <Shield className="h-12 w-12 text-red-500" />
                </EmptyMedia>
                <EmptyTitle>Access Denied</EmptyTitle>
                <EmptyDescription>
                  Only organization owners and administrators can access the
                  voice notes audit view.
                </EmptyDescription>
                <Button
                  className="mt-4"
                  onClick={() => router.push(`/orgs/${orgId}`)}
                  variant="outline"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Return to Dashboard
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl py-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button
            className="h-9 w-9 p-0"
            onClick={() => router.push(`/orgs/${orgId}/admin`)}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-7 w-7 text-blue-600" />
              <h1 className="font-bold text-2xl text-foreground">
                Voice Notes Audit
              </h1>
              <Badge className="ml-2" variant="secondary">
                Admin
              </Badge>
            </div>
            <p className="text-gray-600 text-sm">
              Organization-wide voice notes for compliance and oversight
            </p>
          </div>
        </div>

        <Button disabled variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export (Coming Soon)
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Search & Filters</CardTitle>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              size="sm"
              variant="ghost"
            >
              <Filter className="mr-2 h-4 w-4" />
              {showFilters ? "Hide" : "Show"} Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-gray-400" />
            <Input
              className="pr-9 pl-9"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcriptions, insights, players..."
              value={searchQuery}
            />
            {searchQuery && (
              <button
                className="-translate-y-1/2 absolute top-1/2 right-3 text-gray-400 hover:text-gray-600"
                onClick={() => setSearchQuery("")}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filters (collapsible) */}
          {showFilters && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="mb-2 text-sm">Note Type</Label>
                <Select
                  onValueChange={(value) => setTypeFilter(value as NoteType)}
                  value={typeFilter}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="match">Match</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Placeholder for future filters */}
              <div className="text-gray-400 text-sm">
                <Label className="mb-2 text-sm">Coach (Coming Soon)</Label>
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="All Coaches" />
                  </SelectTrigger>
                </Select>
              </div>

              <div className="text-gray-400 text-sm">
                <Label className="mb-2 text-sm">Date Range (Coming Soon)</Label>
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                </Select>
              </div>
            </div>
          )}

          {/* Results count */}
          <div className="mt-4 flex items-center justify-between border-gray-200 border-t pt-4 text-sm">
            <span className="text-gray-600">
              Showing {filteredNotes?.length ?? 0} of {voiceNotes?.length ?? 0}{" "}
              voice notes
            </span>
            {(searchQuery || typeFilter !== "all") && (
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                }}
                size="sm"
                variant="ghost"
              >
                Clear all filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Voice Notes List */}
      <div className="space-y-4">
        {filteredNotes && filteredNotes.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <Empty>
                <EmptyContent>
                  <EmptyMedia variant="icon">
                    <FileText className="h-8 w-8" />
                  </EmptyMedia>
                  <EmptyTitle>
                    {voiceNotes?.length === 0
                      ? "No voice notes yet"
                      : "No matching notes"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {voiceNotes?.length === 0
                      ? "Voice notes from coaches will appear here"
                      : "Try adjusting your search or filters"}
                  </EmptyDescription>
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          filteredNotes?.map((note) => (
            <Card className="border-2" key={note._id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{note.type}</Badge>
                    {note.source && (
                      <Badge variant="outline">
                        {note.source === "whatsapp_audio" ||
                        note.source === "whatsapp_text"
                          ? "WhatsApp"
                          : note.source === "app_recorded"
                            ? "Recorded"
                            : "Typed"}
                      </Badge>
                    )}
                    {note.coachName && (
                      <Badge
                        className="flex items-center gap-1"
                        variant="secondary"
                      >
                        <User className="h-3 w-3" />
                        {note.coachName}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Calendar className="h-4 w-4" />
                    {formatAuditDate(note.date)}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Status indicators */}
                <div className="flex flex-wrap gap-2">
                  {note.transcriptionStatus === "processing" && (
                    <Badge
                      className="flex items-center gap-1"
                      variant="secondary"
                    >
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Transcribing...
                    </Badge>
                  )}
                  {note.transcriptionStatus === "failed" && (
                    <Badge
                      className="flex items-center gap-1"
                      variant="destructive"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Transcription Failed
                    </Badge>
                  )}
                  {note.insightsStatus === "processing" && (
                    <Badge
                      className="flex items-center gap-1"
                      variant="secondary"
                    >
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Analyzing...
                    </Badge>
                  )}
                  {note.insights.length > 0 && (
                    <>
                      {note.insights.filter((i: any) => i.status === "pending")
                        .length > 0 && (
                        <Badge variant="outline">
                          {
                            note.insights.filter(
                              (i: any) => i.status === "pending"
                            ).length
                          }{" "}
                          pending
                        </Badge>
                      )}
                      {note.insights.filter((i: any) => i.status === "applied")
                        .length > 0 && (
                        <Badge variant="default">
                          {
                            note.insights.filter(
                              (i: any) => i.status === "applied"
                            ).length
                          }{" "}
                          applied
                        </Badge>
                      )}
                      {note.insights.filter(
                        (i: any) => i.status === "dismissed"
                      ).length > 0 && (
                        <Badge variant="secondary">
                          {
                            note.insights.filter(
                              (i: any) => i.status === "dismissed"
                            ).length
                          }{" "}
                          dismissed
                        </Badge>
                      )}
                      {note.insights.filter(
                        (i: any) => i.status === "auto_applied"
                      ).length > 0 && (
                        <Badge className="bg-green-100 text-green-800">
                          {
                            note.insights.filter(
                              (i: any) => i.status === "auto_applied"
                            ).length
                          }{" "}
                          auto-applied
                        </Badge>
                      )}
                    </>
                  )}
                </div>

                {/* Summary */}
                {note.summary && (
                  <div className="rounded-lg border-blue-200 border-l-4 bg-blue-50 p-3">
                    <p className="font-medium text-blue-900 text-sm">
                      AI Summary
                    </p>
                    <p className="mt-1 text-blue-800 text-sm">{note.summary}</p>
                  </div>
                )}

                {/* Insights */}
                {note.insights.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-medium text-gray-700 text-sm">
                      Insights:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {note.insights.map((insight: any) => (
                        <Badge
                          className="text-xs"
                          key={insight.id}
                          variant={
                            insight.status === "applied"
                              ? "default"
                              : insight.status === "auto_applied"
                                ? "default"
                                : insight.status === "dismissed"
                                  ? "secondary"
                                  : "outline"
                          }
                        >
                          {insight.status === "applied" && "✓ Applied: "}
                          {insight.status === "auto_applied" && "✓ Auto: "}
                          {insight.status === "dismissed" && "✗ Dismissed: "}
                          {insight.status === "pending" && "⏳ Pending: "}
                          {insight.playerName && `${insight.playerName}: `}
                          {insight.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transcription */}
                {note.transcription && (
                  <details className="group">
                    <summary className="flex cursor-pointer items-center gap-2 font-medium text-gray-700 text-sm hover:text-gray-900">
                      <span>View Transcription</span>
                      <span className="text-gray-400 text-xs">
                        ({note.transcription.length} characters)
                      </span>
                    </summary>
                    <div className="mt-2 rounded-lg bg-gray-50 p-3">
                      <p className="whitespace-pre-wrap text-gray-700 text-sm">
                        {note.transcription}
                      </p>
                    </div>
                  </details>
                )}

                {/* Error messages */}
                {note.transcriptionError && (
                  <div className="rounded-lg border-red-200 bg-red-50 p-3">
                    <p className="font-medium text-red-900 text-sm">
                      Transcription Error
                    </p>
                    <p className="mt-1 text-red-800 text-xs">
                      {note.transcriptionError}
                    </p>
                  </div>
                )}
                {note.insightsError && (
                  <div className="rounded-lg border-red-200 bg-red-50 p-3">
                    <p className="font-medium text-red-900 text-sm">
                      Insights Error
                    </p>
                    <p className="mt-1 text-red-800 text-xs">
                      {note.insightsError}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
