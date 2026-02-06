"use client";

import { Clock, LogIn, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ExpiredLinkViewProps = {
  expiresAt: number;
  voiceNoteCount: number;
};

export function ExpiredLinkView({
  expiresAt,
  voiceNoteCount,
}: ExpiredLinkViewProps) {
  const expiredAgo = formatTimeAgo(expiresAt);

  return (
    <div className="flex min-h-[60svh] items-center justify-center">
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle>Link Expired</CardTitle>
          <CardDescription>
            This review link expired {expiredAgo}. It covered {voiceNoteCount}{" "}
            voice note{voiceNoteCount !== 1 ? "s" : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground text-sm">
            To get a new review link, send a voice note or type{" "}
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground text-xs">
              R
            </span>{" "}
            in your WhatsApp chat.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild className="min-h-[44px] w-full">
              <a href="https://wa.me/">
                <MessageSquare className="mr-2 h-4 w-4" />
                Open WhatsApp
              </a>
            </Button>
            <Button asChild className="min-h-[44px] w-full" variant="outline">
              <a href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Log in to PlayerARC
              </a>
            </Button>
          </div>
          <p className="text-center text-muted-foreground/70 text-xs">
            Logging in requires your PlayerARC account credentials.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    return "just now";
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return "yesterday";
  }
  return `${diffDays} days ago`;
}
