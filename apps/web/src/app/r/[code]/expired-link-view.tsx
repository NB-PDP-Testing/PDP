"use client";

import { Clock, MessageSquare, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ExpiredLinkView() {
  return (
    <div className="flex min-h-[60svh] items-center justify-center">
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle>Link Expired</CardTitle>
          <CardDescription>
            This review link has expired. Review links are valid for 48 hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground text-sm">
            To get a new link, send a voice note or type{" "}
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground text-xs">
              R
            </span>{" "}
            in your WhatsApp chat.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild className="min-h-[44px] w-full">
              <a href="/">
                <Mic className="mr-2 h-4 w-4" />
                Open Voice Notes
              </a>
            </Button>
            <Button asChild className="min-h-[44px] w-full" variant="outline">
              <a
                href="https://wa.me/"
                rel="noopener noreferrer"
                target="_blank"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Back to WhatsApp
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
