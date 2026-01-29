"use client";

import { formatDistanceToNow } from "date-fns";
import { Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Summary = {
  summaryId: string;
  playerName: string;
  summaryPreview: string;
  sentAt: number;
  viewedAt?: number;
  acknowledgedAt?: number;
};

type SentSummariesSectionProps = {
  summaries: Summary[];
  setActiveTab?: (tab: string) => void;
};

export function SentSummariesSection({
  summaries,
  setActiveTab,
}: SentSummariesSectionProps) {
  if (summaries.length === 0) {
    return (
      <Empty>
        <EmptyMedia>
          <Send className="h-12 w-12" />
        </EmptyMedia>
        <EmptyContent>
          <EmptyTitle>No summaries sent yet</EmptyTitle>
          <EmptyDescription>
            Summaries you send to parents will appear here
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  const displaySummaries = summaries.slice(0, 10);

  const getStatusBadge = (summary: Summary) => {
    if (summary.acknowledgedAt) {
      return <Badge variant="default">Acknowledged</Badge>;
    }
    if (summary.viewedAt) {
      return <Badge variant="secondary">Viewed</Badge>;
    }
    return <Badge variant="outline">Sent</Badge>;
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-lg">Sent to Parents</h3>
        <Badge variant="secondary">{summaries.length} summaries</Badge>
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Sent At</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displaySummaries.map((summary) => (
              <TableRow key={summary.summaryId}>
                <TableCell>{summary.playerName}</TableCell>
                <TableCell className="max-w-md truncate">
                  {summary.summaryPreview}
                </TableCell>
                <TableCell>
                  {formatDistanceToNow(new Date(summary.sentAt), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell>{getStatusBadge(summary)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card view */}
      <div className="space-y-3 md:hidden">
        {displaySummaries.map((summary) => (
          <Card key={summary.summaryId}>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{summary.playerName}</p>
                  {getStatusBadge(summary)}
                </div>
                <p className="line-clamp-2 text-muted-foreground text-sm">
                  {summary.summaryPreview}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(summary.sentAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View All button if more than 10 summaries */}
      {summaries.length > 10 && setActiveTab && (
        <Button
          className="mt-4 w-full"
          onClick={() => setActiveTab("auto-sent")}
          variant="outline"
        >
          View All {summaries.length} Summaries
        </Button>
      )}
    </div>
  );
}
